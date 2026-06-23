// HYPERSOLID — Redesign v2 (frontend-design pass). All 6 screens, Electrum phosphor
// theme, English/i18n-canonical, fixing the PM P0/P1 review:
//  real OS status bar + slim headers; signature oscilloscope trace used with restraint;
//  surface cards (not saturated brand fills) for AA contrast; ▲▼ on every up/down;
//  dense Markets (search + movers + funding); Trade with inline order book (no empty gap);
//  consistent number precision; unconfirmed-order state.
//   node render-core.js redesign-v2.html redesign-v2.png   (NOT committed)
const fs = require('fs');

// ---- Electrum phosphor tokens (refined for contrast) ----
const t = {
  bg: '#0A1217', surf: '#0F1A20', surf2: '#0C151A', line: '#1C2A32', line2: '#263742',
  text: '#EAF1F4', dim: '#8BA0AB', faint: '#5E6E78',
  brand: '#E8C98F', glow: '#F6E4BE', up: '#37D69A', down: '#FF6168', warn: '#FFA53D',
  upS: 'rgba(55,214,154,.13)', downS: 'rgba(255,97,104,.13)', brandS: 'rgba(232,201,143,.12)',
  grid: 'rgba(232,201,143,.05)',
};
const arr = (up) => up ? '▲' : '▼';

function svg(inner, size, sw, fill) {
  return `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="${fill || 'none'}" stroke="${fill ? 'none' : 'currentColor'}" stroke-width="${sw || 1.75}" stroke-linecap="round" stroke-linejoin="round" style="display:block">${inner}</svg>`;
}
const ICON = {
  markets: (a) => `<polyline points="2,14 6,14 8.5,8 11,17 13.5,6 16,14 22,14"/>${a ? '<circle cx="13.5" cy="6" r="1.6" fill="currentColor" stroke="none"/>' : ''}`,
  trade: () => `<path d="M8 20V5"/><path d="M4.5 8.5 8 5l3.5 3.5"/><path d="M16 4v15"/><path d="M12.5 15.5 16 19l3.5-3.5"/>`,
  positions: () => `<path d="M12 3 21 8 12 13 3 8Z"/><path d="M3 12.5 12 17.5 21 12.5"/>`,
  strategy: (a) => `<circle cx="12" cy="12" r="7.5"/><circle cx="12" cy="12" r="2.5" ${a ? 'fill="currentColor" stroke="none"' : ''}/><path d="M12 1.5V4.5"/><path d="M12 19.5V22.5"/><path d="M1.5 12H4.5"/><path d="M19.5 12H22.5"/>`,
  wallet: () => `<rect x="3" y="6" width="18" height="13" rx="2.5"/><path d="M3 10h18"/><circle cx="16.5" cy="14.5" r="1.2" fill="currentColor" stroke="none"/>`,
  star: () => `<path d="M12 3.4 14.6 9l6.1.7-4.5 4.1 1.2 6L12 17l-5.4 2.8 1.2-6-4.5-4.1L9.4 9Z"/>`,
  search: () => `<circle cx="10.5" cy="10.5" r="6.3"/><path d="M20 20 15.6 15.6"/>`,
  back: () => `<path d="M15 5l-7 7 7 7"/>`,
  caret: () => `<path d="M6 9l6 6 6-6"/>`,
  chevR: () => `<path d="M9 6l6 6-6 6"/>`,
  shield: () => `<path d="M12 3 19 6v5c0 4.5-3 7.6-7 9-4-1.4-7-4.5-7-9V6Z"/><path d="M9 12l2 2 4-4"/>`,
  bolt: () => `<path d="M13 2 5 13h6l-1 9 8-12h-6z"/>`,
  globe: () => `<circle cx="12" cy="12" r="9"/><path d="M3 12h18"/><path d="M12 3a14 14 0 0 1 0 18a14 14 0 0 1 0-18"/>`,
  contrast: () => `<circle cx="12" cy="12" r="9"/><path d="M12 3v18" /><path d="M12 3a9 9 0 0 1 0 18Z" fill="currentColor" stroke="none"/>`,
  key: () => `<circle cx="8" cy="9" r="4"/><path d="M11 11l9 9"/><path d="M17 17l2-2"/>`,
  grid: () => `<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>`,
  repeat: () => `<path d="M4 9a6 6 0 0 1 6-6h7"/><path d="M14 1l3 2-3 2"/><path d="M20 15a6 6 0 0 1-6 6H7"/><path d="M10 23l-3-2 3-2"/>`,
  plus: () => `<path d="M12 5v14M5 12h14"/>`,
  alert: () => `<path d="M12 3 19.5 5.8V11c0 4.6-3.2 7.9-7.5 9.3C7.7 18.9 4.5 15.6 4.5 11V5.8Z"/><path d="M12 8.5V12.6"/><path d="M12 16h.01"/>`,
};
function ico(name, px, color, a, sw, fill) {
  return `<span style="color:${color};display:inline-flex">${svg(ICON[name](a), px, sw, fill)}</span>`;
}

// real OS status bar (cellular / wifi / battery)
function osbar() {
  const cell = `<svg width="18" height="12" viewBox="0 0 18 12"><g fill="${t.text}">
    <rect x="0" y="7" width="3" height="5" rx="1"/><rect x="5" y="5" width="3" height="7" rx="1"/><rect x="10" y="3" width="3" height="9" rx="1"/><rect x="15" y="1" width="3" height="11" rx="1"/></g></svg>`;
  const wifi = `<svg width="17" height="12" viewBox="0 0 17 12" fill="none" stroke="${t.text}" stroke-width="1.5" stroke-linecap="round"><path d="M1 4.2a11 11 0 0 1 15 0"/><path d="M3.6 7a7.3 7.3 0 0 1 9.8 0"/><path d="M6.2 9.6a3.6 3.6 0 0 1 4.6 0"/><circle cx="8.5" cy="11.4" r="0.6" fill="${t.text}" stroke="none"/></svg>`;
  const batt = `<svg width="26" height="13" viewBox="0 0 26 13"><rect x="0.5" y="0.5" width="22" height="12" rx="3" fill="none" stroke="${t.dim}" opacity="0.6"/><rect x="2" y="2" width="15" height="9" rx="1.5" fill="${t.up}"/><rect x="23.5" y="4" width="2" height="5" rx="1" fill="${t.dim}" opacity="0.6"/></svg>`;
  return `<div class="osbar"><span class="ostime">9:41</span><span class="osr">${cell}${wifi}${batt}</span></div>`;
}

