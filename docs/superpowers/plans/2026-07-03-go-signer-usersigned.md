# Go Signing Core — User-Signed (approveAgent) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the user-signed EIP-712 path (`HyperliquidSignTransaction` domain) to the Go signing core with `approveAgent` as the first action, proven byte-for-byte against `@nktkas/hyperliquid`.

**Architecture:** A small generic `UserSignedDigest` (ordered typed-field table; supports `string`/`address`/`uint64`) reusing the merged `keccak`/`word` helpers; a thin `ApproveAgentDigest` wrapper + a `Signer.SignApproveAgent` method reusing the merged secp256k1 path. The existing golden generator is extended to emit `golden_usersigned.json` (TS oracle); Go tests assert digest + signature match byte-for-byte.

**Tech Stack:** Go 1.26; existing deps (`golang.org/x/crypto/sha3`, `github.com/decred/dcrd/dcrec/secp256k1/v4`). Generator: Node ESM using `@nktkas/hyperliquid/signing` (`signUserSignedAction`) + `@nktkas/hyperliquid/api/exchange` (`ApproveAgentTypes`) + `viem` from `mobile/node_modules`. Spec: `docs/superpowers/specs/2026-07-03-go-signer-usersigned-design.md`.

---

## Baselines (must stay green)

- **Backend:** `cd backend && go build ./... && go vet ./... && go test ./...` all green (the merged first slice: msgpack/action/hash/eip712/signer + 18 L1 golden assertions). Each task grows the suite; the final gate adds `go test -race ./internal/hl/`.
- `server/` and `mobile/` are untouched.

## Context you can rely on (already in the repo, merged)

- `backend/internal/hl/eip712.go` exports helpers: `func keccak(parts ...[]byte) [32]byte` and `func word(n *big.Int) []byte` (same package `hl` — reuse directly).
- `backend/internal/hl/signer.go`: `Signer{ mu sync.RWMutex; key *secp.PrivateKey; keyBuf []byte; closed bool }`, `NewSigner`, `func signDigest(key *secp.PrivateKey, digest [32]byte) (Sig, error)`, `type Sig struct{ R,S [32]byte; V byte }`.
- `backend/internal/hl/golden_test.go` defines `type goldenSig struct{ R,S string; V int }` (package `hl` — reuse for user-signed vectors).
- `mobile/scripts/gen-golden-vectors.mjs` builds L1 vectors and writes `backend/internal/hl/testdata/golden.json`. It already imports `createL1ActionHash, signL1Action` (signing), `hashTypedData` (viem), `privateKeyToAccount` (viem/accounts), and defines `PK`, `account`, `NONCE`, `ZERO`, `normSig`.

## Conventions (apply to every task)

- **TDD:** write the failing test first, run it and watch it fail, implement minimally, run it and watch it pass, commit.
- **Commit:** `git commit --no-verify -m "<msg>"` with trailer `Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>`. Commit per task; push only when the user says so.
- **Golden vectors are the source of truth.** Never edit `golden_usersigned.json` to fit a buggy implementation; only regenerate it from the TS oracle.

## File Structure

- `mobile/scripts/gen-golden-vectors.mjs` — extend to also write `golden_usersigned.json`.
- `backend/internal/hl/testdata/golden_usersigned.json` *(new, committed)*.
- `backend/internal/hl/usersigned.go` *(new)* — `Field`, `UserSignedDigest`, `ApproveAgentInput`, `ApproveAgentDigest`.
- `backend/internal/hl/usersigned_test.go` *(new)* — unit tests.
- `backend/internal/hl/golden_usersigned_test.go` *(new)* — golden digest + signature assertions.
- `backend/internal/hl/signer.go` — add `SignApproveAgent`.

---

## Task 1: Extend the generator → `golden_usersigned.json`

**Files:**
- Modify: `mobile/scripts/gen-golden-vectors.mjs`
- Create (generated, committed): `backend/internal/hl/testdata/golden_usersigned.json`

- [ ] **Step 1: Extend the generator** — edit `mobile/scripts/gen-golden-vectors.mjs`.

