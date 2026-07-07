# policy 每日封顶：有状态 SpendTracker + 门控 `/v1/sign/l1`

日期：2026-07-07
状态：已批准，待实现

## 背景

TS 侧 `server/src/risk/guards.ts` 的 `RiskLimits.dailyMaxNotionalUsdc`（每-owner 每日名义封顶）此前由 scheduler 用 spend 状态强制。`internal/policy`（PR #23/#24）目前是**纯**评估器 + policy 门控，其 spec 明确把「有状态每日封顶」列为范围外（需 spend 存储）。本片把每日封顶引进 Go 签名边界：新增有状态 `policy.SpendTracker`（每-key 每日累计名义额，UTC 日历日分桶），并在签名端单笔 policy 通过后、生成 nonce 前做**原子** Charge。仍不接入 TS 运行时。

## 现状

- `internal/policy`：`Config{AllowedKinds map[string]bool; KillSwitch bool; MaxNotionalUsdc float64; PerCoinMaxUsdc map[string]float64}`；`Evaluate(intent, cfg) Decision`（纯，单笔规则）；`Store{Set/Get}`（keyId→Config，缺失=零值=default-deny）。
- `cmd/signer/main.go`（PR #26）：`handleSignL1(ks, policies, nonces)` —— 404 → `Evaluate(intentFor(kind,params), policies.Get(keyId))` 403 → `ActionFromKind` 400 → `n := nonces.Next(keyId)` → `SignL1Action(action,n,isTestnet)` 500 → 200 `{r,s,v,nonce:n}`。`newMux(ks, policies, nonces)`；`main()` 建空 keystore/policy + `nonce.New(nil)`。`intentFor(kind, params) policy.Intent`（order/modify/batchModify 算名义额，非名义类 0）。

## 架构

`policy.Evaluate` 保持纯（不感知 spend）。新增有状态 `policy.SpendTracker`：每-key 每日累计名义额，UTC 日历日分桶，可注入时钟，并发安全。`Config` 加 `DailyMaxNotionalUsdc`（每-key 每日封顶，`0`=无限）。签名端把每日封顶作为**原子 Charge**（检查+预留同锁）在生成 nonce 前执行。

### 组件 1：`policy.Config` 加字段

在 `Config` 加：
```go
	DailyMaxNotionalUsdc float64 // per-key daily notional cap; 0 = no daily limit
```
（`Evaluate` **不**使用它——每日封顶是有状态的，由 `SpendTracker` 在签名边界强制。零值 = 无每日封顶，向后兼容既有 Config。）

### 组件 2：`policy.SpendTracker`（`backend/internal/policy/spend.go`）

```go
type SpendTracker struct {
	nowMs func() int64
	mu    sync.Mutex
	spent map[string]daySpend
}

type daySpend struct {
	day   int64   // UTC day number = nowMs / 86400000
	total float64 // notional spent within that day
}

// NewSpendTracker returns a tracker. nil nowMs → real clock (time.Now().UnixMilli()).
func NewSpendTracker(nowMs func() int64) *SpendTracker

// Charge atomically enforces the per-key daily cap: if the current UTC day
// rolled over, the key's total resets to 0; if dailyCap > 0 and total+notional
// would exceed it, Charge returns false WITHOUT adding; otherwise it adds
// notional to the day's total and returns true. dailyCap == 0 means no daily
// limit (always charges/returns true).
func (s *SpendTracker) Charge(keyID string, notional, dailyCap float64) bool

// Spent returns the notional spent by keyID within the current UTC day
// (resets if the day rolled). For tests/observability.
func (s *SpendTracker) Spent(keyID string) float64
```

`Charge` 逻辑（全程持 `mu`）：
```
d := nowMs() / 86400000
e := spent[keyID]
if e.day != d { e = daySpend{day: d, total: 0} }  // 日滚动重置
if dailyCap > 0 && e.total+notional > dailyCap {
    spent[keyID] = e  // 保存（可能已重置日）
    return false
}
e.total += notional
e.day = d
spent[keyID] = e
return true
```

### 组件 3：`cmd/signer` 接线

