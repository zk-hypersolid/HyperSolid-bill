# Strategy Automation Engine (Phase C) — Design

> **Status:** Design. User chose **B/C (server-side execution + HL agent wallet)** as the execution
> model. **User to review this spec before implementation.** First strategy = **DCA** (assumed per
> recommendation; adjust if wanted). The backend execution engine is a **separate project** — this
> spec defines the App-side control plane + the App↔backend contract, and outlines the backend.

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
POST /agent/provision            -> { agentAddress }            // backend mints a trade-only agent
POST /agent/confirm  { agentAddress, owner }                    // app reports the on-chain approval
GET  /agent/status?owner=        -> { approved, agentAddress? }
POST /agent/revoke   { owner }                                  // backend stops using the agent
GET  /strategies?owner=          -> Strategy[]
POST /strategies     { owner, type:"dca", params }              -> Strategy
PATCH /strategies/:id { status:"paused"|"running" }             -> Strategy
DELETE /strategies/:id
GET  /strategies/:id/activity    -> Activity[]                  // recent child fills/actions
POST /kill-switch    { owner }                                  // pause all strategies
```
`owner` = the user's main address; the backend authenticates requests (auth scheme = backend's spec).

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

## Open questions (for the user)

1. **Backend ownership:** will you build the backend to this contract, or should I also write a
   separate backend spec (and pick a stack)? (App side proceeds either way.)
2. **Agent expiry:** set an `agentName` `valid_until` expiry (auto-expiring approval), or no expiry +
   manual revoke? (Default: include a `valid_until` ~90 days for safety.)
3. **Auth:** how does the backend authenticate the app (sign-in-with-wallet signature, token)? (Needed
   to finalize the contract; default assumption: a wallet-signature session.)
