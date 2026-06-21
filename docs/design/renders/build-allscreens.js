// Renders ALL HyperSolid app screens as phone mockups in the phosphor /
// oscilloscope house style, using the redesigned monoline icon system.
// node render-png.js allscreens.html allscreens.png
const fs = require('fs');

const t = {
  bg: '#0C0A07', surf: '#14110B', surf2: '#171309', line: '#2A2418',
  grid: 'rgba(255,180,84,.06)', text: '#F3ECDD', dim: '#9A8E73',
  brand: '#FFB454', hi: '#FFD9A0', up: '#6FE0C0', down: '#FF7A6B',
};

// ---------- icon library (24x24 monoline, stroke=currentColor) ----------
function svg(inner, size) {
  return `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" style="display:block">${inner}</svg>`;
}
const ICON = {
  markets: (a) => `<polyline points="2,14 6,14 8.5,8 11,17 13.5,6 16,14 22,14"/>${a ? '<circle cx="13.5" cy="6" r="1.7" fill="currentColor" stroke="none"/>' : ''}`,
  trade: () => `<path d="M8 20V5"/><path d="M4.5 8.5 8 5l3.5 3.5"/><path d="M16 4v15"/><path d="M12.5 15.5 16 19l3.5-3.5"/>`,
  positions: () => `<path d="M12 3 21 8 12 13 3 8Z"/><path d="M3 12.5 12 17.5 21 12.5"/>`,
  agent: (a) => `<circle cx="12" cy="12" r="7.5"/><circle cx="12" cy="12" r="2.6" ${a ? 'fill="currentColor" stroke="none"' : ''}/><path d="M12 1.5V4.5"/><path d="M12 19.5V22.5"/><path d="M1.5 12H4.5"/><path d="M19.5 12H22.5"/>`,
  account: () => `<rect x="3" y="6" width="18" height="13" rx="2.5"/><path d="M3 10h18"/><circle cx="16.5" cy="14.5" r="1.3" fill="currentColor" stroke="none"/>`,
  star: (a) => `<path d="M12 3.6 14.55 9.1 20.6 9.8 16.1 14 17.4 20 12 16.9 6.6 20 7.9 14 3.4 9.8 9.45 9.1Z" ${a ? 'fill="currentColor"' : ''}/>`,
  key: () => `<circle cx="8" cy="8" r="4.2"/><path d="M11 11 20 20"/><path d="M17.5 17.5 19.5 15.5"/><path d="M15.2 15.2 17 13.4"/>`,
  alert: () => `<path d="M12 3 19.5 5.8V11c0 4.6-3.2 7.9-7.5 9.3C7.7 18.9 4.5 15.6 4.5 11V5.8Z"/><path d="M12 8.5V12.6"/><path d="M12 16h.01"/>`,
  swap: () => `<path d="M4 9h13"/><path d="M14 6 17 9 14 12"/><path d="M20 15H7"/><path d="M10 12 7 15 10 18"/>`,
  chevron: () => `<path d="M14.5 6 9 12l5.5 6"/>`,
  arrowRight: () => `<path d="M4 12h15"/><path d="M13 6l6 6-6 6"/>`,
  eye: () => `<path d="M2 12s3.5-6.5 10-6.5S22 12 22 12s-3.5 6.5-10 6.5S2 12 2 12Z"/><circle cx="12" cy="12" r="2.6"/>`,
  lock: () => `<rect x="4.5" y="10.5" width="15" height="10" rx="2.2"/><path d="M8 10.5V7.5a4 4 0 0 1 8 0v3"/><circle cx="12" cy="15.2" r="1.1" fill="currentColor" stroke="none"/>`,
  search: () => `<circle cx="10.5" cy="10.5" r="6.5"/><path d="M20 20 15.5 15.5"/>`,
};
function ico(name, px, color, active) {
  return `<span style="color:${color};display:inline-flex;flex:0 0 auto">${svg(ICON[name](active), px)}</span>`;
}

