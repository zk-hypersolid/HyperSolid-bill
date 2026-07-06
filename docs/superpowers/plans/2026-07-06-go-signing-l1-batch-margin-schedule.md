# Go 签名核第五片：L1 批量/保证金/定时动作 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为 Go 签名核新增三个 L1 动作构造器——`batchModify` / `updateIsolatedMargin` / `scheduleCancel`——并用 `@nktkas` 作 oracle 的 byte-exact golden 向量断言其正确性。

**Architecture:** 纯增量，复用既有 msgpack + `L1ActionHash` + `AgentDigest` + `Signer.SignL1Action` 管线；抽出 `modifyEntry` 供 modify/batchModify 复用；新增跨语言 golden 向量。无新签名路径、无 mobile/server 运行时代码改动。

**Tech Stack:** Go（`backend/internal/hl`，`go test`）；golden 生成脚本 `mobile/scripts/gen-golden-vectors.mjs`（Node ESM，oracle=`@nktkas/hyperliquid/signing` + `viem`）。

---

## File Structure

- `backend/internal/hl/action.go` —— 抽出 `modifyEntry` 辅助 + 三个 `Build*Action` 构造器与输入。
- `backend/internal/hl/action_test.go` —— 构造器形状单测（`reflect.DeepEqual`）。
- `mobile/scripts/gen-golden-vectors.mjs` —— `buildAction` 增加三个分支 + `cases` 增加 5 条向量。
- `backend/internal/hl/testdata/golden.json` —— 由脚本重新生成（含新向量）。
- `backend/internal/hl/golden_test.go` —— `actionForVector` switch 增加三个 `case`。

## 现有约定（供无上下文的实现者参考）

- `Map` 是**插入有序**的 `[]KV{K string; V any}`（msgpack map key 顺序对 HL byte-significant）。字段顺序必须与 `@nktkas` wire 形状逐字节一致。
- `int64` 正数编码为 msgpack uint；负数走 `encInt` 的负数分支；`bool`/`string` 直编（`msgpack.go`）。
- 既有 `OrderInput{Asset int64; IsBuy bool; Px, Sz string; ReduceOnly bool; Tif string; Cloid string}`；`orderTuple(o OrderInput) Map` 构造 `{a,b,p,s,r,t:{limit:{tif}}(,c)}`。
- 既有 `ModifyInput{Oid int64; Cloid string; Order OrderInput}`；当前 `BuildModifyAction` 内联构造 `{type, oid, order}`（`oid`=Cloid 字符串当 `Cloid != ""`，否则 int64 `Oid`）。
- 既有 golden 断言：`golden_test.go` 的 `actionForVector(t, v)` switch 依 `v.Kind` 从 `v.Params`（json.RawMessage，用 `mustJSON(t, raw, dst)` 解）重建 action；测试循环断言 `L1ActionHash`/`AgentDigest`/签名 `{r,s,v}` 与向量逐字节相等。生成脚本 `cases` 每条含 `{name, kind, isTestnet, params}`。
- 基线：`cd backend && go test ./...` 全绿；`go vet ./...` 干净。
- 提交用 `--no-verify` 并附 `Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>` trailer。

---

### Task 1: `modifyEntry` 辅助 + `BuildBatchModifyAction`

**Files:**
- Modify: `backend/internal/hl/action.go`
- Test: `backend/internal/hl/action_test.go`

- [ ] **Step 1: Write the failing test**

在 `backend/internal/hl/action_test.go` 末尾追加：

```go
func TestBuildBatchModifyAction(t *testing.T) {
	got := BuildBatchModifyAction([]ModifyInput{
		{Oid: 123, Order: OrderInput{Asset: 0, IsBuy: true, Px: "50000", Sz: "0.01", ReduceOnly: false, Tif: "Gtc"}},
		{Cloid: "0x00000000000000000000000000000002", Order: OrderInput{Asset: 1, IsBuy: false, Px: "3000", Sz: "0.5", ReduceOnly: true, Tif: "Ioc", Cloid: "0x00000000000000000000000000000009"}},
	})
	want := Map{
		{"type", "batchModify"},
		{"modifies", []any{
			Map{{"oid", int64(123)}, {"order", Map{
				{"a", int64(0)}, {"b", true}, {"p", "50000"}, {"s", "0.01"}, {"r", false},
				{"t", Map{{"limit", Map{{"tif", "Gtc"}}}}},
			}}},
			Map{{"oid", "0x00000000000000000000000000000002"}, {"order", Map{
				{"a", int64(1)}, {"b", false}, {"p", "3000"}, {"s", "0.5"}, {"r", true},
				{"t", Map{{"limit", Map{{"tif", "Ioc"}}}}},
				{"c", "0x00000000000000000000000000000009"},
			}}},
		}},
	}
	if !reflect.DeepEqual(got, want) {
		t.Fatalf("batchModify action mismatch:\n got %#v\nwant %#v", got, want)
	}
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && go test ./internal/hl/ -run TestBuildBatchModifyAction`
Expected: FAIL —— `undefined: BuildBatchModifyAction`（编译错误）。

