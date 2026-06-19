const fs = require('fs');

const themes = {
  A: {
    name: 'A · Electrum Terminal',
    bg:'#0A1217', surf:'#0F1A20', surf2:'#13242B', line:'#20303A',
    text:'#EAF1F4', mist:'#7E929C', brand:'#E8C98F', brand2:'#F3E3B3',
    up:'#34C98B', down:'#FF5C63', glow:'0 0 0 1px rgba(232,201,143,.10), 0 10px 30px rgba(0,0,0,.45)',
    chip:'#13242B', pill:'rgba(232,201,143,.12)', pillTx:'#E8C98F',
    pulse:'linear-gradient(90deg,#0A1217,#E8C98F55,#F3E3B3,#57C8E655,#0A1217)',
    dark:true
  },
  B: {
    name:'B · Daylight Ledger',
    bg:'#EEF1F3', surf:'#FFFFFF', surf2:'#F5F7F8', line:'#CBD5D8',
    text:'#11201F', mist:'#5A6B6E', brand:'#0E5A6B', brand2:'#0E5A6B',
    up:'#1E7F5C', down:'#C0492F', glow:'0 1px 0 #fff, 0 8px 24px rgba(16,40,46,.10)',
    chip:'#EAEFF1', pill:'rgba(14,90,107,.10)', pillTx:'#0E5A6B',
    pulse:'repeating-linear-gradient(90deg,#CBD5D8 0 6px, transparent 6px 12px)',
    dark:false
  }
};

const coins = [
  ['BTC','62,481.5','+2.14%',1,'0.011%','1.2B'],
  ['ETH','3,002.18','-0.86%',0,'0.008%','842M'],
  ['SOL','148.22','+5.41%',1,'0.021%','510M'],
  ['HYPE','28.74','+1.07%',1,'0.014%','333M'],
  ['ARB','1.182','-2.30%',0,'0.006%','119M'],
  ['DOGE','0.1642','+0.92%',1,'0.004%','97M'],
];

function candles(t){
  let x=8, out='', vals=[62200,62380,62150,62520,62410,62680,62540,62760,62600,62820,62700,62900,62810,62980,62880,63010,62940,62700,62560,62650,62740,62820,62781,62815];
  let prev=vals[0];
  out += `<svg viewBox="0 0 320 150" width="100%" height="150" preserveAspectRatio="none">`;
  const min=Math.min(...vals), max=Math.max(...vals);
  const Y=v=>140-((v-min)/(max-min))*120-6;
  vals.forEach((v,i)=>{
    const up=v>=prev; const col=up?t.up:t.down;
    const o=Y(prev), c=Y(v); const hi=Math.min(o,c)-6-(i%3)*3; const lo=Math.max(o,c)+5+(i%2)*3;
    const cx=x+5.5;
    out+=`<line x1="${cx}" y1="${hi}" x2="${cx}" y2="${lo}" stroke="${col}" stroke-width="1.2"/>`;
    out+=`<rect x="${x}" y="${Math.min(o,c)}" width="11" height="${Math.max(3,Math.abs(c-o))}" fill="${col}" rx="1"/>`;
    prev=v; x+=13;
  });
  out+=`</svg>`;
  return out;
}

function depth(t,side,rows){
  return rows.map((r,i)=>{
    const w=20+ (rows.length-i)*10;
    const col=side==='bid'?t.up:t.down;
    const bar = side==='bid'
      ? `background:linear-gradient(90deg,transparent ${100-w}%, ${col}22 ${100-w}%)`
      : `background:linear-gradient(90deg,${col}22 ${w}%, transparent ${w}%)`;
    return `<div class="ob" style="${bar}"><span class="px" style="color:${col}">${r[0]}</span><span class="sz">${r[1]}</span></div>`;
  }).join('');
}

function phone(t, inner, label){
  return `<div class="col"><div class="label">${label}</div><div class="phone">${inner}</div></div>`;
}

function markets(t){
  const rows = coins.map(c=>`
    <div class="row">
      <div class="sym"><div class="tk">${c[0]}<span class="perp">-PERP</span></div>
        <div class="sub">funding ${c[4]} · vol ${c[5]}</div></div>
      <div class="pxblock">
        <div class="big" style="color:${t.text}">${c[1]}</div>
        <div class="chg" style="color:${c[3]?t.up:t.down}">${c[3]?'▲':'▼'} ${c[2]}</div>
      </div>
    </div>`).join('');
  return `
   <div class="pulse" style="background:${t.pulse}"></div>
   <div class="sb"><span>9:41</span><span>HyperSolid</span><span class="pill">◷ Testnet</span></div>
   <div class="pad">
     <div class="search">Search markets</div>
     <div class="tabs"><span class="tab on">Perps</span><span class="tab">Watch</span><span class="tab">Gainers</span></div>
     ${rows}
   </div>`;
}

