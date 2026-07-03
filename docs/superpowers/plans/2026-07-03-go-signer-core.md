# Go Signing Core (Tier ①) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up a self-written, minimal Go HL L1-action signing core (`backend/`), proven byte-for-byte against `@nktkas/hyperliquid` via cross-language golden vectors.

**Architecture:** A new greenfield Go module. Layered: a hand-written ordered msgpack encoder → typed L1 action builders → `L1ActionHash` (keccak byte layout) → `AgentDigest` (hand-written EIP-712) → tier-① in-process `Signer` (secp256k1). A committed Node generator produces `golden.json` from the TS SDK (the oracle); Go tests assert each layer matches byte-for-byte.

**Tech Stack:** Go 1.26 (`go1.26.2` is installed); `golang.org/x/crypto/sha3` (legacy Keccak-256); `github.com/decred/dcrd/dcrec/secp256k1/v4` (secp256k1). Generator: Node ESM using `@nktkas/hyperliquid/signing` + `viem` from `mobile/node_modules`. Spec: `docs/superpowers/specs/2026-07-03-go-signer-core-design.md`.

---

## Baselines

- New module — no existing Go baseline. The gate this plan establishes: `cd backend && go build ./... && go vet ./... && go test ./...` all green.
- `server/` and `mobile/` are untouched — do not run or modify them.

## Conventions (apply to every task)

- **TDD:** write the failing test first, run it and watch it fail, implement minimally, run it and watch it pass, commit.
- **Commit:** `git commit --no-verify -m "<msg>"` with trailer `Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>`. Commit per task; push only when the user says so.
- **Determinism / no secrets in logs:** fixed test key + fixed nonces make signatures deterministic. Never print private-key material.
- **The golden vectors are the source of truth.** If a Go layer's output diverges from a golden value, fix the Go code — never edit `golden.json` to match a buggy implementation (only regenerate it deliberately from the TS oracle).

## File Structure

```
backend/
  go.mod / go.sum
  internal/hl/
    msgpack.go / msgpack_test.go       # ordered msgpack encoder
    action.go / action_test.go         # typed L1 action builders → ordered Map
    hash.go / hash_test.go             # L1ActionHash (byte layout)
    eip712.go / eip712_test.go         # AgentDigest (hand-written EIP-712)
    signer.go / signer_test.go         # tier-① Signer (secp256k1)
    golden_test.go                     # asserts Go hash/digest/sig == golden.json
    testdata/golden.json               # committed oracle vectors
mobile/scripts/gen-golden-vectors.mjs  # Node generator (run from mobile/)
.github/workflows/ci.yml               # + backend job
```

---

## Task 1: Module scaffold + smoke test

**Files:**
- Create: `backend/go.mod`
- Test: `backend/internal/hl/smoke_test.go`

- [ ] **Step 1: Init the module**

Run:
```
cd /Users/bill/Documents/GitHub/HyperSolid && mkdir -p backend/internal/hl && cd backend && go mod init github.com/lumos-forge/hypersolid/backend
```
Expected: creates `backend/go.mod` with `module github.com/lumos-forge/hypersolid/backend` and a `go 1.26` (or the installed toolchain) line.

- [ ] **Step 2: Write a smoke test** — create `backend/internal/hl/smoke_test.go`:

```go
package hl

import "testing"

func TestSmoke(t *testing.T) {
	if 1+1 != 2 {
		t.Fatal("arithmetic is broken")
	}
}
```

- [ ] **Step 3: Run it, expect pass**

Run: `cd /Users/bill/Documents/GitHub/HyperSolid/backend && go test ./...`
Expected: `ok  github.com/lumos-forge/hypersolid/backend/internal/hl`.

- [ ] **Step 4: Commit**

