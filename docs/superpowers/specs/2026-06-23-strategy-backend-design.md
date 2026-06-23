# Strategy Backend — Execution Engine (Phase C, sub-project 2) — Design

> **Status:** Design. Sub-project of Phase C (the App-side control plane is
> `2026-06-23-strategy-automation-design.md`). User asked us to build the backend. Implements the
> App↔backend contract + runs strategies 24/7 with a trade-only HL agent wallet. **User to review.**

## Goal

A small server that runs users' strategies (DCA first) continuously, placing orders on Hyperliquid
with each user's **trade-only agent wallet** — never able to withdraw. It exposes the contract the app
calls, authenticates the app by wallet signature, and keeps strict cloid idempotency so restarts never
double-place.

## Stack & layout (decisions)

- **Runtime:** Node.js + TypeScript (reuses `@nktkas/hyperliquid` + `viem` exactly like the app).
- **HTTP:** Fastify (small, TS-native). **Persistence:** SQLite via `better-sqlite3` for v1 (single
  process); Postgres is a later swap behind the store interface.
- **Location:** `server/` at the repo root (monorepo with `mobile/`).
- **Layout (one responsibility per file):**
  - `server/src/http/` — routes (auth, agent, strategies, kill-switch) + the Fastify app.
  - `server/src/auth/` — challenge/nonce issue + signature verify (`viem.verifyMessage`) + session tokens (JWT).
  - `server/src/agent/agentManager.ts` — per-owner agent keypair generate/store(encrypted)/load; build an HL `ExchangeClient` signing with the agent key.
  - `server/src/strategies/store.ts` — persist strategies (owner, type, params, status, nextRunAt) + child intents + activity (the store interface; SQLite impl).
  - `server/src/strategies/dca.ts` — pure DCA logic: `dueStrategies(strategies, now)`, `nextRunAt(strategy)`, `dcaOrder(params)`.
  - `server/src/engine/scheduler.ts` — the tick loop: find due strategies → place via agent (fresh cloid) → record → advance; honor risk guards + kill-switch + agent `valid_until`.
  - `server/src/engine/idempotency.ts` — reuse the cloid discipline (persist pending cloid before signing; reconcile by cloid; recovery on startup).
  - `server/src/risk/guards.ts` — max notional per order, daily-loss cap, global kill-switch.

## Security

- **Agent keys are secrets:** generated server-side, stored **encrypted at rest** (a KMS/secret manager
  in prod; a dev-only env-derived key for local). Never logged, never returned to the app (only the
  address is). The agent can only trade (HL guarantee) — a breach can mis-trade, never withdraw.
- **Auth:** the app proves ownership of the main address by signing a one-time nonce; the backend
  verifies via `viem.verifyMessage`/recovery and issues a short-lived JWT. `owner` on authed routes
  comes from the verified session, never the request body.
- **Agent expiry:** approvals carry `valid_until ≈ now+90d`; the scheduler refuses to trade an expired
  agent and the app re-approves.

## DCA execution

- Strategy row: `{ id, owner, type:"dca", params:{coin, side:"buy", quoteAmountUsdc, intervalHours, maxTotalUsdc?}, status, nextRunAt, filledTotalUsdc }`.
- Scheduler tick (e.g. every 60s): for each `running` DCA with `nextRunAt <= now` and not over `maxTotalUsdc`:
  place an aggressive-limit/market buy for `quoteAmountUsdc` of `coin` via the agent client with a fresh
  cloid (persist pending first), record the fill as activity, advance `nextRunAt += intervalHours`,
  add to `filledTotalUsdc`. On an uncertain receipt, keep the cloid and reconcile next tick — never
  double-place.

## Idempotency & recovery

- Mirror the app's `IntentLedger`: persist the cloid (pending) **before** signing; on (re)start,
  reconcile every non-terminal cloid against HL by `cloid` before scheduling new orders.

## Testing

- Pure logic (`dca.ts`, `guards.ts`) unit-tested directly (`dueStrategies`, `nextRunAt`, caps).
- `agentManager` + scheduler tested with a **fake HL ExchangeClient** (no real orders) + an in-memory
  store; assert idempotency (a forced restart mid-tick does not double-place), expiry refusal, and
  kill-switch. Auth tested with viem-signed nonces. **No real network/keys in tests.**

## Deployment (outline, not v1 code)

- Single Node process + SQLite for v1; a process manager keeps it alive; the scheduler is an internal
  interval. Horizontal scale (Postgres + a leader/lock for the tick) is a later concern.

## Out of scope

- Grid/TWAP/TP-SL strategies (after DCA); multi-region/HA; a full secrets-manager integration (interface
  now, concrete KMS later).
