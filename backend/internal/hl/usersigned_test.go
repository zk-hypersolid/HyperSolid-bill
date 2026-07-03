package hl

import (
	"bytes"
	"encoding/hex"
	"testing"
)

func TestEncodeField(t *testing.T) {
	got, err := encodeField(Field{"agentName", "string"}, "")
	if err != nil {
		t.Fatalf("string: %v", err)
	}
	if hex.EncodeToString(got) != "c5d2460186f7233c927e7db2dcc703c0e500b653ca82273b7bfad8045d85a470" {
		t.Fatalf("keccak(\"\") = %x", got)
	}
	addr, err := encodeField(Field{"agentAddress", "address"}, "0x000000000000000000000000000000000000dEaD")
	if err != nil {
		t.Fatalf("address: %v", err)
	}
	want := make([]byte, 32)
	want[30], want[31] = 0xde, 0xad
	if !bytes.Equal(addr, want) {
		t.Fatalf("address word = %x, want %x", addr, want)
	}
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
