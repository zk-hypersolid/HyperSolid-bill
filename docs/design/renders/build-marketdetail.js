// High-fidelity professional Market Detail for HyperSolid, modeled on the
// user-provided reference (BTC-USDC light screen). Renders LIGHT + DARK variants
// side by side so light/dark can be decided. Internationalized, pro layout.
//   node render-core.js marketdetail.html marketdetail.png
const fs = require('fs');

function svg(inner, size, sw, fill) {
  return `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="${fill || 'none'}" stroke="${fill ? 'none' : 'currentColor'}" stroke-width="${sw || 1.8}" stroke-linecap="round" stroke-linejoin="round" style="display:block">${inner}</svg>`;
}
const ICON = {
  back: () => `<path d="M15 5l-7 7 7 7"/>`,
  caret: () => `<path d="M6 9l6 6 6-6"/>`,
  star: () => `<path d="M12 3.2 14.7 9l6.3.7-4.7 4.3 1.3 6.2L12 17.1 6.4 20.2l1.3-6.2L3 9.7 9.3 9Z"/>`,
  clock: () => `<circle cx="12" cy="12" r="8.4"/><path d="M12 7.6V12l3 1.8"/>`,
};
function ico(name, px, color, sw, fill) {
  return `<span style="color:${color};display:inline-flex">${svg(ICON[name](), px, sw, fill)}</span>`;
}

// ---------- candles bounded to the reference's real range [63,919 .. 64,865] ----------
const LO = 63919, HI = 64865, CUR = 64745;
function series() {
  // normalized close path in [0,1]: chop + dip, then a sharp rally; min 0.05, max 1.0.
  const shape = [
    0.42, 0.55, 0.38, 0.30, 0.16, 0.10, 0.05, 0.12, 0.22, 0.18, 0.28, 0.24, 0.33, 0.30, 0.26, 0.34, 0.30, 0.24, 0.31, 0.27,
    0.33, 0.38, 0.30, 0.36, 0.42, 0.46, 0.55, 0.62, 0.70, 0.78, 0.74, 0.83, 0.90, 0.86, 0.94, 1.0, 0.96, 0.91, 0.88, 0.873,
  ];
  const px = (s) => LO + s * (HI - LO);
  const out = [];
  for (let i = 0; i < shape.length; i++) {
    const o = px(i === 0 ? 0.42 : shape[i - 1]), c = px(shape[i]);
    let hi = Math.max(o, c) + 22, lo = Math.min(o, c) - 22;
    hi = Math.min(hi, HI); lo = Math.max(lo, LO);
    out.push([o, c, hi, lo]);
  }
  return out;
}
function chart(t, w, h) {
  const cs = series();
  const max = HI + 18, min = LO - 18;
  const y = (v) => ((max - v) / (max - min)) * h;
  const cw = w / cs.length;
  let body = '';
  [64865, 64550, 64234, 63919].forEach((p) => {
    body += `<line x1="0" y1="${y(p).toFixed(1)}" x2="${w}" y2="${y(p).toFixed(1)}" stroke="${t.grid}" stroke-width="1"/>`;
  });
  cs.forEach(([o, c, hi, lo], i) => {
    const x = i * cw + cw / 2, up = c >= o, col = up ? t.up : t.down;
    const top = y(Math.max(o, c)), bot = y(Math.min(o, c));
    body += `<line x1="${x.toFixed(1)}" y1="${y(hi).toFixed(1)}" x2="${x.toFixed(1)}" y2="${y(lo).toFixed(1)}" stroke="${col}" stroke-width="1.1"/>`;
    body += `<rect x="${(x - cw * 0.32).toFixed(1)}" y="${top.toFixed(1)}" width="${(cw * 0.64).toFixed(1)}" height="${Math.max(1.5, bot - top).toFixed(1)}" fill="${col}"/>`;
  });
  const cy = y(CUR);
  body += `<line x1="0" y1="${cy.toFixed(1)}" x2="${w}" y2="${cy.toFixed(1)}" stroke="${t.up}" stroke-width="1" stroke-dasharray="4 4" opacity="0.95"/>`;
  const axis = [64865, 64550, 64234, 63919].map((p) => ({ p, y: y(p) }));
  return { svg: `<svg viewBox="0 0 ${w} ${h}" width="100%" height="${h}" preserveAspectRatio="none">${body}</svg>`, cy, cur: CUR, axis, h, w };
}

