export function sma(values: number[], period: number): (number | null)[] {
  return values.map((_, i) => {
    if (i + 1 < period) return null;
    let sum = 0;
    for (let j = i + 1 - period; j <= i; j++) sum += values[j];
    return sum / period;
  });
}

export function ema(values: number[], period: number): (number | null)[] {
  const k = 2 / (period + 1);
  const out: (number | null)[] = values.map(() => null);
  let prev: number | null = null;
  for (let i = 0; i < values.length; i++) {
    if (i + 1 < period) continue;
    if (prev === null) {
      let sum = 0;
      for (let j = i + 1 - period; j <= i; j++) sum += values[j];
      prev = sum / period;
    } else {
      prev = values[i] * k + prev * (1 - k);
    }
    out[i] = prev;
  }
  return out;
}

export function bollinger(values: number[], period: number, mult = 2) {
  const mid = sma(values, period);
  const upper: (number | null)[] = values.map(() => null);
  const lower: (number | null)[] = values.map(() => null);
  for (let i = 0; i < values.length; i++) {
    const m = mid[i];
    if (m === null) continue;
    let variance = 0;
    for (let j = i + 1 - period; j <= i; j++) variance += (values[j] - m) ** 2;
    const sd = Math.sqrt(variance / period);
    upper[i] = m + mult * sd;
    lower[i] = m - mult * sd;
  }
  return { mid, upper, lower };
}

export function rsi(values: number[], period = 14): (number | null)[] {
  const out: (number | null)[] = values.map(() => null);
  let avgGain = 0;
  let avgLoss = 0;
  for (let i = 1; i < values.length; i++) {
    const diff = values[i] - values[i - 1];
    const gain = Math.max(0, diff);
    const loss = Math.max(0, -diff);
    if (i <= period) {
      avgGain += gain;
      avgLoss += loss;
      if (i === period) {
        avgGain /= period;
        avgLoss /= period;
        out[i] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);
      }
    } else {
      avgGain = (avgGain * (period - 1) + gain) / period;
      avgLoss = (avgLoss * (period - 1) + loss) / period;
      out[i] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);
    }
  }
  return out;
}

/** MACD: macd line = EMA(fast) − EMA(slow); signal = EMA(signal) of the macd line; histogram = macd − signal. */
export function macd(
  values: number[],
  fast = 12,
  slow = 26,
  signalPeriod = 9,
): { macd: (number | null)[]; signal: (number | null)[]; histogram: (number | null)[] } {
  const ef = ema(values, fast);
  const es = ema(values, slow);
  const macdLine = values.map((_, i) => (ef[i] !== null && es[i] !== null ? ef[i]! - es[i]! : null));

  const compact: number[] = [];
  const idx: number[] = [];
  macdLine.forEach((m, i) => {
    if (m !== null) {
      compact.push(m);
      idx.push(i);
    }
  });
  const sigCompact = ema(compact, signalPeriod);
  const signal: (number | null)[] = values.map(() => null);
  sigCompact.forEach((v, j) => {
    if (v !== null) signal[idx[j]] = v;
  });

  const histogram = macdLine.map((m, i) => (m !== null && signal[i] !== null ? m - signal[i]! : null));
  return { macd: macdLine, signal, histogram };
}

/** Stochastic KDJ over `period`: K/D are 1/3 smoothing of the raw stochastic (RSV); J = 3K − 2D. */
export function kdj(
  highs: number[],
  lows: number[],
  closes: number[],
  period = 9,
): { k: (number | null)[]; d: (number | null)[]; j: (number | null)[] } {
  const n = closes.length;
  const k: (number | null)[] = closes.map(() => null);
  const d: (number | null)[] = closes.map(() => null);
  const j: (number | null)[] = closes.map(() => null);
  let kPrev = 50;
  let dPrev = 50;
  for (let i = 0; i < n; i++) {
    if (i + 1 < period) continue;
    let hh = -Infinity;
    let ll = Infinity;
    for (let m = i + 1 - period; m <= i; m++) {
      hh = Math.max(hh, highs[m]);
      ll = Math.min(ll, lows[m]);
    }
    const rsv = hh === ll ? 100 : ((closes[i] - ll) / (hh - ll)) * 100;
    kPrev = (2 / 3) * kPrev + (1 / 3) * rsv;
    dPrev = (2 / 3) * dPrev + (1 / 3) * kPrev;
    k[i] = kPrev;
    d[i] = dPrev;
    j[i] = 3 * kPrev - 2 * dPrev;
  }
  return { k, d, j };
}

/** Parabolic SAR (Wilder): trend-following stop-and-reverse dots. `step`/`max` are the AF bounds. */
export function sar(highs: number[], lows: number[], step = 0.02, max = 0.2): (number | null)[] {
  const n = highs.length;
  const out: (number | null)[] = highs.map(() => null);
  if (n < 2) return out;
  let trendUp = highs[1] >= highs[0];
  let af = step;
  let ep = trendUp ? highs[0] : lows[0];
  let sarVal = trendUp ? lows[0] : highs[0];
  out[0] = sarVal;
  for (let i = 1; i < n; i++) {
    sarVal = sarVal + af * (ep - sarVal);
    const prevLow2 = i >= 2 ? lows[i - 2] : lows[i - 1];
    const prevHigh2 = i >= 2 ? highs[i - 2] : highs[i - 1];
    if (trendUp) {
      sarVal = Math.min(sarVal, lows[i - 1], prevLow2);
      if (lows[i] < sarVal) {
        trendUp = false;
        sarVal = ep;
        ep = lows[i];
        af = step;
      } else if (highs[i] > ep) {
        ep = highs[i];
        af = Math.min(max, af + step);
      }
    } else {
      sarVal = Math.max(sarVal, highs[i - 1], prevHigh2);
      if (highs[i] > sarVal) {
        trendUp = true;
        sarVal = ep;
        ep = highs[i];
        af = step;
      } else if (lows[i] < ep) {
        ep = lows[i];
        af = Math.min(max, af + step);
      }
    }
    out[i] = sarVal;
  }
  return out;
}
