# Go 签名核第四片：L1 订单管理动作 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为 Go 签名核新增三个 App 已用但未覆盖的 L1 动作构造器——`cancelByCloid` / `modify` / `updateLeverage`——并用 `@nktkas` 作 oracle 的 byte-exact golden 向量断言其正确性。

**Architecture:** 纯增量，复用既有 msgpack + `L1ActionHash` + `AgentDigest` + `Signer.SignL1Action` 管线；新增有序 `Map` 构造器 + 跨语言 golden 向量。无新签名路径、无 mobile/server 运行时代码改动。

**Tech Stack:** Go（`backend/internal/hl`，`go test`）；golden 生成脚本 `mobile/scripts/gen-golden-vectors.mjs`（Node ESM，oracle=`@nktkas/hyperliquid/signing` + `viem`）。

---

## File Structure

- `backend/internal/hl/action.go` —— 新增 `orderTuple` 辅助 + 三个 `Build*Action` 构造器与输入类型。
- `backend/internal/hl/action_test.go` —— 三个构造器的形状单测（`reflect.DeepEqual`）。
- `mobile/scripts/gen-golden-vectors.mjs` —— `buildAction` 增加三个分支 + `cases` 增加 5 条向量。
- `backend/internal/hl/testdata/golden.json` —— 由脚本重新生成（含新向量）。
- `backend/internal/hl/golden_test.go` —— `actionForVector` switch 增加三个 `case`。

## 现有约定（供无上下文的实现者参考）

- `Map` 是**插入有序**的 `[]KV`（msgpack map key 顺序对 HL 是 byte-significant）。构造 action 时字段顺序必须与 `@nktkas` wire 形状逐字节一致。
- `int64` 正数编码为 msgpack uint（`msgpack.go` `encInt`→`encUint`）；`bool`/`string` 直编。
- 既有 `OrderInput{Asset int64; IsBuy bool; Px, Sz string; ReduceOnly bool; Tif string; Cloid string}`（`action.go`）。单笔订单元组形状：`{a,b,p,s,r,t:{limit:{tif}}(,c)}`，见 `BuildOrderAction`。
- 既有 golden 断言：`golden_test.go` 读取 `testdata/golden.json`，对每条向量用 `actionForVector` 重建 action，断言 `L1ActionHash` / `AgentDigest` / 签名 `{r,s,v}` 与向量逐字节相等。
- 基线：`cd backend && go test ./...` 全绿；`go vet ./...` 干净。
- 提交用 `--no-verify` 并附 `Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>` trailer。

---

### Task 1: `orderTuple` 辅助 + `BuildCancelByCloidAction`

**Files:**
- Modify: `backend/internal/hl/action.go`
- Test: `backend/internal/hl/action_test.go`

- [ ] **Step 1: Write the failing test**

在 `backend/internal/hl/action_test.go` 末尾追加：

```go
func TestBuildCancelByCloidAction(t *testing.T) {
	got := BuildCancelByCloidAction([]CancelByCloidInput{{Asset: 0, Cloid: "0x00000000000000000000000000000001"}})
	want := Map{
		{"type", "cancelByCloid"},
		{"cancels", []any{Map{
			{"asset", int64(0)},
			{"cloid", "0x00000000000000000000000000000001"},
		}}},
	}
	if !reflect.DeepEqual(got, want) {
		t.Fatalf("cancelByCloid action mismatch:\n got %#v\nwant %#v", got, want)
	}
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && go test ./internal/hl/ -run TestBuildCancelByCloidAction`
Expected: FAIL —— `undefined: BuildCancelByCloidAction` / `undefined: CancelByCloidInput`（编译错误）。

- [ ] **Step 3: Refactor `orderTuple` + implement `BuildCancelByCloidAction`**

在 `backend/internal/hl/action.go` 中，先抽出单笔订单元组辅助函数（供下单与后续改单复用），并让 `BuildOrderAction` 调用它。将现有 `BuildOrderAction` 内联的 tuple 构造替换为：

