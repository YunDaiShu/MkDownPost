/* tools/shot.mjs — 任意视口截图（自带无头 Edge + CDP，无第三方依赖）
   用法：node tools/shot.mjs <url> [width] [height] [outPath] [--full] [--wait=ms]
   例：  node tools/shot.mjs "https://yundaishu.github.io/MkDownPost/#/" 1920 1080 shot.png
   实现：启动 --headless=new Edge，用内置 WebSocket 直接说 CDP，截完即退。 */

import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const args = process.argv.slice(2);
const url = args[0];
const width = Number(args[1] || 1920);
const height = Number(args[2] || 1080);
const out = args[3] || 'shot.png';
const fullPage = args.includes('--full');
const waitMs = Number((args.find((a) => a.startsWith('--wait=')) || '--wait=2500').split('=')[1]);

if (!url) { console.error('usage: node tools/shot.mjs <url> [w] [h] [out.png] [--full] [--wait=ms]'); process.exit(2); }

const EDGE_CANDIDATES = [
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe'
];
const bin = EDGE_CANDIDATES.find((p) => fs.existsSync(p));
if (!bin) { console.error('未找到 Edge/Chrome'); process.exit(3); }

const port = 9333 + (process.pid % 200);
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'mdp-shot-'));

const child = spawn(bin, [
  '--headless=new',
  '--disable-gpu',
  '--hide-scrollbars',
  '--no-first-run',
  '--no-default-browser-check',
  '--force-device-scale-factor=1',
  '--window-size=' + width + ',' + height,
  '--remote-debugging-port=' + port,
  '--user-data-dir=' + profile,
  'about:blank'
], { stdio: 'ignore', windowsHide: true });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function wsUrl() {
  for (let i = 0; i < 60; i++) {
    try {
      const r = await fetch('http://127.0.0.1:' + port + '/json/version');
      const j = await r.json();
      if (j.webSocketDebuggerUrl) return j.webSocketDebuggerUrl;
    } catch { /* 还没起来 */ }
    await sleep(150);
  }
  throw new Error('浏览器未就绪');
}

const ws = new WebSocket(await wsUrl());
await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });

const consoleLogs = [];
let seq = 0;
const pending = new Map();
ws.onmessage = (ev) => {
  const msg = JSON.parse(ev.data);
  if (msg.method === 'Runtime.consoleAPICalled' && msg.params && msg.params.type === 'error') {
    consoleLogs.push('console.error: ' + (msg.params.args || []).map((a) => a.value || a.description || '').join(' ').slice(0, 160));
  }
  if (msg.method === 'Runtime.exceptionThrown') {
    const d = (msg.params && msg.params.exceptionDetails) || {};
    consoleLogs.push('exception: ' + String(d.text || '') + ' ' + String((d.exception && d.exception.description) || '').slice(0, 160));
  }
  if (msg.id && pending.has(msg.id)) {
    const { resolve, reject } = pending.get(msg.id);
    pending.delete(msg.id);
    msg.error ? reject(new Error(msg.error.message)) : resolve(msg.result);
  }
};

function send(method, params = {}, sessionId) {
  const id = ++seq;
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject });
    ws.send(JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) }));
  });
}

const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
const S = sessionId;

try { await send('Page.enable', {}, S); } catch (e) { console.error('Page.enable', e.message); }
await send('Runtime.enable', {}, S);
await send('Emulation.setDeviceMetricsOverride', {
  width, height, deviceScaleFactor: 1, mobile: false
}, S);
await send('Emulation.setVisibleSize', { width, height }, S).catch(() => null);

const waitForSel = (args.find((a) => a.startsWith('--waitFor=')) || '').split('=')[1];
await send('Page.navigate', { url }, S);
if (waitForSel) {
  for (let i = 0; i < 80; i++) {
    const r = await send('Runtime.evaluate', { expression: '!!document.querySelector(' + JSON.stringify(waitForSel) + ')', returnByValue: true }, S);
    if (r.result && r.result.value === true) break;
    await sleep(100);
  }
  await sleep(600);
} else {
  await sleep(waitMs);
}

const metrics = await send('Page.getLayoutMetrics', {}, S);
const size = fullPage
  ? { width: Math.ceil(metrics.cssContentSize.width), height: Math.ceil(metrics.cssContentSize.height) }
  : { width, height };

const shot = await send('Page.captureScreenshot', {
  format: 'png',
  captureBeyondViewport: fullPage,
  clip: fullPage ? { x: 0, y: 0, width: size.width, height: size.height, scale: 1 } : undefined
}, S);

fs.writeFileSync(out, Buffer.from(shot.data, 'base64'));
const evalArg = args.find((a) => a.startsWith('--eval='));
let evalOut = null;
if (evalArg) {
  const expr = fs.readFileSync(evalArg.slice(7), 'utf8');
  const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true }, S);
  evalOut = r.result && r.result.value !== undefined ? r.result.value : (r.exceptionDetails ? 'ERR ' + r.exceptionDetails.text : null);
}

const probe = await send('Runtime.evaluate', {
  expression: 'JSON.stringify({vw:innerWidth,vh:innerHeight,title:document.title})',
  returnByValue: true
}, S);

console.log(JSON.stringify({
  logs: consoleLogs.slice(0, 6),
  eval: evalOut,
  ok: true, out: path.resolve(out), bytes: fs.statSync(out).size,
  size, viewport: JSON.parse(probe.result.value)
}));

ws.close();
child.kill();
await sleep(200);
try { fs.rmSync(profile, { recursive: true, force: true }); } catch { /* 忽略 */ }
process.exit(0);