- `newMux(ks, policies, nonces, spend *policy.SpendTracker)`；`handleSignL1(ks, policies, nonces, spend)`。
- `handleSignL1` 顺序：
  1. method/json；`ks.Signer` 404。
  2. `intent := intentFor(req.Kind, req.Params)`；`cfg := policies.Get(req.KeyID)`。
  3. 单笔 `if d := policy.Evaluate(intent, cfg); !d.Allow → 403 d.Reason`。
  4. `action, err := hl.ActionFromKind(...)` → 400。
  5. **每日** `if !spend.Charge(req.KeyID, intent.NotionalUsdc, cfg.DailyMaxNotionalUsdc) → 403 "daily cap exceeded"`（在 Next 之前 → 拒不烧 nonce）。
  6. `n := nonces.Next(req.KeyID)` → `SignL1Action(action, n, isTestnet)` 500 → 200 `{r,s,v,nonce:n}`。
- `main()`：`spend := policy.NewSpendTracker(nil)`；`newMux(ks, policies, nonces, spend)`。

## 数据流

```
POST /v1/sign/l1 → 404(key) → Evaluate 单笔 403 → ActionFromKind 400
  → spend.Charge(keyId, intent.NotionalUsdc, cfg.DailyMaxNotionalUsdc)   // 原子检查+预留
       false → 403 "daily cap exceeded"（未烧 nonce）
       true  → n := Next(keyId) → 签名 → 200 {r,s,v,nonce}
```

## 关键安全性质

- **并发不超顶**：`Charge` 单锁原子完成「检查+预留」，两个并发同-key 请求不会都通过后再各自累加。
- **每日拒不烧 nonce**：Charge 在 `Next` 之前。
- **签名失败偏严**：Charge（预留）在 sign 之前，若 sign 罕见失败（signer 已 Close）则该名义额已计入当日预算——fail-safe（偏严，绝不放松封顶）。
- **UTC 日滚动重置**：`nowMs/86400000` 变化即重置该 key 当日累计。
- `DailyMaxNotionalUsdc == 0` → 无每日封顶（恒 Charge 通过）。
- 非名义类 kind（notional 0）Charge 累加 0，恒通过。
- 响应/日志不含密钥；deny 只回 reason。

## 测试

- `policy/spend_test.go`：
  - `Charge` 在 cap 内累加、返回 true；累计超过 cap → 返回 false 且不累加（`Spent` 不变）。
  - `dailyCap == 0` → 恒 true（大额也过）；`Spent` 随之累加。
  - UTC 日滚动（第二天 nowMs）→ 该 key 累计重置为 0，之前满额的 key 又可 Charge。
  - 多 key 独立（一个 key 满额不影响另一个）。
  - 并发：N goroutine 对同一 key 各 Charge `c`，cap = `k*c`（k<N）→ 恰好 k 个返回 true、其余 false，`Spent == k*c`（`go test -race`，绝不超顶）。
- `cmd/signer/main_test.go`：
  - 所有 `newMux(...)` 调用加第四参（不触发每日的用例传 `policy.NewSpendTracker(nil)`）。
  - `TestSignL1Endpoint` 仍 200（`Config` 不设 DailyMax=0 → 无每日限制；固定时钟 nonce 不变）。
  - 新增 **每日超顶 → 403**：`Config` 设 `AllowedKinds{order}`、大 `MaxNotionalUsdc`（1e12，不触发单笔顶）、`DailyMaxNotionalUsdc = 600`；每单 order 名义额 `500`（px 50000 × sz 0.01）。两次 POST 同 key：第一次 200（累计 500 ≤ 600），第二次 403 `"daily cap exceeded"`（500+500=1000 > 600）。
  - 新增 **每日拒不烧 nonce**：无法直接观测 nonce 未推进（allocator 内部），但断言每日拒返回 403 且 body reason=="daily cap exceeded"。

## 验证门槛

- `cd backend && go test ./... && go vet ./...` 全绿；`go test -race ./internal/policy/ ./cmd/signer/` 通过；`go build ./cmd/signer` 成功。

## 范围外（YAGNI）

- 跨进程共享 spend（持久/分布式 store）、滚动 24h 窗口、每日封顶观测/告警、spend 持久化（进程重启重置为 0——本片可接受）。
