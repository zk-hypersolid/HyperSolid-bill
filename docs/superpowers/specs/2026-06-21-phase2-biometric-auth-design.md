# Phase 2 — 钱包生物识别 / 会话解锁 设计方案

> 日期：2026-06-21 · 状态：评审稿（draft，待用户审阅）
> 范围：Phase 2 的「生物识别接线 + 会话解锁 + 启动重新水合」子切片。
> 权威来源：spec《2026-06-17-hypersolid-design.md》§5.4/§5.5、ADR-011/ADR-002；本文是其端上落地视图。
> **决策模式说明**：本设计在用户不在场时按自主决策推进，关键取舍均在 §8「假设与待确认」列出，供用户审阅时确认/否决。

---

## 1. 目标与背景

**目标**：把 `expo-local-authentication` 接入本地钱包（ADR-011 Passkey 本地主推），实现「生物识别解锁 → 会话内签名 → 自动锁定」的安全且顺滑的鉴权流，并修复**启动后钱包丢失**的现存缺陷。

**现状（已核查代码）**：
- `SecureStoreKeyStore` 已用 `requireAuthentication: true`：OS 层在**每次读取助记词**时弹生物识别。
- `expo-local-authentication@56.0.4` **已安装但 `src` 从未引用**。
- **缺陷**：`WalletManager.loadWallet()` 仅在测试中调用，App 启动时**未重新水合** → 冷启动后 `walletStore.wallet` 为 `null`，用户「看似退出登录」（助记词其实仍在 SecureStore）。
- `walletStore` 仅在内存持有 wallet，**无锁定/会话概念、无自动锁定**。
- `app.json` plugins 仅含 `expo-secure-store`，**缺** `expo-local-authentication` 配置插件与 iOS `NSFaceIDUsageDescription`（缺失会导致 Face ID 崩溃）。

**不在本切片范围**（各自后续 spec/plan）：approveAgent、approveBuilderFee、入金引导、Privy 适配、iCloud/云备份。

---

## 2. 核心设计决策

**门禁粒度 = 会话解锁（A）+ 为高危操作预留强制再验的接口（C 为终态）**

- 不再让「每次签名都触发 SecureStore 生物识别」（体验差、连续下单反复弹脸）。
- 改为：**显式解锁一次** → 助记词解密、`LocalWalletService` 留在内存供本会话签名 → **自动锁定**（冷启动 / 后台 / 空闲超时）后需重新解锁。
- 鉴权接口设计为 `authenticate({ reason, forceReauth })`，`forceReauth` 预留给未来「提现 / approveAgent」等高危主钱包操作（spec ADR-002 两层授权），本切片不实现高危再验 UI，但**不留返工**。

**为什么不用 SecureStore 的 per-read 生物识别做主门禁**：它无法表达「解锁一次、会话内复用」，且每签必弹；显式 `LocalAuthentication` 给我们「可用性/录入检测 + 设备口令回退 + 会话/锁定 UX + Android Class 3 弱生物识别处理」的控制力（spec §5.5）。SecureStore 的 `requireAuthentication` 仍作为**储存层的硬件门禁底座**保留（解锁那一刻读取助记词时仍受硬件保护）。

---

## 3. 架构与单元

新增 3 个职责清晰、可独立测试的单元，复用既有 `WalletManager`/`KeyStore`：

### 3.1 `BiometricGate`（`src/wallet/biometricGate.ts`）
封装 `expo-local-authentication`，把不可测的原生模块注入化。
- 接口：
  - `isAvailable(): Promise<BiometricAvailability>` — `{ hasHardware, isEnrolled, supportedTypes }`
  - `authenticate(opts: { reason: string; forceReauth?: boolean }): Promise<AuthResult>` — `'success' | 'failed' | 'unavailable' | 'cancelled'`
- 依赖：`LocalAuthentication`（构造注入，测试用 mock）。
- 设备口令回退：`disableDeviceFallback: false`（无生物识别但有设备口令时仍可解锁，spec §5.5）。

### 3.2 `authStore`（`src/state/authStore.ts`，Zustand）
会话锁定状态机（与 `walletStore` 分离，单一职责）。
- 状态：`status: 'unknown' | 'noWallet' | 'locked' | 'unlocked'`、`lastActiveAt`。
- 动作：`evaluate()`（启动判定 hasWallet）、`unlock()`、`lock()`、`touch()`（刷新活跃时间）。
- 不直接持私钥；解锁成功后由编排逻辑把 `LocalWalletService` 写入 `walletStore`，锁定时 `walletStore.reset()`（清内存 wallet）。

### 3.3 自动锁定编排（`src/wallet/useAutoLock.ts` hook）
- 监听 `AppState`：进入 `background` → 记录时间；回到 `active` 且距上次活跃 > 超时（默认 5 分钟，常量可配）→ `lock()`。
- 冷启动：`authStore.status` 初始 `unknown` → `evaluate()` → 有钱包则 `locked`（强制解锁）。