Add these imports near the top (next to the existing `@nktkas/hyperliquid/signing` import):
```js
import { signUserSignedAction } from "@nktkas/hyperliquid/signing";
import { ApproveAgentTypes } from "@nktkas/hyperliquid/api/exchange";
```
(The existing import line already brings in `createL1ActionHash, signL1Action` from `@nktkas/hyperliquid/signing` — either extend that line to also import `signUserSignedAction`, or add the separate import above. `hashTypedData`, `privateKeyToAccount`, `writeFileSync`, `resolve`, `dirname`, `fileURLToPath`, `PK`, `account`, `NONCE`, `ZERO`, `normSig` are already present.)

Append this block at the END of the file (after the existing L1 `writeFileSync(...)`/`console.log(...)`):
```js
// --- User-signed (approveAgent) vectors: HyperliquidSignTransaction domain ---
const userCases = [
  { name: "approve-mainnet-named", signatureChainId: "0xa4b1", hyperliquidChain: "Mainnet", agentAddress: "0x000000000000000000000000000000000000dEaD", agentName: "myAgent", nonce: NONCE },
  { name: "approve-testnet-empty", signatureChainId: "0x66eee", hyperliquidChain: "Testnet", agentAddress: "0x00000000000000000000000000000000cafe0001", agentName: "", nonce: NONCE },
  { name: "approve-mainnet-named-2", signatureChainId: "0xa4b1", hyperliquidChain: "Mainnet", agentAddress: "0x1111111111111111111111111111111111111111", agentName: "second", nonce: NONCE + 1 },
];

const userOut = [];
for (const c of userCases) {
  const chainId = parseInt(c.signatureChainId);
  const digest = hashTypedData({
    domain: { name: "HyperliquidSignTransaction", version: "1", chainId, verifyingContract: ZERO },
    types: ApproveAgentTypes,
    primaryType: "HyperliquidTransaction:ApproveAgent",
    message: { hyperliquidChain: c.hyperliquidChain, agentAddress: c.agentAddress, agentName: c.agentName, nonce: BigInt(c.nonce) },
  });
  const action = { type: "approveAgent", signatureChainId: c.signatureChainId, hyperliquidChain: c.hyperliquidChain, agentAddress: c.agentAddress, agentName: c.agentName, nonce: c.nonce };
  const sig = normSig(await signUserSignedAction({ wallet: account, action, types: ApproveAgentTypes }));
  userOut.push({ name: c.name, signatureChainId: c.signatureChainId, hyperliquidChain: c.hyperliquidChain, agentAddress: c.agentAddress, agentName: c.agentName, nonce: c.nonce, privKey: PK, digest, sig });
}
const userDest = resolve(dirname(fileURLToPath(import.meta.url)), "../../backend/internal/hl/testdata/golden_usersigned.json");
writeFileSync(userDest, JSON.stringify(userOut, null, 2) + "\n");
console.log(`wrote ${userOut.length} user-signed vectors to ${userDest}`);
```

- [ ] **Step 2: Regenerate both golden files**

Run: `cd /Users/bill/Documents/GitHub/HyperSolid/mobile && node scripts/gen-golden-vectors.mjs`
Expected: prints both `wrote 6 vectors to …/golden.json` and `wrote 3 user-signed vectors to …/golden_usersigned.json`. The L1 `golden.json` must be byte-identical to before (same PK/nonce/cases) — verify with `cd /Users/bill/Documents/GitHub/HyperSolid && git status --short backend/internal/hl/testdata/golden.json` shows NO change; if it changed, the L1 section was altered — revert that.

- [ ] **Step 3: Sanity-check the new file**

Run: `cd /Users/bill/Documents/GitHub/HyperSolid && node -e "const g=require('./backend/internal/hl/testdata/golden_usersigned.json'); console.log(g.length, g.every(v=>/^0x[0-9a-f]{64}$/.test(v.digest) && /^0x[0-9a-f]{64}$/.test(v.sig.r) && /^0x[0-9a-f]{64}$/.test(v.sig.s) && [27,28].includes(v.sig.v)))"`
Expected: `3 true`.

- [ ] **Step 4: Commit**

```bash
cd /Users/bill/Documents/GitHub/HyperSolid && git add mobile/scripts/gen-golden-vectors.mjs backend/internal/hl/testdata/golden_usersigned.json && git commit --no-verify -m "test(backend): golden generator emits user-signed (approveAgent) vectors

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

## Task 2: `UserSignedDigest` (generic) + field encoding

**Files:**
- Create: `backend/internal/hl/usersigned.go`
- Test: `backend/internal/hl/usersigned_test.go`

- [ ] **Step 1: Write the failing test** — create `backend/internal/hl/usersigned_test.go`:

```go
package hl