// signature oscilloscope trace (home header only)
function trace() {
  const h = 22, w = 348; let d = `M0 ${h / 2}`; const n = 70;
  for (let i = 1; i <= n; i++) {
    const x = (i / n) * w;
    const s = Math.sin(i * 0.5 + 0.4) * 6 * 0.6 + Math.sin(i * 0.17 + 0.8) * 6 * 0.4 + Math.sin(i * 1.9 + 0.4) * 6 * 0.18;
    d += ` L${x.toFixed(1)} ${(h / 2 - s).toFixed(1)}`;
  }
  return `<div class="trace"><svg viewBox="0 0 ${w} ${h}" width="100%" height="${h}" preserveAspectRatio="none">
    <defs><filter id="tg"><feGaussianBlur stdDeviation="1.1"/></filter></defs>
    <path d="${d}" fill="none" stroke="${t.brand}" stroke-width="2.6" opacity="0.22" filter="url(#tg)"/>
    <path d="${d}" fill="none" stroke="${t.glow}" stroke-width="1"/></svg></div>`;
}
function spark(up, seed) {
  let d = 'M0 17'; const n = 22;
  for (let i = 1; i <= n; i++) { const x = (i / n) * 64; const y = 17 - (Math.sin(i * 0.7 + seed) * 4.5 + Math.sin(i * 0.32 + seed) * 3.5 + (up ? i * 0.22 : -i * 0.22)); d += ` L${x.toFixed(1)} ${Math.max(2, Math.min(32, y)).toFixed(1)}`; }
  return `<svg width="64" height="34" viewBox="0 0 64 34"><path d="${d}" fill="none" stroke="${up ? t.up : t.down}" stroke-width="1.5"/></svg>`;
}

const NAV = [['markets', 'Markets'], ['trade', 'Trade'], ['positions', 'Positions'], ['strategy', 'Strategy'], ['wallet', 'Wallet']];
function tabbar(active) {
  return `<div class="tabbar">${NAV.map(([k, l]) => { const on = k === active; return `<div class="tcell">${ico(k, 21, on ? t.brand : t.faint, on, 1.7)}<div class="tlbl" style="color:${on ? t.brand : t.faint}">${l}</div></div>`; }).join('')}</div>`;
}
// slim app header (no repeated wordmark/SIGNAL)
function head(title, opts = {}) {
  const left = opts.back ? `${ico('back', 21, t.text, 0, 2)}<b>${title}</b>${opts.tag ? `<span class="kpill">${opts.tag}</span>` : ''}` : `<b class="htitle">${title}</b>`;
  const right = opts.right || '';
  return `<div class="head">${osbar()}<div class="hrow"><span class="hl">${left}</span><span class="hr">${right}</span></div>${opts.trace ? trace() : ''}</div>`;
}

// ---- chart (detail) ----
const LO = 63919, HI = 64865, CUR = 64745;
function chart(w, h) {
  const shape = [0.42, 0.55, 0.38, 0.30, 0.16, 0.10, 0.05, 0.12, 0.22, 0.18, 0.28, 0.24, 0.33, 0.30, 0.26, 0.34, 0.30, 0.24, 0.31, 0.27, 0.33, 0.38, 0.30, 0.36, 0.42, 0.46, 0.55, 0.62, 0.70, 0.78, 0.74, 0.83, 0.90, 0.86, 0.94, 1.0, 0.96, 0.91, 0.88, 0.873];
  const px = (s) => LO + s * (HI - LO); const cs = [];
  for (let i = 0; i < shape.length; i++) { const o = px(i === 0 ? 0.42 : shape[i - 1]), c = px(shape[i]); cs.push([o, c, Math.min(HI, Math.max(o, c) + 22), Math.max(LO, Math.min(o, c) - 22)]); }
  const max = HI + 16, min = LO - 16, y = (v) => ((max - v) / (max - min)) * h, cw = w / cs.length; let body = '';
  [64865, 64550, 64234, 63919].forEach((p) => { body += `<line x1="0" y1="${y(p).toFixed(1)}" x2="${w}" y2="${y(p).toFixed(1)}" stroke="${t.grid}" stroke-width="1"/>`; });
  cs.forEach(([o, c, hi, lo], i) => { const x = i * cw + cw / 2, up = c >= o, col = up ? t.up : t.down, top = y(Math.max(o, c)), bot = y(Math.min(o, c)); body += `<line x1="${x.toFixed(1)}" y1="${y(hi).toFixed(1)}" x2="${x.toFixed(1)}" y2="${y(lo).toFixed(1)}" stroke="${col}" stroke-width="1.1"/><rect x="${(x - cw * 0.32).toFixed(1)}" y="${top.toFixed(1)}" width="${(cw * 0.64).toFixed(1)}" height="${Math.max(1.5, bot - top).toFixed(1)}" fill="${col}"/>`; });
  const cy = y(CUR); body += `<line x1="0" y1="${cy.toFixed(1)}" x2="${w}" y2="${cy.toFixed(1)}" stroke="${t.brand}" stroke-width="1" stroke-dasharray="3 4" opacity="0.85"/>`;
  return { svg: `<svg viewBox="0 0 ${w} ${h}" width="100%" height="${h}" preserveAspectRatio="none">${body}</svg>`, cy, axis: [64865, 64550, 64234, 63919].map((p) => ({ p, y: y(p) })), h };
}

