package hl

import (
	"encoding/hex"
	"encoding/json"
	"os"
	"testing"
)

type moreVector struct {
	Name             string    `json:"name"`
	Action           string    `json:"action"`
	SignatureChainID string    `json:"signatureChainId"`
	HyperliquidChain string    `json:"hyperliquidChain"`
	Destination      string    `json:"destination"`
	Amount           string    `json:"amount"`
	Time             uint64    `json:"time"`
	MaxFeeRate       string    `json:"maxFeeRate"`
	Builder          string    `json:"builder"`
	Nonce            uint64    `json:"nonce"`
	PrivKey          string    `json:"privKey"`
	Digest           string    `json:"digest"`
	Sig              goldenSig `json:"sig"`
}

func loadMoreGolden(t *testing.T) []moreVector {
	t.Helper()
	raw, err := os.ReadFile("testdata/golden_usersigned_more.json")
	if err != nil {
		t.Fatalf("read: %v", err)
	}
	var vs []moreVector
	if err := json.Unmarshal(raw, &vs); err != nil {
		t.Fatalf("parse: %v", err)
	}
	if len(vs) == 0 {
		t.Fatal("empty golden_usersigned_more.json")
	}
	return vs
}

func moreDigest(t *testing.T, v moreVector) [32]byte {
	t.Helper()
	var d [32]byte
	var err error
	switch v.Action {
	case "withdraw3":
		d, err = Withdraw3Digest(Withdraw3Input{v.SignatureChainID, v.HyperliquidChain, v.Destination, v.Amount, v.Time})
	case "usdSend":
		d, err = UsdSendDigest(UsdSendInput{v.SignatureChainID, v.HyperliquidChain, v.Destination, v.Amount, v.Time})
	case "approveBuilderFee":
		d, err = ApproveBuilderFeeDigest(ApproveBuilderFeeInput{v.SignatureChainID, v.HyperliquidChain, v.MaxFeeRate, v.Builder, v.Nonce})
	default:
		t.Fatalf("unknown action %q", v.Action)
	}
	if err != nil {
		t.Fatalf("digest: %v", err)
	}
	return d
}

func TestMoreDigestGolden(t *testing.T) {
	for _, v := range loadMoreGolden(t) {
		t.Run(v.Name, func(t *testing.T) {
			got := moreDigest(t, v)
			if hex.EncodeToString(got[:]) != v.Digest[2:] {
				t.Fatalf("digest = 0x%s, want %s", hex.EncodeToString(got[:]), v.Digest)
			}
		})
	}
}