import (
	"bytes"
	"encoding/hex"
	"testing"
)

func TestEncodeField(t *testing.T) {
	// string → keccak256(utf8); empty string is the well-known keccak256("").
	got, err := encodeField(Field{"agentName", "string"}, "")
	if err != nil {
		t.Fatalf("string: %v", err)
	}
	if hex.EncodeToString(got) != "c5d2460186f7233c927e7db2dcc703c0e500b653ca82273b7bfad8045d85a470" {
		t.Fatalf("keccak(\"\") = %x", got)
	}
	// address → 20 bytes left-padded to 32 (case-insensitive hex).
	addr, err := encodeField(Field{"agentAddress", "address"}, "0x000000000000000000000000000000000000dEaD")
	if err != nil {
		t.Fatalf("address: %v", err)
	}
	want := make([]byte, 32)
	want[30], want[31] = 0xde, 0xad
	if !bytes.Equal(addr, want) {
		t.Fatalf("address word = %x, want %x", addr, want)
	}
	// uint64 → big-endian right-aligned in a 32-byte word.
	n, err := encodeField(Field{"nonce", "uint64"}, uint64(7))
	if err != nil {
		t.Fatalf("uint64: %v", err)
	}
	if len(n) != 32 || n[31] != 7 {
		t.Fatalf("uint64 word = %x", n)
	}
}

func TestEncodeFieldErrors(t *testing.T) {
	if _, err := encodeField(Field{"x", "address"}, "0xzz"); err == nil {
		t.Fatal("expected bad-address error")
	}
	if _, err := encodeField(Field{"x", "address"}, "0x1234"); err == nil {
		t.Fatal("expected wrong-length address error")
	}
	if _, err := encodeField(Field{"x", "bytes32"}, "0x00"); err == nil {
		t.Fatal("expected unknown-type error")
	}
	if _, err := encodeField(Field{"x", "string"}, uint64(1)); err == nil {
		t.Fatal("expected wrong-Go-type error")
	}
}

func TestUserSignedTypeString(t *testing.T) {
	got := userSignedTypeString("HyperliquidTransaction:ApproveAgent", []Field{
		{"hyperliquidChain", "string"}, {"agentAddress", "address"}, {"agentName", "string"}, {"nonce", "uint64"},
	})
	want := "HyperliquidTransaction:ApproveAgent(string hyperliquidChain,address agentAddress,string agentName,uint64 nonce)"
	if got != want {
		t.Fatalf("type string = %q", got)
	}
}
```

- [ ] **Step 2: Run it, expect fail**

Run: `cd /Users/bill/Documents/GitHub/HyperSolid/backend && go test ./internal/hl/ -run "TestEncodeField|TestUserSignedTypeString"`
Expected: FAIL (compile error — `encodeField`/`Field`/`userSignedTypeString` undefined).

- [ ] **Step 3: Implement** — create `backend/internal/hl/usersigned.go`:

```go
package hl

import (
	"encoding/hex"
	"fmt"
	"math/big"
	"strings"
)

// Field is one EIP-712 typed field. Type ∈ "string" | "address" | "uint64".
type Field struct {
	Name string
	Type string
}

// encodeField encodes a single EIP-712 field value to its 32-byte word.
func encodeField(f Field, val any) ([]byte, error) {
	switch f.Type {
	case "string":
		s, ok := val.(string)
		if !ok {
			return nil, fmt.Errorf("field %q: expected string, got %T", f.Name, val)
		}
		h := keccak([]byte(s))
		return h[:], nil
	case "address":
		s, ok := val.(string)
		if !ok {
			return nil, fmt.Errorf("field %q: expected address string, got %T", f.Name, val)
		}
		b, err := hex.DecodeString(strings.TrimPrefix(strings.ToLower(s), "0x"))
		if err != nil {
			return nil, fmt.Errorf("field %q: bad address hex: %w", f.Name, err)
		}
		if len(b) != 20 {
			return nil, fmt.Errorf("field %q: address must be 20 bytes, got %d", f.Name, len(b))
		}
		out := make([]byte, 32)
		copy(out[12:], b)
		return out, nil
	case "uint64":
		n, ok := val.(uint64)
		if !ok {
			return nil, fmt.Errorf("field %q: expected uint64, got %T", f.Name, val)
		}
		return word(new(big.Int).SetUint64(n)), nil
	default:
		return nil, fmt.Errorf("field %q: unsupported type %q", f.Name, f.Type)
	}
}