### 3.4 启动门禁 UI（`LockScreen` + 接入根组件）
- 根据 `authStore.status` 渲染：`locked` → 锁屏（「使用 Face ID / 指纹解锁」按钮 + 解锁失败重试 + 设备无生物识别时的引导文案）；`unlocked`/`noWallet` → 正常 App。
- 复用 Phase 1 的 `ScreenScaffold` / `Icon`(`lock`) / 主题 token。

### 3.5 配置接线（`app.json`）
- 增加 `expo-local-authentication` 配置插件，设置 iOS `faceIDPermission`（→ `NSFaceIDUsageDescription`）。

---

## 4. 数据流

```
冷启动
  └─ authStore.evaluate() ─ hasWallet? ─ 否 ─▶ status=noWallet（走 onboarding，Phase 1 已有）
                                       └ 是 ─▶ status=locked ─▶ LockScreen
LockScreen「解锁」
  └─ BiometricGate.authenticate({reason}) ─ success ─▶ WalletManager.loadWallet()
        └─ walletStore.setLocalWallet(wallet) + authStore.unlock() ─▶ 正常 App
     ─ failed/cancelled ─▶ 留在 LockScreen + 错误提示 + 重试
     ─ unavailable ─▶ 引导文案（设置设备生物识别/口令）

签名（下单等，Phase 3 调用）
  └─ 要求 status=unlocked；wallet 已在内存 ─▶ 直接签名（不再弹生物识别）
  └─ touch() 刷新活跃时间

进入后台 / 空闲超时
  └─ useAutoLock ─▶ authStore.lock() + walletStore.reset()（清内存 wallet；助记词仍安全存 SecureStore）
```

---

## 5. 错误处理与边界

- **设备无生物识别且无口令**：`isAvailable` 返回不可用 → 锁屏显示引导（去系统设置启用），不静默放行。
- **生物识别失败/取消**：留在锁屏，可重试；不暴露助记词、不降级为明文。
- **Android Class 3 警示**（spec §5.5）：弱人脸（Class 2）不可绑密钥 → 优先指纹/设备口令；文案提示。
- **SecureStore 读取仍受硬件门禁**：解锁时 `loadMnemonic()` 的 `requireAuthentication` 作为第二道底座（双重保险，不冲突）。
- **锁定即清内存**：`lock()` 必须 `walletStore.reset()`，确保后台快照/内存中不留可签名 wallet。

---

## 6. 测试策略（TDD）

全部用注入式 mock，无真机依赖（沿用 jest-expo + @testing-library/react-native v14）：
- `biometricGate.test.ts`：mock `LocalAuthentication` → 可用/无硬件/未录入/成功/失败/取消/设备口令回退 各分支。
- `authStore.test.ts`：`evaluate`（有/无钱包）、`unlock`/`lock` 状态迁移、`touch`。
- `useAutoLock.test.tsx`：mock `AppState` → 后台再返回超时触发 `lock`；未超时不锁。
- `LockScreen.test.tsx`：locked 渲染解锁按钮；点击触发 gate；失败显示错误；unavailable 显示引导。
- 启动重新水合集成：`hasWallet → locked → unlock → loadWallet → walletStore 填充`（mock gate + in-memory KeyStore）。
- **质量门**：`tsc --noEmit` 零错、`jest` 全绿（≥ 166 + 新增）、改动源无 emoji/硬编码色。

---

## 7. 仓库改动清单

- 新增：`src/wallet/biometricGate.ts`(+test)、`src/state/authStore.ts`(+test)、`src/wallet/useAutoLock.ts`(+test)、`src/screens/LockScreen.tsx`(+test)
- 修改：根组件接入锁屏门禁（`App.tsx` 或新 `Root` 包装）；`walletStore` 不变或仅补充类型；`app.json` 增 `expo-local-authentication` 插件 + `NSFaceIDUsageDescription`
- 不改：`services/`/`lib/`/既有下单逻辑（Phase 3 才消费 `unlocked` 前置）

---

## 8. 假设与待确认（用户审阅时请确认/否决）

1. **门禁粒度 = 会话解锁（A）**，高危再验（C）留接口、本切片不做 UI。
2. **自动锁定**：冷启动必锁 + 后台返回超时锁，**默认空闲超时 5 分钟**（常量可调；是否需要用户在设置里可配，留 Phase 2 后续）。
3. **无生物识别时允许设备口令回退**；二者皆无则引导启用、不放行。
4. **范围仅生物识别/会话/重新水合**；approveAgent/approveBuilderFee/入金为独立子切片。
5. **签名仍由 `LocalWalletService`（viem）执行**，本切片只加「解锁门禁 + 会话」，不改签名实现。

---

## 9. 与 spec 对齐

- ADR-011：Passkey 本地钱包硬件门禁（Secure Enclave/StrongBox）+ 生物识别解锁 ✅
- §5.5：iOS Face ID（`NSFaceIDUsageDescription`）/ Android BiometricPrompt + Class 3 警示、设备口令回退 ✅
- ADR-002（预留）：两层授权 → 高危主钱包操作的 `forceReauth` 接口位 ✅（终态 C）