// ====================== SCREENS ======================
// Real Hyperliquid mainnet top markets by 24h volume (live-fetched 2026-06-23):
// [sym, price, chg%, up, vol, funding]
const coins = [
  ['BTC', '63,825.5', 0.22, 1, '2.75B', '0.0013%'], ['ETH', '1,720.6', 0.07, 1, '1.63B', '0.0013%'],
  ['HYPE', '65.872', -1.88, 0, '606.50M', '0.0013%'], ['SOL', '71.450', -2.06, 0, '294.01M', '-0.0003%'],
  ['ZEC', '438.13', -0.07, 0, '105.64M', '-0.0009%'], ['XRP', '1.1261', -0.52, 0, '35.75M', '-0.0006%'],
  ['SUI', '0.71568', 2.27, 1, '35.53M', '0.0013%'], ['WLD', '0.62003', -0.55, 0, '32.03M', '0.0013%'],
];
// Testnet warning — loud at order-placing screens; absent on mainnet (asymmetric).
function tnstrip() {
  return `<div class="tnstrip">${ico('alert', 13, t.warn, 0, 1.8)}<span class="tnx">Testnet</span><span class="tnsub">· paper funds, not real money</span></div>`;
}
function retCurve(w, h) {
  const pts = [0.46, 0.4, 0.52, 0.47, 0.58, 0.5, 0.62, 0.7, 0.63, 0.76, 0.71, 0.82, 0.88, 0.8, 0.93, 1.0];
  const n = pts.length, X = (i) => (i / (n - 1)) * w, Y = (v) => h - v * (h - 6) - 3;
  const line = pts.map((v, i) => `${i ? 'L' : 'M'}${X(i).toFixed(1)} ${Y(v).toFixed(1)}`).join(' ');
  const area = `M0 ${h} ` + pts.map((v, i) => `L${X(i).toFixed(1)} ${Y(v).toFixed(1)}`).join(' ') + ` L${w} ${h} Z`;
  return `<svg viewBox="0 0 ${w} ${h}" width="100%" height="${h}" preserveAspectRatio="none"><defs><linearGradient id="rc" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${t.up}" stop-opacity="0.2"/><stop offset="1" stop-color="${t.up}" stop-opacity="0"/></linearGradient></defs><path d="${area}" fill="url(#rc)"/><path d="${line}" fill="none" stroke="${t.up}" stroke-width="1.6"/></svg>`;
}
function markets() {
  const rows = coins.map((c, i) => {
    const col = c[3] ? t.up : t.down, fav = i < 2 || i === 3;
    return `<div class="mrow"><div class="mleft">${ico('star', 16, fav ? t.brand : t.faint, 0, 0, fav ? t.brand : 'none')}
      <div><div class="tk">${c[0]}<span class="perp">PERP</span></div><div class="sub">Fund ${c[5]} · Vol ${c[4]}</div></div></div>
      <div class="mpx"><div class="big">${c[1]}</div><div class="chg" style="color:${col}"><span class="ar">${arr(c[3])}</span>${c[2] >= 0 ? '+' : ''}${c[2].toFixed(2)}%</div></div></div>`;
  }).join('');
  // Markets home: slim functional title + TESTNET network indicator (no brand wordmark, no decoration).
  return `${head('Markets', { right: `<span class="twarn">TESTNET</span>` })}
    <div class="pad">
      <div class="srch">${ico('search', 15, t.faint, 0, 1.8)}<span>Search markets</span></div>
      <div class="mtabs"><span class="mtab on">All</span><span class="mtab">Watchlist</span></div>
      <div class="mlist">${rows}</div></div>`;
}

function trade() {
  return `${head('BTC-USDC', { back: true, tag: 'PERP', right: `<span class="lastpx" style="color:${t.up}">64,731.5 ${arr(1)}</span>` })}
    ${tnstrip()}
    <div class="pad">
      <div class="bs"><button class="bbtn buy">Buy / Long</button><button class="bbtn sell">Sell / Short</button></div>
      <div class="otype">${['Limit', 'Market', 'Stop'].map((s, i) => `<span class="ot ${i === 0 ? 'on' : ''}">${s}</span>`).join('')}<span class="lev">20× Cross ${ico('caret', 11, t.brand, 0, 2)}</span></div>
      <div class="field"><span class="fl">Price · USDC</span><span class="fv">64,731.5</span></div>
      <div class="field"><span class="fl">Size · BTC</span><span class="fv ph">0.00</span></div>
      <div class="slider"><div class="track"><div class="fill" style="width:50%"></div><div class="knob" style="left:50%"></div></div>
        <div class="ticks">${['0', '25', '50', '75', '100%'].map((x) => `<span>${x}</span>`).join('')}</div></div>
      <div class="opts"><span class="optchip"><span class="optbox"></span>Reduce-only</span><span class="optchip"><span class="optbox"></span>Post-only</span></div>
      <div class="tpsl"><div class="tpslhd">Take profit / Stop loss<span class="tpsltog">Optional</span></div>
        <div class="tpslrow"><div class="tpf"><span class="tpfl">TP price</span><span class="tpfv">—</span></div><div class="tpf"><span class="tpfl">SL price</span><span class="tpfv">—</span></div></div></div>
      <div class="sum"><div class="sr"><span>Available</span><span>1,284.20 USDC</span></div><div class="sr"><span>Order value</span><span>≈ 161.83 USDC</span></div><div class="sr"><span>Est. liq. price</span><span>61,402.0</span></div></div>
      <button class="cta buyc">Buy / Long BTC</button></div>`;
}

function positions() {
  const ps = [['BTC', 1, '0.124', '20×', '61,240', '64,731', '+432.10', '+21.8%'], ['ETH', 0, '2.50', '10×', '3,110', '3,002', '+268.40', '+8.6%'], ['SOL', 1, '18.0', '5×', '151.20', '148.22', '-53.64', '-3.6%']];
  const rows = ps.map((p) => { const up = parseFloat(p[6]) >= 0; return `<div class="pcard"><div class="ph2"><span class="pcoin">${p[0]}<span class="perp">PERP</span></span>
    <span class="ptag ${p[1] ? 'long' : 'short'}">${p[1] ? 'Long' : 'Short'} · ${p[3]}</span><span class="ppnl" style="color:${up ? t.up : t.down}"><span class="ar">${arr(up)}</span>${p[6]} USDC</span></div>
    <div class="pg"><div><div class="gl">Size</div><div class="gv">${p[2]}</div></div><div><div class="gl">Entry</div><div class="gv">${p[4]}</div></div>
    <div><div class="gl">Mark</div><div class="gv">${p[5]}</div></div><div><div class="gl">ROE</div><div class="gv" style="color:${up ? t.up : t.down}">${p[7]}</div></div></div></div>`; }).join('');
  return `${head('Positions')}
    <div class="pad">
      <div class="eqcard"><div class="eqrule"></div><div class="eqtop"><span class="eql">Equity · USDC</span><span class="eqpill">Cross</span></div>
        <div class="eqv">12,840.55</div>
        <div class="eqrow"><div><div class="eql2">Available</div><div class="eqv2">1,284.20</div></div>
          <div><div class="eql2">Unrealized PnL</div><div class="eqv2" style="color:${t.up}"><span class="ar">${arr(1)}</span>+646.86</div></div>
          <div><div class="eql2">Margin ratio</div><div class="eqv2">3.4%</div></div></div>
        <div class="health"><div class="healthbar"><div class="healthfill" style="width:24%"></div></div><div class="healthlbl"><span>Account health</span><span style="color:${t.up}">Healthy · 3.4% margin</span></div></div></div>
      <div class="seg">${['Positions · 3', 'Orders · 2', 'History'].map((s, i) => `<span class="segc ${i === 0 ? 'on' : ''}">${s}</span>`).join('')}</div>
      <div class="plist">${rows}</div></div>`;
}

