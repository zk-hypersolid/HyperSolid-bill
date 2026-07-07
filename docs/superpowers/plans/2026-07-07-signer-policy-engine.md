# `internal/policy` 拒绝优先策略引擎 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 新增一个自包含、纯函数、reject-first 的策略评估器 `backend/internal/policy`：`Evaluate(intent, cfg) → Decision`，default-deny，镜像并强化 TS `withinCaps`（kind 白名单 + kill-switch + 单笔 notional 封顶，per-coin 覆盖 global）。不接入 `/v1/sign/l1`。

**Architecture:** 单个纯 Go 包，无状态、无依赖、无副作用。零值 `Config` 拒一切；名义封顶 fail-closed；规则序确定（kill-switch > kind 白名单 > 名义封顶）。用 table-driven 测试覆盖全部规则与边界。

**Tech Stack:** Go（`backend/internal/policy`，标准库，`go test`）。

---

## File Structure

- `backend/internal/policy/policy.go`（新）—— `Intent`/`Config`/`Decision` 类型 + `Evaluate`。
- `backend/internal/policy/policy_test.go`（新）—— table-driven 规则/边界测试。

## 现有约定（供无上下文的实现者参考）

- 参照 `server/src/risk/guards.ts` 的 `withinCaps`（kill-switch + per-order notional cap，per-coin 覆盖 global）；本包在 Go 侧镜像并加 reject-first 的 kind 白名单。
- Go module：`github.com/lumos-forge/hypersolid/backend`。验证：`go test ./...`、`go vet ./...`。
- 提交用 `--no-verify` + `Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>` trailer。

---

### Task 1: `internal/policy` 评估器

**Files:**
- Create: `backend/internal/policy/policy.go`
- Create: `backend/internal/policy/policy_test.go`

- [ ] **Step 1: Write the failing tests**

创建 `backend/internal/policy/policy_test.go`：

```go
package policy

import "testing"

func TestEvaluate(t *testing.T) {
	allowOrder := map[string]bool{"order": true, "cancelByCloid": true}
	cases := []struct {
		name       string
		intent     Intent
		cfg        Config
		wantAllow  bool
		wantReason string
	}{
		{
			name:       "kill-switch denies even an allowed within-cap order",
			intent:     Intent{Kind: "order", Coin: "BTC", NotionalUsdc: 10},
			cfg:        Config{AllowedKinds: allowOrder, KillSwitch: true, MaxNotionalUsdc: 1000},
			wantAllow:  false,
			wantReason: "kill-switch active",
		},
		{
			name:       "zero-value config denies everything (default deny)",
			intent:     Intent{Kind: "order", NotionalUsdc: 1},
			cfg:        Config{},
			wantAllow:  false,
			wantReason: "kind not allowed",
		},
		{
			name:       "kind not in allowlist is denied",
			intent:     Intent{Kind: "withdraw3", NotionalUsdc: 0},
			cfg:        Config{AllowedKinds: allowOrder, MaxNotionalUsdc: 1000},
			wantAllow:  false,
			wantReason: "kind not allowed",
		},
		{
			name:      "allowed order within global cap is allowed",
			intent:    Intent{Kind: "order", Coin: "BTC", NotionalUsdc: 500},
			cfg:       Config{AllowedKinds: allowOrder, MaxNotionalUsdc: 1000},
			wantAllow: true,
		},
		{
			name:       "allowed order over global cap is denied",
			intent:     Intent{Kind: "order", Coin: "BTC", NotionalUsdc: 1500},
			cfg:        Config{AllowedKinds: allowOrder, MaxNotionalUsdc: 1000},
			wantAllow:  false,
			wantReason: "over notional cap",
		},
		{
			name:       "per-coin cap tighter than global: over per-coin is denied",
			intent:     Intent{Kind: "order", Coin: "DOGE", NotionalUsdc: 300},
			cfg:        Config{AllowedKinds: allowOrder, MaxNotionalUsdc: 1000, PerCoinMaxUsdc: map[string]float64{"DOGE": 200}},
			wantAllow:  false,
			wantReason: "over notional cap",
		},
		{
			name:      "per-coin cap tighter than global: within per-coin is allowed",
			intent:    Intent{Kind: "order", Coin: "DOGE", NotionalUsdc: 150},
			cfg:       Config{AllowedKinds: allowOrder, MaxNotionalUsdc: 1000, PerCoinMaxUsdc: map[string]float64{"DOGE": 200}},
			wantAllow: true,
		},
		{
			name:       "per-coin explicit 0 blocks any notional for that coin",
			intent:     Intent{Kind: "order", Coin: "SHIB", NotionalUsdc: 1},
			cfg:        Config{AllowedKinds: allowOrder, MaxNotionalUsdc: 1000, PerCoinMaxUsdc: map[string]float64{"SHIB": 0}},
			wantAllow:  false,
			wantReason: "over notional cap",
		},
		{
			name:      "non-notional kind skips the cap even with zero global cap",
			intent:    Intent{Kind: "cancelByCloid", NotionalUsdc: 0},
			cfg:       Config{AllowedKinds: allowOrder, MaxNotionalUsdc: 0},
			wantAllow: true,
		},
		{
			name:      "notional exactly equal to the cap is allowed (strict >)",
			intent:    Intent{Kind: "order", Coin: "BTC", NotionalUsdc: 1000},
			cfg:       Config{AllowedKinds: allowOrder, MaxNotionalUsdc: 1000},
			wantAllow: true,
		},
	}
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			got := Evaluate(c.intent, c.cfg)
			if got.Allow != c.wantAllow {
				t.Fatalf("Allow = %v, want %v (reason %q)", got.Allow, c.wantAllow, got.Reason)
			}
			if !c.wantAllow && got.Reason != c.wantReason {
				t.Fatalf("Reason = %q, want %q", got.Reason, c.wantReason)
			}
			if c.wantAllow && got.Reason != "" {
				t.Fatalf("allowed decision should have empty reason, got %q", got.Reason)
			}
		})
	}
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && go test ./internal/policy/`
Expected: FAIL —— package has no non-test files / `Intent`/`Config`/`Decision`/`Evaluate` undefined (compile error).

