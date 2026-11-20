import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
const ROOT='E:/AAA DeepWork/MkDownPost', PORT=5219, CDP=9725;
const MIME={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.svg':'image/svg+xml','.png':'image/png'};
const srv=http.createServer((q,r)=>{const rel=decodeURIComponent((q.url||'/').split('?')[0]);const f=path.join(ROOT, rel==='/'?'/index.html':rel);
if(!fs.existsSync(f)||fs.statSync(f).isDirectory()){r.writeHead(404);r.end('nf');return;} r.writeHead(200,{'Content-Type':MIME[path.extname(f)]||'application/octet-stream','Cache-Control':'no-store'});r.end(fs.readFileSync(f));});
await new Promise(r=>srv.listen(PORT,'127.0.0.1',r));
const EDGE=['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe','C:/Program Files/Microsoft/Edge/Application/msedge.exe'].find(p=>fs.existsSync(p));
const child=spawn(EDGE,['--headless=new','--remote-debugging-port='+CDP,'--user-data-dir='+path.join(ROOT,'.profile-perf'),'--window-size=1280,900','--no-first-run','about:blank'],{stdio:'ignore'});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
let wsUrl=null;
for(let i=0;i<80;i++){try{const j=await (await fetch('http://127.0.0.1:'+CDP+'/json/version')).json();if(j.webSocketDebuggerUrl){wsUrl=j.webSocketDebuggerUrl;break;}}catch(e){}await sleep(250);}
const ws=new WebSocket(wsUrl);await new Promise((r,j)=>{ws.addEventListener('open',r);ws.addEventListener('error',j);});
let id=0;const pend=new Map();
ws.addEventListener('message',e=>{const m=JSON.parse(e.data);if(m.id&&pend.has(m.id)){const p=pend.get(m.id);pend.delete(m.id);m.error?p.rej(new Error(JSON.stringify(m.error))):p.res(m.result);}});
const send=(m,p={},sid)=>new Promise((res,rej)=>{const mid=++id;pend.set(mid,{res,rej});ws.send(JSON.stringify({id:mid,method:m,params:p,...(sid?{sessionId:sid}:{})}));});
const {targetId}=await send('Target.createTarget',{url:'about:blank'});
const {sessionId}=await send('Target.attachToTarget',{targetId,flatten:true});
const S=(m,p)=>send(m,p,sessionId);
await S('Page.enable');await S('Runtime.enable');
await S('Emulation.setDeviceMetricsOverride',{width:1280,height:900,deviceScaleFactor:1,mobile:false});
const ev=async e=>{const r=await S('Runtime.evaluate',{expression:e,returnByValue:true,awaitPromise:true});return r.result&&r.result.value;};

for (const [label, url] of [['首页','#/'],['主题页','#/themes'],['编辑器','#/editor']]) {
  await S('Page.navigate',{url:'about:blank'});
  await sleep(300);
  const t0=Date.now();
  await S('Page.navigate',{url:'http://127.0.0.1:'+PORT+'/index.html'+url});
  await sleep(3500);
  const m = await ev(`(() => {
    const nav = performance.getEntriesByType('navigation')[0] || {};
    const paints = performance.getEntriesByType('paint').map(p => ({ n: p.name, t: Math.round(p.startTime) }));
    const res = performance.getEntriesByType('resource');
    const js = res.filter(r => /\\.js/.test(r.name));
    return JSON.stringify({
      dom: Math.round(nav.domContentLoadedEventEnd||0),
      load: Math.round(nav.loadEventEnd||0),
      paints,
      resCount: res.length,
      jsCount: js.length,
      jsTotalMs: Math.round(js.reduce((s,r)=>s+r.duration,0)),
      nodes: document.querySelectorAll('*').length
    });
  })()`);
  // 点击响应：点第一个主题胶囊，测 DOM 更新时间
  const clickMs = await ev(`(async () => {
    const btn = document.querySelector('.tsw__chip') || document.querySelector('a.btn');
    if (!btn) return -1;
    const t = performance.now();
    btn.click();
    await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
    return Math.round(performance.now() - t);
  })()`);
  console.log('PAGE ' + label + ' ' + m + ' clickToPaint=' + clickMs);
}
ws.close(); child.kill(); srv.close(); process.exit(0);
