package nonce

import (
	"sync"
	"testing"
	"time"
)

func TestNextStrictlyIncreasesOnStalledClock(t *testing.T) {
	a := New(func() int64 { return 1000 })
	n1 := a.Next("k1")
	n2 := a.Next("k1")
	if n1 != 1000 {
		t.Fatalf("n1 = %d, want 1000", n1)
	}
	if n2 != n1+1 {
		t.Fatalf("n2 = %d, want %d (strictly increasing)", n2, n1+1)
	}
}

func TestNextStrictlyIncreasesOnRegressingClock(t *testing.T) {
	now := int64(5000)
	a := New(func() int64 { return now })
	n1 := a.Next("k1")
	now = 4000
	n2 := a.Next("k1")
	if n2 <= n1 {
		t.Fatalf("n2 = %d must be > n1 = %d despite clock regression", n2, n1)
	}
}

func TestNextFollowsAdvancingClock(t *testing.T) {
	now := int64(1000)
	a := New(func() int64 { return now })
	_ = a.Next("k1")
	now = 2000
	if n := a.Next("k1"); n != 2000 {
		t.Fatalf("n = %d, want 2000 (follows the clock)", n)
	}
}

func TestNextPerKeyIsolation(t *testing.T) {
	a := New(func() int64 { return 1000 })
	na := a.Next("a")
	nb := a.Next("b")
	if na != 1000 || nb != 1000 {
		t.Fatalf("na = %d, nb = %d, want both 1000 (per-key isolation)", na, nb)
	}
}

func TestNextConcurrentUnique(t *testing.T) {
	a := New(func() int64 { return 1000 })
	const n = 500
	var wg sync.WaitGroup
	results := make([]uint64, n)
	for i := 0; i < n; i++ {
		wg.Add(1)
		go func(idx int) {
			defer wg.Done()
			results[idx] = a.Next("k1")
		}(i)
	}
	wg.Wait()
	seen := make(map[uint64]bool, n)
	for _, v := range results {
		if seen[v] {
			t.Fatalf("duplicate nonce %d under concurrency", v)
		}
		seen[v] = true
	}
	if len(seen) != n {
		t.Fatalf("got %d unique nonces, want %d", len(seen), n)
	}
}

func TestWithinWindow(t *testing.T) {
	now := int64(1_700_000_000_000)
	cases := []struct {
		name  string
		nonce uint64
		want  bool
	}{
		{"exactly now", uint64(now), true},
		{"just inside past bound", uint64(now - windowPastMs + 1), true},
		{"at past bound is excluded", uint64(now - windowPastMs), false},
		{"just inside future bound", uint64(now + windowFutureMs - 1), true},
		{"at future bound is excluded", uint64(now + windowFutureMs), false},
	}
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			if got := WithinWindow(c.nonce, now); got != c.want {
				t.Fatalf("WithinWindow(%d, %d) = %v, want %v", c.nonce, now, got, c.want)
			}
		})
	}
}

func TestNewNilClockUsesRealTime(t *testing.T) {
	a := New(nil)
	n := a.Next("k1")
	if !WithinWindow(n, time.Now().UnixMilli()) {
		t.Fatalf("nonce %d from real clock should be within the current window", n)
	}
}