```bash
cd /Users/bill/Documents/GitHub/HyperSolid && git add backend/go.mod backend/internal/hl/smoke_test.go && git commit --no-verify -m "chore(backend): init Go module + smoke test

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

## Task 2: Golden-vector generator + `golden.json`

**Files:**
- Create: `mobile/scripts/gen-golden-vectors.mjs`
- Create (generated, committed): `backend/internal/hl/testdata/golden.json`

- [ ] **Step 1: Write the generator** — create `mobile/scripts/gen-golden-vectors.mjs`. It lives under `mobile/` so it resolves `@nktkas/hyperliquid/signing` + `viem` from `mobile/node_modules`. It builds each action object, computes `createL1ActionHash`, the EIP-712 `agentDigest` (via viem `hashTypedData`), and the signature (via `signL1Action`), and writes `../backend/internal/hl/testdata/golden.json`.

```js
// Regenerate the cross-language golden vectors for the Go signing core.
// Run from the mobile/ directory:  node scripts/gen-golden-vectors.mjs
// Oracle: @nktkas/hyperliquid/signing (same scheme the app signs with) + viem.
import { writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { createL1ActionHash, signL1Action } from "@nktkas/hyperliquid/signing";
import { hashTypedData } from "viem";
import { privateKeyToAccount } from "viem/accounts";

const PK = "0x1111111111111111111111111111111111111111111111111111111111111111";
const account = privateKeyToAccount(PK);
const NONCE = 1700000000000;
const ZERO = "0x0000000000000000000000000000000000000000";

// Build the exact action object HL signs, from semantic params (field order is byte-critical).
function buildAction(kind, p) {
  if (kind === "order") {
    const o = { a: p.asset, b: p.isBuy, p: p.px, s: p.sz, r: p.reduceOnly, t: { limit: { tif: p.tif } } };
    if (p.cloid) o.c = p.cloid;
    return { type: "order", orders: [o], grouping: p.grouping ?? "na" };
  }
  if (kind === "cancel") return { type: "cancel", cancels: p.cancels.map((c) => ({ a: c.asset, o: c.oid })) };
  if (kind === "twapOrder") return { type: "twapOrder", twap: { a: p.asset, b: p.isBuy, s: p.sz, r: p.reduceOnly, m: p.minutes, t: p.randomize } };
  if (kind === "twapCancel") return { type: "twapCancel", a: p.asset, t: p.twapId };
  throw new Error("unknown kind " + kind);
}

const cases = [
  { name: "order-limit-gtc-mainnet", kind: "order", isTestnet: false, params: { asset: 0, isBuy: true, px: "50000", sz: "0.01", reduceOnly: false, tif: "Gtc", grouping: "na" } },
  { name: "order-limit-ioc-testnet", kind: "order", isTestnet: true, params: { asset: 1, isBuy: false, px: "3000", sz: "0.5", reduceOnly: true, tif: "Ioc", grouping: "na" } },
  { name: "order-limit-cloid-mainnet", kind: "order", isTestnet: false, params: { asset: 0, isBuy: true, px: "50000", sz: "0.01", reduceOnly: false, tif: "Gtc", grouping: "na", cloid: "0x00000000000000000000000000000001" } },
  { name: "cancel-mainnet", kind: "cancel", isTestnet: false, params: { cancels: [{ asset: 0, oid: 123 }] } },
  { name: "twapOrder-mainnet", kind: "twapOrder", isTestnet: false, params: { asset: 0, isBuy: true, sz: "0.02", reduceOnly: false, minutes: 30, randomize: true } },
  { name: "twapCancel-testnet", kind: "twapCancel", isTestnet: true, params: { asset: 0, twapId: 7 } },
];

function normSig(sig) {
  // signL1Action returns { r, s, v } (hex r/s, numeric v). Normalize defensively.
  if (typeof sig === "string") {
    const h = sig.slice(2);
    return { r: "0x" + h.slice(0, 64), s: "0x" + h.slice(64, 128), v: parseInt(h.slice(128, 130), 16) };
  }
  return { r: sig.r, s: sig.s, v: Number(sig.v) };
}

const out = [];
for (const c of cases) {
  const action = buildAction(c.kind, c.params);
  const actionHash = createL1ActionHash({ action, nonce: NONCE });
  const agentDigest = hashTypedData({
    domain: { name: "Exchange", version: "1", chainId: 1337, verifyingContract: ZERO },
    types: { Agent: [{ name: "source", type: "string" }, { name: "connectionId", type: "bytes32" }] },
    primaryType: "Agent",
    message: { source: c.isTestnet ? "b" : "a", connectionId: actionHash },
  });
  const sig = normSig(await signL1Action({ wallet: account, action, nonce: NONCE, isTestnet: c.isTestnet }));
  out.push({ name: c.name, kind: c.kind, params: c.params, nonce: NONCE, isTestnet: c.isTestnet, privKey: PK, actionHash, agentDigest, sig });
}

const dest = resolve(dirname(fileURLToPath(import.meta.url)), "../../backend/internal/hl/testdata/golden.json");
mkdirSync(dirname(dest), { recursive: true });
writeFileSync(dest, JSON.stringify(out, null, 2) + "\n");
console.log(`wrote ${out.length} vectors to ${dest}`);
```

- [ ] **Step 2: Generate the vectors**

Run: `cd /Users/bill/Documents/GitHub/HyperSolid/mobile && node scripts/gen-golden-vectors.mjs`
Expected: prints `wrote 6 vectors to …/backend/internal/hl/testdata/golden.json`, and the file exists with 6 entries, each having non-empty `actionHash` (0x + 64 hex), `agentDigest` (0x + 64 hex), and `sig.{r,s,v}` (v is 27 or 28).

If `signL1Action`'s return shape isn't `{r,s,v}`, the `normSig` helper already handles a hex string; if it's some other object, adjust `normSig` to extract r/s/v — do NOT change the vectors' meaning.

- [ ] **Step 3: Sanity-check the file**

Run: `cd /Users/bill/Documents/GitHub/HyperSolid && node -e "const g=require('./backend/internal/hl/testdata/golden.json'); console.log(g.length, g.every(v=>/^0x[0-9a-f]{64}$/.test(v.actionHash) && /^0x[0-9a-f]{64}$/.test(v.agentDigest) && [27,28].includes(v.sig.v)))"`
Expected: `6 true`.

- [ ] **Step 4: Commit**

```bash
cd /Users/bill/Documents/GitHub/HyperSolid && git add mobile/scripts/gen-golden-vectors.mjs backend/internal/hl/testdata/golden.json && git commit --no-verify -m "test(backend): golden-vector generator + committed golden.json (TS oracle)

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

## Task 3: Ordered msgpack encoder

**Files:**
- Create: `backend/internal/hl/msgpack.go`
- Test: `backend/internal/hl/msgpack_test.go`

- [ ] **Step 1: Write the failing test** — create `backend/internal/hl/msgpack_test.go`:

```go
package hl

import (
	"bytes"
	"testing"
)

func TestEncodePrimitives(t *testing.T) {
	cases := []struct {
		name string
		in   any
		want []byte
	}{
		{"str-fix", "hi", []byte{0xa2, 'h', 'i'}},
		{"str8-32chars", string(bytes.Repeat([]byte("a"), 32)), append([]byte{0xd9, 0x20}, bytes.Repeat([]byte("a"), 32)...)},
		{"int-0", int64(0), []byte{0x00}},
		{"int-127", int64(127), []byte{0x7f}},
		{"int-128", int64(128), []byte{0xcc, 0x80}},
		{"int-256", int64(256), []byte{0xcd, 0x01, 0x00}},
		{"int-65536", int64(65536), []byte{0xce, 0x00, 0x01, 0x00, 0x00}},
		{"int-2^32", int64(4294967296), []byte{0xcf, 0, 0, 0, 1, 0, 0, 0, 0}},
		{"int-neg1", int64(-1), []byte{0xff}},
		{"int-neg32", int64(-32), []byte{0xe0}},
		{"int-neg33", int64(-33), []byte{0xd0, 0xdf}},
		{"bool-true", true, []byte{0xc3}},
		{"bool-false", false, []byte{0xc2}},
		{"array", []any{int64(1), int64(2)}, []byte{0x92, 0x01, 0x02}},
		{"map", Map{{"a", int64(0)}, {"b", true}}, []byte{0x82, 0xa1, 'a', 0x00, 0xa1, 'b', 0xc3}},
	}
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			got, err := Encode(c.in)
			if err != nil {
				t.Fatalf("Encode error: %v", err)
			}
			if !bytes.Equal(got, c.want) {
				t.Fatalf("Encode(%v) = %x, want %x", c.in, got, c.want)
			}
		})
	}
}
```

- [ ] **Step 2: Run it, expect fail**

Run: `cd /Users/bill/Documents/GitHub/HyperSolid/backend && go test ./internal/hl/ -run TestEncodePrimitives`
Expected: FAIL (compile error — `Encode`/`Map` undefined).

- [ ] **Step 3: Implement** — create `backend/internal/hl/msgpack.go`:

```go
package hl

import (
	"encoding/binary"
	"fmt"
)

// KV is one ordered key/value pair.
type KV struct {
	K string
	V any
}

// Map is an insertion-ordered map (msgpack map key order is byte-significant for HL).
type Map []KV

// Encode serializes v as msgpack, matching @std/msgpack for the value shapes HL actions use:
// string, int64, uint64, bool, []any (array), and Map (ordered map). No floats.
func Encode(v any) ([]byte, error) {
	var b []byte
	if err := enc(&b, v); err != nil {
		return nil, err
	}
	return b, nil
}

func enc(b *[]byte, v any) error {
	switch x := v.(type) {
	case string:
		encStr(b, x)
	case bool:
		if x {
			*b = append(*b, 0xc3)
		} else {
			*b = append(*b, 0xc2)
		}
	case int64:
		encInt(b, x)
	case uint64:
		encUint(b, x)
	case []any:
		encArrayHeader(b, len(x))
		for _, e := range x {
			if err := enc(b, e); err != nil {
				return err
			}
		}
	case Map:
		encMapHeader(b, len(x))
		for _, kv := range x {
			encStr(b, kv.K)
			if err := enc(b, kv.V); err != nil {
				return err
			}
		}
	default:
		return fmt.Errorf("msgpack: unsupported type %T", v)
	}
	return nil
}

func encStr(b *[]byte, s string) {
	n := len(s)
	switch {
	case n < 32:
		*b = append(*b, 0xa0|byte(n))
	case n < 256:
		*b = append(*b, 0xd9, byte(n))
	default:
		*b = append(*b, 0xdb)
		*b = binary.BigEndian.AppendUint16(*b, uint16(n)) // str16 header
	}
	*b = append(*b, s...)
}

func encInt(b *[]byte, n int64) {
	if n >= 0 {
		encUint(b, uint64(n))
		return
	}
	switch {
	case n >= -32:
		*b = append(*b, byte(n)) // negative fixint
	case n >= -128:
		*b = append(*b, 0xd0, byte(int8(n)))
	case n >= -32768:
		*b = append(*b, 0xd1)
		*b = binary.BigEndian.AppendUint16(*b, uint16(int16(n)))
	case n >= -2147483648:
		*b = append(*b, 0xd2)
		*b = binary.BigEndian.AppendUint32(*b, uint32(int32(n)))
	default:
		*b = append(*b, 0xd3)
		*b = binary.BigEndian.AppendUint64(*b, uint64(n))
	}
}

func encUint(b *[]byte, n uint64) {
	switch {
	case n < 128:
		*b = append(*b, byte(n)) // positive fixint
	case n < 256:
		*b = append(*b, 0xcc, byte(n))
	case n < 65536:
		*b = append(*b, 0xcd)
		*b = binary.BigEndian.AppendUint16(*b, uint16(n))
	case n < 4294967296:
		*b = append(*b, 0xce)
		*b = binary.BigEndian.AppendUint32(*b, uint32(n))
	default:
		*b = append(*b, 0xcf)
		*b = binary.BigEndian.AppendUint64(*b, n)
	}
}

func encArrayHeader(b *[]byte, n int) {
	if n < 16 {
		*b = append(*b, 0x90|byte(n))
		return
	}
	*b = append(*b, 0xdc)
	*b = binary.BigEndian.AppendUint16(*b, uint16(n))
}

func encMapHeader(b *[]byte, n int) {
	if n < 16 {
		*b = append(*b, 0x80|byte(n))
		return
	}
	*b = append(*b, 0xde)
	*b = binary.BigEndian.AppendUint16(*b, uint16(n))
}
```

- [ ] **Step 4: Run it, expect pass**

Run: `cd /Users/bill/Documents/GitHub/HyperSolid/backend && go test ./internal/hl/ -run TestEncodePrimitives`
Expected: PASS. Also `go vet ./...` clean.

Note on str8 vs str16: this encoder uses `str8` (0xd9) for 32–255 byte strings. `@std/msgpack` also uses str8. If Task 5's golden test fails specifically on the `order-limit-cloid-mainnet` vector (the only one with a 34-char string), inspect what `@std/msgpack` emits for a 32–255 string and match it here (str8 is correct per the msgpack spec and @std/msgpack).

- [ ] **Step 5: Commit**

```bash
cd /Users/bill/Documents/GitHub/HyperSolid && git add backend/internal/hl/msgpack.go backend/internal/hl/msgpack_test.go && git commit --no-verify -m "feat(backend): minimal ordered msgpack encoder

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

## Task 4: Typed L1 action builders

**Files:**
- Create: `backend/internal/hl/action.go`
- Test: `backend/internal/hl/action_test.go`

- [ ] **Step 1: Write the failing test** — create `backend/internal/hl/action_test.go`. It asserts the builders produce the exact ordered `Map` (field order is what matters):

```go
package hl

import (
	"reflect"
	"testing"
)

func TestBuildOrderAction(t *testing.T) {
	got := BuildOrderAction([]OrderInput{{Asset: 0, IsBuy: true, Px: "50000", Sz: "0.01", ReduceOnly: false, Tif: "Gtc"}}, "na")
	want := Map{
		{"type", "order"},
		{"orders", []any{Map{
			{"a", int64(0)}, {"b", true}, {"p", "50000"}, {"s", "0.01"}, {"r", false},
			{"t", Map{{"limit", Map{{"tif", "Gtc"}}}}},
		}}},
		{"grouping", "na"},
	}
	if !reflect.DeepEqual(got, want) {
		t.Fatalf("order action mismatch:\n got %#v\nwant %#v", got, want)
	}
}

func TestBuildOrderActionWithCloid(t *testing.T) {
	got := BuildOrderAction([]OrderInput{{Asset: 0, IsBuy: true, Px: "50000", Sz: "0.01", Tif: "Gtc", Cloid: "0x00000000000000000000000000000001"}}, "na")
	orders := got[1].V.([]any)
	tuple := orders[0].(Map)
	last := tuple[len(tuple)-1]
	if last.K != "c" || last.V.(string) != "0x00000000000000000000000000000001" {
		t.Fatalf("expected trailing cloid field, got %#v", tuple)
	}
}

func TestBuildCancelAction(t *testing.T) {
	got := BuildCancelAction([]CancelInput{{Asset: 0, Oid: 123}})
	want := Map{{"type", "cancel"}, {"cancels", []any{Map{{"a", int64(0)}, {"o", int64(123)}}}}}
	if !reflect.DeepEqual(got, want) {
		t.Fatalf("cancel action mismatch:\n got %#v\nwant %#v", got, want)
	}
}

func TestBuildTwapActions(t *testing.T) {
	twap := BuildTwapOrderAction(0, true, "0.02", false, 30, true)
	wantTwap := Map{{"type", "twapOrder"}, {"twap", Map{{"a", int64(0)}, {"b", true}, {"s", "0.02"}, {"r", false}, {"m", int64(30)}, {"t", true}}}}
	if !reflect.DeepEqual(twap, wantTwap) {
		t.Fatalf("twapOrder mismatch:\n got %#v\nwant %#v", twap, wantTwap)
	}
	cancel := BuildTwapCancelAction(0, 7)
	wantCancel := Map{{"type", "twapCancel"}, {"a", int64(0)}, {"t", int64(7)}}
	if !reflect.DeepEqual(cancel, wantCancel) {
		t.Fatalf("twapCancel mismatch:\n got %#v\nwant %#v", cancel, wantCancel)
	}
}
```

- [ ] **Step 2: Run it, expect fail**

Run: `cd /Users/bill/Documents/GitHub/HyperSolid/backend && go test ./internal/hl/ -run "TestBuild"`
Expected: FAIL (builders/types undefined).

- [ ] **Step 3: Implement** — create `backend/internal/hl/action.go`:

```go
package hl

// OrderInput is the semantic input for one limit order (first-slice: limit orders only).
type OrderInput struct {
	Asset      int64
	IsBuy      bool
	Px         string
	Sz         string
	ReduceOnly bool
	Tif        string // "Gtc" | "Ioc" | "Alo"
	Cloid      string // optional; omitted from the action when ""
}

// CancelInput is one cancel-by-oid.
type CancelInput struct {
	Asset int64
	Oid   int64
}

// BuildOrderAction builds the ordered msgpack Map for an `order` action (fields in HL byte order).
func BuildOrderAction(orders []OrderInput, grouping string) Map {
	arr := make([]any, len(orders))
	for i, o := range orders {
		tuple := Map{
			{"a", o.Asset}, {"b", o.IsBuy}, {"p", o.Px}, {"s", o.Sz}, {"r", o.ReduceOnly},
			{"t", Map{{"limit", Map{{"tif", o.Tif}}}}},
		}
		if o.Cloid != "" {
			tuple = append(tuple, KV{"c", o.Cloid})
		}
		arr[i] = tuple
	}
	return Map{{"type", "order"}, {"orders", arr}, {"grouping", grouping}}
}

// BuildCancelAction builds the ordered Map for a `cancel` action.
func BuildCancelAction(cancels []CancelInput) Map {
	arr := make([]any, len(cancels))
	for i, c := range cancels {
		arr[i] = Map{{"a", c.Asset}, {"o", c.Oid}}
	}
	return Map{{"type", "cancel"}, {"cancels", arr}}
}

// BuildTwapOrderAction builds the ordered Map for a `twapOrder` action.
func BuildTwapOrderAction(asset int64, isBuy bool, sz string, reduceOnly bool, minutes int64, randomize bool) Map {
	return Map{{"type", "twapOrder"}, {"twap", Map{
		{"a", asset}, {"b", isBuy}, {"s", sz}, {"r", reduceOnly}, {"m", minutes}, {"t", randomize},
	}}}
}

// BuildTwapCancelAction builds the ordered Map for a `twapCancel` action.
func BuildTwapCancelAction(asset, twapID int64) Map {
	return Map{{"type", "twapCancel"}, {"a", asset}, {"t", twapID}}
}
```

- [ ] **Step 4: Run it, expect pass**

Run: `cd /Users/bill/Documents/GitHub/HyperSolid/backend && go test ./internal/hl/ -run "TestBuild"`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
cd /Users/bill/Documents/GitHub/HyperSolid && git add backend/internal/hl/action.go backend/internal/hl/action_test.go && git commit --no-verify -m "feat(backend): typed L1 action builders (order/cancel/twap)

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

## Task 5: `L1ActionHash` + golden hash assertion

**Files:**
- Create: `backend/internal/hl/hash.go`
- Test: `backend/internal/hl/hash_test.go`, `backend/internal/hl/golden_test.go` (create golden loader here)

- [ ] **Step 1: Write the failing tests**

Create `backend/internal/hl/golden_test.go` (the shared loader used by Tasks 5–7):
```go
package hl

import (
	"encoding/json"
	"os"
	"testing"
)

type goldenSig struct {
	R string `json:"r"`
	S string `json:"s"`
	V int    `json:"v"`
}

type goldenVector struct {
	Name        string          `json:"name"`
	Kind        string          `json:"kind"`
	Params      json.RawMessage `json:"params"`
	Nonce       uint64          `json:"nonce"`
	IsTestnet   bool            `json:"isTestnet"`
	PrivKey     string          `json:"privKey"`
	ActionHash  string          `json:"actionHash"`
	AgentDigest string          `json:"agentDigest"`
	Sig         goldenSig       `json:"sig"`
}

func loadGolden(t *testing.T) []goldenVector {
	t.Helper()
	raw, err := os.ReadFile("testdata/golden.json")
	if err != nil {
		t.Fatalf("read golden.json: %v", err)
	}
	var vs []goldenVector
	if err := json.Unmarshal(raw, &vs); err != nil {
		t.Fatalf("parse golden.json: %v", err)
	}
	if len(vs) == 0 {
		t.Fatal("golden.json is empty")
	}
	return vs
}

// actionForVector rebuilds the action Map from a vector's kind+params (used by all layer tests).
func actionForVector(t *testing.T, v goldenVector) Map {
	t.Helper()
	switch v.Kind {
	case "order":
		var p struct {
			Asset      int64  `json:"asset"`
			IsBuy      bool   `json:"isBuy"`
			Px         string `json:"px"`
			Sz         string `json:"sz"`
			ReduceOnly bool   `json:"reduceOnly"`
			Tif        string `json:"tif"`
			Grouping   string `json:"grouping"`
			Cloid      string `json:"cloid"`
		}
		mustJSON(t, v.Params, &p)
		return BuildOrderAction([]OrderInput{{Asset: p.Asset, IsBuy: p.IsBuy, Px: p.Px, Sz: p.Sz, ReduceOnly: p.ReduceOnly, Tif: p.Tif, Cloid: p.Cloid}}, p.Grouping)
	case "cancel":
		var p struct {
			Cancels []struct {
				Asset int64 `json:"asset"`
				Oid   int64 `json:"oid"`
			} `json:"cancels"`
		}
		mustJSON(t, v.Params, &p)
		ins := make([]CancelInput, len(p.Cancels))
		for i, c := range p.Cancels {
			ins[i] = CancelInput{Asset: c.Asset, Oid: c.Oid}
		}
		return BuildCancelAction(ins)
	case "twapOrder":
		var p struct {
			Asset      int64  `json:"asset"`
			IsBuy      bool   `json:"isBuy"`
			Sz         string `json:"sz"`
			ReduceOnly bool   `json:"reduceOnly"`
			Minutes    int64  `json:"minutes"`
			Randomize  bool   `json:"randomize"`
		}
		mustJSON(t, v.Params, &p)
		return BuildTwapOrderAction(p.Asset, p.IsBuy, p.Sz, p.ReduceOnly, p.Minutes, p.Randomize)
	case "twapCancel":
		var p struct {
			Asset  int64 `json:"asset"`
			TwapID int64 `json:"twapId"`
		}
		mustJSON(t, v.Params, &p)
		return BuildTwapCancelAction(p.Asset, p.TwapID)
	}
	t.Fatalf("unknown kind %q", v.Kind)
	return nil
}

func mustJSON(t *testing.T, raw json.RawMessage, dst any) {
	t.Helper()
	if err := json.Unmarshal(raw, dst); err != nil {
		t.Fatalf("params: %v", err)
	}
}
```

Create `backend/internal/hl/hash_test.go`:
```go
package hl

import (
	"encoding/hex"
	"testing"
)

func TestL1ActionHashGolden(t *testing.T) {
	for _, v := range loadGolden(t) {
		t.Run(v.Name, func(t *testing.T) {
			action := actionForVector(t, v)
			got, err := L1ActionHash(action, v.Nonce, nil, nil)
			if err != nil {
				t.Fatalf("L1ActionHash: %v", err)
			}
			want := v.ActionHash[2:] // strip 0x
			if hex.EncodeToString(got[:]) != want {
				t.Fatalf("actionHash = %s, want 0x%s", "0x"+hex.EncodeToString(got[:]), want)
			}
		})
	}
}
```

- [ ] **Step 2: Run them, expect fail**

Run: `cd /Users/bill/Documents/GitHub/HyperSolid/backend && go test ./internal/hl/ -run "TestL1ActionHashGolden"`
Expected: FAIL (compile error — `L1ActionHash` undefined).

- [ ] **Step 3: Implement** — create `backend/internal/hl/hash.go` (adds the keccak dependency):

```go
package hl

import (
	"encoding/binary"

	"golang.org/x/crypto/sha3"
)

// L1ActionHash reproduces @nktkas/hyperliquid createL1ActionHash:
// keccak256( msgpack(action) || nonce(8B big-endian) || vaultMarker || vaultBytes || expiresMarker || expiresBytes ).
// vaultAddress is the 20-byte address or nil; expiresAfter is *uint64 or nil.
func L1ActionHash(action Map, nonce uint64, vaultAddress []byte, expiresAfter *uint64) ([32]byte, error) {
	actionBytes, err := Encode(action)
	if err != nil {
		return [32]byte{}, err
	}
	buf := make([]byte, 0, len(actionBytes)+40)
	buf = append(buf, actionBytes...)
	buf = binary.BigEndian.AppendUint64(buf, nonce)
	if vaultAddress != nil {
		buf = append(buf, 1)
		buf = append(buf, vaultAddress...)
	} else {
		buf = append(buf, 0)
	}
	if expiresAfter != nil {
		buf = append(buf, 0)
		buf = binary.BigEndian.AppendUint64(buf, *expiresAfter)
	}
	h := sha3.NewLegacyKeccak256()
	h.Write(buf)
	var out [32]byte
	copy(out[:], h.Sum(nil))
	return out, nil
}
```

- [ ] **Step 4: Resolve the dep + run, expect pass**

Run: `cd /Users/bill/Documents/GitHub/HyperSolid/backend && go mod tidy && go test ./internal/hl/ -run "TestL1ActionHashGolden"`
Expected: `go mod tidy` adds `golang.org/x/crypto` to go.mod/go.sum; the test PASSES for all 6 vectors (proves msgpack + action builders + hash all match the TS oracle byte-for-byte). If ONLY the cloid vector fails, revisit str8 handling in `msgpack.go` (Task 3 note).

- [ ] **Step 5: Commit**

```bash
cd /Users/bill/Documents/GitHub/HyperSolid && git add backend/internal/hl/hash.go backend/internal/hl/hash_test.go backend/internal/hl/golden_test.go backend/go.mod backend/go.sum && git commit --no-verify -m "feat(backend): L1ActionHash + golden hash assertion (byte-exact vs TS)

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

## Task 6: `AgentDigest` (EIP-712) + golden digest assertion

**Files:**
- Create: `backend/internal/hl/eip712.go`
- Test: `backend/internal/hl/eip712_test.go`

- [ ] **Step 1: Write the failing test** — create `backend/internal/hl/eip712_test.go`:

```go
package hl

import (
	"encoding/hex"
	"testing"
)

func TestAgentDigestGolden(t *testing.T) {
	for _, v := range loadGolden(t) {
		t.Run(v.Name, func(t *testing.T) {
			var conn [32]byte
			b, err := hex.DecodeString(v.ActionHash[2:])
			if err != nil {
				t.Fatalf("decode actionHash: %v", err)
			}
			copy(conn[:], b)
			got := AgentDigest(conn, v.IsTestnet)
			want := v.AgentDigest[2:]
			if hex.EncodeToString(got[:]) != want {
				t.Fatalf("agentDigest = 0x%s, want 0x%s", hex.EncodeToString(got[:]), want)
			}
		})
	}
}
```

- [ ] **Step 2: Run it, expect fail**

Run: `cd /Users/bill/Documents/GitHub/HyperSolid/backend && go test ./internal/hl/ -run "TestAgentDigestGolden"`
Expected: FAIL (`AgentDigest` undefined).

- [ ] **Step 3: Implement** — create `backend/internal/hl/eip712.go`:

```go
package hl

import (
	"math/big"

	"golang.org/x/crypto/sha3"
)

func keccak(parts ...[]byte) [32]byte {
	h := sha3.NewLegacyKeccak256()
	for _, p := range parts {
		h.Write(p)
	}
	var out [32]byte
	copy(out[:], h.Sum(nil))
	return out
}

// left-pad a big.Int to 32 bytes (uint256 ABI word).
func word(n *big.Int) []byte {
	b := n.Bytes()
	out := make([]byte, 32)
	copy(out[32-len(b):], b)
	return out
}

// AgentDigest reproduces the EIP-712 digest signL1Action signs:
// domain Exchange/1/chainId 1337/verifyingContract 0x0; Agent(string source,bytes32 connectionId);
// message { source: isTestnet?"b":"a", connectionId }.
func AgentDigest(connectionID [32]byte, isTestnet bool) [32]byte {
	domainTypeHash := keccak([]byte("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"))
	nameHash := keccak([]byte("Exchange"))
	versionHash := keccak([]byte("1"))
	chainID := word(big.NewInt(1337))
	verifyingContract := make([]byte, 32) // address(0) left-padded
	domainSeparator := keccak(domainTypeHash[:], nameHash[:], versionHash[:], chainID, verifyingContract)

	agentTypeHash := keccak([]byte("Agent(string source,bytes32 connectionId)"))
	source := "a"
	if isTestnet {
		source = "b"
	}
	sourceHash := keccak([]byte(source))
	structHash := keccak(agentTypeHash[:], sourceHash[:], connectionID[:])

	return keccak([]byte{0x19, 0x01}, domainSeparator[:], structHash[:])
}
```

- [ ] **Step 4: Run it, expect pass**

Run: `cd /Users/bill/Documents/GitHub/HyperSolid/backend && go test ./internal/hl/ -run "TestAgentDigestGolden"`
Expected: PASS for all 6 vectors (proves the EIP-712 domain separator + Agent struct hashing match viem byte-for-byte, incl. source "a"/"b").

- [ ] **Step 5: Commit**

```bash
cd /Users/bill/Documents/GitHub/HyperSolid && git add backend/internal/hl/eip712.go backend/internal/hl/eip712_test.go && git commit --no-verify -m "feat(backend): AgentDigest (hand-written EIP-712) + golden assertion

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

## Task 7: Tier-① `Signer` (secp256k1) + golden signature assertion

**Files:**
- Create: `backend/internal/hl/signer.go`
- Test: `backend/internal/hl/signer_test.go`

- [ ] **Step 1: Write the failing tests** — create `backend/internal/hl/signer_test.go`:

```go
package hl

import (
	"encoding/hex"
	"testing"
)

func TestSignL1ActionGolden(t *testing.T) {
	for _, v := range loadGolden(t) {
		t.Run(v.Name, func(t *testing.T) {
			key, err := hex.DecodeString(v.PrivKey[2:])
			if err != nil {
				t.Fatalf("decode key: %v", err)
			}
			s, err := NewSigner(key)
			if err != nil {
				t.Fatalf("NewSigner: %v", err)
			}
			defer s.Close()
			action := actionForVector(t, v)
			sig, err := s.SignL1Action(action, v.Nonce, v.IsTestnet)
			if err != nil {
				t.Fatalf("SignL1Action: %v", err)
			}
			gotR := "0x" + hex.EncodeToString(sig.R[:])
			gotS := "0x" + hex.EncodeToString(sig.S[:])
			if gotR != v.Sig.R || gotS != v.Sig.S || int(sig.V) != v.Sig.V {
				t.Fatalf("sig = {r:%s s:%s v:%d}, want {r:%s s:%s v:%d}", gotR, gotS, sig.V, v.Sig.R, v.Sig.S, v.Sig.V)
			}
		})
	}
}

func TestSignerCloseZeroizes(t *testing.T) {
	key := make([]byte, 32)
	for i := range key {
		key[i] = 0x11
	}
	s, err := NewSigner(key)
	if err != nil {
		t.Fatal(err)
	}
	s.Close()
	if _, err := s.SignL1Action(BuildTwapCancelAction(0, 1), 1, false); err == nil {
		t.Fatal("expected signing after Close to fail")
	}
}
```

- [ ] **Step 2: Run it, expect fail**

Run: `cd /Users/bill/Documents/GitHub/HyperSolid/backend && go test ./internal/hl/ -run "TestSign"`
Expected: FAIL (`NewSigner`/`Signer` undefined).

- [ ] **Step 3: Implement** — create `backend/internal/hl/signer.go` (adds the secp256k1 dependency):

```go
package hl

import (
	"errors"

	secp "github.com/decred/dcrd/dcrec/secp256k1/v4"
	"github.com/decred/dcrd/dcrec/secp256k1/v4/ecdsa"
)

// Sig is an Ethereum-style ECDSA signature. V is 27 or 28.
type Sig struct {
	R [32]byte
	S [32]byte
	V byte
}

// Signer holds a secp256k1 private key in-process (tier ①). Go GC cannot guarantee
// erasure; Close is a best-effort zeroization (see BACKEND-ARCHITECTURE §5 tier ①).
type Signer struct {
	key    *secp.PrivateKey
	keyBuf []byte
	closed bool
}

// NewSigner takes a 32-byte private key.
func NewSigner(priv []byte) (*Signer, error) {
	if len(priv) != 32 {
		return nil, errors.New("signer: private key must be 32 bytes")
	}
	buf := make([]byte, 32)
	copy(buf, priv)
	return &Signer{key: secp.PrivKeyFromBytes(buf), keyBuf: buf}, nil
}

// SignL1Action hashes the action + signs the EIP-712 Agent digest.
func (s *Signer) SignL1Action(action Map, nonce uint64, isTestnet bool) (Sig, error) {
	if s.closed {
		return Sig{}, errors.New("signer: closed")
	}
	conn, err := L1ActionHash(action, nonce, nil, nil)
	if err != nil {
		return Sig{}, err
	}
	digest := AgentDigest(conn, isTestnet)
	return signDigest(s.key, digest)
}

// Close best-effort zeroizes the key buffer.
func (s *Signer) Close() {
	for i := range s.keyBuf {
		s.keyBuf[i] = 0
	}
	s.key = nil
	s.closed = true
}

// signDigest produces an Ethereum-style {r,s,v} over a 32-byte digest, low-S, v in {27,28}.
func signDigest(key *secp.PrivateKey, digest [32]byte) (Sig, error) {
	// SignCompact returns 65 bytes: [recoveryCode+27 (+4 if compressed)] || R(32) || S(32), low-S enforced.
	compact := ecdsa.SignCompact(key, digest[:], false)
	var sig Sig
	recovery := compact[0] - 27
	sig.V = 27 + (recovery & 1)
	copy(sig.R[:], compact[1:33])
	copy(sig.S[:], compact[33:65])
	return sig, nil
}
```

- [ ] **Step 4: Resolve the dep + run, expect pass**

Run: `cd /Users/bill/Documents/GitHub/HyperSolid/backend && go mod tidy && go test ./internal/hl/ -run "TestSign"`
Expected: `go mod tidy` adds `github.com/decred/dcrd/dcrec/secp256k1/v4`; the golden signature test PASSES for all 6 vectors, and the Close-zeroization test passes.

If the `v` value mismatches a golden `v` (27 vs 28), inspect the `SignCompact` recovery-byte layout (with `false` for uncompressed it is `27+recid`); adjust the `recovery`/`V` derivation to yield the exact Ethereum `v`. If secp256k1 recovery handling proves fiddly, the spec permits substituting `github.com/ethereum/go-ethereum/crypto.Sign` (returns `[R||S||V]`, V in {0,1}; then `V += 27`) — but keep the same `Sig` shape and do not change the vectors.

- [ ] **Step 5: Commit**

```bash
cd /Users/bill/Documents/GitHub/HyperSolid && git add backend/internal/hl/signer.go backend/internal/hl/signer_test.go backend/go.mod backend/go.sum && git commit --no-verify -m "feat(backend): tier-1 Signer (secp256k1) + golden signature assertion

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

## Task 8: CI — add the `backend` job

**Files:**
- Modify: `.github/workflows/ci.yml`

- [ ] **Step 1: Inspect the current workflow**

Run: `cd /Users/bill/Documents/GitHub/HyperSolid && sed -n '1,120p' .github/workflows/ci.yml`
Read how the existing `server` and `mobile` jobs are structured (job keys, `runs-on`, checkout action version, `defaults.run.working-directory`, triggers).

- [ ] **Step 2: Add a `backend` job** — mirror the existing jobs' shape (same `on:` triggers, same `runs-on`, same checkout action version). Add a job that sets up Go 1.26 and runs build/vet/test in `backend/`:

```yaml
  backend:
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: backend
    steps:
      - uses: actions/checkout@v4   # match the version the other jobs use
      - uses: actions/setup-go@v5
        with:
          go-version: "1.26"
      - run: go build ./...
      - run: go vet ./...
      - run: go test ./...
```
Match the EXACT indentation, `checkout` version, and trigger style of the sibling jobs in this file (if `server`/`mobile` use a different checkout version or a matrix, align to it). Do NOT change the existing jobs.

- [ ] **Step 3: Validate locally**

Run: `cd /Users/bill/Documents/GitHub/HyperSolid/backend && go build ./... && go vet ./... && go test ./...`
Expected: build clean; vet clean; all tests pass (msgpack + action + hash + eip712 + signer + all golden vectors).
Also confirm the YAML is well-formed: `cd /Users/bill/Documents/GitHub/HyperSolid && python -c "import yaml,sys; yaml.safe_load(open('.github/workflows/ci.yml'))" && echo "yaml ok"`.

- [ ] **Step 4: Commit**

```bash
cd /Users/bill/Documents/GitHub/HyperSolid && git add .github/workflows/ci.yml && git commit --no-verify -m "ci: add backend Go job (build/vet/test)

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

## Final verification

- [ ] `cd backend && go build ./... && go vet ./... && go test ./...` — all green; the golden tests (hash + agentDigest + signature) pass for all 6 vectors, proving byte-for-byte parity with `@nktkas/hyperliquid`.
- [ ] `.github/workflows/ci.yml` parses and has a `backend` job mirroring the siblings.
- [ ] `server/` and `mobile/` are untouched (this slice adds only `backend/` + `mobile/scripts/gen-golden-vectors.mjs` + a CI job).
- [ ] Report the vector count (6) and that all layers match the oracle. Await the user's explicit "push".

## Self-review notes (spec coverage)

- Minimal hand-written msgpack (no dep) → Task 3. ✓
- L1 action field order (order/cancel/twapOrder/twapCancel) → Task 4, proven by Task 5 golden. ✓
- Action-hash byte layout (nonce/vault/expires markers) → Task 5. ✓
- EIP-712 Agent digest (Exchange/1337/0x0, source a/b) → Task 6. ✓
- Tier-① in-process Signer + Close zeroization → Task 7. ✓
- Cross-language golden vectors (TS oracle generator + Go byte-assertions, layered: hash/digest/sig) → Tasks 2, 5, 6, 7. ✓
- Minimal pinned deps (x/crypto/sha3, dcrec secp256k1) + go.sum → Tasks 5, 7. ✓
- New `go test ./...` + `go vet` gate + CI job → Task 8. ✓
- Non-goals (user-signed, KMS/enclave, nonce lease, policy, vault/expires vectors) → not implemented. ✓
