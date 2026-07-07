// Package nonce hands out strictly-increasing millisecond-timestamp nonces per
// key (the single writer WITHIN a process; the cross-process lease/fencing
// single-writer is a separate concern — see docs/BACKEND-ARCHITECTURE.md §5).
package nonce

import (
	"sync"
	"time"
)

// Allocator issues per-key monotonic ms nonces. Safe for concurrent use.
type Allocator struct {
	nowMs func() int64
	mu    sync.Mutex
	last  map[string]uint64
}

// New returns an Allocator. If nowMs is nil, it uses the real clock
// (time.Now().UnixMilli()); tests inject a fake clock for determinism.
func New(nowMs func() int64) *Allocator {
	if nowMs == nil {
		nowMs = func() int64 { return time.Now().UnixMilli() }
	}
	return &Allocator{nowMs: nowMs, last: make(map[string]uint64)}
}

// Next returns a strictly-increasing ms nonce for keyID: n = max(now, last+1).
// A stalled or regressing clock still yields a strictly higher nonce than the
// previous one for that key, so a nonce is never reused. Per-key isolated.
func (a *Allocator) Next(keyID string) uint64 {
	a.mu.Lock()
	defer a.mu.Unlock()
	n := uint64(a.nowMs())
	if last := a.last[keyID]; n <= last {
		n = last + 1
	}
	a.last[keyID] = n
	return n
}

// HL accepts a nonce only within (T-2days, T+1day) of the current time.
const (
	windowPastMs   int64 = 2 * 24 * 60 * 60 * 1000 // 2 days
	windowFutureMs int64 = 1 * 24 * 60 * 60 * 1000 // 1 day
)

// WithinWindow reports whether a nonce (ms) is inside HL's accepted open
// interval (nowMs - 2d, nowMs + 1d).
func WithinWindow(nonce uint64, nowMs int64) bool {
	n := int64(nonce)
	return n > nowMs-windowPastMs && n < nowMs+windowFutureMs
}