function strategy() {
  const cards = [['grid', 'Grid', 'BTC-USDC · Running', '+5.82%', 1], ['repeat', 'DCA', 'ETH · Every Monday', '+1.24%', 1]];
  const rows = cards.map((c) => `<div class="scard"><div class="sicon">${ico(c[0], 19, t.brand, 1, 1.7)}</div>
    <div class="smid"><div class="sname">${c[1]}</div><div class="sdesc">${c[2]}</div></div><div class="sret" style="color:${t.up}"><span class="ar">${arr(c[4])}</span>${c[3]}</div>${ico('chevR', 15, t.faint, 0, 2)}</div>`).join('');
  const tmpls = [['grid', 'Grid'], ['repeat', 'DCA'], ['bolt', 'TWAP'], ['shield', 'TP-SL']];
  const tchips = tmpls.map(([icn, n]) => `<div class="tmpl">${ico(icn, 16, t.brand, 0, 1.7)}<span>${n}</span></div>`).join('');
  return `${head('Strategy')}
    <div class="pad">
      <div class="herocard"><div class="eqrule"></div><div class="herol">30D strategy return</div>
        <div class="herov" style="color:${t.up}"><span class="ar">${arr(1)}</span>+7.06%</div><div class="herosub">2 running · risk-bounded</div>
        <div class="retcurve">${retCurve(300, 46)}</div></div>
      <div class="eyebrow">Templates</div>
      <div class="tmpls">${tchips}</div>
      <div class="eyebrow">My strategies</div>
      <div class="slist">${rows}</div>
      <button class="cta ghost">${ico('plus', 15, t.brand, 0, 2)} New strategy</button></div>`;
}

function wallet() {
  const items = [['shield', 'Security & Face ID', 'On'], ['globe', 'Network', 'Testnet'], ['contrast', 'Theme', 'Electrum'], ['key', 'Export & backup', '']];
  const rows = items.map((it) => `<div class="arow"><span class="ai">${ico(it[0], 18, t.brand, 0, 1.7)}</span><span class="aname">${it[1]}</span><span class="aval">${it[2]}</span>${ico('chevR', 14, t.faint, 0, 2)}</div>`).join('');
  return `${head('Wallet')}
    <div class="pad">
      <div class="wcard"><div class="eqrule"></div><div class="wtop"><span class="wlbl">Local wallet</span><span class="wbadge">Non-custodial</span></div>
        <div class="waddr">0x7a3f…9C42</div><div class="wbal"><span>Balance</span><b>12,840.55 USDC</b></div></div>
      <div class="wactions"><button class="wbtn primary">Deposit</button><button class="wbtn">Withdraw</button></div>
      <div class="alert">${ico('alert', 16, t.brand, 0, 1.8)}<span class="alertx">1 unconfirmed order — exposure unknown. Review</span>${ico('chevR', 14, t.brand, 0, 2)}</div>
      <div class="alist">${rows}</div>
      <button class="cta ghost">Manage wallet</button></div>`;
}

function detail() {
  const c = chart(348, 176);
  const axisLabels = c.axis.map(({ p, y }) => `<div class="axlbl" style="top:${y.toFixed(1)}px">${p.toLocaleString()}</div>`).join('');
  const curTop = Math.min(c.h - 15, Math.max(2, c.cy - 9));
  const stat = (l, v) => `<div class="strow"><span class="sl">${l}</span><span class="sv">${v}</span></div>`;
  const ob = (px, sz, side, d) => `<div class="obr ${side}"><div class="obbar" style="width:${d}%;background:${(side === 'a' ? t.down : t.up)}1f"></div>${side === 'b' ? `<span class="obsz">${sz}</span><span class="obpx" style="color:${t.up}">${px}</span>` : `<span class="obpx" style="color:${t.down}">${px}</span><span class="obsz">${sz}</span>`}</div>`;
  const TF = ['1m', '3m', '5m', '15m', '30m', '1h', '2h', '4h'], IND1 = ['MA', 'EMA', 'BOLL', 'SAR'], IND2 = ['VOL', 'MACD', 'KDJ', 'RSI'];
  const PERF = [['24H', '+0.85%', 1], ['7D', '-2.36%', 0], ['30D', '-15.62%', 0], ['90D', '-8.25%', 0], ['180D', '-9.06%', 0], ['1Y', '-9.06%', 0]];
  return `${head('BTC-USDC', { back: true, tag: 'PERP', right: ico('star', 20, t.brand, 0, 0, t.brand) })}
  ${tnstrip()}
  <div class="quote"><div class="qleft"><div class="qbig">64,731</div><div class="qsub" style="color:${t.up}"><span class="ar">${arr(1)}</span>$64,731.5 · +1.09%</div><div class="qmark">Mark <b>64,733</b></div></div>
    <div class="qright">${stat('24h high', '64,865')}${stat('24h low', '63,242')}${stat('24h vol · USDC', '1.77B')}${stat('Open interest', '1.95B')}${stat('Funding · 00:47:19', '0.0010%')}</div></div>
  <div class="tfs">${TF.map((x) => `<span class="tf ${x === '15m' ? 'on' : ''}">${x}</span>`).join('')}</div>
  <div class="chartwrap"><div class="chart">${c.svg}</div><div class="axis">${axisLabels}</div><div class="curbadge" style="top:${curTop}px">64,745</div>
    <div class="xax">${['06:00', '07:30', '09:00', '10:30', '12:00'].map((x) => `<span>${x}</span>`).join('')}</div></div>
  <div class="inds">${IND1.map((x, i) => `<span class="ind ${i === 0 ? 'on' : ''}">${x}</span>`).join('')}<span class="indsep"></span>${IND2.map((x) => `<span class="ind">${x}</span>`).join('')}</div>
  <div class="perf">${PERF.map(([l, v, up]) => `<div class="pf"><div class="pfl">${l}</div><div class="pfv" style="color:${up ? t.up : t.down}"><span class="ar">${arr(up)}</span>${v.replace(/[+\-]/, '')}</div></div>`).join('')}</div>
  <div class="btabs"><span class="bt on">Order book</span><span class="bt">Trades</span><span class="lsmini"><i style="color:${t.up}">L 87.8%</i> · <i style="color:${t.down}">12.2% S</i></span></div>
  <div class="obcols"><span>Price</span><span>Size (BTC)</span><span>Sum</span></div>
  <div class="obook">${ob('64,740', '0.451', 'a', 88)}${ob('64,736', '0.927', 'a', 72)}${ob('64,733', '0.318', 'a', 55)}${ob('64,730', '0.812', 'b', 60)}${ob('64,728', '0.402', 'b', 78)}${ob('64,725', '1.205', 'b', 95)}</div>
  <div class="cta-wrap"><button class="cta detailcta">Trade</button></div>`;
}

