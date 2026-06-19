# HyperSolid Markets List (Phase 0 + Phase 1) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a working React Native (Expo) app that shows a live, sorted list of Hyperliquid perpetual markets with mid price, 24h change, funding and volume, switchable between mainnet and testnet — fully unit-tested.

**Architecture:** A thin SDK adapter wraps `@nktkas/hyperliquid` (snapshot via `InfoClient.metaAndAssetCtxs()`, live prices via `SubscriptionClient.allMids()`). All business logic lives in pure functions (`normalize.ts`) and injectable services (`marketData.ts`) so it can be unit-tested without network or the ESM SDK. Zustand stores hold UI state; a single `MarketsScreen` renders rows from the store and a hook merges live mid updates.

**Tech Stack:** Expo (blank-typescript), React Navigation (native-stack), `@nktkas/hyperliquid`, Zustand, `@shopify/flash-list`, Jest (`jest-expo`) + `@testing-library/react-native`.

**Theme:** Default theme = A · Electrum Terminal (`#0A1217` bg, `#E8C98F` brand); built-in light theme = B · Daylight Ledger; optional = C · Oscilloscope. Brand color is always separate from up/down semantic colors (`#34C98B` / `#FF5C63`). See `docs/design/renders/` and `docs/design/VISUAL-DIRECTION.md`.

**Scope note:** This plan is the first vertical slice. Market Detail (chart + orderbook + trades) and view-only positions (`clearinghouseState`) are deliberately deferred to follow-up plans so this slice ships and is testable on its own.

**Price semantics (review fix):** This read-only markets list displays the live **mid price** (`midPx`), seeded from `assetCtx.midPx` in the snapshot and updated by the `allMids` subscription. The true **mark price** (used for PnL, margin, liquidation, and TP/SL triggers) is a *distinct* concept and is introduced as a separate field in the trading/positions phases (sourced from `activeAssetCtx`/`fastAssetCtxs`). Do not conflate mid and mark.

**Repo layout:** The Expo app lives in `mobile/` at the repo root (leaving room for a future `backend/`). All paths below are relative to the repo root unless noted.

**Alignment with v2 spec (`docs/superpowers/specs/2026-06-17-hypersolid-design.md`):** This slice is read-only (no keys, no orders), so most v2 integration rules apply only in later phases. But to avoid rework, the SDK adapter built here MUST reserve these seams now:
- **Asset-id resolution**: keep a `coin → assetId` map derived from `meta`/`metaAndAssetCtxs` (perp index). Even though the markets list only needs coin names, later trading needs the integer `asset`; build the adapter so the resolution table is a natural extension (see spec §4.1).
- **WS feed naming**: name subscription wrappers after the real Hyperliquid channels so later phases drop in unchanged — `allMids` (used here), and reserved-but-unused stubs/names for `bbo`, `fastAssetCtxs`, `l2Book`, `candle`, `trades`, and user feeds `webData3`/`clearinghouseState`/`orderUpdates`/`userFills` (note: `webData2` is now `webData3`; `userEvents` arrives on channel `"user"`) — see spec §4.6.
- **Price semantics**: keep `midPx` (live) distinct from a future `markPx` (PnL/risk) — already enforced in this plan (see Price semantics note above and spec §4.5).
- **Env isolation**: the `envStore` + `resolveIsTestnet` built here is the single switch later phases reuse for signing `hyperliquidChain` (spec §5.2).

These are design constraints, not extra tasks — the tasks below already follow them.

---

## File Structure

- `mobile/` — Expo app root (created in Task 0)
- `mobile/App.tsx` — root component, navigation + theme provider
- `mobile/src/theme/tokens.ts` — theme token sets (A/B/C) + `ThemeTokens` type
- `mobile/src/state/envStore.ts` — Zustand store for `network` (`mainnet`/`testnet`)
- `mobile/src/state/marketStore.ts` — Zustand store for market tickers + loading/error
- `mobile/src/lib/hyperliquid/types.ts` — shared types + injectable client interfaces
- `mobile/src/lib/hyperliquid/normalize.ts` — pure `normalizeMarkets` + `applyMids`
- `mobile/src/lib/hyperliquid/network.ts` — pure `resolveIsTestnet`
- `mobile/src/lib/hyperliquid/client.ts` — thin factory building real SDK clients (smoke-tested only)
- `mobile/src/services/marketData.ts` — `MarketDataService` (injected clients): snapshot + live subscribe
- `mobile/src/components/PriceText.tsx` — tabular number with up/down color
- `mobile/src/components/MarketRow.tsx` — one market row
- `mobile/src/hooks/useLiveMids.ts` — subscribes to live mids, pushes into store
- `mobile/src/screens/MarketsScreen.tsx` — list screen

Test files are co-located as `*.test.ts(x)` next to each unit.

---

### Task 0: Scaffold the Expo app and test runner

**Files:**
- Create: `mobile/` (entire Expo project)
- Modify: `mobile/package.json`
- Create: `mobile/jest.config.js`
- Create: `mobile/src/test-smoke.test.ts`

- [x] **Step 1: Scaffold the Expo app**

Run from the repo root:

```bash
cd /Users/bill/Documents/GitHub/HyperSolid
npx create-expo-app@latest mobile --template blank-typescript
```

Expected: a `mobile/` folder with `App.tsx`, `package.json`, `tsconfig.json`.

- [x] **Step 2: Install runtime and dev dependencies**

```bash
cd /Users/bill/Documents/GitHub/HyperSolid/mobile
npx expo install react-native-screens react-native-safe-area-context
npm i @nktkas/hyperliquid zustand @shopify/flash-list @react-navigation/native @react-navigation/native-stack
npm i -D jest jest-expo @testing-library/react-native @testing-library/jest-native @types/jest
```

