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