```go
// orderTuple builds one order's ordered msgpack tuple: {a,b,p,s,r,t(,c)}.
func orderTuple(o OrderInput) Map {
	tuple := Map{
		{"a", o.Asset}, {"b", o.IsBuy}, {"p", o.Px}, {"s", o.Sz}, {"r", o.ReduceOnly},
		{"t", Map{{"limit", Map{{"tif", o.Tif}}}}},
	}
	if o.Cloid != "" {
		tuple = append(tuple, KV{"c", o.Cloid})
	}
	return tuple
}

// BuildOrderAction builds the ordered msgpack Map for an `order` action (fields in HL byte order).
func BuildOrderAction(orders []OrderInput, grouping string) Map {
	arr := make([]any, len(orders))
	for i, o := range orders {
		arr[i] = orderTuple(o)
	}
	return Map{{"type", "order"}, {"orders", arr}, {"grouping", grouping}}
}
```

然后在文件末尾追加 cancelByCloid：

```go
// CancelByCloidInput is one cancel-by-cloid (asset + 34-char 0x client order id).
type CancelByCloidInput struct {
	Asset int64
	Cloid string
}

// BuildCancelByCloidAction builds the ordered Map for a `cancelByCloid` action.
func BuildCancelByCloidAction(cancels []CancelByCloidInput) Map {
	arr := make([]any, len(cancels))
	for i, c := range cancels {
		arr[i] = Map{{"asset", c.Asset}, {"cloid", c.Cloid}}
	}
	return Map{{"type", "cancelByCloid"}, {"cancels", arr}}
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd backend && go test ./internal/hl/ -run 'TestBuildOrderAction|TestBuildCancelByCloidAction'`
Expected: PASS（`orderTuple` 重构未改变 `BuildOrderAction` 输出，既有 order 测试保持绿；新 cancelByCloid 测试通过）。

- [ ] **Step 5: Commit**

```bash
git add backend/internal/hl/action.go backend/internal/hl/action_test.go
git commit --no-verify -m "feat(backend): orderTuple helper + BuildCancelByCloidAction

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

### Task 2: `BuildModifyAction` + `BuildUpdateLeverageAction`

**Files:**
- Modify: `backend/internal/hl/action.go`
- Test: `backend/internal/hl/action_test.go`

- [ ] **Step 1: Write the failing tests**

在 `backend/internal/hl/action_test.go` 末尾追加：

```go
func TestBuildModifyActionNumericOid(t *testing.T) {
	got := BuildModifyAction(ModifyInput{
		Oid:   123,
		Order: OrderInput{Asset: 0, IsBuy: true, Px: "50000", Sz: "0.01", ReduceOnly: false, Tif: "Gtc"},
	})
	want := Map{
		{"type", "modify"},
		{"oid", int64(123)},
		{"order", Map{
			{"a", int64(0)}, {"b", true}, {"p", "50000"}, {"s", "0.01"}, {"r", false},
			{"t", Map{{"limit", Map{{"tif", "Gtc"}}}}},
		}},
	}
	if !reflect.DeepEqual(got, want) {
		t.Fatalf("modify(numeric oid) mismatch:\n got %#v\nwant %#v", got, want)
	}
}

func TestBuildModifyActionCloidOid(t *testing.T) {
	got := BuildModifyAction(ModifyInput{
		Cloid: "0x00000000000000000000000000000002",
		Order: OrderInput{Asset: 1, IsBuy: false, Px: "3000", Sz: "0.5", ReduceOnly: true, Tif: "Ioc"},
	})
	if got[1].K != "oid" {
		t.Fatalf("expected second field oid, got %#v", got[1])
	}
	if s, ok := got[1].V.(string); !ok || s != "0x00000000000000000000000000000002" {
		t.Fatalf("expected cloid string oid, got %#v", got[1].V)
	}
}