- [x] **Step 3: Configure Jest**

Create `mobile/jest.config.js`:

```js
module.exports = {
  preset: "jest-expo",
  setupFilesAfterEnv: ["@testing-library/jest-native/extend-expect"],
  transformIgnorePatterns: [
    "node_modules/(?!((jest-)?react-native|@react-native(-community)?|expo(nent)?|@expo(nent)?/.*|@react-navigation/.*|@shopify/flash-list))",
  ],
};
```

Add a test script to `mobile/package.json` (`scripts` block):

```json
"test": "jest"
```

- [x] **Step 4: Add a smoke test**

Create `mobile/src/test-smoke.test.ts`:

```ts
describe("test runner", () => {
  it("runs", () => {
    expect(1 + 1).toBe(2);
  });
});
```

- [x] **Step 5: Run the smoke test**

```bash
cd /Users/bill/Documents/GitHub/HyperSolid/mobile
npm test -- src/test-smoke.test.ts
```

Expected: PASS, 1 test.

- [x] **Step 6: Commit**

```bash
cd /Users/bill/Documents/GitHub/HyperSolid
git add mobile
git commit -m "chore(mobile): scaffold Expo TS app + jest"
```

---

### Task 1: Theme tokens

**Files:**
- Create: `mobile/src/theme/tokens.ts`
- Test: `mobile/src/theme/tokens.test.ts`

- [x] **Step 1: Write the failing test**

Create `mobile/src/theme/tokens.test.ts`:

```ts
import { themes, type ThemeName, type ThemeTokens } from "./tokens";

const names: ThemeName[] = ["electrum", "daylight", "oscilloscope"];

describe("theme tokens", () => {
  it.each(names)("%s has all required keys", (name) => {
    const t: ThemeTokens = themes[name];
    for (const key of ["bg", "surface", "line", "text", "muted", "brand", "up", "down"] as const) {
      expect(typeof t[key]).toBe("string");
      expect(t[key]).toMatch(/^#[0-9A-Fa-f]{6}$/);
    }
  });

  it.each(names)("%s keeps brand separate from up/down semantics", (name) => {
    const t = themes[name];
    expect(t.brand).not.toBe(t.up);
    expect(t.brand).not.toBe(t.down);
  });

  it("defaults to electrum", () => {
    expect(themes.electrum.bg).toBe("#0A1217");
    expect(themes.electrum.brand).toBe("#E8C98F");
  });
});
```

- [x] **Step 2: Run test to verify it fails**

```bash
cd /Users/bill/Documents/GitHub/HyperSolid/mobile
npm test -- src/theme/tokens.test.ts
```

Expected: FAIL with "Cannot find module './tokens'".

- [x] **Step 3: Write the implementation**

Create `mobile/src/theme/tokens.ts`:

```ts
export type ThemeName = "electrum" | "daylight" | "oscilloscope";

export interface ThemeTokens {
  bg: string;
  surface: string;
  line: string;
  text: string;
  muted: string;
  brand: string;
  up: string;
  down: string;
}

export const themes: Record<ThemeName, ThemeTokens> = {
  electrum: {
    bg: "#0A1217",
    surface: "#0F1A20",
    line: "#20303A",
    text: "#EAF1F4",
    muted: "#7E929C",
    brand: "#E8C98F",
    up: "#34C98B",
    down: "#FF5C63",
  },
  daylight: {
    bg: "#EEF1F3",
    surface: "#FFFFFF",
    line: "#CBD5D8",
    text: "#11201F",
    muted: "#5A6B6E",
    brand: "#0E5A6B",
    up: "#1E7F5C",
    down: "#C0492F",
  },
  oscilloscope: {
    bg: "#0C0A07",
    surface: "#14110B",
    line: "#2A2418",
    text: "#F3ECDD",
    muted: "#9A8E73",
    brand: "#FFB454",
    up: "#6FE0C0",
    down: "#FF7A6B",
  },
};

export const defaultTheme: ThemeName = "electrum";
```

- [x] **Step 4: Run test to verify it passes**

```bash
cd /Users/bill/Documents/GitHub/HyperSolid/mobile
npm test -- src/theme/tokens.test.ts
```

Expected: PASS.

- [x] **Step 5: Commit**

```bash
cd /Users/bill/Documents/GitHub/HyperSolid
git add mobile/src/theme
git commit -m "feat(mobile): theme tokens (electrum/daylight/oscilloscope)"
```

---

### Task 2: Environment store (mainnet/testnet)

**Files:**
- Create: `mobile/src/state/envStore.ts`
- Test: `mobile/src/state/envStore.test.ts`

- [ ] **Step 1: Write the failing test**

Create `mobile/src/state/envStore.test.ts`:

```ts
import { useEnvStore } from "./envStore";

describe("envStore", () => {
  beforeEach(() => {
    useEnvStore.setState({ network: "mainnet" });
  });

  it("defaults to mainnet", () => {
    expect(useEnvStore.getState().network).toBe("mainnet");
  });

  it("toggles to testnet and back", () => {
    useEnvStore.getState().toggleNetwork();
    expect(useEnvStore.getState().network).toBe("testnet");
    useEnvStore.getState().toggleNetwork();
    expect(useEnvStore.getState().network).toBe("mainnet");
  });

  it("sets network explicitly", () => {
    useEnvStore.getState().setNetwork("testnet");
    expect(useEnvStore.getState().network).toBe("testnet");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd /Users/bill/Documents/GitHub/HyperSolid/mobile
npm test -- src/state/envStore.test.ts
```

