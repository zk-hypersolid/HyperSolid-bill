// Market Detail: the ACCEPTED professional layout (from marketdetail.png) re-skinned
// in the ORIGINAL HyperSolid phosphor / oscilloscope house style (amber-on-dark,
// terminal type, trace header, solid-amber CTA). Two house tints side by side:
// Electrum (app default gold/teal) + Oscilloscope (render orange).
//   node render-core.js marketdetail-phosphor.html marketdetail-phosphor.png
const fs = require('fs');

function svg(inner, size, sw, fill) {
  return `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="${fill || 'none'}" stroke="${fill ? 'none' : 'currentColor'}" stroke-width="${sw || 1.7}" stroke-linecap="round" stroke-linejoin="round" style="display:block">${inner}</svg>`;
}
const ICON = {
  back: () => `<path d="M15 5l-7 7 7 7"/>`,
  caret: () => `<path d="M6 9l6 6 6-6"/>`,
  star: () => `<path d="M12 3.2 14.7 9l6.3.7-4.7 4.3 1.3 6.2L12 17.1 6.4 20.2l1.3-6.2L3 9.7 9.3 9Z"/>`,
};
function ico(name, px, color, sw, fill) {
  return `<span style="color:${color};display:inline-flex">${svg(ICON[name](), px, sw, fill)}</span>`;
}

// phosphor oscilloscope trace header (from original house style)
function trace(t, amp, seed, h) {
  h = h || 26;
  let d = `M0 ${h / 2}`; const n = 64;
  for (let i = 1; i <= n; i++) {
    const x = (i / n) * 348;
    const s = Math.sin(i * 0.55 + seed) * amp * 0.6 + Math.sin(i * 0.17 + seed * 2) * amp * 0.4 + Math.sin(i * 1.9 + seed) * amp * 0.15;
    d += ` L${x.toFixed(1)} ${(h / 2 - s).toFixed(1)}`;
  }
  return `<div class="trace"><svg viewBox="0 0 348 ${h}" width="100%" height="${h}" preserveAspectRatio="none">
    <defs><filter id="g${seed}"><feGaussianBlur stdDeviation="1.2"/></filter></defs>
    <path d="${d}" fill="none" stroke="${t.brand}" stroke-width="3" opacity="0.26" filter="url(#g${seed})"/>
    <path d="${d}" fill="none" stroke="${t.hi}" stroke-width="1.1"/></svg></div>`;
}

// ---- candles bounded to the reference's real range ----
const LO = 63919, HI = 64865, CUR = 64745;
function series() {
  const shape = [0.42, 0.55, 0.38, 0.30, 0.16, 0.10, 0.05, 0.12, 0.22, 0.18, 0.28, 0.24, 0.33, 0.30, 0.26, 0.34, 0.30, 0.24, 0.31, 0.27, 0.33, 0.38, 0.30, 0.36, 0.42, 0.46, 0.55, 0.62, 0.70, 0.78, 0.74, 0.83, 0.90, 0.86, 0.94, 1.0, 0.96, 0.91, 0.88, 0.873];
  const px = (s) => LO + s * (HI - LO); const out = [];
  for (let i = 0; i < shape.length; i++) {
    const o = px(i === 0 ? 0.42 : shape[i - 1]), c = px(shape[i]);
    out.push([o, c, Math.min(HI, Math.max(o, c) + 22), Math.max(LO, Math.min(o, c) - 22)]);
  }
  return out;
}
function chart(t, w, h) {
  const cs = series(); const max = HI + 18, min = LO - 18;
  const y = (v) => ((max - v) / (max - min)) * h; const cw = w / cs.length;
  let body = '';
  [64865, 64550, 64234, 63919].forEach((p) => { body += `<line x1="0" y1="${y(p).toFixed(1)}" x2="${w}" y2="${y(p).toFixed(1)}" stroke="${t.grid}" stroke-width="1"/>`; });
  cs.forEach(([o, c, hi, lo], i) => {
    const x = i * cw + cw / 2, up = c >= o, col = up ? t.up : t.down;
    const top = y(Math.max(o, c)), bot = y(Math.min(o, c));
    body += `<line x1="${x.toFixed(1)}" y1="${y(hi).toFixed(1)}" x2="${x.toFixed(1)}" y2="${y(lo).toFixed(1)}" stroke="${col}" stroke-width="1.1"/>`;
    body += `<rect x="${(x - cw * 0.32).toFixed(1)}" y="${top.toFixed(1)}" width="${(cw * 0.64).toFixed(1)}" height="${Math.max(1.5, bot - top).toFixed(1)}" fill="${col}"/>`;
  });
  const cy = y(CUR);
  body += `<line x1="0" y1="${cy.toFixed(1)}" x2="${w}" y2="${cy.toFixed(1)}" stroke="${t.brand}" stroke-width="1" stroke-dasharray="4 4" opacity="0.9"/>`;
  return { svg: `<svg viewBox="0 0 ${w} ${h}" width="100%" height="${h}" preserveAspectRatio="none">${body}</svg>`, cy, cur: CUR, axis: [64865, 64550, 64234, 63919].map((p) => ({ p, y: y(p) })), h };
}

