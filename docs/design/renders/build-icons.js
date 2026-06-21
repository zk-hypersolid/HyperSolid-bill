// Renders the redesigned HyperSolid icon system (phosphor / oscilloscope).
// Single-weight monoline icons on a 24px grid — consistent, mobile-native,
// theme-tinted. Replaces the multicolor system-emoji set.
const fs = require('fs');

const t = {
  bg: '#0C0A07', surf: '#14110B', surf2: '#171309', line: '#2A2418',
  grid: 'rgba(255,180,84,.06)', text: '#F3ECDD', dim: '#9A8E73',
  brand: '#FFB454', hi: '#FFD9A0', up: '#6FE0C0', down: '#FF7A6B',
};

// ---- icon library (24x24, stroke=currentColor, 1.7 monoline) ----
function svg(inner, size) {
  size = size || 24;
  return `<svg class="ic" viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${inner}</svg>`;
}
const ICON = {
  // bottom nav
  markets: (a) => svg(`<polyline points="2,14 6,14 8.5,8 11,17 13.5,6 16,14 22,14"/>${a ? '<circle cx="13.5" cy="6" r="1.7" fill="currentColor" stroke="none"/>' : ''}`),
  trade: () => svg(`<path d="M8 20V5"/><path d="M4.5 8.5 8 5l3.5 3.5"/><path d="M16 4v15"/><path d="M12.5 15.5 16 19l3.5-3.5"/>`),
  positions: () => svg(`<path d="M12 3 21 8 12 13 3 8Z"/><path d="M3 12.5 12 17.5 21 12.5"/>`),
  agent: (a) => svg(`<circle cx="12" cy="12" r="7.5"/><circle cx="12" cy="12" r="2.6" ${a ? 'fill="currentColor" stroke="none"' : ''}/><path d="M12 1.5V4.5"/><path d="M12 19.5V22.5"/><path d="M1.5 12H4.5"/><path d="M19.5 12H22.5"/>`),
  account: () => svg(`<rect x="3" y="6" width="18" height="13" rx="2.5"/><path d="M3 10h18"/><circle cx="16.5" cy="14.5" r="1.3" fill="currentColor" stroke="none"/>`),
  // utility glyphs
  star: (a) => svg(`<path d="M12 3.6 14.55 9.1 20.6 9.8 16.1 14 17.4 20 12 16.9 6.6 20 7.9 14 3.4 9.8 9.45 9.1Z" ${a ? 'fill="currentColor"' : ''}/>`),
  key: () => svg(`<circle cx="8" cy="8" r="4.2"/><path d="M11 11 20 20"/><path d="M17.5 17.5 19.5 15.5"/><path d="M15.2 15.2 17 13.4"/>`),
  alert: () => svg(`<path d="M12 3 19.5 5.8V11c0 4.6-3.2 7.9-7.5 9.3C7.7 18.9 4.5 15.6 4.5 11V5.8Z"/><path d="M12 8.5V12.6"/><path d="M12 16h.01"/>`),
  swap: () => svg(`<path d="M4 9h13"/><path d="M14 6 17 9 14 12"/><path d="M20 15H7"/><path d="M10 12 7 15 10 18"/>`),
  chevron: () => svg(`<path d="M14.5 6 9 12l5.5 6"/>`),
};

// ---- before/after data ----
const TABS = [
  { key: 'markets', emoji: '📈', zh: '行情', en: 'MARKETS' },
  { key: 'trade', emoji: '⚡', zh: '交易', en: 'TRADE' },
  { key: 'positions', emoji: '💼', zh: '持仓', en: 'POSITIONS' },
  { key: 'agent', emoji: '🤖', zh: '策略', en: 'AGENT' },
  { key: 'account', emoji: '👤', zh: '钱包', en: 'ACCOUNT' },
];
const GLYPHS = [
  { key: 'star', emoji: '★', en: 'WATCH' },
  { key: 'key', emoji: '🔑', en: 'RESTORE' },
  { key: 'alert', emoji: '⚠️', en: 'BACKUP' },
  { key: 'swap', emoji: '⇄', en: 'SWITCH NET' },
  { key: 'chevron', emoji: '→', en: 'BACK' },
];

function specimen() {
  const tabCells = TABS.map((x, i) => `<div class="spec">
      <div class="glyph ${i === 0 ? 'on' : ''}">${ICON[x.key](i === 0)}</div>
      <div class="sname">${ICON_NAME(x.key)}</div></div>`).join('');
  const utilCells = GLYPHS.map((x) => `<div class="spec">
      <div class="glyph util">${ICON[x.key](true)}</div>
      <div class="sname">${ICON_NAME(x.key)}</div></div>`).join('');
  return `<div class="panel grid">
     <div class="plabel">图标系统 · 单线示波器风格 · 24px 网格 · 自动随主题着色</div>
     <div class="specrow">${tabCells}</div>
     <div class="hr"></div>
     <div class="specrow">${utilCells}</div></div>`;
}
function ICON_NAME(k) { return { markets: 'markets', trade: 'trade', positions: 'positions', agent: 'agent', account: 'account', star: 'watch', key: 'restore', alert: 'backup', swap: 'switch', chevron: 'back' }[k]; }

function tabbar(after) {
  const cells = TABS.map((x, i) => {
    const active = i === 0;
    if (!after) {
      return `<div class="tcell"><div class="emoji">${x.emoji}</div><div class="tlbl">${x.zh}</div></div>`;
    }
    return `<div class="tcell ${active ? 'act' : ''}">${active ? '<div class="tick"></div>' : ''}
      <div class="ticon">${ICON[x.key](active)}</div><div class="tlbl">${x.zh}</div></div>`;
  }).join('');
  return `<div class="bar ${after ? 'after' : 'before'}">${cells}</div>`;
}