function detail(t){
  const bids=[['62,485','1.20'],['62,483','0.84'],['62,481','2.05'],['62,480','0.42']];
  const asks=[['62,492','0.66'],['62,490','1.31'],['62,488','0.39'],['62,486','1.74']];
  return `
   <div class="pulse" style="background:${t.pulse}"></div>
   <div class="sb"><span>‹ Back</span><span>BTC-PERP</span><span class="pill" style="color:${t.up};background:${t.dark?'rgba(52,201,139,.12)':'rgba(30,127,92,.10)'}">▲ 2.14%</span></div>
   <div class="pad">
     <div class="priceLg" style="color:${t.text}">62,481.5</div>
     <div class="chips"><span class="c on">1H</span><span class="c">4H</span><span class="c">1D</span><span class="c">1W</span></div>
     <div class="chart">${candles(t)}</div>
     <div class="obwrap">
       <div class="obcol">${depth(t,'ask',asks)}</div>
       <div class="obcol">${depth(t,'bid',bids)}</div>
     </div>
     <div class="ladder">
       <div class="btn long" style="background:${t.up}">Long</div>
       <div class="btn short" style="background:${t.down}">Short</div>
     </div>
   </div>`;
}

function agent(t){
  const strat=[['TP/SL','BTC','+3% / −1.5%',1],['Grid','ETH','2.9k–3.2k ×8',1],['DCA','BTC','$50 / 8h',0]];
  const rows=strat.map(s=>`
    <div class="srow">
      <div><div class="sname">${s[0]} <span class="smkt">${s[1]}</span></div>
      <div class="sub">${s[2]}</div></div>
      <div class="tog ${s[3]?'on':''}" style="${s[3]?`background:${t.brand}`:`background:${t.line}`}"><i></i></div>
    </div>`).join('');
  return `
   <div class="pulse on" style="background:${t.pulse}"></div>
   <div class="sb"><span>9:41</span><span>Your Agent</span><span class="pill" style="color:${t.up};background:${t.dark?'rgba(52,201,139,.12)':'rgba(30,127,92,.10)'}">◉ Armed</span></div>
   <div class="pad">
     <div class="agentHead">
       <div class="aTitle" style="color:${t.brand}">Phase Pulse · ACTIVE</div>
       <div class="sub">Trade-only · no withdrawal · runs while you're offline</div>
     </div>
     <div class="sectlbl">Strategies</div>
     ${rows}
     <div class="guard"><span class="sub">Guardrails</span><span class="gv">max 5× · day −$200</span></div>
     <div class="ladder">
       <div class="btn kill" style="background:${t.down}">▮ Kill switch</div>
       <div class="btn new" style="border:1px solid ${t.line};color:${t.text};background:transparent">+ New</div>
     </div>
   </div>`;
}