const TF = ['1m', '3m', '5m', '15m', '30m', '1h', '2h', '4h'];
const IND1 = ['MA', 'EMA', 'BOLL', 'SAR', 'AVL'], IND2 = ['VOL', 'MACD', 'KDJ', 'RSI', 'ROC'];
const PERF = [['今日', '+0.85%', 1], ['7days', '-2.36%', 0], ['30days', '-15.62%', 0], ['90days', '-8.25%', 0], ['180days', '-9.06%', 0], ['年线', '-9.06%', 0]];

function screen(t) {
  const c = chart(t, 348, 184);
  const axisLabels = c.axis.map(({ p, y }) => `<div class="axlbl" style="top:${y.toFixed(1)}px">${p.toLocaleString()}</div>`).join('');
  const curTop = Math.min(c.h - 16, Math.max(2, c.cy - 9));
  const stat = (l, v) => `<div class="strow"><span class="sl">${l}</span><span class="sv">${v}</span></div>`;
  const ob = (rows, side) => rows.map(([px, sum, d]) => `<div class="obr ${side}">
      <div class="obbar" style="width:${d}%;background:${(side === 'bid' ? t.up : t.down)}22"></div>
      ${side === 'bid' ? `<span class="obsum">${sum}</span><span class="obpx" style="color:${t.up}">${px}</span>` : `<span class="obpx" style="color:${t.down}">${px}</span><span class="obsum">${sum}</span>`}</div>`).join('');

  return `<div class="screen">
  ${trace(t, 6, 0.4)}
  <div class="status"><span class="t">20:12</span><span class="wm">HYPERSOLID</span><span class="rd"><i></i>SIGNAL</span></div>
  <div class="hd"><span class="hl">${ico('back', 21, t.text, 2)}<b>BTC-USDC</b><span class="kpill">合约 ${ico('caret', 12, t.brand, 2)}</span></span>
    <span>${ico('star', 21, t.star, 0, t.star)}</span></div>
  <div class="quote">
    <div class="qleft"><div class="qbig">64,731</div>
      <div class="qsub"><span style="color:${t.up}">$64,731.5</span> <span style="color:${t.up}">+1.09%</span></div>
      <div class="qmark">标记价格 <b>64,733</b></div></div>
    <div class="qright">${stat('24H 最高', '64,865')}${stat('24H 最低', '63,242')}${stat('24H 成交量(USDC)', '1.77B')}${stat('未平仓(USDC)', '1.95B')}${stat('资金费率', '0.0010% · 00:47:19')}</div>
  </div>
  <div class="tfs">${TF.map((x) => `<span class="tf ${x === '15m' ? 'on' : ''}">${x}</span>`).join('')}</div>
  <div class="chartwrap"><div class="chart">${c.svg}</div><div class="axis">${axisLabels}</div>
    <div class="curbadge" style="top:${curTop}px">${c.cur.toLocaleString()}</div>
    <div class="xax">${['06:00', '07:30', '09:00', '10:30', '12:00'].map((x) => `<span>${x}</span>`).join('')}</div></div>
  <div class="inds">${IND1.map((x, i) => `<span class="ind ${i === 0 ? 'on' : ''}">${x}</span>`).join('')}<span class="indsep"></span>${IND2.map((x) => `<span class="ind">${x}</span>`).join('')}</div>
  <div class="perf">${PERF.map(([l, v, up]) => `<div class="pf"><div class="pfl">${l}</div><div class="pfv" style="color:${up ? t.up : t.down}">${v}</div></div>`).join('')}</div>
  <div class="btabs"><span class="bt on">委托簿</span><span class="bt">最新成交</span></div>
  <div class="ls"><div class="lsbar"><div class="lsl" style="width:87.84%"></div><div class="lsr" style="width:12.16%"></div></div>
    <div class="lslab"><span style="color:${t.up}">Long 87.84%</span><span style="color:${t.down}">12.16% Short</span></div></div>
  <div class="obhd"><span>买盘</span><span>卖盘</span><span class="grp">1 ${ico('caret', 11, t.dim, 2)}</span></div>
  <div class="obcols"><span>Sum(BTC)</span><span>价格</span><span>价格</span><span>Sum(BTC)</span></div>
  <div class="obbook"><div class="obside">${ob([['64,730', '0.812', 60], ['64,728', '0.402', 78], ['64,725', '1.205', 95], ['64,721', '0.640', 50]], 'bid')}</div>
    <div class="obside">${ob([['64,733', '0.318', 55], ['64,736', '0.927', 72], ['64,740', '0.451', 88], ['64,744', '1.083', 64]], 'ask')}</div></div>
  <div class="cta-wrap"><button class="cta">交 易</button></div>
  </div>`;
}