// ---------- shared chrome ----------
function trace(amp, seed, h) {
  h = h || 30;
  let d = `M0 ${h / 2}`, n = 64;
  for (let i = 1; i <= n; i++) {
    const x = (i / n) * 320;
    const s = Math.sin(i * 0.55 + seed) * amp * 0.6 + Math.sin(i * 0.17 + seed * 2) * amp * 0.4 + Math.sin(i * 1.9 + seed) * amp * 0.15;
    d += ` L${x.toFixed(1)} ${(h / 2 - s).toFixed(1)}`;
  }
  return `<div class="trace" style="height:${h}px"><svg viewBox="0 0 320 ${h}" width="100%" height="${h}" preserveAspectRatio="none">
    <defs><filter id="g"><feGaussianBlur stdDeviation="1.3"/></filter></defs>
    <path d="${d}" fill="none" stroke="${t.brand}" stroke-width="3" opacity="0.28" filter="url(#g)"/>
    <path d="${d}" fill="none" stroke="${t.hi}" stroke-width="1.2"/></svg></div>`;
}
function sb(left, mid, pill, pillCls) {
  return `<div class="sb"><span>${left}</span><span class="wm">${mid}</span><span class="pill ${pillCls || ''}">${pill}</span></div>`;
}
const NAV = [
  ['markets', '行情'], ['trade', '交易'], ['positions', '持仓'], ['agent', '策略'], ['account', '钱包'],
];
function tabbar(active) {
  const cells = NAV.map(([k, label]) => {
    const on = k === active;
    return `<div class="tcell ${on ? 'act' : ''}">${on ? '<div class="tick"></div>' : ''}
      ${ico(k, 22, on ? t.brand : t.dim, on)}<div class="tlbl">${label}</div></div>`;
  }).join('');
  return `<div class="tabbar">${cells}</div>`;
}
function phone(inner, label, active) {
  return `<div class="col"><div class="clabel">${label}</div>
    <div class="phone"><div class="screen">${inner}</div>${tabbar(active)}</div></div>`;
}

// ---------- screen content ----------
const coins = [['BTC', '62,481.5', '+2.14%', 1, '0.011%', '1.2B'], ['ETH', '3,002.18', '-0.86%', 0, '0.008%', '842M'],
['SOL', '148.22', '+5.41%', 1, '0.021%', '510M'], ['HYPE', '28.74', '+1.07%', 1, '0.014%', '333M'],
['ARB', '1.182', '-2.30%', 0, '0.006%', '119M'], ['DOGE', '0.1642', '+0.92%', 1, '0.004%', '97M']];