const SCREENS = [['markets', 'MARKETS', markets], ['detail', 'MARKET DETAIL', detail], ['trade', 'TRADE', trade], ['positions', 'POSITIONS', positions], ['strategy', 'STRATEGY', strategy], ['wallet', 'WALLET', wallet]];

const RAWCSS = `
*{box-sizing:border-box;margin:0;padding:0}
body{background:#05070A}
.stage{width:1236px;padding:48px;background:radial-gradient(110% 38% at 50% 0,#0B141A 0,#05070A 58%);font-family:Inter,-apple-system,system-ui,sans-serif}
.title{font:800 30px Inter,sans-serif;color:#EAF1F4;letter-spacing:.2px}
.sub{font:500 14px Inter,sans-serif;color:#7E929C;margin:9px 0 8px;max-width:1300px}
.fixes{font:600 12px ui-monospace,monospace;color:${t.brand};margin-bottom:28px;letter-spacing:.3px}
.row{display:flex;gap:24px}
.col{display:flex;flex-direction:column;gap:11px;align-items:center}
.clabel{font:800 11px Inter,sans-serif;color:#8B9CA6;letter-spacing:2px}
.phone{width:356px;background:${t.bg};border-radius:30px;overflow:hidden;border:1px solid ${t.line2};box-shadow:0 26px 64px rgba(0,0,0,.55)}
.screen{font-family:-apple-system,"SF Pro Display",Inter,system-ui,sans-serif;position:relative;height:838px;overflow:hidden}
.num{font-family:ui-monospace,"SF Mono","JetBrains Mono",monospace}
.ar{font-size:.72em;margin-right:3px;letter-spacing:0}
/* status + header */
.osbar{display:flex;justify-content:space-between;align-items:center;padding:12px 22px 2px}
.ostime{font:700 15px ui-monospace,monospace;color:${t.text};letter-spacing:.3px}
.osr{display:flex;align-items:center;gap:7px}
.head{border-bottom:1px solid ${t.line}}
.hrow{display:flex;align-items:center;justify-content:space-between;padding:6px 20px 12px;min-height:40px}
.hl{display:flex;align-items:center;gap:9px}
.htitle,.hl b{font:800 21px -apple-system,Inter,sans-serif;color:${t.text};letter-spacing:.2px}
.hl b{font-size:18px}
.kpill{font:700 9px ui-monospace,monospace;letter-spacing:.6px;color:${t.brand};background:${t.brandS};border:1px solid ${t.brand}40;border-radius:5px;padding:2px 6px}
.lastpx,.lsmini{font:700 13px ui-monospace,monospace}
.trace{height:22px;margin:-4px 0 6px;opacity:.92}
.pad{padding:14px 20px 0}
.eyebrow{font:700 10px ui-monospace,monospace;letter-spacing:2px;color:${t.faint};text-transform:uppercase;margin:2px 0 9px}
/* markets */
.srch{display:flex;align-items:center;gap:9px;background:${t.surf};border:1px solid ${t.line};border-radius:11px;padding:11px 13px;margin-bottom:16px}
.srch span{color:${t.faint};font:500 13px -apple-system,sans-serif}
.movers{display:flex;gap:9px;margin-bottom:16px}
.mchip{flex:1;background:${t.surf};border:1px solid ${t.line};border-radius:12px;padding:9px 10px}
.mchipt{font:800 12px ui-monospace,monospace;color:${t.text};display:flex;align-items:center;gap:3px;justify-content:space-between}
.mchips{margin:3px 0}
.mchipv{font:700 11px ui-monospace,monospace}
.seg{display:flex;gap:7px;margin-bottom:13px}
.segc{font:600 12.5px -apple-system,sans-serif;color:${t.dim};background:${t.surf};border:1px solid ${t.line};border-radius:9px;padding:6px 14px}
.segc.on{color:${t.bg};background:${t.brand};border-color:${t.brand};font-weight:800}
.colhd{display:flex;justify-content:space-between;padding:0 2px 9px;border-bottom:1px solid ${t.line}}
.colhd span{font:600 10px ui-monospace,monospace;letter-spacing:.5px;color:${t.faint};text-transform:uppercase}
.colhd span:last-child{text-align:right}
.mrow{display:flex;align-items:center;justify-content:space-between;padding:11px 2px;border-bottom:1px solid ${t.line}}
.mleft{display:flex;align-items:center;gap:10px;flex:1}
.tk{font:700 15px -apple-system,sans-serif;color:${t.text};display:flex;align-items:center;gap:6px}
.perp{font:700 7.5px ui-monospace,monospace;letter-spacing:.4px;color:${t.faint};border:1px solid ${t.line2};border-radius:4px;padding:1px 4px}
.sub{font:500 10.5px ui-monospace,monospace;color:${t.dim};margin-top:3px}
.spk{flex:0 0 64px;display:flex;justify-content:center}
.mpx{text-align:right;flex:1}
.big{font:600 14.5px ui-monospace,monospace;color:${t.text}}
.chg{font:700 11.5px ui-monospace,monospace;margin-top:4px;display:flex;align-items:center;justify-content:flex-end}
/* trade */
.bs{display:flex;gap:10px;margin:2px 0 14px}
.bbtn{flex:1;border:none;border-radius:11px;padding:13px;font:800 14px -apple-system,sans-serif;cursor:pointer}
.bbtn.buy{background:${t.upS};color:${t.up};border:1px solid ${t.up}55}
.bbtn.sell{background:${t.surf};color:${t.dim};border:1px solid ${t.line}}
.otype{display:flex;align-items:center;gap:15px;margin-bottom:13px}
.ot{font:600 12.5px -apple-system,sans-serif;color:${t.dim}}.ot.on{color:${t.brand};font-weight:800}
.lev{margin-left:auto;font:600 11.5px ui-monospace,monospace;color:${t.text};background:${t.surf};border:1px solid ${t.line};border-radius:7px;padding:5px 9px;display:flex;align-items:center;gap:4px}
.field{display:flex;justify-content:space-between;align-items:center;background:${t.surf};border:1px solid ${t.line};border-radius:11px;padding:13px;margin-bottom:9px}
.fl{font:500 11.5px -apple-system,sans-serif;color:${t.dim}}.fv{font:700 15px ui-monospace,monospace;color:${t.text}}.fv.ph{color:${t.faint}}
.slider{margin:7px 2px 14px}
.track{position:relative;height:5px;background:${t.line2};border-radius:3px}
.fill{position:absolute;left:0;top:0;bottom:0;background:${t.brand};border-radius:3px}
.knob{position:absolute;top:50%;width:15px;height:15px;border-radius:50%;background:${t.brand};transform:translate(-50%,-50%);border:3px solid ${t.bg};box-shadow:0 0 0 1px ${t.brand}}
.ticks{display:flex;justify-content:space-between;margin-top:9px}.ticks span{font:600 10px ui-monospace,monospace;color:${t.faint}}
.obwrap{margin-bottom:13px}
.rowlbl{display:flex;justify-content:space-between;align-items:center;margin-bottom:8px}
.spread{font:600 9.5px ui-monospace,monospace;letter-spacing:.3px;color:${t.dim};text-transform:none}
.ob{display:flex;flex-direction:column;gap:3px}
.obr{position:relative;display:flex;justify-content:space-between;padding:4px 9px;border-radius:4px;overflow:hidden}
.obr .obbar{position:absolute;top:0;bottom:0;right:0}
.obpx,.obsz{position:relative;font:600 11.5px ui-monospace,monospace}.obsz{color:${t.dim}}
.obmid{display:flex;justify-content:space-between;padding:5px 9px;font:700 12.5px ui-monospace,monospace;color:${t.text};border-top:1px solid ${t.line};border-bottom:1px solid ${t.line};margin:2px 0}
.obmid span:last-child{color:${t.dim};font-weight:600;font-size:10.5px;align-self:center}
.sum{background:${t.surf2};border:1px solid ${t.line};border-radius:11px;padding:11px 13px;margin-bottom:14px}
.sr{display:flex;justify-content:space-between;padding:4px 0;font:500 12px -apple-system,sans-serif;color:${t.dim}}
.sr span:last-child{color:${t.text};font-weight:600;font-family:ui-monospace,monospace}
/* shared surface cards (fix contrast: no saturated brand fill) */
.eqcard,.herocard,.wcard{position:relative;background:${t.surf};border:1px solid ${t.line2};border-radius:15px;padding:16px;margin-bottom:14px;overflow:hidden}
.eqrule{position:absolute;left:0;top:0;height:3px;width:100%;background:linear-gradient(90deg,${t.brand},${t.brand}00)}
.eqtop,.wtop{display:flex;justify-content:space-between;align-items:center;margin-bottom:8px}
.eql,.wlbl{font:600 11px ui-monospace,monospace;letter-spacing:.5px;color:${t.dim};text-transform:uppercase}
.eqpill,.wbadge{font:700 9px ui-monospace,monospace;color:${t.brand};background:${t.brandS};border:1px solid ${t.brand}40;border-radius:5px;padding:2px 7px}
.eqv{font:800 30px ui-monospace,monospace;color:${t.text};letter-spacing:-.5px}
.eqrow{display:flex;gap:22px;margin-top:14px}
.eql2{font:500 9.5px ui-monospace,monospace;color:${t.faint};margin-bottom:3px;text-transform:uppercase;letter-spacing:.4px}
.eqv2{font:700 13px ui-monospace,monospace;color:${t.text};display:flex;align-items:center}
.herol{font:600 11px ui-monospace,monospace;letter-spacing:.5px;color:${t.dim};text-transform:uppercase}
.herov{font:800 33px ui-monospace,monospace;margin:5px 0;letter-spacing:-1px;display:flex;align-items:center}
.herosub{font:500 11.5px -apple-system,sans-serif;color:${t.dim}}
/* positions */
.pcard{background:${t.surf2};border:1px solid ${t.line};border-radius:13px;padding:12px;margin-bottom:9px}
.ph2{display:flex;align-items:center;gap:9px;margin-bottom:11px}
.pcoin{font:800 14.5px -apple-system,sans-serif;color:${t.text};display:flex;align-items:center;gap:5px}
.ptag{font:700 10px ui-monospace,monospace;border-radius:6px;padding:2px 7px}
.ptag.long{color:${t.up};background:${t.upS}}.ptag.short{color:${t.down};background:${t.downS}}
.ppnl{margin-left:auto;font:800 14px ui-monospace,monospace;display:flex;align-items:center}
.pg{display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:7px}
.gl{font:500 9px ui-monospace,monospace;color:${t.faint};margin-bottom:3px;text-transform:uppercase;letter-spacing:.4px}
.gv{font:700 12px ui-monospace,monospace;color:${t.text};display:flex;align-items:center}
/* strategy */
.scard{display:flex;align-items:center;gap:11px;background:${t.surf2};border:1px solid ${t.line};border-radius:13px;padding:13px;margin-bottom:9px}
.sicon{width:38px;height:38px;border-radius:10px;background:${t.brandS};display:flex;align-items:center;justify-content:center}
.smid{flex:1}.sname{font:700 14px -apple-system,sans-serif;color:${t.text}}.sdesc{font:500 11px ui-monospace,monospace;color:${t.dim};margin-top:3px}
.sret{font:800 13.5px ui-monospace,monospace;margin-right:6px;display:flex;align-items:center}
.emptyhint{font:500 11.5px -apple-system,sans-serif;color:${t.faint};text-align:center;margin:14px 8px 0;line-height:1.5}
/* wallet */
.waddr{font:700 17px ui-monospace,monospace;letter-spacing:.5px;color:${t.text};margin-bottom:13px}
.wbal{display:flex;justify-content:space-between;align-items:baseline;font:500 11.5px -apple-system,sans-serif;color:${t.dim}}
.wbal b{font:800 16px ui-monospace,monospace;color:${t.text}}
.alert{display:flex;align-items:center;gap:9px;background:${t.brandS};border:1px solid ${t.brand}40;border-radius:11px;padding:11px 12px;margin-bottom:14px}
.alertx{flex:1;font:600 11.5px -apple-system,sans-serif;color:${t.glow}}
.arow{display:flex;align-items:center;gap:12px;padding:14px 4px;border-bottom:1px solid ${t.line}}
.ai{width:33px;height:33px;border-radius:9px;background:${t.brandS};display:flex;align-items:center;justify-content:center}
.aname{font:600 13.5px -apple-system,sans-serif;color:${t.text};flex:1}.aval{font:500 12px ui-monospace,monospace;color:${t.dim}}
/* detail */
.quote{display:flex;justify-content:space-between;padding:12px 20px 2px;gap:12px}
.qbig{font:800 34px ui-monospace,monospace;letter-spacing:-1px;line-height:1.05;color:${t.text}}
.qsub{font:700 12.5px ui-monospace,monospace;margin-top:4px;display:flex;align-items:center}
.qmark{font:500 11px ui-monospace,monospace;color:${t.dim};margin-top:6px}.qmark b{color:${t.text};font-weight:700}
.qright{flex:1;max-width:182px;padding-top:3px}
.strow{display:flex;justify-content:space-between;margin-bottom:4px}
.sl{font:500 10px ui-monospace,monospace;color:${t.dim}}.sv{font:600 10.5px ui-monospace,monospace;color:${t.text}}
.tfs{display:flex;justify-content:space-between;padding:10px 16px 6px}
.tf{font:600 11.5px ui-monospace,monospace;color:${t.dim};padding:4px 6px}
.tf.on{color:${t.bg};font-weight:800;background:${t.brand};border-radius:7px;padding:4px 10px}
.chartwrap{position:relative;padding:2px 12px 0}.chart{height:176px}
.axis{position:absolute;right:14px;top:0;height:176px;width:52px}
.axlbl{position:absolute;right:0;font:600 9.5px ui-monospace,monospace;color:${t.faint};transform:translateY(-50%);background:${t.bg};padding-left:3px}
.curbadge{position:absolute;right:14px;font:700 10px ui-monospace,monospace;color:${t.bg};background:${t.brand};border-radius:4px;padding:2px 5px}
.xax{display:flex;justify-content:space-between;padding:7px 6px 0}.xax span{font:600 9.5px ui-monospace,monospace;color:${t.faint}}
.inds{display:flex;align-items:center;gap:13px;padding:12px 18px 9px;border-bottom:1px solid ${t.line};overflow:hidden}
.ind{font:600 11.5px ui-monospace,monospace;color:${t.dim};white-space:nowrap}.ind.on{color:${t.brand};font-weight:800}
.indsep{width:1px;height:12px;background:${t.line2}}
.perf{display:flex;justify-content:space-between;padding:12px 18px;border-bottom:1px solid ${t.line}}
.pfl{font:600 9px ui-monospace,monospace;color:${t.faint};margin-bottom:4px;letter-spacing:.4px}
.pfv{font:700 11px ui-monospace,monospace;display:flex;align-items:center;justify-content:center}
.btabs{display:flex;align-items:center;gap:18px;padding:12px 18px 0}
.bt{font:700 13px -apple-system,sans-serif;color:${t.dim};padding-bottom:7px}.bt.on{color:${t.text};border-bottom:2.5px solid ${t.brand}}
.lsmini{margin-left:auto;font:700 10.5px ui-monospace,monospace;color:${t.dim}}
.obcols{display:flex;padding:9px 18px 4px}.obcols span{flex:1;font:600 9px ui-monospace,monospace;color:${t.faint};text-transform:uppercase;letter-spacing:.4px}
.obcols span:nth-child(2){text-align:center}.obcols span:last-child{text-align:right}
.obook{padding:0 18px}
.obook .obr{padding:4px 9px}.obook .obsz{position:relative}
.cta-wrap{position:absolute;left:0;right:0;bottom:62px;padding:10px 0 0;background:linear-gradient(${t.bg}00,${t.bg} 42%)}
.cta{border:none;border-radius:12px;padding:15px;font:800 14.5px -apple-system,sans-serif;cursor:pointer;width:calc(100% - 40px);margin:0 20px;color:${t.bg};background:${t.brand};display:block}
.cta.buyc{background:${t.up};color:#04140E}
.cta.ghost{background:${t.surf};color:${t.brand};border:1px solid ${t.brand}55;display:flex;align-items:center;justify-content:center;gap:7px}
.cta.detailcta{letter-spacing:1px}
.cta-wrap .cta{margin:0 20px}
.tabbar{position:absolute;left:0;right:0;bottom:0;display:flex;border-top:1px solid ${t.line};background:${t.surf2};padding:9px 0 12px}
.tcell{flex:1;display:flex;flex-direction:column;align-items:center;gap:5px}.tlbl{font:600 10.5px -apple-system,sans-serif}
`;