// userSignedTypeString builds the EIP-712 encodeType string: `Primary(type1 name1,type2 name2,...)`.
func userSignedTypeString(primaryType string, fields []Field) string {
	var sb strings.Builder
	sb.WriteString(primaryType)
	sb.WriteByte('(')
	for i, f := range fields {
		if i > 0 {
			sb.WriteByte(',')
		}
		sb.WriteString(f.Type)
		sb.WriteByte(' ')
		sb.WriteString(f.Name)
	}
	sb.WriteByte(')')
	return sb.String()
}

// UserSignedDigest builds the EIP-712 digest for a HyperliquidSignTransaction-domain action.
// `message` maps each field name to its value (string, a 0x-address string, or uint64).
func UserSignedDigest(primaryType string, fields []Field, chainID uint64, message map[string]any) ([32]byte, error) {
	typeHash := keccak([]byte(userSignedTypeString(primaryType, fields)))
	parts := make([][]byte, 0, len(fields)+1)
	parts = append(parts, typeHash[:])
	for _, f := range fields {
		val, ok := message[f.Name]
		if !ok {
			return [32]byte{}, fmt.Errorf("missing message field %q", f.Name)
		}
		w, err := encodeField(f, val)
		if err != nil {
			return [32]byte{}, err
		}
		parts = append(parts, w)
	}
	structHash := keccak(parts...)

	domainTypeHash := keccak([]byte("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"))
	nameHash := keccak([]byte("HyperliquidSignTransaction"))
	versionHash := keccak([]byte("1"))
	chainWord := word(new(big.Int).SetUint64(chainID))
	verifyingContract := make([]byte, 32) // address(0)
	domainSeparator := keccak(domainTypeHash[:], nameHash[:], versionHash[:], chainWord, verifyingContract)

	return keccak([]byte{0x19, 0x01}, domainSeparator[:], structHash[:]), nil
}
```

- [ ] **Step 4: Run it, expect pass**

Run: `cd /Users/bill/Documents/GitHub/HyperSolid/backend && go test ./internal/hl/ -run "TestEncodeField|TestUserSignedTypeString"`
Expected: PASS. Also `go vet ./...` clean.

- [ ] **Step 5: Commit**

```bash
cd /Users/bill/Documents/GitHub/HyperSolid && git add backend/internal/hl/usersigned.go backend/internal/hl/usersigned_test.go && git commit --no-verify -m "feat(backend): generic user-signed EIP-712 digest (string/address/uint64)

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

## Task 3: `ApproveAgentDigest` + golden digest assertion

**Files:**
- Modify: `backend/internal/hl/usersigned.go`
- Test: `backend/internal/hl/golden_usersigned_test.go`

- [ ] **Step 1: Write the failing test** — create `backend/internal/hl/golden_usersigned_test.go`:

```go
package hl

import (
	"encoding/hex"
	"encoding/json"
	"os"
	"testing"
)

type usVector struct {
	Name             string    `json:"name"`
	SignatureChainID string    `json:"signatureChainId"`
	HyperliquidChain string    `json:"hyperliquidChain"`
	AgentAddress     string    `json:"agentAddress"`
	AgentName        string    `json:"agentName"`
	Nonce            uint64    `json:"nonce"`
	PrivKey          string    `json:"privKey"`
	Digest           string    `json:"digest"`
	Sig              goldenSig `json:"sig"` // reuse goldenSig from golden_test.go
}

func loadUserGolden(t *testing.T) []usVector {
	t.Helper()
	raw, err := os.ReadFile("testdata/golden_usersigned.json")
	if err != nil {
		t.Fatalf("read golden_usersigned.json: %v", err)
	}
	var vs []usVector
	if err := json.Unmarshal(raw, &vs); err != nil {
		t.Fatalf("parse: %v", err)
	}
	if len(vs) == 0 {
		t.Fatal("golden_usersigned.json is empty")
	}
	return vs
}

func inputOf(v usVector) ApproveAgentInput {
	return ApproveAgentInput{
		SignatureChainID: v.SignatureChainID,
		HyperliquidChain: v.HyperliquidChain,
		AgentAddress:     v.AgentAddress,
		AgentName:        v.AgentName,
		Nonce:            v.Nonce,
	}
}

func TestApproveAgentDigestGolden(t *testing.T) {
	for _, v := range loadUserGolden(t) {
		t.Run(v.Name, func(t *testing.T) {
			got, err := ApproveAgentDigest(inputOf(v))
			if err != nil {
				t.Fatalf("ApproveAgentDigest: %v", err)
			}
			if hex.EncodeToString(got[:]) != v.Digest[2:] {
				t.Fatalf("digest = 0x%s, want %s", hex.EncodeToString(got[:]), v.Digest)
			}
		})
	}
}
```