Expected: FAIL with "Cannot find module './envStore'".

- [ ] **Step 3: Write the implementation**

Create `mobile/src/state/envStore.ts`:

```ts
import { create } from "zustand";

export type Network = "mainnet" | "testnet";

interface EnvState {
  network: Network;
  setNetwork: (n: Network) => void;
  toggleNetwork: () => void;
}

export const useEnvStore = create<EnvState>((set) => ({
  network: "mainnet",
  setNetwork: (network) => set({ network }),
  toggleNetwork: () =>
    set((s) => ({ network: s.network === "mainnet" ? "testnet" : "mainnet" })),
}));
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd /Users/bill/Documents/GitHub/HyperSolid/mobile
npm test -- src/state/envStore.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
cd /Users/bill/Documents/GitHub/HyperSolid
git add mobile/src/state/envStore.ts mobile/src/state/envStore.test.ts
git commit -m "feat(mobile): env store for mainnet/testnet"
```

---

### Task 3: Shared types and injectable interfaces

**Files:**
- Create: `mobile/src/lib/hyperliquid/types.ts`
- Test: none (types only; exercised by later tasks)

- [ ] **Step 1: Write the types**

Create `mobile/src/lib/hyperliquid/types.ts`:

```ts
// Raw shapes mirror @nktkas/hyperliquid responses we consume.
export interface RawAssetMeta {
  name: string;
  szDecimals: number;
  maxLeverage: number;
}
export interface RawMeta {
  universe: RawAssetMeta[];
}
export interface RawAssetCtx {
  midPx: string;
  prevDayPx: string;
  funding: string;
  dayNtlVlm: string;
  openInterest: string;
}
export type MetaAndAssetCtxs = [RawMeta, RawAssetCtx[]];
export type Mids = Record<string, string>;

// Normalized model used throughout the app.
export interface MarketTicker {
  coin: string;
  midPx: number;
  prevDayPx: number;
  changePct: number;
  funding: number;
  dayNtlVlm: number;
  maxLeverage: number;
}

// Subscription handle returned by the SDK.
export interface Subscription {
  unsubscribe(): Promise<void>;
}

// Minimal client interfaces so services can be tested with fakes.
export interface InfoLike {
  metaAndAssetCtxs(): Promise<MetaAndAssetCtxs>;
}
export interface SubsLike {
  allMids(listener: (data: { mids: Mids }) => void): Promise<Subscription>;
}
```

- [ ] **Step 2: Verify it type-checks**

```bash
cd /Users/bill/Documents/GitHub/HyperSolid/mobile
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
cd /Users/bill/Documents/GitHub/HyperSolid
git add mobile/src/lib/hyperliquid/types.ts
git commit -m "feat(mobile): hyperliquid shared types + injectable interfaces"
```

---

### Task 4: Pure normalization (`normalizeMarkets`)

**Files:**
- Create: `mobile/src/lib/hyperliquid/normalize.ts`
- Test: `mobile/src/lib/hyperliquid/normalize.test.ts`

- [ ] **Step 1: Write the failing test**

Create `mobile/src/lib/hyperliquid/normalize.test.ts`:

```ts
import { normalizeMarkets } from "./normalize";
import type { MetaAndAssetCtxs } from "./types";

const sample: MetaAndAssetCtxs = [
  {
    universe: [
      { name: "BTC", szDecimals: 5, maxLeverage: 50 },
      { name: "ETH", szDecimals: 4, maxLeverage: 50 },
    ],
  },
  [
    { midPx: "102", prevDayPx: "100", funding: "0.0001", dayNtlVlm: "500", openInterest: "10" },
    { midPx: "99", prevDayPx: "100", funding: "0.0002", dayNtlVlm: "1500", openInterest: "20" },
  ],
];

describe("normalizeMarkets", () => {
  it("maps universe + ctxs into tickers", () => {
    const out = normalizeMarkets(sample);
    const btc = out.find((t) => t.coin === "BTC")!;
    expect(btc.midPx).toBe(102);
    expect(btc.prevDayPx).toBe(100);
    expect(btc.changePct).toBeCloseTo(2, 5);
    expect(btc.maxLeverage).toBe(50);
  });

  it("computes negative change", () => {
    const eth = normalizeMarkets(sample).find((t) => t.coin === "ETH")!;
    expect(eth.changePct).toBeCloseTo(-1, 5);
  });

  it("sorts by 24h notional volume descending", () => {
    const out = normalizeMarkets(sample);
    expect(out.map((t) => t.coin)).toEqual(["ETH", "BTC"]);
  });

  it("treats prevDayPx of 0 as 0% change (no divide-by-zero)", () => {
    const data: MetaAndAssetCtxs = [
      { universe: [{ name: "NEW", szDecimals: 2, maxLeverage: 3 }] },
      [{ midPx: "5", prevDayPx: "0", funding: "0", dayNtlVlm: "1", openInterest: "0" }],
    ];
    expect(normalizeMarkets(data)[0].changePct).toBe(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd /Users/bill/Documents/GitHub/HyperSolid/mobile
npm test -- src/lib/hyperliquid/normalize.test.ts
```

Expected: FAIL with "Cannot find module './normalize'".

- [ ] **Step 3: Write the implementation**

Create `mobile/src/lib/hyperliquid/normalize.ts`:

```ts
import type { MarketTicker, MetaAndAssetCtxs, Mids } from "./types";

function pctChange(mark: number, prev: number): number {
  if (!prev || !isFinite(prev)) return 0;
  return ((mark - prev) / prev) * 100;
}

export function normalizeMarkets(data: MetaAndAssetCtxs): MarketTicker[] {
  const [meta, ctxs] = data;
  const tickers: MarketTicker[] = meta.universe.map((asset, i) => {
    const ctx = ctxs[i];
    const midPx = Number(ctx?.midPx ?? 0);
    const prevDayPx = Number(ctx?.prevDayPx ?? 0);
    return {
      coin: asset.name,
      midPx,
      prevDayPx,
      changePct: pctChange(midPx, prevDayPx),
      funding: Number(ctx?.funding ?? 0),
      dayNtlVlm: Number(ctx?.dayNtlVlm ?? 0),
      maxLeverage: asset.maxLeverage,
    };
  });
  return tickers.sort((a, b) => b.dayNtlVlm - a.dayNtlVlm);
}

export function applyMids(tickers: MarketTicker[], mids: Mids): MarketTicker[] {
  return tickers.map((t) => {
    const raw = mids[t.coin];
    if (raw === undefined) return t;
    const midPx = Number(raw);
    return { ...t, midPx, changePct: pctChange(midPx, t.prevDayPx) };
  });
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd /Users/bill/Documents/GitHub/HyperSolid/mobile
npm test -- src/lib/hyperliquid/normalize.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
cd /Users/bill/Documents/GitHub/HyperSolid
git add mobile/src/lib/hyperliquid/normalize.ts mobile/src/lib/hyperliquid/normalize.test.ts
git commit -m "feat(mobile): pure normalizeMarkets"
```

---

### Task 5: Pure `applyMids` live-merge

**Files:**
- Modify: `mobile/src/lib/hyperliquid/normalize.ts` (already contains `applyMids` from Task 4)
- Test: `mobile/src/lib/hyperliquid/applyMids.test.ts`

- [ ] **Step 1: Write the failing test**

Create `mobile/src/lib/hyperliquid/applyMids.test.ts`:

```ts
import { applyMids } from "./normalize";
import type { MarketTicker } from "./types";

const base: MarketTicker[] = [
  { coin: "BTC", midPx: 100, prevDayPx: 100, changePct: 0, funding: 0, dayNtlVlm: 9, maxLeverage: 50 },
  { coin: "ETH", midPx: 50, prevDayPx: 50, changePct: 0, funding: 0, dayNtlVlm: 8, maxLeverage: 50 },
];

describe("applyMids", () => {
  it("updates midPx and recomputes changePct for known coins", () => {
    const out = applyMids(base, { BTC: "110" });
    const btc = out.find((t) => t.coin === "BTC")!;
    expect(btc.midPx).toBe(110);
    expect(btc.changePct).toBeCloseTo(10, 5);
  });

  it("leaves coins not present in the update unchanged", () => {
    const out = applyMids(base, { BTC: "110" });
    const eth = out.find((t) => t.coin === "ETH")!;
    expect(eth.midPx).toBe(50);
  });

  it("does not mutate the input array", () => {
    const snapshot = JSON.parse(JSON.stringify(base));
    applyMids(base, { BTC: "999" });
    expect(base).toEqual(snapshot);
  });
});
```

- [ ] **Step 2: Run test to verify it passes (applyMids already implemented in Task 4)**

```bash
cd /Users/bill/Documents/GitHub/HyperSolid/mobile
npm test -- src/lib/hyperliquid/applyMids.test.ts
```

Expected: PASS. (If FAIL, ensure `applyMids` from Task 4, Step 3 exists in `normalize.ts`.)

- [ ] **Step 3: Commit**

```bash
cd /Users/bill/Documents/GitHub/HyperSolid
git add mobile/src/lib/hyperliquid/applyMids.test.ts
git commit -m "test(mobile): applyMids live-merge coverage"
```

---

### Task 6: Pure `resolveIsTestnet`

**Files:**
- Create: `mobile/src/lib/hyperliquid/network.ts`
- Test: `mobile/src/lib/hyperliquid/network.test.ts`

- [ ] **Step 1: Write the failing test**

Create `mobile/src/lib/hyperliquid/network.test.ts`:

```ts
import { resolveIsTestnet } from "./network";

describe("resolveIsTestnet", () => {
  it("maps testnet to true", () => {
    expect(resolveIsTestnet("testnet")).toBe(true);
  });
  it("maps mainnet to false", () => {
    expect(resolveIsTestnet("mainnet")).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd /Users/bill/Documents/GitHub/HyperSolid/mobile
npm test -- src/lib/hyperliquid/network.test.ts
```

Expected: FAIL with "Cannot find module './network'".

- [ ] **Step 3: Write the implementation**

Create `mobile/src/lib/hyperliquid/network.ts`:

```ts
import type { Network } from "../../state/envStore";

export function resolveIsTestnet(network: Network): boolean {
  return network === "testnet";
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd /Users/bill/Documents/GitHub/HyperSolid/mobile
npm test -- src/lib/hyperliquid/network.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
cd /Users/bill/Documents/GitHub/HyperSolid
git add mobile/src/lib/hyperliquid/network.ts mobile/src/lib/hyperliquid/network.test.ts
git commit -m "feat(mobile): resolveIsTestnet"
```

---

### Task 7: SDK client factory (thin, smoke-tested)

**Files:**
- Create: `mobile/src/lib/hyperliquid/client.ts`
- Test: none (network/ESM boundary; covered by the manual smoke test in Task 12)

- [ ] **Step 1: Write the implementation**

Create `mobile/src/lib/hyperliquid/client.ts`:

```ts
import {
  HttpTransport,
  InfoClient,
  SubscriptionClient,
  WebSocketTransport,
} from "@nktkas/hyperliquid";
import type { Network } from "../../state/envStore";
import { resolveIsTestnet } from "./network";
import type { InfoLike, SubsLike } from "./types";

export function createInfoClient(network: Network): InfoLike {
  const transport = new HttpTransport({ isTestnet: resolveIsTestnet(network) });
  return new InfoClient({ transport }) as unknown as InfoLike;
}

export function createSubsClient(network: Network): SubsLike {
  const transport = new WebSocketTransport({ isTestnet: resolveIsTestnet(network) });
  return new SubscriptionClient({ transport }) as unknown as SubsLike;
}
```

- [ ] **Step 2: Verify it type-checks**

```bash
cd /Users/bill/Documents/GitHub/HyperSolid/mobile
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
cd /Users/bill/Documents/GitHub/HyperSolid
git add mobile/src/lib/hyperliquid/client.ts
git commit -m "feat(mobile): hyperliquid client factory"
```

---

### Task 8: Market store

**Files:**
- Create: `mobile/src/state/marketStore.ts`
- Test: `mobile/src/state/marketStore.test.ts`

- [ ] **Step 1: Write the failing test**

Create `mobile/src/state/marketStore.test.ts`:

```ts
import { useMarketStore } from "./marketStore";
import type { MarketTicker } from "../lib/hyperliquid/types";

const tickers: MarketTicker[] = [
  { coin: "BTC", midPx: 100, prevDayPx: 100, changePct: 0, funding: 0, dayNtlVlm: 9, maxLeverage: 50 },
];

describe("marketStore", () => {
  beforeEach(() => {
    useMarketStore.setState({ tickers: [], loading: true, error: null });
  });

  it("setMarkets stores tickers and clears loading", () => {
    useMarketStore.getState().setMarkets(tickers);
    expect(useMarketStore.getState().tickers).toHaveLength(1);
    expect(useMarketStore.getState().loading).toBe(false);
    expect(useMarketStore.getState().error).toBeNull();
  });

  it("mergeMids updates an existing ticker price", () => {
    useMarketStore.getState().setMarkets(tickers);
    useMarketStore.getState().mergeMids({ BTC: "120" });
    expect(useMarketStore.getState().tickers[0].midPx).toBe(120);
  });

  it("setError records the message and clears loading", () => {
    useMarketStore.getState().setError("boom");
    expect(useMarketStore.getState().error).toBe("boom");
    expect(useMarketStore.getState().loading).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd /Users/bill/Documents/GitHub/HyperSolid/mobile
npm test -- src/state/marketStore.test.ts
```

Expected: FAIL with "Cannot find module './marketStore'".

- [ ] **Step 3: Write the implementation**

Create `mobile/src/state/marketStore.ts`:

```ts
import { create } from "zustand";
import type { MarketTicker, Mids } from "../lib/hyperliquid/types";
import { applyMids } from "../lib/hyperliquid/normalize";

interface MarketState {
  tickers: MarketTicker[];
  loading: boolean;
  error: string | null;
  setMarkets: (tickers: MarketTicker[]) => void;
  mergeMids: (mids: Mids) => void;
  setError: (message: string) => void;
  reset: () => void;
}

export const useMarketStore = create<MarketState>((set) => ({
  tickers: [],
  loading: true,
  error: null,
  setMarkets: (tickers) => set({ tickers, loading: false, error: null }),
  mergeMids: (mids) => set((s) => ({ tickers: applyMids(s.tickers, mids) })),
  setError: (message) => set({ error: message, loading: false }),
  reset: () => set({ tickers: [], loading: true, error: null }),
}));
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd /Users/bill/Documents/GitHub/HyperSolid/mobile
npm test -- src/state/marketStore.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
cd /Users/bill/Documents/GitHub/HyperSolid
git add mobile/src/state/marketStore.ts mobile/src/state/marketStore.test.ts
git commit -m "feat(mobile): market store"
```

---

### Task 9: Market data service

**Files:**
- Create: `mobile/src/services/marketData.ts`
- Test: `mobile/src/services/marketData.test.ts`

- [ ] **Step 1: Write the failing test**

Create `mobile/src/services/marketData.test.ts`:

```ts
import { MarketDataService } from "./marketData";
import type {
  InfoLike,
  MetaAndAssetCtxs,
  Subscription,
  SubsLike,
} from "../lib/hyperliquid/types";

const meta: MetaAndAssetCtxs = [
  { universe: [{ name: "BTC", szDecimals: 5, maxLeverage: 50 }] },
  [{ midPx: "102", prevDayPx: "100", funding: "0", dayNtlVlm: "1", openInterest: "0" }],
];

class FakeInfo implements InfoLike {
  metaAndAssetCtxs = jest.fn(async (): Promise<MetaAndAssetCtxs> => meta);
}

class FakeSubs implements SubsLike {
  public listener: ((data: { mids: Record<string, string> }) => void) | null = null;
  public unsub = jest.fn(async () => {});
  allMids = jest.fn(async (l: (data: { mids: Record<string, string> }) => void): Promise<Subscription> => {
    this.listener = l;
    return { unsubscribe: this.unsub };
  });
}

describe("MarketDataService", () => {
  it("loadSnapshot returns normalized tickers", async () => {
    const svc = new MarketDataService(new FakeInfo(), new FakeSubs());
    const tickers = await svc.loadSnapshot();
    expect(tickers[0].coin).toBe("BTC");
    expect(tickers[0].midPx).toBe(102);
  });

  it("subscribeMids forwards mid updates to the callback", async () => {
    const subs = new FakeSubs();
    const svc = new MarketDataService(new FakeInfo(), subs);
    const received: Record<string, string>[] = [];
    await svc.subscribeMids((mids) => received.push(mids));
    subs.listener!({ mids: { BTC: "120" } });
    expect(received).toEqual([{ BTC: "120" }]);
  });

  it("subscribeMids returns a handle that unsubscribes", async () => {
    const subs = new FakeSubs();
    const svc = new MarketDataService(new FakeInfo(), subs);
    const handle = await svc.subscribeMids(() => {});
    await handle.unsubscribe();
    expect(subs.unsub).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd /Users/bill/Documents/GitHub/HyperSolid/mobile
npm test -- src/services/marketData.test.ts
```