const TF = ['1m', '3m', '5m', '15m', '30m', '1h', '2h', '4h'];
const IND1 = ['MA', 'EMA', 'BOLL', 'SAR', 'AVL'];
const IND2 = ['VOL', 'MACD', 'KDJ', 'RSI', 'ROC'];
const PERF = [['今日', '+0.85%', 1], ['7days', '-2.36%', 0], ['30days', '-15.62%', 0], ['90days', '-8.25%', 0], ['180days', '-9.06%', 0], ['年线', '-9.06%', 0]];

function screen(t) {
  const c = chart(t, 348, 188);
  const axisLabels = c.axis
    .map(({ p, y }) => `<div class="axlbl" style="top:${y.toFixed(1)}px">${p.toLocaleString()}</div>`)
    .join('');
  const curTop = Math.min(c.h - 16, Math.max(2, c.cy - 9));

  const stat = (l, v, vc) => `<div class="strow"><span class="sl">${l}</span><span class="sv" ${vc ? `style="color:${vc}"` : ''}>${v}</span></div>`;
  const ob = (rows, side) => rows.map(([px, sum, d]) => `<div class="obr ${side}">
      <div class="obbar" style="width:${d}%;background:${(side === 'bid' ? t.up : t.down)}1c"></div>
      ${side === 'bid'
      ? `<span class="obsum">${sum}</span><span class="obpx" style="color:${t.up}">${px}</span>`
      : `<span class="obpx" style="color:${t.down}">${px}</span><span class="obsum">${sum}</span>`}</div>`).join('');

  return `<div class="screen">
  <div class="status"><span class="t">20:12</span><span class="si">●●●● ▾ ▮</span></div>

  <div class="hd">
    <span class="hl">${ico('back', 22, t.text, 2)}<b>BTC-USDC</b><span class="kpill">合约 ${ico('caret', 12, t.dim, 2)}</span></span>
    <span>${ico('star', 22, t.star, 0, t.star)}</span>
  </div>

  <div class="quote">
    <div class="qleft">
      <div class="qbig" style="color:${t.text}">64,731</div>
      <div class="qsub"><span style="color:${t.up}">$64,731.5</span> <span style="color:${t.up}">+1.09%</span></div>
      <div class="qmark">标记价格 <b>64,733</b></div>
    </div>
    <div class="qright">
      ${stat('24H 最高', '64,865')}
      ${stat('24H 最低', '63,242')}
      ${stat('24H 成交量(USDC)', '1.77B')}
      ${stat('未平仓(USDC)', '1.95B')}
      ${stat('资金费率', '0.0010% · 00:47:19')}
    </div>
  </div>

  <div class="tfs">${TF.map((x) => `<span class="tf ${x === '15m' ? 'on' : ''}">${x}</span>`).join('')}</div>

  <div class="chartwrap">
    <div class="chart">${c.svg}</div>
    <div class="axis">${axisLabels}</div>
    <div class="curbadge" style="top:${curTop}px">${c.cur.toLocaleString()}</div>
    <div class="xax">${['06:00', '07:30', '09:00', '10:30', '12:00'].map((x) => `<span>${x}</span>`).join('')}</div>
  </div>

  <div class="inds">
    ${IND1.map((x, i) => `<span class="ind ${i === 0 ? 'on' : ''}">${x}</span>`).join('')}
    <span class="indsep"></span>
    ${IND2.map((x) => `<span class="ind">${x}</span>`).join('')}
  </div>

  <div class="perf">${PERF.map(([l, v, up]) => `<div class="pf"><div class="pfl">${l}</div><div class="pfv" style="color:${up ? t.up : t.down}">${v}</div></div>`).join('')}</div>

  <div class="btabs"><span class="bt on">委托簿</span><span class="bt">最新成交</span></div>

  <div class="ls">
    <div class="lsbar"><div class="lsl" style="width:87.84%"></div><div class="lsr" style="width:12.16%"></div></div>
    <div class="lslab"><span style="color:${t.up}">Long 87.84%</span><span style="color:${t.down}">12.16% Short</span></div>
  </div>

  <div class="obhd"><span>买盘</span><span>卖盘</span><span class="grp">1 ${ico('caret', 11, t.dim, 2)}</span></div>
  <div class="obcols"><span>Sum(BTC)</span><span>价格</span><span>价格</span><span>Sum(BTC)</span></div>
  <div class="obbook">
    <div class="obside">${ob([['64,730', '0.812', 60], ['64,728', '0.402', 78], ['64,725', '1.205', 95], ['64,721', '0.640', 50]], 'bid')}</div>
    <div class="obside">${ob([['64,733', '0.318', 55], ['64,736', '0.927', 72], ['64,740', '0.451', 88], ['64,744', '1.083', 64]], 'ask')}</div>
  </div>

  <div class="cta-wrap"><button class="cta">交易</button></div>
  </div>`;
}