function markets() {
  const rows = coins.map((c, i) => `<div class="mrow">
    <div class="mleft">${ico('star', 17, i < 2 || i === 3 ? t.brand : t.dim, i < 2 || i === 3)}
      <div><div class="tk">${c[0]}<span class="perp"> ·PERP</span></div><div class="sub">fund ${c[4]} · vol ${c[5]}</div></div></div>
    <div class="mpx"><div class="big">${c[1]}</div><div class="chg" style="color:${c[3] ? t.up : t.down}">${c[2]}</div></div></div>`).join('');
  return `${trace(6, 0.4)}${sb('9:41', 'HYPERSOLID', '◷ TESTNET')}
    <div class="pad"><div class="readout"><span class="rlbl">SIGNAL · LIVE</span><span class="rdot"></span></div>
    <div class="search">${ico('search', 14, t.dim)}<span>search markets</span></div>
    <div class="tabs"><span class="tb on">全部</span><span class="tb">自选</span></div>${rows}</div>`;
}
function candles() {
  let x = 6, out = '', vals = [62200, 62380, 62150, 62520, 62410, 62680, 62540, 62760, 62600, 62820, 62700, 62900, 62810, 62980, 62880, 63010, 62940, 62700, 62560, 62650, 62740, 62820];
  let prev = vals[0]; const min = Math.min(...vals), max = Math.max(...vals); const Y = v => 94 - ((v - min) / (max - min)) * 78 - 6;
  out += `<svg viewBox="0 0 280 100" width="100%" height="100" preserveAspectRatio="none">`;
  vals.forEach((v, i) => {
    const up = v >= prev; const col = up ? t.up : t.down; const o = Y(prev), c = Y(v);
    const hi = Math.min(o, c) - 5 - (i % 3) * 2, lo = Math.max(o, c) + 4 + (i % 2) * 2; const cx = x + 5;
    out += `<line x1="${cx}" y1="${hi}" x2="${cx}" y2="${lo}" stroke="${col}" stroke-width="1" opacity="0.85"/>`;
    out += `<rect x="${x}" y="${Math.min(o, c)}" width="10" height="${Math.max(3, Math.abs(c - o))}" fill="${col}" rx="1"/>`; prev = v; x += 12.4;
  });
  out += `</svg>`; return out;
}
function depth(side, rows) {
  return rows.map((r, i) => {
    const w = 18 + (rows.length - i) * 11; const col = side === 'bid' ? t.up : t.down;
    const bar = side === 'bid' ? `linear-gradient(90deg,transparent ${100 - w}%, ${col}22 ${100 - w}%)` : `linear-gradient(90deg,${col}22 ${w}%, transparent ${w}%)`;
    return `<div class="ob" style="background:${bar}"><span style="color:${col}">${r[0]}</span><span class="obsz">${r[1]}</span></div>`;
  }).join('');
}
function detail() {
  const bids = [['62,485', '1.20'], ['62,483', '0.84'], ['62,481', '2.05']];
  const asks = [['62,490', '1.31'], ['62,488', '0.39'], ['62,486', '1.74']];
  const stats = [['标记价', '62,481.5'], ['24h 涨跌', '+2.14%'], ['资金费', '0.011%'], ['24h 量', '1.2B'], ['最大杠杆', '50x'], ['前日价', '61,170']];
  const sg = stats.map(s => `<div class="scell"><div class="slbl">${s[0]}</div><div class="sval">${s[1]}</div></div>`).join('');
  return `${sb(`<span class="bk">${ico('chevron', 14, t.dim)}BTC-PERP</span>`, '', '▲ 2.14%', 'up')}
    <div class="pad"><div class="priceLg">62,481.5 <span class="pchg" style="color:${t.up}">+2.14%</span></div>
    <div class="chips"><span class="c on">1H</span><span class="c">4H</span><span class="c">1D</span><span class="c">1W</span></div>
    <div class="chart grid">${candles()}</div>
    <div class="statgrid">${sg}</div>
    <div class="sectlbl">盘口 ORDERBOOK</div>
    <div class="obhead"><span>价格</span><span>数量</span></div>${depth('ask', asks)}
    <div class="spread">价差 5.00 (0.008%)</div>${depth('bid', bids)}
    <div class="cta">去交易 ${ico('arrowRight', 16, t.bg)}</div></div>`;
}
function trade() {
  return `${sb('9:41', 'HYPERSOLID', '◷ TESTNET')}
    <div class="pad"><div class="h1">交易 Trade</div>
    <div class="netline">网络：testnet（仅测试网可下真单）</div>
    <div class="sideRow"><div class="sbtn on up">买入 / 做多</div><div class="sbtn">卖出 / 做空</div></div>
    <div class="fld"><div class="flbl">标的</div><div class="finput">BTC</div></div>
    <div class="hint">当前价 62,481.5</div>
    <div class="fld"><div class="flbl">数量</div><div class="finput on">0.05</div></div>
    <div class="fld"><div class="flbl">价格</div><div class="finput on">62,400</div></div>
    <div class="hint">名义价值 $3,120.00</div>
    <div class="submit">提交订单</div></div>`;
}
function positions() {
  const pos = [['BTC', '多 20x', '0.05 @ 61,180  强平 54,030', '+86.04', '+12.4%', 1], ['ETH', '空 10x', '1.2 @ 3,060  强平 3,540', '-42.18', '-6.1%', 0]];
  const rows = pos.map(p => `<div class="prow"><div><div class="pcoin">${p[0]} <span style="color:${p[5] ? t.up : t.down}">${p[1]}</span></div>
    <div class="sub">${p[2]}</div></div><div class="pright"><div class="ppnl" style="color:${p[5] ? t.up : t.down}">${p[3]}</div>
    <div class="proe" style="color:${p[5] ? t.up : t.down}">${p[4]}</div></div></div>`).join('');
  return `${sb('9:41', 'HYPERSOLID', '◷ TESTNET')}
    <div class="pad"><div class="h1">持仓 Positions</div>
    <div class="banner">${ico('eye', 15, t.dim)}<span>view-only 预览：输入任意地址查看其持仓（零私钥）。连接钱包后自动填充。</span></div>
    <div class="inputRow"><div class="finput grow">0x7f…a3c2 钱包地址</div><div class="qbtn">查询</div></div>
    <div class="summary"><div class="sumc"><div class="sumlbl">账户权益</div><div class="sumval">$8.42K</div></div>
      <div class="sumc"><div class="sumlbl">可提现</div><div class="sumval">$5.10K</div></div>
      <div class="sumc"><div class="sumlbl">未实现盈亏</div><div class="sumval" style="color:${t.up}">+43.86</div></div></div>
    ${rows}</div>`;
}
function agent() {
  const strat = [['TP/SL', 'BTC', '+3% / −1.5%', 1], ['GRID', 'ETH', '2.9k–3.2k ×8', 1], ['DCA', 'BTC', '$50 / 8h', 0]];
  const rows = strat.map(s => `<div class="srow"><div><div class="sname">${s[0]} <span class="smkt">${s[1]}</span></div>
    <div class="sub">${s[2]}</div></div><div class="tog ${s[3] ? 'on' : ''}"><i></i></div></div>`).join('');
  return `${trace(10, 2.2, 34)}${sb('9:41', 'YOUR AGENT', '◉ ARMED', 'up')}
    <div class="pad"><div class="agentHead grid"><div class="aTitle">PHOSPHOR TRACE · ACTIVE</div>
    <div class="sub">trade-only · 无提现权限 · 离线也运行</div></div>
    <div class="sectlbl">STRATEGIES</div>${rows}
    <div class="guard"><span class="sub">GUARDRAILS</span><span class="gv">max 5× · 日内 −$200</span></div>
    <div class="ladder"><div class="btn kill">▮ KILL SWITCH</div><div class="btn new">+ 新建</div></div></div>`;
}
function accountOnboard() {
  return `${sb('9:41', 'HYPERSOLID', '◷ TESTNET')}
    <div class="pad"><div class="h1">欢迎使用 HyperSolid</div>
    <div class="subtitle">非托管 · 私钥永不离开设备</div>
    <div class="bigbtn brand">${ico('star', 17, t.bg, true)}<span>创建本地钱包（推荐）</span></div>
    <div class="sectlbl">用助记词恢复</div>
    <div class="finput">输入 12 词助记词</div>
    <div class="bigbtn outline brand">${ico('key', 17, t.brand)}<span>恢复钱包</span></div>
    <div class="sectlbl">仅查看（零私钥）</div>
    <div class="finput">0x… 地址</div>
    <div class="bigbtn outline">${ico('eye', 17, t.text)}<span>以只读模式进入</span></div></div>`;
}
function accountConnected() {
  return `${sb('9:41', 'HYPERSOLID', '◷ TESTNET')}
    <div class="pad"><div class="h1">钱包 Account</div>
    <div class="card"><div class="cardlbl">${ico('lock', 14, t.dim)}<span>本地钱包（非托管）</span></div>
      <div class="addr">0x7f3a…c2e9</div></div>
    <div class="card warn"><div class="warnrow">${ico('alert', 16, t.brand)}<span>请立即备份助记词（仅显示一次，禁止截图）</span></div>
      <div class="mnemonic">orbit cradle ... phosphor signal</div><div class="link">我已安全备份</div></div>
    <div class="setrow"><span class="cardlbl2">网络</span><span class="netval">testnet ${ico('swap', 15, t.dim)}</span></div>
    <div class="bigbtn outline down">退出 / 切换钱包</div></div>`;
}