- [ ] **Step 3: Create policy.go**

创建 `backend/internal/policy/policy.go`：

```go
// Package policy is a stateless, reject-first evaluator for the signing boundary
// (docs/BACKEND-ARCHITECTURE.md §5.1a). It is default-deny: only a recognized,
// non-killed, within-cap Intent is allowed. It performs no signing and holds no
// state; the wiring layer must populate Intent fields authoritatively from the action.
package policy

// Intent is the semantic view of a signing request that the policy evaluates.
type Intent struct {
	Kind         string  // "order" / "cancel" / "cancelByCloid" / "scheduleCancel" / …
	Coin         string  // symbol for per-coin caps; "" when not applicable
	NotionalUsdc float64 // order notional (px*sz); 0 for non-notional kinds
}

// Config is the per-user policy bound at the signing boundary.
type Config struct {
	AllowedKinds    map[string]bool    // reject-first allowlist; a kind absent/false is denied
	KillSwitch      bool               // when true, every intent is rejected
	MaxNotionalUsdc float64            // global per-order notional cap
	PerCoinMaxUsdc  map[string]float64 // optional tighter per-coin cap (overrides global)
}

// Decision is the policy verdict. Allow is false unless every rule passes.
type Decision struct {
	Allow  bool
	Reason string // set when Allow is false
}

func deny(reason string) Decision { return Decision{Allow: false, Reason: reason} }

// Evaluate applies the reject-first policy: default-deny, allowing only a
// recognized, non-killed, within-cap intent. Rule order is deterministic
// (kill-switch, then kind allowlist, then notional cap) so the reason is stable.
func Evaluate(intent Intent, cfg Config) Decision {
	if cfg.KillSwitch {
		return deny("kill-switch active")
	}
	if !cfg.AllowedKinds[intent.Kind] {
		return deny("kind not allowed")
	}
	if intent.NotionalUsdc > 0 {
		limit := cfg.MaxNotionalUsdc
		if c, ok := cfg.PerCoinMaxUsdc[intent.Coin]; ok {
			limit = c
		}
		if intent.NotionalUsdc > limit {
			return deny("over notional cap")
		}
	}
	return Decision{Allow: true}
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd backend && go test ./internal/policy/ && go vet ./internal/policy/`
Expected: PASS（全部 table 用例）；vet 干净。

- [ ] **Step 5: Commit**

```bash
git add backend/internal/policy/policy.go backend/internal/policy/policy_test.go
git commit --no-verify -m "feat(backend): internal/policy reject-first evaluator (not wired)

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

## Final Verification（任务完成后）

- `cd backend && go test ./... && go vet ./...` 全绿。
- `git diff --stat main...HEAD` —— 仅触及：`backend/internal/policy/{policy.go,policy_test.go}` + 两份 docs。无其它改动。