Expected: FAIL with "Cannot find module './marketData'".

- [ ] **Step 3: Write the implementation**

Create `mobile/src/services/marketData.ts`:

```ts
import type {
  InfoLike,
  MarketTicker,
  Mids,
  Subscription,
  SubsLike,
} from "../lib/hyperliquid/types";
import { normalizeMarkets } from "../lib/hyperliquid/normalize";

export class MarketDataService {
  constructor(private info: InfoLike, private subs: SubsLike) {}

  async loadSnapshot(): Promise<MarketTicker[]> {
    const data = await this.info.metaAndAssetCtxs();
    return normalizeMarkets(data);
  }

  async subscribeMids(onMids: (mids: Mids) => void): Promise<Subscription> {
    return this.subs.allMids((data) => onMids(data.mids));
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd /Users/bill/Documents/GitHub/HyperSolid/mobile
npm test -- src/services/marketData.test.ts
```

Expected: PASS, 3 tests.

- [ ] **Step 5: Commit**

```bash
cd /Users/bill/Documents/GitHub/HyperSolid
git add mobile/src/services/marketData.ts mobile/src/services/marketData.test.ts
git commit -m "feat(mobile): market data service"
```

---

### Task 10: Presentational components (`PriceText`, `MarketRow`)

**Files:**
- Create: `mobile/src/components/PriceText.tsx`
- Create: `mobile/src/components/MarketRow.tsx`
- Test: `mobile/src/components/MarketRow.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `mobile/src/components/MarketRow.test.tsx`:

```tsx
import React from "react";
import { render } from "@testing-library/react-native";
import { MarketRow } from "./MarketRow";
import { themes } from "../theme/tokens";
import type { MarketTicker } from "../lib/hyperliquid/types";

const t = themes.electrum;
const up: MarketTicker = {
  coin: "BTC", midPx: 62481.5, prevDayPx: 61000, changePct: 2.43,
  funding: 0.0001, dayNtlVlm: 1.2e9, maxLeverage: 50,
};
const down: MarketTicker = { ...up, coin: "ETH", changePct: -0.86 };

