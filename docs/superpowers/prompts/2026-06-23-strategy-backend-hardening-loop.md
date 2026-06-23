# Continuous Agent Loop — Strategy Backend Hardening (Phase C)

> **Loop type:** sequential (continuous-agent-loop default). One crafted prompt, executed
> task-by-task with a quality gate every iteration until **all acceptance criteria pass**.
> **Scope:** `server/` only. Self-contained, network-free, TDD. Live-testnet wiring + deployment are
> explicitly **out of loop** (need real keys/infra).

## Role

You are an autonomous engineer hardening the HyperSolid strategy backend. You already shipped T1–T9
(DCA scheduler, agent custody, auth, Fastify contract, SQLite store; 43 tests green). Now grind the
backlog below to done. Work **one task at a time**, strict TDD, commit each task.

## Per-iteration protocol (repeat until backlog empty)

1. Pick the first `pending` task from the **Backlog**.
2. **Write the failing test first** (Jest, `ts-jest`). Run it; confirm it FAILS for the right reason.
3. Implement the **minimal** code to pass. No speculative scope (YAGNI). DRY.
4. **Quality gate (all must hold):**
   - `cd server && npx tsc --noEmit` → exit 0.
   - `cd server && npx jest` → all green; total test count **only grows** vs. the previous iteration.
   - No real HL network and **no real private keys** in tests — inject fakes; deterministic `now`/key gens.
   - No secret, key, or `EXPO_PUBLIC_*` value committed.
5. **Commit** (`git commit --no-verify`) with a focused message + the trailer:
   `Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>`
6. Record the task `done` + commit sha in loop state. Go to 1.

## Guardrails (never violate)

- Never touch the mobile Phase 2 wallet-security (`mobile/src/wallet/*`) or Phase 3 encoding core
  (`mobile/src/lib/hyperliquid/{buildOrder,order,cancel}`), or the IntentLedger.
- Agent keys are secrets: generated server-side, **encrypted at rest**, never returned over HTTP, never
  logged. The agent can only trade (HL guarantee) — never withdraw.
- `owner` on authed routes always comes from the verified session token, never the request body.
- Fail closed: any uncertain placement receipt → no `recordFill`, no `nextRunAt` advance (retry next tick).
- Push to origin **only when the user explicitly says so**.

## Backlog (in order)

### L1 — Encryption primitive (`secretBox`) ✅ done
`server/src/agent/secretBox.ts` — AES-256-GCM `seal`/`open` + scrypt `deriveKey`. Tests: round-trip,
no-plaintext-leak, random-IV, wrong-key throws, tamper throws.

### L2 — Encrypted durable agent custody
**Files:** `server/src/agent/sqliteAgentStore.ts` (+test); modify `server/src/index.ts`.
- `SqliteAgentStore implements AgentStore` (same interface as `MemoryAgentStore`): `get/set/remove`.
  Schema `agents(owner PK, agent_address, enc_private_key, approved, valid_until)`. The private key is
  stored **only** via `secretBox.seal(...)`; `get` decrypts with `open`.
- Test (TDD): set→get round-trips the record incl. the decrypted key; persists across a **reopen**
  (durable recovery); the at-rest `enc_private_key` column does **not** contain the raw key; owner
  match case-insensitive.
- Wire `index.ts`: build the agent store from `SqliteAgentStore.open(DB_PATH, deriveKey(requireEnv("AGENT_ENC_KEY")))`
  so agents survive restarts (expired/missing agents already fail closed in the placer).

### L3 — Activity persistence
**Files:** `server/src/strategies/activityStore.ts` (+test); thread into `engine/scheduler.ts` +
`http/app.ts` (+ their tests).
- `ActivityStore` (Memory + Sqlite) records a fill: `{ id, strategyId, owner, time, coin, side, sz, px }`,
  and `list(owner, strategyId)` returns newest-first. Match the App `Activity` DTO
  (`{ id, time, coin, side, sz, px }`).
- `tick` records an activity row **on confirmed fill only** (alongside `recordFill`).
- `GET /strategies/:id/activity` returns the real list (still owner-scoped, 404 if not owned).
- Tests: a successful tick writes exactly one activity row with the filled sz/px; a failed placement
  writes none; the route returns it.

### L4 — Per-coin risk caps
**Files:** modify `server/src/risk/guards.ts` (+test), `engine/scheduler.ts` (+test), `index.ts`.
- Extend `RiskLimits` with optional `perCoinMaxNotionalUsdc?: Record<string, number>`; `withinCaps`
  rejects when a coin's notional exceeds its per-coin cap (falls back to the global cap when unset).
- `tick` passes the coin so the per-coin cap is enforced; over-cap strategies are skipped (no advance),
  exactly like the global cap / kill-switch path.
- Config from env in `index.ts`: `PER_COIN_CAPS` as JSON (e.g. `{"BTC":500}`), parsed defensively.
- Tests: a coin over its per-coin cap is skipped while another coin under cap still fires.

## Acceptance criteria (loop exits when ALL hold)

- L1–L4 all `done`, each its own commit.
- `cd server && npx tsc --noEmit` → 0 and `npx jest` → all green (≥ 43 + new tests).
- Agent keys are never stored or logged in plaintext; a fresh process can decrypt persisted agents.
- Activity route returns real recorded fills; per-coin caps are enforced in the tick.
- Working tree clean; commits carry the Co-authored-by trailer; nothing pushed.

## Recovery (if the loop churns)

Freeze. Reduce to the single failing unit, re-read its acceptance test, fix root cause (don't retry the
same change). If a task needs real network/keys, it does **not** belong in this loop — stop and report.