- [ ] **Step 2: Run it, expect fail**

Run: `cd /Users/bill/Documents/GitHub/HyperSolid/backend && go test ./internal/hl/ -run "TestApproveAgentDigestGolden"`
Expected: FAIL (compile error — `ApproveAgentInput`/`ApproveAgentDigest` undefined).

- [ ] **Step 3: Implement** — edit `backend/internal/hl/usersigned.go`.

First, add `"strconv"` to the file's EXISTING top-of-file import block (which already has `encoding/hex`, `fmt`, `math/big`, `strings`). Go requires all imports at the top — do NOT write a second `import (...)` group lower in the file.

Then append these declarations to the end of the file:

```go
// ApproveAgentInput is the semantic input for an approveAgent user-signed action.
type ApproveAgentInput struct {
	SignatureChainID string // hex, e.g. "0xa4b1" (drives the domain chainId)
	HyperliquidChain string // "Mainnet" | "Testnet" (signed replay-protection field)
	AgentAddress     string // 0x… 20-byte
	AgentName        string // "" when none
	Nonce            uint64
}

// approveAgentFields is the ordered EIP-712 type table for HyperliquidTransaction:ApproveAgent.
var approveAgentFields = []Field{
	{"hyperliquidChain", "string"},
	{"agentAddress", "address"},
	{"agentName", "string"},
	{"nonce", "uint64"},
}

// ApproveAgentDigest builds the EIP-712 digest for an approveAgent action.
func ApproveAgentDigest(in ApproveAgentInput) ([32]byte, error) {
	chainID, err := parseHexChainID(in.SignatureChainID)
	if err != nil {
		return [32]byte{}, err
	}
	message := map[string]any{
		"hyperliquidChain": in.HyperliquidChain,
		"agentAddress":     in.AgentAddress,
		"agentName":        in.AgentName,
		"nonce":            in.Nonce,
	}
	return UserSignedDigest("HyperliquidTransaction:ApproveAgent", approveAgentFields, chainID, message)
}

func parseHexChainID(s string) (uint64, error) {
	h := strings.TrimPrefix(strings.ToLower(s), "0x")
	if h == "" {
		return 0, fmt.Errorf("empty signatureChainId")
	}
	return strconv.ParseUint(h, 16, 64)
}
```

- [ ] **Step 4: Run it, expect pass**

Run: `cd /Users/bill/Documents/GitHub/HyperSolid/backend && go test ./internal/hl/ -run "TestApproveAgentDigestGolden" -v`
Expected: PASS for all 3 vectors (proves the domain `HyperliquidSignTransaction`/real-chainId + the ApproveAgent struct hashing match viem byte-for-byte, incl. the empty-agentName testnet vector). Then `go test ./... && go vet ./...` → all green.

If a vector mismatches, report got-vs-want and STOP (do NOT edit the golden file) — it's a real EIP-712 bug (check field order, the type string, the address padding, or the chainId parse).

- [ ] **Step 5: Commit**

