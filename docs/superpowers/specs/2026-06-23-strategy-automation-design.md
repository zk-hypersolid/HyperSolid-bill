# Strategy Automation Engine (Phase C) — Design

> **Status:** ✅ **Approved (decisions locked 2026-06-23).** Execution model = **B/C (server-side +
> trade-only HL agent wallet)**. First strategy = **DCA**. Locked sub-decisions: **(1) we build the
> backend** (separate spec `2026-06-23-strategy-backend-design.md`, Node/TS in `server/`); **(2) agent
> approval carries a `valid_until` ≈ 90-day expiry**; **(3) backend auth = wallet-signature session**
> (sign-in-with-wallet challenge → session token). The backend is its own sub-project; this spec is the
> App-side control plane + the App↔backend contract.

## Goal

Turn the Strategy tab from a mock shell into a real **24/7 automation** feature, while keeping the
app **non-custodial**: the user's main key never leaves the device, and automation can never withdraw
funds. Start with **DCA** (dollar-cost averaging) as the first strategy type.

## Why this architecture (the B/C decision)

A strategy must run continuously, but a mobile app is killed in the background — it cannot reliably
run 24/7. So execution lives on a **server**. To avoid the server custodying funds, Hyperliquid's
**agent wallet** (`approveAgent`) is used: the user signs (once, on-device, with their main key) an
approval authorizing a **trade-only** agent address. The server holds that agent key and trades on
the user's behalf, but the agent **cannot withdraw** — so a server compromise can mis-trade at worst,
never steal. The user can revoke the agent anytime.

## Decomposition (two sub-projects)

| Sub-project | Where | This spec |
|---|---|---|
| **1. App control plane** | this repo (`mobile/`) | **fully designed here**, implementable now |
| **2. Backend execution engine** | a **separate** service/repo | **contract + outline only**; its own spec/stack decision; NOT built in `mobile/` |

The App is the **control plane** (approve/revoke the agent, create/pause/delete strategies, view
status); the backend is the **execution plane** (runs the loops, places orders with the agent key).

## Security model

- **Agent key custody:** the **backend generates and holds** the agent keypair (server-side). The app
  only ever receives the agent **address** and signs the on-chain `approveAgent` with the user's main
  key. The agent **private key never touches the app or the wire**.
- **Trade-only:** HL guarantees an agent cannot withdraw. The non-custodial guarantee for funds holds
  even if the backend is breached.
- **Revocable:** the app can revoke (re-`approveAgent` with a null/expired agent or HL's revoke path)
  + a kill-switch that pauses all strategies server-side.
- **Idempotency:** the backend reuses the existing cloid idempotency discipline (one cloid per intended
  child order; retries reuse it) so a backend restart/crash never double-places.

## App control plane — components (this repo)

1. **`ExchangeService.approveAgent(agentAddress, agentName)`** — a new user-signed action mirroring
   `withdrawUsdc` (validate → `client.approveAgent({agentAddress, agentName})` → honest/uncertain
   result). Signs with the on-device main key. TDD with a fake client. **No funds move.**
2. **`StrategyApi`** (`src/services/strategyApi.ts`) — typed HTTP client to the backend (base URL from
   server-delivered runtime config, like the RPC). Methods: `provisionAgent()`, `confirmAgent(addr)`,
   `listStrategies()`, `createStrategy(dca)`, `pauseStrategy(id)`, `resumeStrategy(id)`,
   `deleteStrategy(id)`, `getActivity(id)`. Injectable `fetch` for tests.
3. **`AgentScreen` real wiring** — replace the mock: an **agent-approval card** (not approved → CTA
   that provisions + signs `approveAgent` + confirms; approved → show agent address + revoke); the
   **strategy list** from the backend (running/paused, return, recent activity); a **create-DCA** form
   (coin, amount per buy, interval, optional cap); pause/resume/delete; a **kill-switch** (pause all).
4. **Runtime config** — add `strategyApiBaseUrl` to the server-delivered `AppRuntimeConfig` (consistent
   with the RPC pattern; never embedded).

## App↔Backend API contract (the backend implements this)

```
# Auth (wallet-signature session)
POST /auth/challenge { owner }   -> { nonce }                   // backend issues a one-time nonce
POST /auth/session   { owner, nonce, signature } -> { token }   // app signs the nonce with the main key

# All routes below require Authorization: Bearer <token>; owner is taken from the verified session.
POST /agent/provision            -> { agentAddress }            // backend mints a trade-only agent
POST /agent/confirm  { agentAddress }                           // app reports the on-chain approval
GET  /agent/status               -> { approved, agentAddress?, validUntil? }
POST /agent/revoke                                              // backend stops using the agent
GET  /strategies                 -> Strategy[]
POST /strategies     { type:"dca", params }                     -> Strategy
PATCH /strategies/:id { status:"paused"|"running" }             -> Strategy
DELETE /strategies/:id
GET  /strategies/:id/activity    -> Activity[]                  // recent child fills/actions
POST /kill-switch                                               // pause all strategies
```
The app signs the `/auth/challenge` nonce with its on-device main key; the backend recovers + verifies
the `owner` address and issues a bearer token. `owner` is never trusted from the body on authed routes.

## First strategy — DCA

- **Params:** `{ coin, side:"buy", quoteAmountUsdc, intervalHours, maxTotalUsdc? }` — buy
  `quoteAmountUsdc` of `coin` every `intervalHours`, optionally until `maxTotalUsdc` is reached.
- **Execution (backend):** on each tick, place a market/aggressive-limit order for the notional via the
  agent key with a fresh cloid; record the fill; respect risk guards (max notional, kill-switch).
- DCA is chosen first because it is the simplest to schedule and reason about (no live grid/TWAP state).

## Backend execution engine — outline (separate spec)

Not built here. Needs its own brainstorm/stack decision. Responsibilities: a scheduler + per-strategy
loop; order placement via the agent key reusing the cloid idempotency kernel; risk guards (max
leverage, daily-loss cap, kill-switch); persistence (strategies + child intents + activity); crash
recovery (reconcile by cloid). Hard question for that spec: hosting/runtime + how the agent key is
stored (KMS/secret manager).

## Testing (App side)

- `ExchangeService.approveAgent`: fake client; assert it signs with `{agentAddress, agentName}` and
  surfaces ok/uncertain; never a real action in tests.
- `StrategyApi`: injected `fetch`; assert each method hits the right path/verb and parses responses;
  non-ok → throws.
- `AgentScreen`: mock `StrategyApi` + `approveAgent`; assert approval flow, strategy list render,
  create-DCA calls the API, pause/resume/delete, kill-switch. No real network.

## Out of scope (this spec)

- The backend implementation (separate project).
- Grid / TWAP / TP-SL strategies (after DCA proves the loop).
- On-device 24/7 execution (rejected — unreliable in background).

## Decisions (locked)

1. **Backend ownership:** we build the backend (`server/`, Node/TS, reusing `@nktkas/hyperliquid` +
   `viem`). Its design is the separate `2026-06-23-strategy-backend-design.md`.
2. **Agent expiry:** the approval's `agentName` encodes `valid_until <unix-ms ≈ now+90d>`; after expiry
   the agent stops being usable and the app prompts re-approval. The app computes the expiry.
3. **Auth (App→backend):** wallet-signature session — the app requests a challenge nonce, signs it with
   the on-device main key (sign-in-with-wallet), and the backend returns a session token used as a
   bearer on subsequent calls. `owner` is the recovered/verified main address.
