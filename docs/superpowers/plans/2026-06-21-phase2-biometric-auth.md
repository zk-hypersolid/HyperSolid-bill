# Phase 2 — 钱包生物识别 / 会话解锁 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 给本地钱包接入生物识别「会话解锁」鉴权，并修复冷启动后钱包从内存丢失的缺陷。

**Architecture:** 新增 `BiometricGate`（封装 `expo-local-authentication`，注入式可测）、`authStore`（锁定状态机，与 `walletStore` 分离）、`useAutoLock`（AppState 监听冷启动/后台/空闲超时触发锁定）、`LockScreen`（解锁门禁 UI），并在根组件接入。解锁成功 → `WalletManager.loadWallet()` → 写入 `walletStore`；锁定 → `walletStore.reset()`。签名仍由既有 `LocalWalletService`(viem) 执行，本切片只加门禁与会话。

**Tech Stack:** Expo SDK 56 · React Native 0.85 · TypeScript · Zustand v5 · `expo-local-authentication@56` · `expo-secure-store` · Jest（jest-expo）+ @testing-library/react-native v14。

**权威设计：** `docs/superpowers/specs/2026-06-21-phase2-biometric-auth-design.md`。**写任何 Expo/RN 代码前先读 `mobile/AGENTS.md` 与 https://docs.expo.dev/versions/v56.0.0/。**

**纪律：** TDD（先写失败测试）；颜色只用 `theme/tokens.ts` token、禁硬编码十六进制色与 emoji；不改 `services/`/`lib/` 下单逻辑；每个 Task 末尾质量门 `cd mobile && npx tsc --noEmit` 零错 + `npx jest` 全绿（≥ 166 + 新增）。所有命令在 `mobile/` 下执行。

---

## File Structure

- Create `mobile/src/wallet/biometricGate.ts` — 封装 expo-local-authentication（可用性检测 + 鉴权 + 设备口令回退）
- Create `mobile/src/wallet/biometricGate.test.ts`
- Create `mobile/src/state/authStore.ts` — 锁定状态机（`unknown|noWallet|locked|unlocked`）
- Create `mobile/src/state/authStore.test.ts`
- Create `mobile/src/wallet/sessionController.ts` — 编排：解锁→loadWallet→walletStore；锁定→reset（把 store 间副作用集中，便于测试）
- Create `mobile/src/wallet/sessionController.test.ts`
- Create `mobile/src/wallet/useAutoLock.ts` — AppState/超时 → lock
- Create `mobile/src/wallet/useAutoLock.test.tsx`
- Create `mobile/src/screens/LockScreen.tsx` — 解锁门禁 UI
- Create `mobile/src/screens/LockScreen.test.tsx`
- Modify `mobile/App.tsx` — 接入启动门禁（locked → LockScreen）
- Modify `mobile/app.json` — 增 `expo-local-authentication` 插件 + iOS faceID 文案

---

### Task 1: BiometricGate — 可用性检测

**Files:**
- Create: `mobile/src/wallet/biometricGate.ts`
- Test: `mobile/src/wallet/biometricGate.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// mobile/src/wallet/biometricGate.test.ts
import { BiometricGate } from "./biometricGate";

function mockLA(over: Partial<Record<string, unknown>> = {}) {
  return {
    hasHardwareAsync: jest.fn().mockResolvedValue(true),
    isEnrolledAsync: jest.fn().mockResolvedValue(true),
    supportedAuthenticationTypesAsync: jest.fn().mockResolvedValue([1, 2]),
    authenticateAsync: jest.fn().mockResolvedValue({ success: true }),
    ...over,
  };
}

describe("BiometricGate.isAvailable", () => {
  it("reports available when hardware present and enrolled", async () => {
    const gate = new BiometricGate(mockLA() as never);
    expect(await gate.isAvailable()).toEqual({
      hasHardware: true,
      isEnrolled: true,
      supportedTypes: [1, 2],
    });
  });

  it("reports not enrolled when no biometric is set up", async () => {
    const gate = new BiometricGate(mockLA({ isEnrolledAsync: jest.fn().mockResolvedValue(false) }) as never);
    expect((await gate.isAvailable()).isEnrolled).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd mobile && npx jest src/wallet/biometricGate.test.ts`