function page() {
  const frames = [
    phone(markets(), 'MARKETS · 行情', 'markets'),
    phone(detail(), 'MARKET DETAIL · 详情', 'markets'),
    phone(trade(), 'TRADE · 交易', 'trade'),
    phone(positions(), 'POSITIONS · 持仓', 'positions'),
    phone(agent(), 'AGENT · 策略', 'agent'),
    phone(accountOnboard(), 'ACCOUNT · 钱包（未连接）', 'account'),
    phone(accountConnected(), 'ACCOUNT · 钱包（已连接）', 'account'),
  ].join('');
  return `<!doctype html><html><head><meta charset="utf8">
   <link href="https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&family=JetBrains+Mono:wght@400;500;700&family=Inter+Tight:wght@400;500;600;700&display=swap" rel="stylesheet">
   <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{width:1360px;background:radial-gradient(120% 55% at 50% -6%, #1a1408 0%, ${t.bg} 52%);
      font-family:'Inter Tight','PingFang SC',system-ui,sans-serif;color:${t.text};-webkit-font-smoothing:antialiased}
    .stage{padding:38px 40px 44px}
    .title{font-family:'Space Mono';font-weight:700;font-size:25px;color:${t.brand};letter-spacing:1px}
    .titlesub{font-size:13px;color:${t.dim};margin-top:6px;letter-spacing:.2px}
    .grid-wrap{display:flex;flex-wrap:wrap;gap:24px 22px;margin-top:26px}
    .col{display:flex;flex-direction:column;align-items:center;gap:9px;width:300px}
    .clabel{font-family:'Space Mono';font-size:11px;color:${t.dim};letter-spacing:1px}
    .phone{width:300px;height:640px;background:${t.surf};border-radius:26px;overflow:hidden;position:relative;display:flex;flex-direction:column;
      border:1px solid ${t.line};box-shadow:0 0 0 1px rgba(255,180,84,.05),0 16px 44px rgba(0,0,0,.6)}
    .screen{flex:1;overflow:hidden;display:flex;flex-direction:column}
    .trace{width:100%;background:linear-gradient(180deg,#100c06,${t.surf});border-bottom:1px solid ${t.line}}
    .sb{display:flex;justify-content:space-between;align-items:center;padding:11px 14px 6px;font-family:'Space Mono';font-size:10.5px;color:${t.dim};letter-spacing:.4px}
    .wm{color:${t.text};font-weight:700;font-size:10.5px}
    .bk{display:inline-flex;align-items:center;gap:3px;color:${t.text};font-weight:700}
    .pill{background:rgba(255,180,84,.12);color:${t.brand};padding:3px 8px;border-radius:6px;font-size:9.5px;font-weight:700;letter-spacing:.4px}
    .pill.up{background:rgba(111,224,192,.12);color:${t.up}}
    .pad{padding:6px 14px 12px;overflow:hidden}
    .h1{font-size:19px;font-weight:700;color:${t.text};margin:4px 0 4px}
    .subtitle{font-size:11.5px;color:${t.dim};margin-bottom:12px}
    .netline{font-size:11px;color:${t.dim};margin-bottom:12px}
    .readout{display:flex;align-items:center;gap:7px;margin:2px 0 10px}
    .rlbl{font-family:'Space Mono';font-size:10px;color:${t.brand};letter-spacing:1.5px}
    .rdot{width:6px;height:6px;border-radius:50%;background:${t.brand};box-shadow:0 0 7px ${t.brand}}
    .search{display:flex;align-items:center;gap:8px;background:${t.surf2};border:1px solid ${t.line};color:${t.dim};border-radius:8px;padding:9px 11px;font-size:12px;font-family:'Space Mono';margin-bottom:11px}
    .tabs{display:flex;gap:16px;border-bottom:1px solid ${t.line};padding-bottom:8px;margin-bottom:2px}
    .tb{font-family:'Space Mono';font-size:11.5px;color:${t.dim}}
    .tb.on{color:${t.brand};font-weight:700}
    .tb.on:after{content:'';display:block;height:2px;background:${t.brand};margin-top:7px;border-radius:2px;box-shadow:0 0 6px ${t.brand}}
    .mrow{display:flex;justify-content:space-between;align-items:center;padding:10px 1px;border-bottom:1px solid ${t.line}}
    .mleft{display:flex;align-items:center;gap:9px}
    .tk{font-family:'Space Mono';font-weight:700;font-size:14px;color:${t.text}}
    .perp{color:${t.dim};font-weight:400;font-size:10px}
    .sub{color:${t.dim};font-size:10px;margin-top:2px}
    .mpx{text-align:right}
    .big{font-family:'JetBrains Mono';font-weight:500;font-size:14px;font-variant-numeric:tabular-nums;color:${t.hi}}
    .chg{font-family:'JetBrains Mono';font-size:11px;margin-top:2px;font-variant-numeric:tabular-nums}
    .priceLg{font-family:'JetBrains Mono';font-weight:700;font-size:27px;color:${t.hi};font-variant-numeric:tabular-nums;margin:6px 0 9px;text-shadow:0 0 16px rgba(255,217,160,.25)}
    .pchg{font-size:13px;font-weight:500}
    .chips{display:flex;gap:7px;margin-bottom:9px}
    .c{font-family:'JetBrains Mono';font-size:11px;color:${t.dim};padding:3px 9px;border:1px solid ${t.line};border-radius:6px}
    .c.on{color:${t.bg};background:${t.brand};border-color:${t.brand};font-weight:700}
    .grid{background-image:linear-gradient(${t.grid} 1px,transparent 1px),linear-gradient(90deg,${t.grid} 1px,transparent 1px);background-size:16px 16px}
    .chart{border:1px solid ${t.line};border-radius:9px;padding:6px;margin-bottom:9px;background-color:${t.surf2}}
    .statgrid{display:flex;flex-wrap:wrap;margin-bottom:6px}
    .scell{width:33.33%;padding:5px 0}
    .slbl{font-size:9px;color:${t.dim};margin-bottom:2px}
    .sval{font-family:'JetBrains Mono';font-size:12px;font-weight:500;color:${t.text};font-variant-numeric:tabular-nums}
    .sectlbl{font-family:'Space Mono';font-size:10px;color:${t.dim};letter-spacing:1.5px;margin:8px 1px 7px}
    .obhead{display:flex;justify-content:space-between;font-size:9px;color:${t.dim};padding:2px 0}
    .ob{display:flex;justify-content:space-between;padding:3px 7px;border-radius:3px;font-family:'JetBrains Mono';font-size:11px;font-variant-numeric:tabular-nums;margin-bottom:2px}
    .obsz{color:${t.dim}}
    .spread{font-size:10px;text-align:center;color:${t.text};padding:4px 0}
    .cta{margin-top:10px;padding:11px;border-radius:9px;background:${t.brand};color:${t.bg};font-family:'Space Mono';font-weight:700;font-size:13px;display:flex;align-items:center;justify-content:center;gap:7px}
    .sideRow{display:flex;gap:9px;margin-bottom:13px}
    .sbtn{flex:1;text-align:center;padding:11px;border-radius:8px;border:1px solid ${t.line};font-size:12.5px;font-weight:700;color:${t.text}}
    .sbtn.on.up{background:${t.up};color:#06231c;border-color:${t.up}}
    .fld{margin-bottom:11px}
    .flbl{font-size:10px;color:${t.dim};margin-bottom:4px}
    .finput{border:1px solid ${t.line};background:${t.surf2};border-radius:8px;padding:9px 11px;font-size:13px;color:${t.dim};font-family:'JetBrains Mono'}
    .finput.on{color:${t.text}}
    .finput.grow{flex:1}
    .hint{font-size:11px;color:${t.dim};margin-bottom:10px}
    .submit{margin-top:8px;padding:13px;border-radius:10px;background:${t.brand};color:${t.bg};text-align:center;font-weight:700;font-size:14px}
    .banner{display:flex;gap:8px;align-items:flex-start;border:1px solid ${t.line};border-radius:8px;padding:9px;font-size:11px;line-height:1.45;color:${t.dim};margin-bottom:11px}
    .inputRow{display:flex;gap:8px;margin-bottom:12px}
    .qbtn{padding:9px 16px;border-radius:8px;background:${t.brand};color:${t.bg};font-weight:700;font-size:12.5px;display:flex;align-items:center}
    .summary{display:flex;border:1px solid ${t.line};border-radius:10px;padding:11px;margin-bottom:8px}
    .sumc{flex:1}
    .sumlbl{font-size:9px;color:${t.dim};margin-bottom:3px}
    .sumval{font-family:'JetBrains Mono';font-size:14px;font-weight:700;color:${t.text};font-variant-numeric:tabular-nums}
    .prow{display:flex;justify-content:space-between;align-items:center;padding:10px 1px;border-bottom:1px solid ${t.line}}
    .pcoin{font-family:'Space Mono';font-size:13px;font-weight:700;color:${t.text}}
    .pright{text-align:right}
    .ppnl{font-family:'JetBrains Mono';font-size:13px;font-weight:600;font-variant-numeric:tabular-nums}
    .proe{font-family:'JetBrains Mono';font-size:10px;margin-top:2px;font-variant-numeric:tabular-nums}
    .agentHead{border:1px solid ${t.line};border-radius:10px;padding:12px;margin:4px 0 10px;background-color:${t.surf2}}
    .aTitle{font-family:'Space Mono';font-weight:700;font-size:13px;color:${t.brand};letter-spacing:.8px}
    .srow{display:flex;justify-content:space-between;align-items:center;padding:10px 1px;border-bottom:1px solid ${t.line}}
    .sname{font-family:'Space Mono';font-weight:700;font-size:13px;color:${t.text}}
    .smkt{color:${t.dim};font-weight:400;font-size:11px}
    .tog{width:38px;height:22px;border-radius:6px;position:relative;background:${t.line};flex:0 0 auto}
    .tog.on{background:${t.brand};box-shadow:0 0 9px rgba(255,180,84,.5)}
    .tog i{position:absolute;top:3px;left:3px;width:16px;height:16px;border-radius:4px;background:${t.bg}}
    .tog.on i{left:19px}
    .guard{display:flex;justify-content:space-between;align-items:center;padding:11px 1px;margin-top:3px}
    .gv{font-family:'JetBrains Mono';font-size:11.5px;color:${t.hi}}
    .ladder{display:flex;gap:9px;margin-top:5px}
    .btn{flex:1;text-align:center;padding:11px;border-radius:9px;font-family:'Space Mono';font-weight:700;font-size:12.5px}
    .btn.kill{background:${t.down};color:#2a0d09}
    .btn.new{border:1px solid ${t.brand};color:${t.brand}}
    .bigbtn{display:flex;align-items:center;justify-content:center;gap:8px;padding:12px;border-radius:10px;font-weight:700;font-size:13.5px;margin-bottom:6px}
    .bigbtn.brand{background:${t.brand};color:${t.bg}}
    .bigbtn.outline{border:1px solid ${t.line};color:${t.text};background:transparent}
    .bigbtn.outline.brand{border-color:${t.brand};color:${t.brand}}
    .bigbtn.outline.down{border-color:${t.down};color:${t.down};margin-top:8px}
    .card{border:1px solid ${t.line};border-radius:10px;padding:12px;margin-bottom:11px}
    .card.warn{border-color:${t.brand}}
    .cardlbl{display:flex;align-items:center;gap:6px;font-size:10px;color:${t.dim};margin-bottom:6px}
    .cardlbl2{font-size:11px;color:${t.dim}}
    .addr{font-family:'JetBrains Mono';font-size:13px;font-weight:600;color:${t.text}}
    .warnrow{display:flex;align-items:flex-start;gap:8px;font-size:11px;font-weight:700;color:${t.brand};margin-bottom:7px}
    .mnemonic{font-size:12px;color:${t.text};line-height:1.5;margin-bottom:7px}
    .link{font-size:11px;color:${t.dim};text-decoration:underline}
    .setrow{display:flex;justify-content:space-between;align-items:center;border:1px solid ${t.line};border-radius:8px;padding:11px;margin-bottom:8px}
    .netval{display:flex;align-items:center;gap:6px;font-size:13px;font-weight:600;color:${t.text}}

    .tabbar{display:flex;justify-content:space-around;align-items:flex-end;background:${t.surf};border-top:1px solid ${t.line};padding:9px 4px 11px}
    .tcell{flex:1;display:flex;flex-direction:column;align-items:center;gap:5px;position:relative;padding-top:6px}
    .tlbl{font-size:9.5px;color:${t.dim}}
    .tcell.act .tlbl{color:${t.brand}}
    .tcell.act span{filter:drop-shadow(0 0 6px rgba(255,180,84,.6))}
    .tick{position:absolute;top:-8px;width:22px;height:2.5px;border-radius:2px;background:${t.brand};box-shadow:0 0 7px ${t.brand}}
   </style></head><body><div class="stage">
     <div class="title">HYPERSOLID — 全部页面设计</div>
     <div class="titlesub">Hyperliquid 移动终端 · 示波器 / 磷光视觉语言 · 统一单线图标系统 · 全部 7 个屏</div>
     <div class="grid-wrap">${frames}</div>
   </div></body></html>`;
}
fs.writeFileSync(__dirname + '/allscreens.html', page());
console.log('wrote allscreens.html');