function page(t){
  return `<!doctype html><html><head><meta charset="utf8">
  <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;700&family=JetBrains+Mono:wght@400;500;700&family=Manrope:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
   *{box-sizing:border-box;margin:0;padding:0}
   body{width:1240px;height:940px;background:${t.bg};font-family:Manrope,system-ui,sans-serif;
        display:flex;flex-direction:column;color:${t.text};-webkit-font-smoothing:antialiased}
   .title{font-family:'Space Grotesk';font-weight:700;font-size:26px;padding:26px 0 6px 48px;color:${t.text};letter-spacing:.2px}
   .titlesub{font-size:13px;color:${t.mist};padding:0 0 14px 48px}
   .stage{display:flex;gap:30px;padding:6px 48px 40px;justify-content:center}
   .col{display:flex;flex-direction:column;align-items:center;gap:10px}
   .label{font-family:'Space Grotesk';font-weight:500;font-size:13px;color:${t.mist}}
   .phone{width:360px;height:760px;background:${t.surf};border-radius:34px;overflow:hidden;
          box-shadow:${t.glow};border:1px solid ${t.line};position:relative}
   .pulse{height:4px;width:100%;opacity:.55}
   .pulse.on{height:6px;opacity:1}
   .sb{display:flex;justify-content:space-between;align-items:center;padding:14px 16px 6px;font-size:12.5px;color:${t.mist};font-family:'Space Grotesk';font-weight:500}
   .pill{background:${t.pill};color:${t.pillTx};padding:3px 9px;border-radius:20px;font-size:11px;font-weight:600}
   .pad{padding:8px 16px 16px}
   .search{background:${t.surf2};border:1px solid ${t.line};color:${t.mist};border-radius:12px;padding:10px 12px;font-size:13px;margin:6px 0 12px}
   .tabs{display:flex;gap:18px;border-bottom:1px solid ${t.line};padding-bottom:10px;margin-bottom:6px}
   .tab{font-size:13px;color:${t.mist};font-weight:600}
   .tab.on{color:${t.text}}
   .tab.on:after{content:'';display:block;height:2px;background:${t.brand};margin-top:8px;border-radius:2px}
   .row{display:flex;justify-content:space-between;align-items:center;padding:13px 2px;border-bottom:1px solid ${t.line}}
   .tk{font-family:'Space Grotesk';font-weight:700;font-size:16px;color:${t.text}}
   .perp{color:${t.mist};font-weight:500;font-size:12px}
   .sub{color:${t.mist};font-size:11.5px;margin-top:3px}
   .pxblock{text-align:right}
   .big{font-family:'JetBrains Mono';font-weight:500;font-size:16px;font-variant-numeric:tabular-nums}
   .chg{font-family:'JetBrains Mono';font-size:12.5px;margin-top:3px;font-variant-numeric:tabular-nums}
   .priceLg{font-family:'JetBrains Mono';font-weight:700;font-size:30px;font-variant-numeric:tabular-nums;margin:6px 0 10px}
   .chips{display:flex;gap:8px;margin-bottom:8px}
   .c{font-family:'JetBrains Mono';font-size:12px;color:${t.mist};padding:4px 10px;border:1px solid ${t.line};border-radius:8px}
   .c.on{color:${t.dark?'#0A1217':'#fff'};background:${t.brand};border-color:${t.brand}}
   .chart{background:${t.surf2};border:1px solid ${t.line};border-radius:12px;padding:8px;margin-bottom:10px}
   .obwrap{display:flex;gap:8px;margin-bottom:12px}
   .obcol{flex:1;display:flex;flex-direction:column;gap:3px}
   .ob{display:flex;justify-content:space-between;padding:4px 8px;border-radius:4px;font-family:'JetBrains Mono';font-size:12px;font-variant-numeric:tabular-nums}
   .ob .sz{color:${t.mist}}
   .ladder{display:flex;gap:10px;margin-top:6px}
   .btn{flex:1;text-align:center;padding:13px;border-radius:12px;font-family:'Space Grotesk';font-weight:700;font-size:15px;color:#06120f}
   .btn.short,.btn.kill{color:#fff}
   .agentHead{background:${t.surf2};border:1px solid ${t.line};border-radius:12px;padding:14px;margin:6px 0 12px}
   .aTitle{font-family:'Space Grotesk';font-weight:700;font-size:16px}
   .sectlbl{font-size:12px;color:${t.mist};text-transform:uppercase;letter-spacing:.12em;margin:6px 2px 8px}
   .srow{display:flex;justify-content:space-between;align-items:center;padding:12px 2px;border-bottom:1px solid ${t.line}}
   .sname{font-family:'Space Grotesk';font-weight:700;font-size:15px;color:${t.text}}
   .smkt{color:${t.mist};font-weight:500;font-size:12px}
   .tog{width:42px;height:24px;border-radius:20px;position:relative;transition:.2s}
   .tog i{position:absolute;top:3px;left:3px;width:18px;height:18px;border-radius:50%;background:#fff}
   .tog.on i{left:21px}
   .guard{display:flex;justify-content:space-between;align-items:center;padding:14px 2px;margin-top:4px}
   .gv{font-family:'JetBrains Mono';font-size:12.5px;color:${t.text}}
  </style></head><body>
   <div class="title">${t.name}</div>
   <div class="titlesub">HyperSolid · Hyperliquid mobile trading terminal — Markets · Detail · Agent</div>
   <div class="stage">
     ${phone(t,markets(t),'Markets')}
     ${phone(t,detail(t),'Market Detail')}
     ${phone(t,agent(t),'Agent (L1)')}
   </div>
  </body></html>`;
}

for(const k of ['A','B']){ fs.writeFileSync(__dirname+'/'+k+'.html', page(themes[k])); console.log('wrote '+k+'.html'); }