```bash
cd /Users/bill/Documents/GitHub/HyperSolid && git add backend/internal/hl/usersigned.go backend/internal/hl/golden_usersigned_test.go && git commit --no-verify -m "feat(backend): ApproveAgentDigest + golden digest assertion (byte-exact vs viem)

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

## Task 4: `Signer.SignApproveAgent` + golden signature assertion

**Files:**
- Modify: `backend/internal/hl/signer.go`
- Test: `backend/internal/hl/golden_usersigned_test.go`

- [ ] **Step 1: Write the failing test** — append to `backend/internal/hl/golden_usersigned_test.go`:

```go
func TestSignApproveAgentGolden(t *testing.T) {
	for _, v := range loadUserGolden(t) {
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
			sig, err := s.SignApproveAgent(inputOf(v))
			if err != nil {
				t.Fatalf("SignApproveAgent: %v", err)
			}
			gotR := "0x" + hex.EncodeToString(sig.R[:])
			gotS := "0x" + hex.EncodeToString(sig.S[:])
			if gotR != v.Sig.R || gotS != v.Sig.S || int(sig.V) != v.Sig.V {
				t.Fatalf("sig = {r:%s s:%s v:%d}, want {r:%s s:%s v:%d}", gotR, gotS, sig.V, v.Sig.R, v.Sig.S, v.Sig.V)
			}
		})
	}
}
```

- [ ] **Step 2: Run it, expect fail**

Run: `cd /Users/bill/Documents/GitHub/HyperSolid/backend && go test ./internal/hl/ -run "TestSignApproveAgentGolden"`
Expected: FAIL (compile error — `SignApproveAgent` undefined).

- [ ] **Step 3: Implement** — add the method to `backend/internal/hl/signer.go` (next to `SignL1Action`, mirroring its lock/closed guard):

```go
// SignApproveAgent signs an approveAgent user-signed action (HyperliquidSignTransaction domain).
func (s *Signer) SignApproveAgent(in ApproveAgentInput) (Sig, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	if s.closed || s.key == nil {
		return Sig{}, errors.New("signer: closed")
	}
	digest, err := ApproveAgentDigest(in)
	if err != nil {
		return Sig{}, err
	}
	return signDigest(s.key, digest)
}
```
(`errors` is already imported in signer.go.)

- [ ] **Step 4: Run it, expect pass**

Run: `cd /Users/bill/Documents/GitHub/HyperSolid/backend && go test ./internal/hl/ -run "TestSignApproveAgentGolden" -v`
Expected: PASS for all 3 vectors (r/s/v byte-for-byte vs the TS `signUserSignedAction`).

Then the full gate:
`cd /Users/bill/Documents/GitHub/HyperSolid/backend && go test ./... && go vet ./... && go test -race ./internal/hl/`
Expected: all green — L1 (18) + user-signed (3 digest + 3 sig) goldens + unit tests; vet clean; no data race.

- [ ] **Step 5: Commit**

```bash
cd /Users/bill/Documents/GitHub/HyperSolid && git add backend/internal/hl/signer.go backend/internal/hl/golden_usersigned_test.go && git commit --no-verify -m "feat(backend): Signer.SignApproveAgent + golden signature assertion

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

## Final verification

- [ ] `cd backend && go build ./... && go vet ./... && go test ./... && go test -race ./internal/hl/` — all green. User-signed goldens (3 digest + 3 signature) pass byte-for-byte vs `@nktkas/hyperliquid` `signUserSignedAction` + viem, covering agentName present/empty and Mainnet/Testnet + both chain ids; the merged L1 goldens still pass.
- [ ] `server/` and `mobile/` untouched except `mobile/scripts/gen-golden-vectors.mjs` (generator only). The L1 `golden.json` is byte-unchanged.
- [ ] Report the user-signed vector count (3) and that digest + signature match the oracle. Await the user's explicit "push".

## Self-review notes (spec coverage)

- Generic user-signed EIP-712 hasher (string/address/uint64, ordered field table) → Task 2. ✓
- `HyperliquidSignTransaction` domain, chainId from `signatureChainId` (real chain) → Tasks 2–3. ✓
- approveAgent field order + `hyperliquidChain` replay field + agentName "" case → Task 3 (+ Task 1 vectors cover empty name + Mainnet/Testnet). ✓
- Signer method reusing the merged secp256k1 path + guards → Task 4. ✓
- Cross-language golden vectors (extended generator + separate `golden_usersigned.json` + Go digest/sig assertions) → Tasks 1, 3, 4. ✓
- Fail-closed on malformed input (bad address/type/chainId) → Task 2/3 (encodeField + parseHexChainID errors). ✓
- L1 path + golden.json untouched; gate grows → Task 1 Step 2 check + final. ✓
- Non-goals (other user-signed actions, multi-sig, uint256, KMS, …) → not implemented. ✓
