const fs=require('fs');
const t={
  name:'C · Oscilloscope', bg:'#0C0A07', surf:'#14110B', surf2:'#171309', line:'#2A2418',
  grid:'rgba(255,180,84,.06)', text:'#F3ECDD', dim:'#9A8E73',
  brand:'#FFB454', hi:'#FFD9A0', up:'#6FE0C0', down:'#FF7A6B'
};
const coins=[['BTC','62,481.5','+2.14%',1,'0.011%','1.2B'],['ETH','3,002.18','-0.86%',0,'0.008%','842M'],
 ['SOL','148.22','+5.41%',1,'0.021%','510M'],['HYPE','28.74','+1.07%',1,'0.014%','333M'],
 ['ARB','1.182','-2.30%',0,'0.006%','119M'],['DOGE','0.1642','+0.92%',1,'0.004%','97M']];

// phosphor waveform path
function wave(w,h,amp,seed){
  let d=`M0 ${h/2}`; let n=64;
  for(let i=1;i<=n;i++){
    const x=i/n*w;
    const s=Math.sin(i*0.55+seed)*amp*0.6 + Math.sin(i*0.17+seed*2)*amp*0.4 + (Math.sin(i*1.9+seed)*amp*0.15);
    d+=` L${x.toFixed(1)} ${(h/2 - s).toFixed(1)}`;
  }
  return d;
}
function trace(amp,seed,h){
  h=h||34;
  return `<div class="trace" style="height:${h}px">
   <svg viewBox="0 0 360 ${h}" width="100%" height="${h}" preserveAspectRatio="none">
    <defs><filter id="g"><feGaussianBlur stdDeviation="1.4"/></filter></defs>
    <path d="${wave(360,h,amp,seed)}" fill="none" stroke="${t.brand}" stroke-width="3" opacity="0.30" filter="url(#g)"/>
    <path d="${wave(360,h,amp,seed)}" fill="none" stroke="${t.hi}" stroke-width="1.3"/>
   </svg></div>`;
}
function candles(){
  let x=8,out='',vals=[62200,62380,62150,62520,62410,62680,62540,62760,62600,62820,62700,62900,62810,62980,62880,63010,62940,62700,62560,62650,62740,62820,62781,62815];
  let prev=vals[0]; const min=Math.min(...vals),max=Math.max(...vals); const Y=v=>140-((v-min)/(max-min))*120-6;
  out+=`<svg viewBox="0 0 320 150" width="100%" height="150" preserveAspectRatio="none">`;
  vals.forEach((v,i)=>{const up=v>=prev;const col=up?t.up:t.down;const o=Y(prev),c=Y(v);
   const hi=Math.min(o,c)-6-(i%3)*3,lo=Math.max(o,c)+5+(i%2)*3;const cx=x+5.5;
   out+=`<line x1="${cx}" y1="${hi}" x2="${cx}" y2="${lo}" stroke="${col}" stroke-width="1.1" opacity="0.85"/>`;
   out+=`<rect x="${x}" y="${Math.min(o,c)}" width="11" height="${Math.max(3,Math.abs(c-o))}" fill="${col}" rx="1"/>`;prev=v;x+=13;});
  out+=`</svg>`;return out;
}
function depth(side,rows){return rows.map((r,i)=>{const w=20+(rows.length-i)*10;const col=side==='bid'?t.up:t.down;
  const bar=side==='bid'?`background:linear-gradient(90deg,transparent ${100-w}%, ${col}1f ${100-w}%)`:`background:linear-gradient(90deg,${col}1f ${w}%, transparent ${w}%)`;
  return `<div class="ob" style="${bar}"><span class="px" style="color:${col}">${r[0]}</span><span class="sz">${r[1]}</span></div>`;}).join('');}
function phone(inner,label){return `<div class="col"><div class="label">${label}</div><div class="phone">${inner}</div></div>`;}

