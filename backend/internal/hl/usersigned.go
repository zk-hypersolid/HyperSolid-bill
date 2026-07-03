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