describe("MarketRow", () => {
  it("shows coin and formatted price", () => {
    const { getByText } = render(<MarketRow ticker={up} theme={t} />);
    expect(getByText("BTC")).toBeTruthy();
    expect(getByText("62,481.5")).toBeTruthy();
  });

  it("colors positive change with the up token", () => {
    const { getByText } = render(<MarketRow ticker={up} theme={t} />);
    expect(getByText("+2.43%")).toHaveStyle({ color: t.up });
  });

  it("colors negative change with the down token", () => {
    const { getByText } = render(<MarketRow ticker={down} theme={t} />);
    expect(getByText("-0.86%")).toHaveStyle({ color: t.down });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd /Users/bill/Documents/GitHub/HyperSolid/mobile
npm test -- src/components/MarketRow.test.tsx
```

Expected: FAIL with "Cannot find module './MarketRow'".

- [ ] **Step 3: Write `PriceText`**

Create `mobile/src/components/PriceText.tsx`:

```tsx
import React from "react";
import { Text, StyleSheet } from "react-native";

export function formatPrice(n: number): string {
  return n.toLocaleString("en-US", { minimumFractionDigits: 1, maximumFractionDigits: 4 });
}

export function formatPct(n: number): string {
  const sign = n >= 0 ? "+" : "";
  return `${sign}${n.toFixed(2)}%`;
}

export function PriceText({ value, color }: { value: number; color: string }) {
  return <Text style={[styles.num, { color }]}>{formatPrice(value)}</Text>;
}

const styles = StyleSheet.create({
  num: { fontVariant: ["tabular-nums"], fontSize: 16, fontWeight: "500" },
});
```

- [ ] **Step 4: Write `MarketRow`**

Create `mobile/src/components/MarketRow.tsx`:

```tsx
import React from "react";
import { View, Text, StyleSheet } from "react-native";
import type { MarketTicker } from "../lib/hyperliquid/types";
import type { ThemeTokens } from "../theme/tokens";
import { PriceText, formatPct } from "./PriceText";

export function MarketRow({ ticker, theme }: { ticker: MarketTicker; theme: ThemeTokens }) {
  const dirColor = ticker.changePct >= 0 ? theme.up : theme.down;
  return (
    <View style={[styles.row, { borderBottomColor: theme.line }]}>
      <View>
        <Text style={[styles.coin, { color: theme.text }]}>{ticker.coin}</Text>
        <Text style={[styles.sub, { color: theme.muted }]}>
          {`funding ${(ticker.funding * 100).toFixed(3)}%`}
        </Text>
      </View>
      <View style={styles.right}>
        <PriceText value={ticker.midPx} color={theme.text} />
        <Text style={[styles.chg, { color: dirColor }]}>{formatPct(ticker.changePct)}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 13,
    borderBottomWidth: 1,
  },
  coin: { fontSize: 16, fontWeight: "700" },
  sub: { fontSize: 11, marginTop: 3 },
  right: { alignItems: "flex-end" },
  chg: { fontSize: 12, marginTop: 3, fontVariant: ["tabular-nums"] },
});
```

- [ ] **Step 5: Run test to verify it passes**

```bash
cd /Users/bill/Documents/GitHub/HyperSolid/mobile
npm test -- src/components/MarketRow.test.tsx
```

Expected: PASS, 3 tests.

- [ ] **Step 6: Commit**

```bash
cd /Users/bill/Documents/GitHub/HyperSolid
git add mobile/src/components
git commit -m "feat(mobile): PriceText + MarketRow components"
```

---

### Task 11: Markets screen

**Files:**
- Create: `mobile/src/screens/MarketsScreen.tsx`
- Test: `mobile/src/screens/MarketsScreen.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `mobile/src/screens/MarketsScreen.test.tsx`:

```tsx
import React from "react";
import { render } from "@testing-library/react-native";
import { MarketsScreen } from "./MarketsScreen";
import { useMarketStore } from "../state/marketStore";
import type { MarketTicker } from "../lib/hyperliquid/types";

const tickers: MarketTicker[] = [
  { coin: "BTC", midPx: 62481.5, prevDayPx: 61000, changePct: 2.43, funding: 0.0001, dayNtlVlm: 2, maxLeverage: 50 },
  { coin: "ETH", midPx: 3002.18, prevDayPx: 3028, changePct: -0.86, funding: 0.00008, dayNtlVlm: 1, maxLeverage: 50 },
];

describe("MarketsScreen", () => {
  beforeEach(() => useMarketStore.setState({ tickers: [], loading: true, error: null }));

  it("shows a loading state initially", () => {
    const { getByText } = render(<MarketsScreen />);
    expect(getByText(/loading/i)).toBeTruthy();
  });

  it("renders rows once markets load", () => {
    useMarketStore.getState().setMarkets(tickers);
    const { getByText } = render(<MarketsScreen />);
    expect(getByText("BTC")).toBeTruthy();
    expect(getByText("ETH")).toBeTruthy();
  });

  it("shows an error message when set", () => {
    useMarketStore.getState().setError("network down");
    const { getByText } = render(<MarketsScreen />);
    expect(getByText(/network down/i)).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd /Users/bill/Documents/GitHub/HyperSolid/mobile
npm test -- src/screens/MarketsScreen.test.tsx
```

Expected: FAIL with "Cannot find module './MarketsScreen'".

- [ ] **Step 3: Write the implementation**

Create `mobile/src/screens/MarketsScreen.tsx`:

```tsx
import React from "react";
import { View, Text, StyleSheet, ActivityIndicator } from "react-native";
import { FlashList } from "@shopify/flash-list";
import { useMarketStore } from "../state/marketStore";
import { MarketRow } from "../components/MarketRow";
import { themes, defaultTheme } from "../theme/tokens";

export function MarketsScreen() {
  const theme = themes[defaultTheme];
  const { tickers, loading, error } = useMarketStore();

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      <Text style={[styles.title, { color: theme.text }]}>Markets</Text>
      {error ? (
        <Text style={[styles.msg, { color: theme.down }]}>{error}</Text>
      ) : loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={theme.brand} />
          <Text style={[styles.msg, { color: theme.muted }]}>Loading markets…</Text>
        </View>
      ) : (
        <FlashList
          data={tickers}
          keyExtractor={(t) => t.coin}
          estimatedItemSize={64}
          renderItem={({ item }) => <MarketRow ticker={item} theme={theme} />}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 16, paddingTop: 24 },
  title: { fontSize: 24, fontWeight: "700", marginBottom: 12 },
  center: { alignItems: "center", justifyContent: "center", paddingTop: 40 },
  msg: { fontSize: 14, marginTop: 8 },
});
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd /Users/bill/Documents/GitHub/HyperSolid/mobile
npm test -- src/screens/MarketsScreen.test.tsx
```

Expected: PASS, 3 tests. (If FlashList warns about act(), tests still pass.)

- [ ] **Step 5: Commit**

```bash
cd /Users/bill/Documents/GitHub/HyperSolid
git add mobile/src/screens
git commit -m "feat(mobile): markets screen"
```

---

### Task 12: Live data hook + wire the app

**Files:**
- Create: `mobile/src/hooks/useLiveMarkets.ts`
- Test: `mobile/src/hooks/useLiveMarkets.test.ts`
- Modify: `mobile/App.tsx`

- [ ] **Step 1: Write the failing test**

Create `mobile/src/hooks/useLiveMarkets.test.ts`:

```ts
import { renderHook, waitFor } from "@testing-library/react-native";
import { useLiveMarkets } from "./useLiveMarkets";
import { useMarketStore } from "../state/marketStore";
import type { MarketDataService } from "../services/marketData";
import type { MarketTicker, Mids, Subscription } from "../lib/hyperliquid/types";

const tickers: MarketTicker[] = [
  { coin: "BTC", midPx: 100, prevDayPx: 100, changePct: 0, funding: 0, dayNtlVlm: 1, maxLeverage: 50 },
];

function fakeService(midsToPush?: Mids) {
  const unsub = jest.fn(async () => {});
  return {
    loadSnapshot: jest.fn(async () => tickers),
    subscribeMids: jest.fn(async (cb: (m: Mids) => void): Promise<Subscription> => {
      if (midsToPush) cb(midsToPush);
      return { unsubscribe: unsub };
    }),
    _unsub: unsub,
  } as unknown as MarketDataService & { _unsub: jest.Mock };
}

describe("useLiveMarkets", () => {
  beforeEach(() => useMarketStore.setState({ tickers: [], loading: true, error: null }));

  it("loads the snapshot into the store", async () => {
    const svc = fakeService();
    renderHook(() => useLiveMarkets(svc));
    await waitFor(() => expect(useMarketStore.getState().tickers).toHaveLength(1));
    expect(useMarketStore.getState().loading).toBe(false);
  });

  it("merges pushed mids into the store", async () => {
    const svc = fakeService({ BTC: "150" });
    renderHook(() => useLiveMarkets(svc));
    await waitFor(() => expect(useMarketStore.getState().tickers[0]?.midPx).toBe(150));
  });

  it("records an error when the snapshot fails", async () => {
    const svc = {
      loadSnapshot: jest.fn(async () => {
        throw new Error("boom");
      }),
      subscribeMids: jest.fn(),
    } as unknown as MarketDataService;
    renderHook(() => useLiveMarkets(svc));
    await waitFor(() => expect(useMarketStore.getState().error).toMatch(/boom/));
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd /Users/bill/Documents/GitHub/HyperSolid/mobile
npm test -- src/hooks/useLiveMarkets.test.ts
```

Expected: FAIL with "Cannot find module './useLiveMarkets'".

- [ ] **Step 3: Write the implementation**

Create `mobile/src/hooks/useLiveMarkets.ts`:

```ts
import { useEffect } from "react";
import type { MarketDataService } from "../services/marketData";
import { useMarketStore } from "../state/marketStore";
import type { Subscription } from "../lib/hyperliquid/types";

export function useLiveMarkets(service: MarketDataService) {
  useEffect(() => {
    let sub: Subscription | null = null;
    let cancelled = false;

    (async () => {
      try {
        const tickers = await service.loadSnapshot();
        if (cancelled) return;
        useMarketStore.getState().setMarkets(tickers);
        sub = await service.subscribeMids((mids) => {
          useMarketStore.getState().mergeMids(mids);
        });
      } catch (e) {
        if (!cancelled) {
          useMarketStore.getState().setError(e instanceof Error ? e.message : String(e));
        }
      }
    })();

    return () => {
      cancelled = true;
      sub?.unsubscribe().catch(() => {});
    };
  }, [service]);
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd /Users/bill/Documents/GitHub/HyperSolid/mobile
npm test -- src/hooks/useLiveMarkets.test.ts
```

Expected: PASS, 3 tests.

- [ ] **Step 5: Wire the app entry**

Replace the contents of `mobile/App.tsx`:

```tsx
import React, { useMemo } from "react";
import { SafeAreaView, StyleSheet } from "react-native";
import { StatusBar } from "expo-status-bar";
import { MarketsScreen } from "./src/screens/MarketsScreen";
import { useLiveMarkets } from "./src/hooks/useLiveMarkets";
import { MarketDataService } from "./src/services/marketData";
import { createInfoClient, createSubsClient } from "./src/lib/hyperliquid/client";
import { useEnvStore } from "./src/state/envStore";
import { themes, defaultTheme } from "./src/theme/tokens";

export default function App() {
  const network = useEnvStore((s) => s.network);
  const theme = themes[defaultTheme];
  const service = useMemo(
    () => new MarketDataService(createInfoClient(network), createSubsClient(network)),
    [network],
  );
  useLiveMarkets(service);

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: theme.bg }]}>
      <StatusBar style="light" />
      <MarketsScreen />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({ root: { flex: 1 } });
```

- [ ] **Step 6: Run the full test suite**

```bash
cd /Users/bill/Documents/GitHub/HyperSolid/mobile
npm test
```

Expected: PASS, all suites green.

- [ ] **Step 7: Manual smoke test against testnet**

```bash
cd /Users/bill/Documents/GitHub/HyperSolid/mobile
npx expo start
```

In the Expo dev tools, open the app (web build is fastest: press `w`). Expected: after a brief "Loading markets…", a list of perps appears with prices that tick/update. (If web has issues with the WS transport, use the iOS simulator with `i` or Expo Go on device.)

- [ ] **Step 8: Commit**

```bash
cd /Users/bill/Documents/GitHub/HyperSolid
git add mobile/src/hooks mobile/App.tsx
git commit -m "feat(mobile): live markets wiring + app entry"
```

---

## Follow-up plans (out of scope here)

- **Market Detail**: candle chart (`candleSnapshot` + `candle` subscription), orderbook (`l2Book`), recent trades (`trades`).
- **View-only positions**: address input → `clearinghouseState` → positions/PnL.
- **Theme switching UI**: expose A/B/C at runtime + persist with MMKV.
- **Env toggle UI**: surface the existing `envStore` toggle in a settings sheet.

---

## Self-Review

**1. Spec coverage (this slice):** scaffold ✔ (Task 0), theme tokens with brand/semantic separation ✔ (Task 1), mainnet/testnet env ✔ (Tasks 2, 6, 7), live markets list with price/change/funding/volume sort ✔ (Tasks 3–5, 8–12). Market Detail and view-only positions are explicitly deferred to follow-up plans (stated in Scope note) — not gaps.

**2. Placeholder scan:** no TBD/TODO; every code step includes complete, runnable code and exact commands with expected output.

**3. Type consistency:** `MarketTicker`, `Mids`, `MetaAndAssetCtxs`, `InfoLike`, `SubsLike`, `Subscription` are defined once in Task 3 and reused verbatim. Store methods (`setMarkets`, `mergeMids`, `setError`, `reset`) match between Task 8 implementation and its consumers in Tasks 11–12. Service methods (`loadSnapshot`, `subscribeMids`) match between Task 9 and the hook in Task 12. `resolveIsTestnet` (Task 6) is consumed by the client factory (Task 7). `themes`/`ThemeTokens`/`defaultTheme` (Task 1) are consumed by components/screen (Tasks 10–12).