// ---- merged type system: JetBrains Mono (numbers) · Space Mono (terminal voice) · Inter Tight (body) ----
const M = "'JetBrains Mono',monospace";          // all numbers / data (tabular)
const D = "'Space Mono','Inter Tight',sans-serif"; // labels, titles, eyebrows, tickers, CTA — terminal voice
const B = "'Inter Tight',-apple-system,system-ui,sans-serif"; // long sentences / settings names — readable body
const CSS = RAWCSS
  .split('ui-monospace,"SF Mono","JetBrains Mono",monospace').join(M)
  .split('ui-monospace,monospace').join(M)
  .split('-apple-system,"SF Pro Display",Inter,system-ui,sans-serif').join(D)
  .split('-apple-system,Inter,sans-serif').join(D)
  .split('Inter,-apple-system,system-ui,sans-serif').join(D)
  .split('-apple-system,sans-serif').join(D)
  .split('Inter,sans-serif').join(D)
  // readable body for sentences/labels (value spans keep their own JetBrains rule)
  + `\n.srch span,.fl,.aname,.herosub,.emptyhint,.alertx,.sr,.sdesc,.wbal{font-family:${B} !important}`
  // one controlled phosphor glow — only the hero number on each screen
  + `\n.qbig,.eqv,.herov{text-shadow:0 0 18px ${t.brand}59}\n.wbal b{text-shadow:0 0 15px ${t.brand}4d}`
  // v3 cleaner Markets home (allscreens first page, no decorative trace)
  + `\n.wordmark{font-family:${D};font-weight:800;font-size:17px;color:${t.brand};letter-spacing:1.6px}`
  + `\n.readout{display:flex;align-items:center;gap:8px;margin:14px 0 14px}`
  + `\n.rdot{width:6px;height:6px;border-radius:50%;background:${t.brand};box-shadow:0 0 8px ${t.brand}}`
  + `\n.rlbl{font-family:${D};font-weight:700;font-size:10px;letter-spacing:2px;color:${t.brand};text-transform:uppercase}`
  + `\n.tpill{font-family:${D};font-weight:700;font-size:9px;letter-spacing:.8px;color:${t.dim};background:${t.surf};border:1px solid ${t.line};border-radius:6px;padding:4px 8px}`
  + `\n.mtabs{display:flex;gap:20px;border-bottom:1px solid ${t.line};margin-bottom:4px}`
  + `\n.mtab{font-family:${D};font-weight:700;font-size:13.5px;color:${t.dim};padding-bottom:10px}`
  + `\n.mtab.on{color:${t.brand};border-bottom:2px solid ${t.brand}}`
  + `\n.mrow .sub{font-family:${M}}`
  // v7: asymmetric testnet warning + trade options/TP-SL + wallet deposit/withdraw
  + `\n.twarn{display:inline-flex;align-items:center;gap:5px;font-family:${D};font-weight:700;font-size:9px;letter-spacing:.8px;color:#241400;background:${t.warn};border-radius:6px;padding:4px 8px}`
  + `\n.tnstrip{display:flex;align-items:center;gap:7px;padding:7px 18px;background:repeating-linear-gradient(45deg,${t.warn}26 0 9px,${t.warn}0d 9px 18px);border-bottom:1px solid ${t.warn}55}`
  + `\n.tnx{font-family:${D};font-weight:700;font-size:10px;letter-spacing:.6px;color:${t.warn};text-transform:uppercase}`
  + `\n.tnsub{font-family:${B};font-weight:500;font-size:10px;color:${t.dim}}`
  + `\n.opts{display:flex;gap:9px;margin-bottom:12px}`
  + `\n.optchip{display:flex;align-items:center;gap:7px;font-family:${D};font-weight:600;font-size:11.5px;color:${t.dim};background:${t.surf};border:1px solid ${t.line};border-radius:9px;padding:9px 12px}`
  + `\n.optbox{width:13px;height:13px;border:1.5px solid ${t.faint};border-radius:3px;flex:0 0 auto}`
  + `\n.tpsl{background:${t.surf2};border:1px solid ${t.line};border-radius:11px;padding:11px 13px;margin-bottom:13px}`
  + `\n.tpslhd{display:flex;justify-content:space-between;align-items:center;font-family:${D};font-weight:600;font-size:12.5px;color:${t.text}}`
  + `\n.tpsltog{display:flex;align-items:center;gap:4px;font-family:${D};font-weight:700;font-size:11px;color:${t.brand}}`
  + `\n.tpslrow{display:flex;gap:9px;margin-top:10px}`
  + `\n.tpf{flex:1;background:${t.bg};border:1px solid ${t.line};border-radius:8px;padding:8px 11px}`
  + `\n.tpfl{display:block;font-family:${B};font-weight:500;font-size:9.5px;color:${t.dim};margin-bottom:3px}`
  + `\n.tpfv{font-family:${M};font-weight:700;font-size:14px;color:${t.faint}}`
  + `\n.wactions{display:flex;gap:10px;margin-bottom:13px}`
  + `\n.wbtn{flex:1;border:1px solid ${t.line2};border-radius:11px;padding:12px;font-family:${D};font-weight:700;font-size:13px;cursor:pointer;background:${t.surf};color:${t.text}}`
  + `\n.wbtn.primary{background:${t.brand};color:${t.bg};border-color:${t.brand}}`
  + `\n.retcurve{margin-top:10px;height:46px}`
  + `\n.tmpls{display:flex;gap:8px;margin-bottom:16px}`
  + `\n.tmpl{flex:1;display:flex;flex-direction:column;align-items:center;gap:6px;background:${t.surf};border:1px solid ${t.line};border-radius:11px;padding:11px 6px;font-family:${D};font-weight:600;font-size:11px;color:${t.dim}}`
  + `\n.health{margin-top:13px}`
  + `\n.healthbar{height:5px;background:${t.line2};border-radius:3px;overflow:hidden}`
  + `\n.healthfill{height:100%;background:${t.up};border-radius:3px}`
  + `\n.healthlbl{display:flex;justify-content:space-between;margin-top:7px;font-family:${B};font-weight:500;font-size:10px;color:${t.dim}}`
  + `\n.tpsltog{color:${t.dim};font-weight:600}`
  + `\n.lev{color:${t.brand};border-color:${t.brand}66}`;