function glyphCompare() {
  const rows = GLYPHS.map((x) => `<div class="gcrow">
     <div class="gname">${x.en}</div>
     <div class="gbefore">${x.emoji}</div>
     <div class="garrow">→</div>
     <div class="gafter">${ICON[x.key](true)}</div></div>`).join('');
  return `<div class="panel"><div class="plabel">界面图标 · 改造前 → 改造后</div><div class="gcwrap">${rows}</div></div>`;
}

function page() {
  return `<!doctype html><html><head><meta charset="utf8">
 <link href="https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&family=Inter+Tight:wght@400;500;600;700&display=swap" rel="stylesheet">
 <style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{width:1240px;background:radial-gradient(120% 70% at 50% -8%, #1a1408 0%, ${t.bg} 58%);
    font-family:'Inter Tight','PingFang SC',system-ui,sans-serif;color:${t.text};-webkit-font-smoothing:antialiased}
  .stage{padding:40px 48px 46px}
  .title{font-family:'Space Mono';font-weight:700;font-size:26px;color:${t.brand};letter-spacing:1px}
  .sub{font-size:13.5px;color:${t.dim};margin-top:6px;letter-spacing:.2px}
  .row2{display:flex;gap:26px;margin-top:26px;align-items:stretch}
  .panel{background:${t.surf};border:1px solid ${t.line};border-radius:16px;padding:22px 22px 24px;
    box-shadow:0 0 0 1px rgba(255,180,84,.05),0 18px 50px rgba(0,0,0,.55)}
  .grid{background-image:linear-gradient(${t.grid} 1px,transparent 1px),linear-gradient(90deg,${t.grid} 1px,transparent 1px);background-size:22px 22px}
  .plabel{font-family:'Space Mono';font-size:11.5px;color:${t.dim};letter-spacing:1.5px;margin-bottom:18px;text-transform:uppercase}
  .specrow{display:flex;gap:14px}
  .spec{flex:1;display:flex;flex-direction:column;align-items:center;gap:11px;padding:18px 6px;border:1px solid ${t.line};border-radius:12px;background:${t.surf2}}
  .glyph{color:${t.text};display:flex}
  .glyph .ic{width:34px;height:34px}
  .glyph.on{color:${t.brand};filter:drop-shadow(0 0 8px rgba(255,180,84,.6))}
  .glyph.util{color:${t.hi}}
  .sname{font-family:'Space Mono';font-size:11px;color:${t.dim};letter-spacing:1px}
  .hr{height:1px;background:${t.line};margin:18px 0}

  .compare{flex:1;display:flex;flex-direction:column;gap:18px}
  .barwrap{}
  .barhead{display:flex;align-items:center;gap:10px;margin-bottom:9px}
  .tag{font-family:'Space Mono';font-size:11px;letter-spacing:1px;padding:3px 9px;border-radius:6px}
  .tag.bad{color:${t.down};background:rgba(255,122,107,.12)}
  .tag.good{color:${t.up};background:rgba(111,224,192,.12)}
  .note{font-size:12px;color:${t.dim}}
  .bar{display:flex;justify-content:space-around;align-items:flex-end;background:${t.surf};
    border:1px solid ${t.line};border-top:1px solid ${t.line};border-radius:14px;padding:12px 8px 13px}
  .tcell{flex:1;display:flex;flex-direction:column;align-items:center;gap:6px;position:relative;padding-top:7px}
  .emoji{font-size:23px;line-height:1}
  .ticon{color:${t.dim};display:flex}
  .ticon .ic{width:25px;height:25px}
  .tcell.act .ticon{color:${t.brand};filter:drop-shadow(0 0 7px rgba(255,180,84,.6))}
  .tlbl{font-size:11px;color:${t.dim};letter-spacing:.5px}
  .tcell.act .tlbl{color:${t.brand}}
  .tick{position:absolute;top:-9px;width:26px;height:2.5px;border-radius:2px;background:${t.brand};box-shadow:0 0 8px ${t.brand}}

  .gcwrap{display:flex;flex-direction:column;gap:3px}
  .gcrow{display:grid;grid-template-columns:1fr 40px 26px 40px;align-items:center;gap:10px;padding:10px 4px;border-bottom:1px solid ${t.line}}
  .gcrow:last-child{border-bottom:none}
  .gname{font-family:'Space Mono';font-size:12px;color:${t.text};letter-spacing:1px}
  .gbefore{font-size:20px;text-align:center;opacity:.85}
  .garrow{color:${t.dim};text-align:center;font-size:15px}
  .gafter{color:${t.hi};display:flex;justify-content:center}
  .gafter .ic{width:24px;height:24px}
 </style></head><body><div class="stage">
   <div class="title">HYPERSOLID — 图标系统重构</div>
   <div class="sub">多彩系统 Emoji（风格不统一·非原生） → 单线示波器图标（1.7px 描边·24px 网格·随主题着色·原生手感）</div>

   ${specimen()}

   <div class="row2">
     <div class="compare">
       <div class="barwrap">
         <div class="barhead"><span class="tag bad">改造前</span><span class="note">系统 Emoji · 多彩 · 风格不一 · 跨平台样式不可控</span></div>
         ${tabbar(false)}
       </div>
       <div class="barwrap">
         <div class="barhead"><span class="tag good">改造后</span><span class="note">单线统一 · 选中态琥珀辉光 + 顶部指示条 · 原生底部导航</span></div>
         ${tabbar(true)}
       </div>
     </div>
     ${glyphCompare()}
   </div>
 </div></body></html>`;
}
fs.writeFileSync(__dirname + '/icons.html', page());
console.log('wrote icons.html');