- [ ] **Step 3: Extract `modifyEntry` + implement `BuildBatchModifyAction`**

在 `backend/internal/hl/action.go` 中，把现有 `BuildModifyAction` 替换为一个抽出的 entry 辅助 + 复用它的构造器：

```go
// modifyEntry builds one modify's {oid, order} tuple, shared by modify and batchModify.
// oid = the 34-char 0x Cloid string when Cloid != "", otherwise the int64 Oid.
func modifyEntry(in ModifyInput) Map {
	var oid any
	if in.Cloid != "" {
		oid = in.Cloid
	} else {
		oid = in.Oid
	}
	return Map{{"oid", oid}, {"order", orderTuple(in.Order)}}
}

// BuildModifyAction builds the ordered Map for a `modify` action: {type, oid, order}.
func BuildModifyAction(in ModifyInput) Map {
	return append(Map{{"type", "modify"}}, modifyEntry(in)...)
}

// BuildBatchModifyAction builds the ordered Map for a `batchModify` action: {type, modifies:[{oid, order}]}.
func BuildBatchModifyAction(mods []ModifyInput) Map {
	arr := make([]any, len(mods))
	for i, m := range mods {
		arr[i] = modifyEntry(m)
	}
	return Map{{"type", "batchModify"}, {"modifies", arr}}
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd backend && go test ./internal/hl/ -run 'TestBuildModifyAction|TestBuildBatchModifyAction'`
Expected: PASS —— `modifyEntry` 重构未改变 `BuildModifyAction` 输出（既有 `TestBuildModifyActionNumericOid` / `TestBuildModifyActionCloidOid` 保持绿）；新 batchModify 测试通过。
再跑整包确认：`cd backend && go test ./internal/hl/` → PASS。

- [ ] **Step 5: Commit**

```bash
git add backend/internal/hl/action.go backend/internal/hl/action_test.go
git commit --no-verify -m "feat(backend): modifyEntry helper + BuildBatchModifyAction

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

### Task 2: `BuildUpdateIsolatedMarginAction` + `BuildScheduleCancelAction`

**Files:**
- Modify: `backend/internal/hl/action.go`
- Test: `backend/internal/hl/action_test.go`

- [ ] **Step 1: Write the failing tests**

在 `backend/internal/hl/action_test.go` 末尾追加：

```go
func TestBuildUpdateIsolatedMarginActionAdd(t *testing.T) {
	got := BuildUpdateIsolatedMarginAction(0, true, 1000000)
	want := Map{{"type", "updateIsolatedMargin"}, {"asset", int64(0)}, {"isBuy", true}, {"ntli", int64(1000000)}}
	if !reflect.DeepEqual(got, want) {
		t.Fatalf("updateIsolatedMargin(add) mismatch:\n got %#v\nwant %#v", got, want)
	}
}

func TestBuildUpdateIsolatedMarginActionRemoveNegative(t *testing.T) {
	got := BuildUpdateIsolatedMarginAction(1, false, -500000)
	want := Map{{"type", "updateIsolatedMargin"}, {"asset", int64(1)}, {"isBuy", false}, {"ntli", int64(-500000)}}
	if !reflect.DeepEqual(got, want) {
		t.Fatalf("updateIsolatedMargin(remove) mismatch:\n got %#v\nwant %#v", got, want)
	}
}

func TestBuildScheduleCancelActionSet(t *testing.T) {
	ts := int64(1700000000000)
	got := BuildScheduleCancelAction(&ts)
	want := Map{{"type", "scheduleCancel"}, {"time", int64(1700000000000)}}
	if !reflect.DeepEqual(got, want) {
		t.Fatalf("scheduleCancel(set) mismatch:\n got %#v\nwant %#v", got, want)
	}
}