func TestBuildUpdateLeverageAction(t *testing.T) {
	got := BuildUpdateLeverageAction(0, true, 5)
	want := Map{
		{"type", "updateLeverage"},
		{"asset", int64(0)},
		{"isCross", true},
		{"leverage", int64(5)},
	}
	if !reflect.DeepEqual(got, want) {
		t.Fatalf("updateLeverage action mismatch:\n got %#v\nwant %#v", got, want)
	}
}
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd backend && go test ./internal/hl/ -run 'TestBuildModifyAction|TestBuildUpdateLeverageAction'`
Expected: FAIL —— `undefined: BuildModifyAction` / `undefined: ModifyInput` / `undefined: BuildUpdateLeverageAction`（编译错误）。

- [ ] **Step 3: Implement the two builders**

在 `backend/internal/hl/action.go` 末尾追加：

```go
// ModifyInput is the semantic input for a `modify` action. Oid is used when Cloid is "";
// otherwise the 34-char 0x Cloid string is used as the oid value (HL oid union: uint | cloid).
type ModifyInput struct {
	Oid   int64
	Cloid string
	Order OrderInput
}

// BuildModifyAction builds the ordered Map for a `modify` action: {type, oid, order}.
func BuildModifyAction(in ModifyInput) Map {
	var oid any
	if in.Cloid != "" {
		oid = in.Cloid
	} else {
		oid = in.Oid
	}
	return Map{{"type", "modify"}, {"oid", oid}, {"order", orderTuple(in.Order)}}
}