const ELECTRUM = { name: 'Electrum · 琥珀金（App 默认）', bg: '#0A1217', surf: '#0F1A20', surf2: '#0C151A', line: '#20303A', line2: '#27414C', text: '#EAF1F4', dim: '#7E929C', sub: '#566571', brand: '#E8C98F', hi: '#F6E4BE', up: '#34C98B', down: '#FF5C63', star: '#E8C98F', cta: '#E8C98F', ctaText: '#0A1217', grid: 'rgba(232,201,143,.06)', pill: 'rgba(232,201,143,.12)' };
const OSCILLO = { name: 'Oscilloscope · 橙琥珀', bg: '#0C0A07', surf: '#14110B', surf2: '#100D08', line: '#2A2418', line2: '#352D1C', text: '#F3ECDD', dim: '#9A8E73', sub: '#6E6450', brand: '#FFB454', hi: '#FFD9A0', up: '#6FE0C0', down: '#FF7A6B', star: '#FFB454', cta: '#FFB454', ctaText: '#1A1206', grid: 'rgba(255,180,84,.07)', pill: 'rgba(255,180,84,.12)' };

function css(t) {
  return `
  .phone{width:392px;background:${t.bg};border-radius:30px;overflow:hidden;border:1px solid ${t.line2};box-shadow:0 30px 70px rgba(0,0,0,.55)}
  .screen{font-family:ui-monospace,"SF Mono","JetBrains Mono",monospace;position:relative;padding-bottom:84px}
  .trace{height:26px;opacity:.9}
  .status{display:flex;justify-content:space-between;align-items:center;padding:4px 20px 2px}
  .status .t{font:600 13px ui-monospace,monospace;color:${t.dim}}
  .status .wm{font:800 13px ui-monospace,monospace;color:${t.brand};letter-spacing:3px}
  .rd{display:inline-flex;align-items:center;gap:5px;font:700 9px ui-monospace,monospace;letter-spacing:1.5px;color:${t.up}}
  .rd i{width:6px;height:6px;border-radius:50%;background:${t.up};box-shadow:0 0 7px ${t.up}}
  .hd{display:flex;align-items:center;justify-content:space-between;padding:8px 18px 6px}
  .hl{display:flex;align-items:center;gap:10px}
  .hl b{font:800 20px ui-monospace,monospace;color:${t.text};letter-spacing:.5px}
  .kpill{display:inline-flex;align-items:center;gap:3px;font:600 12px ui-monospace,monospace;color:${t.brand};background:${t.pill};border:1px solid ${t.brand}40;border-radius:7px;padding:3px 8px}
  .quote{display:flex;justify-content:space-between;padding:6px 20px 4px;gap:14px}
  .qbig{font:800 40px ui-monospace,monospace;letter-spacing:-1px;line-height:1.05;color:${t.text}}
  .qsub{font:700 14px ui-monospace,monospace;margin-top:4px}
  .qmark{font:500 12px ui-monospace,monospace;color:${t.dim};margin-top:6px}
  .qmark b{color:${t.text};font-weight:700}
  .qright{flex:1;max-width:212px;padding-top:3px}
  .strow{display:flex;justify-content:space-between;margin-bottom:5px}
  .sl{font:500 11px ui-monospace,monospace;color:${t.dim}}
  .sv{font:600 11.5px ui-monospace,monospace;color:${t.text}}
  .tfs{display:flex;justify-content:space-between;padding:12px 16px 8px}
  .tf{font:600 12.5px ui-monospace,monospace;color:${t.dim};padding:5px 6px}
  .tf.on{color:${t.ctaText};font-weight:800;background:${t.brand};border-radius:8px;padding:5px 11px}
  .chartwrap{position:relative;padding:2px 12px 0}
  .chart{height:184px}
  .axis{position:absolute;right:14px;top:0;height:184px;width:58px}
  .axlbl{position:absolute;right:0;font:600 10.5px ui-monospace,monospace;color:${t.sub};transform:translateY(-50%)}
  .curbadge{position:absolute;right:14px;font:700 11px ui-monospace,monospace;color:${t.ctaText};background:${t.brand};border-radius:4px;padding:2px 6px}
  .xax{display:flex;justify-content:space-between;padding:8px 6px 0}
  .xax span{font:600 10.5px ui-monospace,monospace;color:${t.sub}}
  .inds{display:flex;align-items:center;gap:13px;padding:14px 18px 10px;border-bottom:1px solid ${t.line};overflow:hidden}
  .ind{font:600 12.5px ui-monospace,monospace;color:${t.dim};white-space:nowrap}
  .ind.on{color:${t.brand};font-weight:800}
  .indsep{width:1px;height:13px;background:${t.line2}}
  .perf{display:flex;justify-content:space-between;padding:14px 18px;border-bottom:1px solid ${t.line}}
  .pfl{font:500 10.5px ui-monospace,monospace;color:${t.dim};margin-bottom:4px}
  .pfv{font:700 12px ui-monospace,monospace}
  .btabs{display:flex;gap:22px;padding:14px 20px 0}
  .bt{font:700 14px ui-monospace,monospace;color:${t.dim};padding-bottom:8px;letter-spacing:.5px}
  .bt.on{color:${t.text};border-bottom:2.5px solid ${t.brand}}
  .ls{padding:12px 18px 6px}
  .lsbar{display:flex;height:22px;border-radius:6px;overflow:hidden;gap:2px}
  .lsl{background:${t.up}30}.lsr{background:${t.down}30}
  .lslab{display:flex;justify-content:space-between;margin-top:6px;font:700 12px ui-monospace,monospace}
  .obhd{display:flex;align-items:center;padding:10px 18px 2px}
  .obhd span{flex:1;font:700 13px ui-monospace,monospace;color:${t.text}}
  .obhd .grp{flex:0 0 auto;display:inline-flex;align-items:center;gap:3px;font:600 11.5px ui-monospace,monospace;color:${t.dim}}
  .obcols{display:flex;padding:6px 18px 4px}
  .obcols span{flex:1;font:500 10px ui-monospace,monospace;color:${t.dim}}
  .obcols span:nth-child(2),.obcols span:nth-child(3){text-align:center}
  .obcols span:nth-child(4){text-align:right}
  .obbook{display:flex;gap:10px;padding:0 18px}
  .obside{flex:1;display:flex;flex-direction:column;gap:4px}
  .obr{position:relative;display:flex;justify-content:space-between;padding:5px 8px;border-radius:4px;overflow:hidden}
  .obr .obbar{position:absolute;top:0;bottom:0}.obr.bid .obbar{right:0}.obr.ask .obbar{left:0}
  .obpx,.obsum{position:relative;font:600 12px ui-monospace,monospace}.obsum{color:${t.dim}}
  .cta-wrap{position:absolute;left:0;right:0;bottom:0;padding:14px 18px 20px;background:linear-gradient(${t.bg}00,${t.bg} 34%)}
  .cta{width:100%;border:none;border-radius:13px;padding:16px;font:800 16px ui-monospace,monospace;letter-spacing:4px;color:${t.ctaText};background:${t.cta};cursor:pointer;box-shadow:0 0 24px ${t.brand}33}
  `;
}
function scopedCss(t, id) {
  return css(t).replace(/(^|\})\s*([.#][^{},]+(?:,[^{}]+)*)\s*\{/g, (m, brace, sel) => `${brace} ${sel.split(',').map((s) => `#${id} ${s.trim()}`).join(',')}{`);
}
function block(t, id) {
  return `<div class="col"><div class="clabel">${t.name}</div>
    <div id="${id}"><div class="phone">${screen(t)}</div></div><style>${scopedCss(t, id)}</style>
    <div class="cap"><i style="background:${t.bg};border:1px solid ${t.line2}"></i><i style="background:${t.brand}"></i><i style="background:${t.up}"></i><i style="background:${t.down}"></i></div></div>`;
}

const html = `<!doctype html><html><head><meta charset="utf-8"><style>
*{box-sizing:border-box;margin:0;padding:0}
body{background:#05060A}
.stage{width:980px;padding:44px;background:radial-gradient(120% 90% at 50% 0,#0C1016 0,#05060A 60%);font-family:Inter,-apple-system,system-ui,sans-serif}
.title{font:800 27px Inter,sans-serif;color:#EAF0F4}
.subtitle{font:500 14px Inter,sans-serif;color:#76828C;margin:8px 0 30px}
.row{display:flex;gap:46px;justify-content:center}
.col{display:flex;flex-direction:column;gap:12px;align-items:center}
.clabel{font:800 12.5px Inter,sans-serif;color:#C7D0D8;letter-spacing:.5px}
.cap{display:flex;gap:6px}.cap i{width:20px;height:20px;border-radius:5px;display:block}
</style></head><body><div class="stage">
  <div class="title">HYPERSOLID — Market Detail：专业版布局 × 原磷光风格</div>
  <div class="subtitle">采纳的 marketdetail 布局/元素，套回原 HyperSolid 磷光/终端风（琥珀金·示波器波形头·等宽终端字·实心琥珀 CTA）· 两种家族色调供确认</div>
  <div class="row">${block(ELECTRUM, 'E')}${block(OSCILLO, 'O')}</div>
</div></body></html>`;

fs.writeFileSync(__dirname + '/marketdetail-phosphor.html', html);
console.log('wrote marketdetail-phosphor.html');