function markets(){
  const rows=coins.map(c=>`<div class="row"><div class="sym"><div class="tk">${c[0]}<span class="perp">·PERP</span></div>
    <div class="sub">fund ${c[4]} · vol ${c[5]}</div></div><div class="pxblock">
    <div class="big">${c[1]}</div><div class="chg" style="color:${c[3]?t.up:t.down}">${c[3]?'▲':'▼'} ${c[2]}</div></div></div>`).join('');
  return `${trace(7,0.4)}<div class="sb"><span>9:41</span><span class="wm">HYPERSOLID</span><span class="pill">◷ TESTNET</span></div>
   <div class="pad"><div class="readout"><span class="rlbl">SIGNAL · LIVE</span><span class="rdot"></span></div>
   <div class="search">⌕ search markets</div>
   <div class="tabs"><span class="tab on">PERPS</span><span class="tab">WATCH</span><span class="tab">GAINERS</span></div>${rows}</div>`;
}
function detail(){
  const bids=[['62,485','1.20'],['62,483','0.84'],['62,481','2.05'],['62,480','0.42']];
  const asks=[['62,492','0.66'],['62,490','1.31'],['62,488','0.39'],['62,486','1.74']];
  return `${trace(5,1.1,26)}<div class="sb"><span>‹ BACK</span><span class="wm">BTC·PERP</span><span class="pill up">▲ 2.14%</span></div>
   <div class="pad"><div class="priceLg">62,481.5</div>
   <div class="chips"><span class="c on">1H</span><span class="c">4H</span><span class="c">1D</span><span class="c">1W</span></div>
   <div class="chart grid">${candles()}</div>
   <div class="obwrap"><div class="obcol">${depth('ask',asks)}</div><div class="obcol">${depth('bid',bids)}</div></div>
   <div class="ladder"><div class="btn long">LONG</div><div class="btn short">SHORT</div></div></div>`;
}
function agent(){
  const strat=[['TP/SL','BTC','+3% / −1.5%',1],['GRID','ETH','2.9k–3.2k ×8',1],['DCA','BTC','$50 / 8h',0]];
  const rows=strat.map(s=>`<div class="srow"><div><div class="sname">${s[0]} <span class="smkt">${s[1]}</span></div>
    <div class="sub">${s[2]}</div></div><div class="tog ${s[3]?'on':''}"><i></i></div></div>`).join('');
  return `${trace(11,2.2,40)}<div class="sb"><span>9:41</span><span class="wm">YOUR AGENT</span><span class="pill up">◉ ARMED</span></div>
   <div class="pad"><div class="agentHead grid"><div class="aTitle">PHOSPHOR TRACE · ACTIVE</div>
   <div class="sub">trade-only · no withdrawal · runs while you're offline</div></div>
   <div class="sectlbl">STRATEGIES</div>${rows}
   <div class="guard"><span class="sub">GUARDRAILS</span><span class="gv">max 5× · day −$200</span></div>
   <div class="ladder"><div class="btn kill">▮ KILL SWITCH</div><div class="btn new">+ NEW</div></div></div>`;
}
function page(){return `<!doctype html><html><head><meta charset="utf8">
 <link href="https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&family=JetBrains+Mono:wght@400;500;700&family=Inter+Tight:wght@400;500;600;700&display=swap" rel="stylesheet">
 <style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{width:1240px;height:960px;background:
     radial-gradient(120% 80% at 50% -10%, #1a1408 0%, ${t.bg} 60%);
     font-family:'Inter Tight',system-ui,sans-serif;display:flex;flex-direction:column;color:${t.text};-webkit-font-smoothing:antialiased}
  .title{font-family:'Space Mono';font-weight:700;font-size:24px;padding:26px 0 4px 48px;color:${t.brand};letter-spacing:1px}
  .titlesub{font-size:13px;color:${t.dim};padding:0 0 14px 48px;letter-spacing:.3px}
  .stage{display:flex;gap:30px;padding:6px 48px 40px;justify-content:center}
  .col{display:flex;flex-direction:column;align-items:center;gap:10px}
  .label{font-family:'Space Mono';font-size:12px;color:${t.dim};letter-spacing:1px}
  .phone{width:360px;height:768px;background:${t.surf};border-radius:30px;overflow:hidden;position:relative;
     border:1px solid ${t.line};box-shadow:0 0 0 1px rgba(255,180,84,.06),0 18px 50px rgba(0,0,0,.6)}
  .trace{width:100%;background:linear-gradient(180deg,#100c06,#14110b);border-bottom:1px solid ${t.line};display:block}
  .sb{display:flex;justify-content:space-between;align-items:center;padding:12px 16px 6px;font-family:'Space Mono';font-size:11.5px;color:${t.dim};letter-spacing:.5px}
  .wm{color:${t.text};font-weight:700}
  .pill{background:rgba(255,180,84,.12);color:${t.brand};padding:3px 9px;border-radius:6px;font-size:10.5px;font-weight:700;letter-spacing:.5px}
  .pill.up{background:rgba(111,224,192,.12);color:${t.up}}
  .pad{padding:8px 16px 16px}
  .readout{display:flex;align-items:center;gap:8px;margin:4px 0 12px}
  .rlbl{font-family:'Space Mono';font-size:11px;color:${t.brand};letter-spacing:1.5px}
  .rdot{width:7px;height:7px;border-radius:50%;background:${t.brand};box-shadow:0 0 8px ${t.brand}}
  .search{background:${t.surf2};border:1px solid ${t.line};color:${t.dim};border-radius:8px;padding:10px 12px;font-size:13px;font-family:'Space Mono';margin-bottom:12px}
  .tabs{display:flex;gap:16px;border-bottom:1px solid ${t.line};padding-bottom:10px;margin-bottom:4px}
  .tab{font-family:'Space Mono';font-size:12px;color:${t.dim};letter-spacing:.5px}
  .tab.on{color:${t.brand}}
  .tab.on:after{content:'';display:block;height:2px;background:${t.brand};margin-top:9px;border-radius:2px;box-shadow:0 0 6px ${t.brand}}
  .row{display:flex;justify-content:space-between;align-items:center;padding:13px 2px;border-bottom:1px solid ${t.line}}
  .tk{font-family:'Space Mono';font-weight:700;font-size:16px;color:${t.text};letter-spacing:.5px}
  .perp{color:${t.dim};font-weight:400;font-size:11px}
  .sub{color:${t.dim};font-size:11px;margin-top:3px;font-family:'Inter Tight'}
  .pxblock{text-align:right}
  .big{font-family:'JetBrains Mono';font-weight:500;font-size:16px;font-variant-numeric:tabular-nums;color:${t.hi}}
  .chg{font-family:'JetBrains Mono';font-size:12px;margin-top:3px;font-variant-numeric:tabular-nums}
  .priceLg{font-family:'JetBrains Mono';font-weight:700;font-size:32px;color:${t.hi};font-variant-numeric:tabular-nums;margin:8px 0 10px;text-shadow:0 0 18px rgba(255,217,160,.25)}
  .chips{display:flex;gap:8px;margin-bottom:10px}
  .c{font-family:'JetBrains Mono';font-size:12px;color:${t.dim};padding:4px 10px;border:1px solid ${t.line};border-radius:6px}
  .c.on{color:${t.bg};background:${t.brand};border-color:${t.brand};font-weight:700}
  .grid{background-image:linear-gradient(${t.grid} 1px,transparent 1px),linear-gradient(90deg,${t.grid} 1px,transparent 1px);background-size:18px 18px}
  .chart{border:1px solid ${t.line};border-radius:10px;padding:8px;margin-bottom:10px;background-color:${t.surf2}}
  .obwrap{display:flex;gap:8px;margin-bottom:12px}
  .obcol{flex:1;display:flex;flex-direction:column;gap:3px}
  .ob{display:flex;justify-content:space-between;padding:4px 8px;border-radius:3px;font-family:'JetBrains Mono';font-size:12px;font-variant-numeric:tabular-nums}
  .ob .sz{color:${t.dim}}
  .ladder{display:flex;gap:10px;margin-top:6px}
  .btn{flex:1;text-align:center;padding:13px;border-radius:9px;font-family:'Space Mono';font-weight:700;font-size:14px;letter-spacing:.5px}
  .btn.long{background:${t.up};color:#06231c}
  .btn.short{background:${t.down};color:#2a0d09}
  .btn.kill{background:${t.down};color:#2a0d09}
  .btn.new{border:1px solid ${t.brand};color:${t.brand};background:transparent}
  .agentHead{border:1px solid ${t.line};border-radius:10px;padding:14px;margin:6px 0 12px;background-color:${t.surf2}}
  .aTitle{font-family:'Space Mono';font-weight:700;font-size:15px;color:${t.brand};letter-spacing:1px}
  .sectlbl{font-family:'Space Mono';font-size:11px;color:${t.dim};letter-spacing:2px;margin:6px 2px 8px}
  .srow{display:flex;justify-content:space-between;align-items:center;padding:12px 2px;border-bottom:1px solid ${t.line}}
  .sname{font-family:'Space Mono';font-weight:700;font-size:14px;color:${t.text};letter-spacing:.5px}
  .smkt{color:${t.dim};font-weight:400;font-size:12px}
  .tog{width:42px;height:24px;border-radius:6px;position:relative;transition:.2s;background:${t.line}}
  .tog.on{background:${t.brand};box-shadow:0 0 10px rgba(255,180,84,.5)}
  .tog i{position:absolute;top:3px;left:3px;width:18px;height:18px;border-radius:4px;background:#0c0a07}
  .tog.on i{left:21px;background:#0c0a07}
  .guard{display:flex;justify-content:space-between;align-items:center;padding:14px 2px;margin-top:4px}
  .gv{font-family:'JetBrains Mono';font-size:12.5px;color:${t.hi}}
 </style></head><body>
  <div class="title">${t.name.toUpperCase()} — PHOSPHOR INSTRUMENT</div>
  <div class="titlesub">HyperSolid · Hyperliquid mobile terminal — the market as a live phosphor trace · Markets · Detail · Agent</div>
  <div class="stage">${phone(markets(),'MARKETS')}${phone(detail(),'MARKET DETAIL')}${phone(agent(),'AGENT · L1')}</div>
 </body></html>`;}
fs.writeFileSync(__dirname+'/C.html',page());console.log('wrote C.html');