const LIGHT = {
  name: '浅色 · Light（贴合参考）', bg: '#FFFFFF', surf: '#F5F7FA', surf2: '#FBFCFD', line: '#EDF0F4', line2: '#E4E8EE',
  text: '#0B0F14', dim: '#8B95A1', sub: '#AEB6C0', up: '#16C784', down: '#F0616A', star: '#F5A623',
  cta: '#0B0E13', ctaText: '#FFFFFF', grid: 'rgba(20,24,30,.05)', pill: '#EEF1F5',
};
const DARK = {
  name: '深色 · Dark（HyperSolid Pro）', bg: '#0B0F12', surf: '#141B20', surf2: '#10161A', line: '#1F2A30', line2: '#26333A',
  text: '#E9EFF3', dim: '#7E8B96', sub: '#5E6B74', up: '#2EBD85', down: '#F6465D', star: '#F5B544',
  cta: '#39E0C4', ctaText: '#062018', grid: 'rgba(255,255,255,.05)', pill: '#1A242A',
};

function css(t) {
  return `
  .phone{width:392px;background:${t.bg};border-radius:30px;overflow:hidden;border:1px solid ${t.line2};box-shadow:0 30px 70px rgba(0,0,0,.45)}
  .screen{font-family:-apple-system,"SF Pro Display",Inter,system-ui,sans-serif;position:relative;padding-bottom:84px}
  .status{display:flex;justify-content:space-between;align-items:center;padding:12px 20px 2px}
  .status .t{font:700 15px ui-monospace,"SF Mono",monospace;color:${t.text}}
  .status .si{font:600 11px sans-serif;color:${t.dim};letter-spacing:1px}
  .hd{display:flex;align-items:center;justify-content:space-between;padding:8px 18px 6px}
  .hl{display:flex;align-items:center;gap:10px}
  .hl b{font:800 21px sans-serif;color:${t.text};letter-spacing:.2px}
  .kpill{display:inline-flex;align-items:center;gap:3px;font:600 12px sans-serif;color:${t.dim};background:${t.pill};border-radius:7px;padding:4px 8px}
  .quote{display:flex;justify-content:space-between;padding:6px 20px 4px;gap:14px}
  .qbig{font:800 40px sans-serif;letter-spacing:-1px;line-height:1.05}
  .qsub{font:700 14px ui-monospace,monospace;margin-top:4px}
  .qmark{font:500 12px sans-serif;color:${t.dim};margin-top:6px}
  .qmark b{color:${t.dim};font-weight:700}
  .qright{flex:1;max-width:210px;padding-top:4px}
  .strow{display:flex;justify-content:space-between;align-items:center;margin-bottom:5px}
  .sl{font:500 11.5px sans-serif;color:${t.dim}}
  .sv{font:600 11.5px ui-monospace,monospace;color:${t.text}}
  .tfs{display:flex;justify-content:space-between;padding:12px 18px 8px}
  .tf{font:600 13px sans-serif;color:${t.dim};padding:5px 4px}
  .tf.on{color:${t.text};font-weight:800;background:${t.pill};border-radius:9px;padding:5px 12px}
  .chartwrap{position:relative;padding:2px 12px 0}
  .chart{height:188px}
  .axis{position:absolute;right:14px;top:0;height:188px;width:60px;pointer-events:none}
  .axlbl{position:absolute;right:0;font:600 11px ui-monospace,monospace;color:${t.sub};transform:translateY(-50%)}
  .curbadge{position:absolute;right:14px;font:700 11px ui-monospace,monospace;color:#fff;background:${t.up};border-radius:4px;padding:2px 6px}
  .xax{display:flex;justify-content:space-between;padding:8px 6px 0}
  .xax span{font:600 11px ui-monospace,monospace;color:${t.sub}}
  .inds{display:flex;align-items:center;gap:14px;padding:14px 18px 8px;border-bottom:1px solid ${t.line};overflow:hidden}
  .ind{font:600 13px sans-serif;color:${t.dim};white-space:nowrap}
  .ind.on{color:${t.text};font-weight:800}
  .indsep{width:1px;height:14px;background:${t.line2};flex:0 0 auto}
  .perf{display:flex;justify-content:space-between;padding:14px 18px;border-bottom:1px solid ${t.line}}
  .pf{text-align:left}
  .pfl{font:500 11px sans-serif;color:${t.dim};margin-bottom:4px}
  .pfv{font:700 12.5px ui-monospace,monospace}
  .btabs{display:flex;gap:22px;padding:14px 20px 0}
  .bt{font:700 15px sans-serif;color:${t.dim};padding-bottom:8px}
  .bt.on{color:${t.text};border-bottom:2.5px solid ${t.text}}
  .ls{padding:12px 18px 6px}
  .lsbar{display:flex;height:24px;border-radius:7px;overflow:hidden;gap:2px}
  .lsl{background:${t.up}2e}
  .lsr{background:${t.down}2e}
  .lslab{display:flex;justify-content:space-between;margin-top:6px;font:700 12px sans-serif}
  .obhd{display:flex;align-items:center;padding:10px 18px 2px}
  .obhd span{flex:1;font:700 13px sans-serif;color:${t.text}}
  .obhd .grp{flex:0 0 auto;display:inline-flex;align-items:center;gap:3px;font:600 12px sans-serif;color:${t.dim}}
  .obcols{display:flex;padding:6px 18px 4px}
  .obcols span{flex:1;font:500 10.5px sans-serif;color:${t.dim}}
  .obcols span:nth-child(2),.obcols span:nth-child(3){text-align:center}
  .obcols span:nth-child(4){text-align:right}
  .obbook{display:flex;gap:10px;padding:0 18px}
  .obside{flex:1;display:flex;flex-direction:column;gap:4px}
  .obr{position:relative;display:flex;justify-content:space-between;padding:5px 8px;border-radius:4px;overflow:hidden}
  .obr .obbar{position:absolute;top:0;bottom:0}
  .obr.bid .obbar{right:0}.obr.ask .obbar{left:0}
  .obpx,.obsum{position:relative;font:600 12px ui-monospace,monospace}
  .obsum{color:${t.dim}}
  .cta-wrap{position:absolute;left:0;right:0;bottom:0;padding:14px 18px 20px;background:linear-gradient(${t.bg}00,${t.bg} 32%)}
  .cta{width:100%;border:none;border-radius:30px;padding:17px;font:800 16px sans-serif;color:${t.ctaText};background:${t.cta};cursor:pointer}
  `;
}