Expected: FAIL — `Cannot find module './biometricGate'`.

- [ ] **Step 3: Write minimal implementation**

```ts
// mobile/src/wallet/biometricGate.ts
export interface LocalAuthLike {
  hasHardwareAsync(): Promise<boolean>;
  isEnrolledAsync(): Promise<boolean>;
  supportedAuthenticationTypesAsync(): Promise<number[]>;
  authenticateAsync(opts: {
    promptMessage: string;
    disableDeviceFallback?: boolean;
    cancelLabel?: string;
  }): Promise<{ success: boolean; error?: string; warning?: string }>;
}

export interface BiometricAvailability {
  hasHardware: boolean;
  isEnrolled: boolean;
  supportedTypes: number[];
}

export type AuthResult = "success" | "failed" | "unavailable" | "cancelled";

export class BiometricGate {
  constructor(private la: LocalAuthLike) {}

  async isAvailable(): Promise<BiometricAvailability> {
    const [hasHardware, isEnrolled, supportedTypes] = await Promise.all([
      this.la.hasHardwareAsync(),
      this.la.isEnrolledAsync(),
      this.la.supportedAuthenticationTypesAsync(),
    ]);
    return { hasHardware, isEnrolled, supportedTypes };
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd mobile && npx jest src/wallet/biometricGate.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add mobile/src/wallet/biometricGate.ts mobile/src/wallet/biometricGate.test.ts
git commit -m "feat(wallet): BiometricGate 可用性检测" -m "Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

### Task 2: BiometricGate — authenticate 分支

**Files:**
- Modify: `mobile/src/wallet/biometricGate.ts`
- Test: `mobile/src/wallet/biometricGate.test.ts`

- [ ] **Step 1: Write the failing test (append)**

```ts
describe("BiometricGate.authenticate", () => {
  it("returns 'unavailable' when no hardware or not enrolled (no prompt)", async () => {
    const la = mockLA({ isEnrolledAsync: jest.fn().mockResolvedValue(false) });
    const gate = new BiometricGate(la as never);
    expect(await gate.authenticate({ reason: "解锁钱包" })).toBe("unavailable");
    expect(la.authenticateAsync).not.toHaveBeenCalled();
  });

  it("returns 'success' on successful auth and passes the reason + device fallback", async () => {
    const la = mockLA();
    const gate = new BiometricGate(la as never);
    expect(await gate.authenticate({ reason: "解锁钱包" })).toBe("success");
    expect(la.authenticateAsync).toHaveBeenCalledWith(
      expect.objectContaining({ promptMessage: "解锁钱包", disableDeviceFallback: false }),
    );
  });

  it("maps user_cancel to 'cancelled'", async () => {
    const la = mockLA({ authenticateAsync: jest.fn().mockResolvedValue({ success: false, error: "user_cancel" }) });
    const gate = new BiometricGate(la as never);
    expect(await gate.authenticate({ reason: "x" })).toBe("cancelled");
  });

  it("maps other failures to 'failed'", async () => {
    const la = mockLA({ authenticateAsync: jest.fn().mockResolvedValue({ success: false, error: "lockout" }) });
    const gate = new BiometricGate(la as never);
    expect(await gate.authenticate({ reason: "x" })).toBe("failed");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd mobile && npx jest src/wallet/biometricGate.test.ts`
Expected: FAIL — `gate.authenticate is not a function`.

- [ ] **Step 3: Add the method**

Append inside `class BiometricGate`:

```ts
  async authenticate(opts: { reason: string; forceReauth?: boolean }): Promise<AuthResult> {
    const avail = await this.isAvailable();
    if (!avail.hasHardware || !avail.isEnrolled) return "unavailable";
    const res = await this.la.authenticateAsync({
      promptMessage: opts.reason,
      disableDeviceFallback: false,
      cancelLabel: "取消",
    });
    if (res.success) return "success";
    return res.error === "user_cancel" ? "cancelled" : "failed";
  }
```

> 注：`forceReauth` 当前不改变行为，为未来高危操作（提现/approveAgent，ADR-002）预留接口位，不留返工。

- [ ] **Step 4: Run test to verify it passes**

Run: `cd mobile && npx jest src/wallet/biometricGate.test.ts`
Expected: PASS (6 tests total).

- [ ] **Step 5: Commit**

```bash
git add mobile/src/wallet/biometricGate.ts mobile/src/wallet/biometricGate.test.ts
git commit -m "feat(wallet): BiometricGate.authenticate 分支映射 + 设备口令回退" -m "Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

### Task 3: authStore 锁定状态机

**Files:**
- Create: `mobile/src/state/authStore.ts`
- Test: `mobile/src/state/authStore.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// mobile/src/state/authStore.test.ts
import { useAuthStore } from "./authStore";

beforeEach(() => useAuthStore.setState({ status: "unknown", lastActiveAt: 0 }));

describe("authStore", () => {
  it("evaluate -> noWallet when no wallet persisted", async () => {
    await useAuthStore.getState().evaluate(async () => false);
    expect(useAuthStore.getState().status).toBe("noWallet");
  });

  it("evaluate -> locked when a wallet exists", async () => {
    await useAuthStore.getState().evaluate(async () => true);
    expect(useAuthStore.getState().status).toBe("locked");
  });

  it("unlock sets status to unlocked and stamps lastActiveAt", () => {
    useAuthStore.getState().unlock();
    expect(useAuthStore.getState().status).toBe("unlocked");
    expect(useAuthStore.getState().lastActiveAt).toBeGreaterThan(0);
  });

  it("lock returns to locked", () => {
    useAuthStore.getState().unlock();
    useAuthStore.getState().lock();
    expect(useAuthStore.getState().status).toBe("locked");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd mobile && npx jest src/state/authStore.test.ts`
Expected: FAIL — `Cannot find module './authStore'`.

- [ ] **Step 3: Write minimal implementation**

```ts
// mobile/src/state/authStore.ts
import { create } from "zustand";

export type AuthStatus = "unknown" | "noWallet" | "locked" | "unlocked";

interface AuthState {
  status: AuthStatus;
  lastActiveAt: number;
  evaluate: (hasWallet: () => Promise<boolean>) => Promise<void>;
  unlock: () => void;
  lock: () => void;
  touch: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  status: "unknown",
  lastActiveAt: 0,
  evaluate: async (hasWallet) => set({ status: (await hasWallet()) ? "locked" : "noWallet" }),
  unlock: () => set({ status: "unlocked", lastActiveAt: Date.now() }),
  lock: () => set({ status: "locked" }),
  touch: () => set({ lastActiveAt: Date.now() }),
}));
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd mobile && npx jest src/state/authStore.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add mobile/src/state/authStore.ts mobile/src/state/authStore.test.ts
git commit -m "feat(state): authStore 锁定状态机" -m "Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

### Task 4: sessionController — 解锁/锁定编排

**Files:**
- Create: `mobile/src/wallet/sessionController.ts`
- Test: `mobile/src/wallet/sessionController.test.ts`

集中「解锁成功 → loadWallet → walletStore.setLocalWallet → authStore.unlock」与「锁定 → walletStore.reset → authStore.lock」的跨 store 副作用，保持 UI 薄、可测。

- [ ] **Step 1: Write the failing test**

```ts
// mobile/src/wallet/sessionController.test.ts
import { unlockSession, lockSession } from "./sessionController";
import { useAuthStore } from "../state/authStore";
import { useWalletStore } from "../state/walletStore";
import type { WalletService } from "./types";

const fakeWallet = { getAddress: () => "0xabc" } as unknown as WalletService;

beforeEach(() => {
  useAuthStore.setState({ status: "locked", lastActiveAt: 0 });
  useWalletStore.setState({ mode: "none", wallet: null, address: null });
});

describe("sessionController", () => {
  it("unlockSession: on success loads wallet into store and unlocks", async () => {
    const gate = { authenticate: jest.fn().mockResolvedValue("success") };
    const manager = { loadWallet: jest.fn().mockResolvedValue(fakeWallet) };
    const r = await unlockSession(gate as never, manager as never);
    expect(r).toBe("success");
    expect(useWalletStore.getState().wallet).toBe(fakeWallet);
    expect(useAuthStore.getState().status).toBe("unlocked");
  });

  it("unlockSession: on failed auth keeps locked and loads nothing", async () => {
    const gate = { authenticate: jest.fn().mockResolvedValue("failed") };
    const manager = { loadWallet: jest.fn() };
    const r = await unlockSession(gate as never, manager as never);
    expect(r).toBe("failed");
    expect(manager.loadWallet).not.toHaveBeenCalled();
    expect(useAuthStore.getState().status).toBe("locked");
  });

  it("lockSession: clears in-memory wallet and locks", () => {
    useWalletStore.setState({ mode: "local", wallet: fakeWallet, address: "0xabc" });
    useAuthStore.setState({ status: "unlocked", lastActiveAt: 1 });
    lockSession();
    expect(useWalletStore.getState().wallet).toBeNull();
    expect(useAuthStore.getState().status).toBe("locked");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd mobile && npx jest src/wallet/sessionController.test.ts`
Expected: FAIL — `Cannot find module './sessionController'`.

- [ ] **Step 3: Write minimal implementation**

```ts
// mobile/src/wallet/sessionController.ts
import { useAuthStore } from "../state/authStore";
import { useWalletStore } from "../state/walletStore";
import type { BiometricGate, AuthResult } from "./biometricGate";
import type { WalletManager } from "./walletManager";

const UNLOCK_REASON = "解锁 HyperSolid 钱包";

export async function unlockSession(gate: BiometricGate, manager: WalletManager): Promise<AuthResult> {
  const result = await gate.authenticate({ reason: UNLOCK_REASON });
  if (result !== "success") return result;
  const wallet = await manager.loadWallet();
  if (!wallet) return "failed";
  useWalletStore.getState().setLocalWallet(wallet);
  useAuthStore.getState().unlock();
  return "success";
}

export function lockSession(): void {
  useWalletStore.getState().reset();
  useAuthStore.getState().lock();
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd mobile && npx jest src/wallet/sessionController.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add mobile/src/wallet/sessionController.ts mobile/src/wallet/sessionController.test.ts
git commit -m "feat(wallet): sessionController 解锁/锁定跨 store 编排" -m "Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

### Task 5: useAutoLock — 后台/超时锁定

**Files:**
- Create: `mobile/src/wallet/useAutoLock.ts`
- Test: `mobile/src/wallet/useAutoLock.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
// mobile/src/wallet/useAutoLock.test.tsx
import React from "react";
import { render } from "@testing-library/react-native";
import { AppState } from "react-native";
import { shouldLock } from "./useAutoLock";

describe("shouldLock", () => {
  it("locks when idle longer than timeout", () => {
    expect(shouldLock({ lastActiveAt: 0, now: 6 * 60_000, timeoutMs: 5 * 60_000 })).toBe(true);
  });
  it("does not lock within timeout", () => {
    expect(shouldLock({ lastActiveAt: 0, now: 60_000, timeoutMs: 5 * 60_000 })).toBe(false);
  });
});

describe("useAutoLock", () => {
  it("subscribes to AppState changes", () => {
    const spy = jest.spyOn(AppState, "addEventListener");
    const { useAutoLock } = require("./useAutoLock");
    function Probe() {
      useAutoLock();
      return null;
    }
    render(<Probe />);
    expect(spy).toHaveBeenCalledWith("change", expect.any(Function));
    spy.mockRestore();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd mobile && npx jest src/wallet/useAutoLock.test.tsx`
Expected: FAIL — `Cannot find module './useAutoLock'`.

- [ ] **Step 3: Write minimal implementation**

```tsx
// mobile/src/wallet/useAutoLock.ts
import { useEffect } from "react";
import { AppState, type AppStateStatus } from "react-native";
import { useAuthStore } from "../state/authStore";
import { lockSession } from "./sessionController";

export const IDLE_TIMEOUT_MS = 5 * 60_000;

export function shouldLock(p: { lastActiveAt: number; now: number; timeoutMs: number }): boolean {
  return p.now - p.lastActiveAt > p.timeoutMs;
}

/** Locks the session when the app returns to foreground after exceeding the idle timeout. */
export function useAutoLock(timeoutMs: number = IDLE_TIMEOUT_MS): void {
  useEffect(() => {
    const sub = AppState.addEventListener("change", (next: AppStateStatus) => {
      const { status, lastActiveAt, touch } = useAuthStore.getState();
      if (status !== "unlocked") return;
      if (next === "active") {
        if (shouldLock({ lastActiveAt, now: Date.now(), timeoutMs })) lockSession();
        else touch();
      } else {
        touch();
      }
    });
    return () => sub.remove();
  }, [timeoutMs]);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd mobile && npx jest src/wallet/useAutoLock.test.tsx`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add mobile/src/wallet/useAutoLock.ts mobile/src/wallet/useAutoLock.test.tsx
git commit -m "feat(wallet): useAutoLock 后台/空闲超时锁定" -m "Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

### Task 6: LockScreen 解锁 UI

**Files:**
- Create: `mobile/src/screens/LockScreen.tsx`
- Test: `mobile/src/screens/LockScreen.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
// mobile/src/screens/LockScreen.test.tsx
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react-native";
import { LockScreen } from "./LockScreen";

describe("LockScreen", () => {
  it("renders the unlock prompt and triggers onUnlock", async () => {
    const onUnlock = jest.fn().mockResolvedValue("success");
    render(<LockScreen onUnlock={onUnlock} />);
    expect(screen.getByText("HyperSolid 已锁定")).toBeTruthy();
    fireEvent.press(screen.getByText("解锁"));
    await waitFor(() => expect(onUnlock).toHaveBeenCalled());
  });

  it("shows an error message when unlock fails", async () => {
    const onUnlock = jest.fn().mockResolvedValue("failed");
    render(<LockScreen onUnlock={onUnlock} />);
    fireEvent.press(screen.getByText("解锁"));
    await waitFor(() => expect(screen.getByText(/验证失败/)).toBeTruthy());
  });

  it("guides the user when biometrics are unavailable", async () => {
    const onUnlock = jest.fn().mockResolvedValue("unavailable");
    render(<LockScreen onUnlock={onUnlock} />);
    fireEvent.press(screen.getByText("解锁"));
    await waitFor(() => expect(screen.getByText(/请在系统设置中启用/)).toBeTruthy());
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd mobile && npx jest src/screens/LockScreen.test.tsx`
Expected: FAIL — `Cannot find module './LockScreen'`.

- [ ] **Step 3: Write minimal implementation**

```tsx
// mobile/src/screens/LockScreen.tsx
import React, { useState } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { useTheme } from "../theme/useTheme";
import { Icon } from "../components/Icon";
import type { AuthResult } from "../wallet/biometricGate";

export function LockScreen({ onUnlock }: { onUnlock: () => Promise<AuthResult> }) {
  const theme = useTheme();
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handle() {
    setBusy(true);
    setMsg(null);
    const r = await onUnlock();
    setBusy(false);
    if (r === "failed") setMsg("验证失败，请重试");
    else if (r === "cancelled") setMsg("已取消");
    else if (r === "unavailable") setMsg("未检测到生物识别，请在系统设置中启用 Face ID/指纹或设备口令");
  }

  return (
    <View style={[styles.root, { backgroundColor: theme.bg }]}>
      <Icon name="lock" color={theme.brand} size={48} />
      <Text style={[styles.title, { color: theme.text }]}>HyperSolid 已锁定</Text>
      <Text style={[styles.sub, { color: theme.muted }]}>用生物识别解锁以继续</Text>
      {msg ? <Text style={[styles.msg, { color: theme.down }]}>{msg}</Text> : null}
      <Pressable
        accessibilityRole="button"
        disabled={busy}
        onPress={handle}
        style={[styles.btn, { backgroundColor: theme.brand }]}
      >
        <Text style={[styles.btnText, { color: theme.bg }]}>解锁</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24, gap: 12 },
  title: { fontSize: 20, fontWeight: "700" },
  sub: { fontSize: 13 },
  msg: { fontSize: 13, textAlign: "center" },
  btn: { marginTop: 12, paddingVertical: 13, paddingHorizontal: 40, borderRadius: 10 },
  btnText: { fontSize: 15, fontWeight: "700" },
});
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd mobile && npx jest src/screens/LockScreen.test.tsx`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add mobile/src/screens/LockScreen.tsx mobile/src/screens/LockScreen.test.tsx
git commit -m "feat(screen): LockScreen 解锁门禁 UI" -m "Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

### Task 7: 根组件接入启动门禁 + 修复重新水合

**Files:**
- Modify: `mobile/App.tsx`

把启动判定（`evaluate`）、锁屏门禁、自动锁定接进根组件。`evaluate` 用 `WalletManager.hasWallet()` 修复「冷启动后钱包丢失」缺陷。

- [ ] **Step 1: Read current App.tsx**

Run: `sed -n '1,40p' mobile/App.tsx` — 确认现有 `SafeAreaProvider`/`NavigationContainer`/`RootNavigator` 结构。

- [ ] **Step 2: Modify App.tsx**

在 `App.tsx` 顶部组件内接入门禁（替换 `return (...)` 包裹层；保留既有 `useLiveMarkets` 等）：

```tsx
import React, { useEffect, useMemo, useState } from "react";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { NavigationContainer } from "@react-navigation/native";
import { RootNavigator } from "./src/navigation/RootNavigator";
import { LockScreen } from "./src/screens/LockScreen";
import { useLiveMarkets } from "./src/hooks/useLiveMarkets";
import { MarketDataService } from "./src/services/marketData";
import { createInfoClient, createSubsClient } from "./src/lib/hyperliquid/client";
import { useEnvStore } from "./src/state/envStore";
import { useAuthStore } from "./src/state/authStore";
import { useAutoLock } from "./src/wallet/useAutoLock";
import { unlockSession } from "./src/wallet/sessionController";
import { BiometricGate } from "./src/wallet/biometricGate";
import { WalletManager } from "./src/wallet/walletManager";
import { SecureStoreKeyStore } from "./src/wallet/secureKeyStore";
import * as LocalAuthentication from "expo-local-authentication";

export default function App() {
  const network = useEnvStore((s) => s.network);
  const service = useMemo(
    () => new MarketDataService(createInfoClient(network), createSubsClient(network)),
    [network],
  );
  useLiveMarkets(service);
  useAutoLock();

  const status = useAuthStore((s) => s.status);
  const manager = useMemo(() => new WalletManager(new SecureStoreKeyStore()), []);
  const gate = useMemo(() => new BiometricGate(LocalAuthentication), []);

  useEffect(() => {
    useAuthStore.getState().evaluate(() => manager.hasWallet());
  }, [manager]);

  const locked = status === "locked";

  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      {locked ? (
        <LockScreen onUnlock={() => unlockSession(gate, manager)} />
      ) : (
        <NavigationContainer>
          <RootNavigator />
        </NavigationContainer>
      )}
    </SafeAreaProvider>
  );
}
```

> `status === "unknown"`（evaluate 进行中）与 `"noWallet"`/`"unlocked"` 均渲染正常 App；仅 `"locked"` 显示锁屏。onboarding（`noWallet`）仍由 Account 屏处理（Phase 1 已有）。

- [ ] **Step 3: Typecheck**

Run: `cd mobile && npx tsc --noEmit`
Expected: 零错误。

- [ ] **Step 4: Full test suite**

Run: `cd mobile && npx jest`
Expected: PASS，全绿（≥ 166 + 新增）。

- [ ] **Step 5: Commit**

```bash
git add mobile/App.tsx
git commit -m "feat(app): 启动生物识别门禁 + 修复冷启动钱包重新水合" -m "Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

### Task 8: app.json 配置插件 + iOS Face ID 文案

**Files:**
- Modify: `mobile/app.json`

- [ ] **Step 1: Read current plugins**

Run: `grep -n -A4 '"plugins"' mobile/app.json` — 当前仅 `expo-secure-store`。

- [ ] **Step 2: Modify app.json plugins**

把 `"plugins": ["expo-secure-store"]` 替换为：

```json
    "plugins": [
      "expo-secure-store",
      [
        "expo-local-authentication",
        {
          "faceIDPermission": "使用 Face ID 解锁你的 HyperSolid 钱包并对交易签名。"
        }
      ]
    ],
```

> 该配置插件会在原生构建时写入 iOS `NSFaceIDUsageDescription`（缺失会导致 Face ID 运行时崩溃，spec §5.5）。

- [ ] **Step 3: Validate JSON**

Run: `cd mobile && node -e "JSON.parse(require('fs').readFileSync('app.json','utf8')); console.log('valid')"`
Expected: `valid`。

- [ ] **Step 4: Verify expo config resolves the plugin**

Run: `cd mobile && npx expo config --type public > /dev/null && echo OK`
Expected: `OK`（无插件解析报错）。

- [ ] **Step 5: Commit**

```bash
git add mobile/app.json
git commit -m "chore(expo): 接入 expo-local-authentication 插件 + Face ID 文案" -m "Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

### Task 9: 收尾验证

**Files:** 无新增（验证 + grep gate）。

- [ ] **Step 1: Full typecheck + tests**

Run: `cd mobile && npx tsc --noEmit && npx jest`
Expected: tsc 零错；jest 全绿（≥ 166 + 本切片新增）。

- [ ] **Step 2: Grep gate（改动源无硬编码色/emoji）**

Run:
```bash
cd mobile/src && grep -rnE "#[0-9A-Fa-f]{3,8}" wallet/biometricGate.ts wallet/sessionController.ts wallet/useAutoLock.ts state/authStore.ts screens/LockScreen.tsx || echo "NONE"
```
Expected: `NONE`（LockScreen 仅用 theme token）。

- [ ] **Step 3: 自检对照 spec**

对照 `docs/superpowers/specs/2026-06-21-phase2-biometric-auth-design.md` §4 数据流逐项核对：冷启动判定 → 锁屏 → 解锁 → loadWallet → store；后台/超时锁定清内存。

- [ ] **Step 4: Final commit（若有收尾改动）**

```bash
git add -A && git commit -m "test(wallet): Phase 2 生物识别切片收尾验证" -m "Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>" || echo "nothing to commit"
```

---

## Self-Review

**Spec coverage：**
- §3.1 BiometricGate → Task 1–2 ✅
- §3.2 authStore → Task 3 ✅
- §3.3 自动锁定 → Task 5 ✅；跨 store 编排 → Task 4（sessionController）✅
- §3.4 LockScreen → Task 6 ✅；根组件接入 + 重新水合缺陷修复 → Task 7 ✅
- §3.5 app.json 配置插件 → Task 8 ✅
- §5 错误处理（unavailable/failed/cancelled 引导）→ Task 2 + Task 6 ✅
- §6 测试策略 → 各 Task 的 TDD 步骤 + Task 9 收尾 ✅
- §8 假设（会话解锁 A / forceReauth 预留 / 5 分钟超时 / 设备口令回退 / 范围）→ 均体现在 Task 2/4/5 ✅

**Placeholder scan：** 无 TBD/TODO/“稍后实现”；每个代码步骤含完整代码与确切命令/预期输出。

**Type consistency：** `AuthResult`（biometricGate）在 sessionController/LockScreen 一致复用；`unlockSession(gate, manager)`/`lockSession()`/`shouldLock(...)`/`useAutoLock()`/`authStore` 动作名（`evaluate/unlock/lock/touch`）跨 Task 一致；`WalletManager.hasWallet/loadWallet`、`walletStore.setLocalWallet/reset` 均为既有 API（已核查源码）。

**范围：** 聚焦生物识别/会话/重新水合单一子系统，可独立交付与测试；approveAgent/approveBuilderFee/入金为后续独立计划。