// BuildUpdateLeverageAction builds the ordered Map for an `updateLeverage` action.
// leverage is an integer; isCross=true → cross margin, false → isolated.
func BuildUpdateLeverageAction(asset int64, isCross bool, leverage int64) Map {
	return Map{
		{"type", "updateLeverage"},
		{"asset", asset},
		{"isCross", isCross},
		{"leverage", leverage},
	}
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd backend && go test ./internal/hl/ -run 'TestBuildModifyAction|TestBuildUpdateLeverageAction'`
Expected: PASS（三个新测试全部通过）。

- [ ] **Step 5: Commit**

```bash
git add backend/internal/hl/action.go backend/internal/hl/action_test.go
git commit --no-verify -m "feat(backend): BuildModifyAction + BuildUpdateLeverageAction

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

### Task 3: 跨语言 golden 向量（cancelByCloid / modify / updateLeverage）

**Files:**
- Modify: `mobile/scripts/gen-golden-vectors.mjs`
- Regenerate: `backend/internal/hl/testdata/golden.json`
- Modify: `backend/internal/hl/golden_test.go`

- [ ] **Step 1: 扩展生成脚本的 `buildAction` 分支**

在 `mobile/scripts/gen-golden-vectors.mjs` 的 `buildAction(kind, p)` 函数内，`twapCancel` 分支之后、`throw` 之前，插入：

```js
  if (kind === "cancelByCloid") return { type: "cancelByCloid", cancels: p.cancels.map((c) => ({ asset: c.asset, cloid: c.cloid })) };
  if (kind === "modify") {
    const o = { a: p.order.asset, b: p.order.isBuy, p: p.order.px, s: p.order.sz, r: p.order.reduceOnly, t: { limit: { tif: p.order.tif } } };
    if (p.order.cloid) o.c = p.order.cloid;
    const oid = p.oidCloid ?? p.oidNum;
    return { type: "modify", oid, order: o };
  }
  if (kind === "updateLeverage") return { type: "updateLeverage", asset: p.asset, isCross: p.isCross, leverage: p.leverage };
```

- [ ] **Step 2: 增加 5 条测试向量**

在同文件的 `cases` 数组（`twapCancel-testnet` 之后）追加：

```js
  { name: "cancelByCloid-mainnet", kind: "cancelByCloid", isTestnet: false, params: { cancels: [{ asset: 0, cloid: "0x00000000000000000000000000000001" }] } },
  { name: "modify-oid-mainnet", kind: "modify", isTestnet: false, params: { oidNum: 123, order: { asset: 0, isBuy: true, px: "50000", sz: "0.01", reduceOnly: false, tif: "Gtc" } } },
  { name: "modify-cloid-testnet", kind: "modify", isTestnet: true, params: { oidCloid: "0x00000000000000000000000000000002", order: { asset: 1, isBuy: false, px: "3000", sz: "0.5", reduceOnly: true, tif: "Ioc" } } },
  { name: "updateLeverage-cross-mainnet", kind: "updateLeverage", isTestnet: false, params: { asset: 0, isCross: true, leverage: 5 } },
  { name: "updateLeverage-isolated-testnet", kind: "updateLeverage", isTestnet: true, params: { asset: 1, isCross: false, leverage: 3 } },
```

- [ ] **Step 3: 重新生成 golden.json**

Run: `cd mobile && node scripts/gen-golden-vectors.mjs`
Expected: 打印 `wrote 11 vectors to …/golden.json`（原 6 条 + 新 5 条）以及后续 user-signed 行；`git diff --stat` 显示仅 `backend/internal/hl/testdata/golden.json` 变化（新增 5 条向量）。

- [ ] **Step 4: Run golden test to verify it fails (unknown kind)**

Run: `cd backend && go test ./internal/hl/ -run TestGolden`
Expected: FAIL —— `actionForVector` 对新 kind 触发 `t.Fatalf("unknown kind %q")`（`cancelByCloid`/`modify`/`updateLeverage` 尚未在 switch 中）。

- [ ] **Step 5: 扩展 `actionForVector` 的 switch**

在 `backend/internal/hl/golden_test.go` 的 `actionForVector` 函数中，`twapCancel` case 之后、`t.Fatalf("unknown kind …")` 之前，插入：

```go
	case "cancelByCloid":
		var p struct {
			Cancels []struct {
				Asset int64  `json:"asset"`
				Cloid string `json:"cloid"`
			} `json:"cancels"`
		}
		mustJSON(t, v.Params, &p)
		ins := make([]CancelByCloidInput, len(p.Cancels))
		for i, c := range p.Cancels {
			ins[i] = CancelByCloidInput{Asset: c.Asset, Cloid: c.Cloid}
		}
		return BuildCancelByCloidAction(ins)
	case "modify":
		var p struct {
			OidNum   int64  `json:"oidNum"`
			OidCloid string `json:"oidCloid"`
			Order    struct {
				Asset      int64  `json:"asset"`
				IsBuy      bool   `json:"isBuy"`
				Px         string `json:"px"`
				Sz         string `json:"sz"`
				ReduceOnly bool   `json:"reduceOnly"`
				Tif        string `json:"tif"`
				Cloid      string `json:"cloid"`
			} `json:"order"`
		}
		mustJSON(t, v.Params, &p)
		return BuildModifyAction(ModifyInput{
			Oid:   p.OidNum,
			Cloid: p.OidCloid,
			Order: OrderInput{Asset: p.Order.Asset, IsBuy: p.Order.IsBuy, Px: p.Order.Px, Sz: p.Order.Sz, ReduceOnly: p.Order.ReduceOnly, Tif: p.Order.Tif, Cloid: p.Order.Cloid},
		})
	case "updateLeverage":
		var p struct {
			Asset    int64 `json:"asset"`
			IsCross  bool  `json:"isCross"`
			Leverage int64 `json:"leverage"`
		}
		mustJSON(t, v.Params, &p)
		return BuildUpdateLeverageAction(p.Asset, p.IsCross, p.Leverage)
```

- [ ] **Step 6: Run golden test to verify byte-exact pass**

Run: `cd backend && go test ./internal/hl/ -run TestGolden`
Expected: PASS —— 新 5 条向量的 `actionHash` / `agentDigest` / `sig` 与 `@nktkas` oracle 逐字节相等。若失败，说明字段顺序/类型与 wire 形状不符（fail-closed），回查 Task 1/2 的构造器与 Step 1 的 `buildAction`。

- [ ] **Step 7: Full suite + vet + commit**

Run: `cd backend && go test ./... && go vet ./...`
Expected: 全部 `ok`；vet 无输出。

```bash
git add mobile/scripts/gen-golden-vectors.mjs backend/internal/hl/testdata/golden.json backend/internal/hl/golden_test.go
git commit --no-verify -m "test(backend): golden vectors for cancelByCloid/modify/updateLeverage

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

## Final Verification（全部任务完成后）

- `cd backend && go test ./...` —— 全绿。
- `cd backend && go vet ./...` —— 干净。
- `git diff --stat main...HEAD` —— 仅触及：`action.go`、`action_test.go`、`golden_test.go`、`testdata/golden.json`、`gen-golden-vectors.mjs`、以及两份 docs（spec + 本 plan）。无 mobile/server 运行时代码改动。