function block(t) {
  return `<div class="col"><div class="clabel">${t.name}</div>
    <div class="phone"><style scoped>${css(t)}</style>${screen(t)}</div>
    <div class="cap"><i style="background:${t.bg};border:1px solid ${t.line2}"></i><i style="background:${t.up}"></i><i style="background:${t.down}"></i><i style="background:${t.cta}"></i></div></div>`;
}

// scope each phone's CSS by wrapping in a unique id (style scoped is non-standard,
// so prefix selectors instead)
function scopedBlock(t, id) {
  const scopedCss = css(t).replace(/(^|\})\s*([.#][^{},]+(?:,[^{}]+)*)\s*\{/g, (m, brace, sel) => {
    const scoped = sel.split(',').map((s) => `#${id} ${s.trim()}`).join(',');
    return `${brace} ${scoped}{`;
  });
  return `<div class="col"><div class="clabel">${t.name}</div>
    <div id="${id}"><div class="phone">${screen(t)}</div></div>
    <style>${scopedCss}</style>
    <div class="cap"><i style="background:${t.bg};border:1px solid ${t.line2}"></i><i style="background:${t.up}"></i><i style="background:${t.down}"></i><i style="background:${t.cta}"></i></div></div>`;
}

const html = `<!doctype html><html><head><meta charset="utf-8"><style>
*{box-sizing:border-box;margin:0;padding:0}
body{background:#06070A}
.stage{width:980px;padding:44px;background:radial-gradient(120% 90% at 50% 0,#0E1218 0,#06070A 60%);font-family:-apple-system,Inter,system-ui,sans-serif}
.title{font:800 28px Inter,sans-serif;color:#EAF0F4}
.subtitle{font:500 14px Inter,sans-serif;color:#76828C;margin:8px 0 30px}
.row{display:flex;gap:46px;justify-content:center}
.col{display:flex;flex-direction:column;gap:12px;align-items:center}
.clabel{font:800 13px Inter,sans-serif;color:#C7D0D8;letter-spacing:.5px}
#L .phone,#D .phone{margin:0}
.cap{display:flex;gap:6px}
.cap i{width:20px;height:20px;border-radius:5px;display:block}
</style></head><body><div class="stage">
  <div class="title">HYPERSOLID — Market Detail 专业版（对照参考重做）</div>
  <div class="subtitle">参考所给截图的全部元素 · 国际化排版 · 浅色/深色两版供决策（信息架构与文案保持，可切主题）</div>
  <div class="row">${scopedBlock(LIGHT, 'L')}${scopedBlock(DARK, 'D')}</div>
</div></body></html>`;

fs.writeFileSync(__dirname + '/marketdetail.html', html);
console.log('wrote marketdetail.html');