func TestBuildScheduleCancelActionClear(t *testing.T) {
	got := BuildScheduleCancelAction(nil)
	want := Map{{"type", "scheduleCancel"}}
	if !reflect.DeepEqual(got, want) {
		t.Fatalf("scheduleCancel(clear) mismatch:\n got %#v\nwant %#v", got, want)
	}
}
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd backend && go test ./internal/hl/ -run 'TestBuildUpdateIsolatedMarginAction|TestBuildScheduleCancelAction'`
Expected: FAIL —— `undefined: BuildUpdateIsolatedMarginAction` / `undefined: BuildScheduleCancelAction`（编译错误）。

- [ ] **Step 3: Implement the two builders**

在 `backend/internal/hl/action.go` 末尾追加：

```go
// BuildUpdateIsolatedMarginAction builds the ordered Map for an `updateIsolatedMargin` action.
// ntli is a SIGNED integer (positive = add margin, negative = remove); isBuy selects the position side.
func BuildUpdateIsolatedMarginAction(asset int64, isBuy bool, ntli int64) Map {
	return Map{
		{"type", "updateIsolatedMargin"},
		{"asset", asset},
		{"isBuy", isBuy},
		{"ntli", ntli},
	}
}

// BuildScheduleCancelAction builds the ordered Map for a `scheduleCancel` action (dead man's switch).
// time == nil clears the schedule ({type} only); a non-nil time sets it ({type, time}).
// The optional field is fully omitted (not sent as 0) when clearing, matching HL wire semantics.
func BuildScheduleCancelAction(time *int64) Map {
	if time == nil {
		return Map{{"type", "scheduleCancel"}}
	}
	return Map{{"type", "scheduleCancel"}, {"time", *time}}
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd backend && go test ./internal/hl/ -run 'TestBuildUpdateIsolatedMarginAction|TestBuildScheduleCancelAction'`
Expected: PASS（四个新测试全部通过）。
再跑整包：`cd backend && go test ./internal/hl/` → PASS。

- [ ] **Step 5: Commit**

```bash
git add backend/internal/hl/action.go backend/internal/hl/action_test.go
git commit --no-verify -m "feat(backend): BuildUpdateIsolatedMarginAction + BuildScheduleCancelAction

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

### Task 3: 跨语言 golden 向量（batchModify / updateIsolatedMargin / scheduleCancel）

**Files:**
- Modify: `mobile/scripts/gen-golden-vectors.mjs`
- Regenerate: `backend/internal/hl/testdata/golden.json`
- Modify: `backend/internal/hl/golden_test.go`

- [ ] **Step 1: 扩展生成脚本的 `buildAction` 分支**

在 `mobile/scripts/gen-golden-vectors.mjs` 的 `buildAction(kind, p)` 函数内，现有 `updateLeverage` 分支之后、最终 `throw new Error("unknown kind " + kind);` 之前，插入：

```js
  if (kind === "batchModify") {
    return { type: "batchModify", modifies: p.modifies.map((m) => {
      const o = { a: m.order.asset, b: m.order.isBuy, p: m.order.px, s: m.order.sz, r: m.order.reduceOnly, t: { limit: { tif: m.order.tif } } };
      if (m.order.cloid) o.c = m.order.cloid;
      return { oid: m.oidCloid ?? m.oidNum, order: o };
    }) };
  }
  if (kind === "updateIsolatedMargin") return { type: "updateIsolatedMargin", asset: p.asset, isBuy: p.isBuy, ntli: p.ntli };
  if (kind === "scheduleCancel") {
    const a = { type: "scheduleCancel" };
    if (p.time !== undefined) a.time = p.time;
    return a;
  }
```

- [ ] **Step 2: 增加 5 条测试向量**

在同文件的 `cases` 数组末尾（最后一个 `updateLeverage-isolated-testnet` 条目之后）追加：

```js
  { name: "batchModify-mainnet", kind: "batchModify", isTestnet: false, params: { modifies: [
    { oidNum: 123, order: { asset: 0, isBuy: true, px: "50000", sz: "0.01", reduceOnly: false, tif: "Gtc" } },
    { oidCloid: "0x00000000000000000000000000000002", order: { asset: 1, isBuy: false, px: "3000", sz: "0.5", reduceOnly: true, tif: "Alo", cloid: "0x00000000000000000000000000000009" } },
  ] } },
  { name: "updateIsolatedMargin-add-mainnet", kind: "updateIsolatedMargin", isTestnet: false, params: { asset: 0, isBuy: true, ntli: 1000000 } },
  { name: "updateIsolatedMargin-remove-testnet", kind: "updateIsolatedMargin", isTestnet: true, params: { asset: 1, isBuy: false, ntli: -500000 } },
  { name: "scheduleCancel-set-mainnet", kind: "scheduleCancel", isTestnet: false, params: { time: 1700000000000 } },
  { name: "scheduleCancel-clear-testnet", kind: "scheduleCancel", isTestnet: true, params: {} },
```

- [ ] **Step 3: 重新生成 golden.json**

Run: `cd mobile && node scripts/gen-golden-vectors.mjs`
Expected: 打印 `wrote 17 vectors to …/golden.json`（原 12 条 + 新 5 条）以及后续 user-signed 行。运行 `git -C /Users/bill/Documents/GitHub/HyperSolid --no-pager diff --stat`，应仅 `backend/internal/hl/testdata/golden.json` 与 `mobile/scripts/gen-golden-vectors.mjs` 变化；若 `golden_usersigned*.json` 意外变化则 STOP 报告。

- [ ] **Step 4: Run golden test to verify it fails (unknown kind)**

Run: `cd backend && go test ./internal/hl/ -run Golden`
Expected: FAIL —— `actionForVector` 对新 kind 触发 `t.Fatalf("unknown kind %q")`（switch 尚未扩展）。

- [ ] **Step 5: 扩展 `actionForVector` 的 switch**

在 `backend/internal/hl/golden_test.go` 的 `actionForVector` 函数中，现有 `updateLeverage` case 之后、最终 `t.Fatalf("unknown kind %q", v.Kind)` 之前，插入：

```go
	case "batchModify":
		var p struct {
			Modifies []struct {
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
			} `json:"modifies"`
		}
		mustJSON(t, v.Params, &p)
		mods := make([]ModifyInput, len(p.Modifies))
		for i, m := range p.Modifies {
			mods[i] = ModifyInput{
				Oid:   m.OidNum,
				Cloid: m.OidCloid,
				Order: OrderInput{Asset: m.Order.Asset, IsBuy: m.Order.IsBuy, Px: m.Order.Px, Sz: m.Order.Sz, ReduceOnly: m.Order.ReduceOnly, Tif: m.Order.Tif, Cloid: m.Order.Cloid},
			}
		}
		return BuildBatchModifyAction(mods)
	case "updateIsolatedMargin":
		var p struct {
			Asset int64 `json:"asset"`
			IsBuy bool  `json:"isBuy"`
			Ntli  int64 `json:"ntli"`
		}
		mustJSON(t, v.Params, &p)
		return BuildUpdateIsolatedMarginAction(p.Asset, p.IsBuy, p.Ntli)
	case "scheduleCancel":
		var p struct {
			Time *int64 `json:"time"`
		}
		mustJSON(t, v.Params, &p)
		return BuildScheduleCancelAction(p.Time)
```

- [ ] **Step 6: Run golden test to verify byte-exact pass**

Run: `cd backend && go test ./internal/hl/ -run Golden`
Expected: PASS —— 新 5 条向量的 `actionHash` / `agentDigest` / `sig` 与 `@nktkas` oracle 逐字节相等（含负 `ntli` 的有符号 msgpack 交叉验证、scheduleCancel 省略字段的两形态）。若 FAIL，说明字段顺序/类型/可选省略与 wire 形状不符（fail-closed），回查 Task 1/2 构造器与 Step 1 的 `buildAction`。

- [ ] **Step 7: Full suite + vet + commit**

Run: `cd backend && go test ./... && go vet ./...`
Expected: 全部 `ok`；vet 无输出。

```bash
git add mobile/scripts/gen-golden-vectors.mjs backend/internal/hl/testdata/golden.json backend/internal/hl/golden_test.go
git commit --no-verify -m "test(backend): golden vectors for batchModify/updateIsolatedMargin/scheduleCancel

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

## Final Verification（全部任务完成后）

- `cd backend && go test ./...` —— 全绿。
- `cd backend && go vet ./...` —— 干净。
- `git diff --stat main...HEAD` —— 仅触及：`action.go`、`action_test.go`、`golden_test.go`、`testdata/golden.json`、`gen-golden-vectors.mjs`、以及两份 docs（spec + 本 plan）。无 mobile/server 运行时代码改动。