const html = `<!doctype html><html><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&family=JetBrains+Mono:wght@400;500;700&family=Inter+Tight:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>${CSS}</style></head><body><div class="stage">
  <div class="title">HYPERSOLID — UI v8</div>
  <div class="sub">v3 = merged（v2 结构 × allscreens 字体 × 单点辉光）整体保留；v7：P0-B 非对称 testnet 警示（Trade/Detail 顶部警示条 + Markets 警示 chip，mainnet 静默）；钱包加 Deposit/Withdraw；Trade 加 Reduce-only/Post-only + TP/SL + 杠杆可调。</div>
  <div class="fixes">CHANGED — Markets: allscreens-style clean list + SIGNAL·LIVE readout · removed header trace line   ·   KEPT — JetBrains Mono numbers · Space Mono voice · Inter Tight body · one hero glow</div>
  <div class="row">${SCREENS.slice(0, 3).map(([k, lab, fn]) => `<div class="col"><div class="clabel">${lab}</div><div class="phone"><div class="screen">${fn()}${tabbar(k === 'detail' ? 'markets' : k)}</div></div></div>`).join('')}</div>
  <div class="row" style="margin-top:34px">${SCREENS.slice(3).map(([k, lab, fn]) => `<div class="col"><div class="clabel">${lab}</div><div class="phone"><div class="screen">${fn()}${tabbar(k === 'detail' ? 'markets' : k)}</div></div></div>`).join('')}</div>
</div></body></html>`;

fs.writeFileSync(__dirname + '/v8.html', html);
console.log('wrote v8.html');
