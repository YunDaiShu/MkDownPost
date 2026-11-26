/* tools/test-copy.mjs — 复制到公众号的回归测试：html 与 plain 两个类型都要有内容
   node tools/test-copy.mjs            测本地（自动起服务）
   node tools/test-copy.mjs --url=...  测指定地址（例如线上） */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';

const ROOT = path.resolve(import.meta.dirname, '..');
const urlArg = process.argv.find((a) => a.startsWith('--url='));
const PORT = 5433, CDP = 9833;
const SENTENCE = '复制回归测试句子';

let server = null, base = urlArg ? urlArg.slice(6) : 'http://127.0.0.1:' + PORT;
if (!urlArg) {
  const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.webm': 'video/webm', '.woff2': 'font/woff2' };
  server = http.createServer((q, r) => {
    const rel = decodeURIComponent((q.url || '/').split('?')[0]);
    const f = path.join(ROOT, rel === '/' ? '/index.html' : rel);
    if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); r.end('nf'); return; }
    r.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    r.end(fs.readFileSync(f));
  });
  await new Promise((res) => server.listen(PORT, '127.0.0.1', res));
}

const EDGE = ['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', 'C:/Program Files/Microsoft/Edge/Application/msedge.exe'].find((p) => fs.existsSync(p));
const profile = path.join(ROOT, '.profile-copytest');
const child = spawn(EDGE, ['--headless=new', '--remote-debugging-port=' + CDP, '--user-data-dir=' + profile, '--no-first-run', '--window-size=1440,900', 'about:blank'], { stdio: 'ignore' });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let wsUrl = null;
for (let i = 0; i < 80; i++) {
  try { const j = await (await fetch('http://127.0.0.1:' + CDP + '/json/version')).json(); if (j.webSocketDebuggerUrl) { wsUrl = j.webSocketDebuggerUrl; break; } } catch (e) {}
  await sleep(250);
}
const ws = new WebSocket(wsUrl);
await new Promise((res, rej) => { ws.addEventListener('open', res); ws.addEventListener('error', rej); });
let id = 0; const pend = new Map(); const errors = [];
ws.addEventListener('message', (e) => {
  const m = JSON.parse(e.data);
  if (m.method === 'Runtime.exceptionThrown') errors.push(((m.params.exceptionDetails.exception && m.params.exceptionDetails.exception.description) || '').slice(0, 160));
  if (m.id && pend.has(m.id)) { const p = pend.get(m.id); pend.delete(m.id); m.error ? p.rej(new Error(JSON.stringify(m.error))) : p.res(m.result); }
});
const send = (m, p = {}, sid) => new Promise((res, rej) => { const mid = ++id; pend.set(mid, { res, rej }); ws.send(JSON.stringify({ id: mid, method: m, params: p, ...(sid ? { sessionId: sid } : {}) })); });

const origin = new URL(base).origin;
await send('Browser.grantPermissions', { origin, permissions: ['clipboardReadWrite', 'clipboardSanitizedWrite'] });
const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
const S = (m, p) => send(m, p, sessionId);
await S('Page.enable'); await S('Runtime.enable');
await S('Page.navigate', { url: base.replace(/\/$/, '') + '/index.html#/editor' });
await sleep(3500);

const ev = async (expr) => {
  const r = await S('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true, userGesture: true });
  if (r.exceptionDetails) return 'EXC:' + ((r.exceptionDetails.exception && r.exceptionDetails.exception.description) || '').slice(0, 160);
  return r.result && r.result.value;
};

const seed = await ev('(function(){var ta=document.querySelector("#ta");if(!ta)return "NO_TA";ta.value="# 标题\\n\\n' + SENTENCE + '。\\n";ta.dispatchEvent(new Event("input",{bubbles:true}));return ta.value.length;})()');
await sleep(1200);

const problems = [];
const modes = ['preview', 'wechat'];
for (const mode of modes) {
  await ev('(function(){var b=document.querySelector("[data-view=' + "'" + '" + mode + ' + "'" + '"]");if(b)b.click();return 1;})()');
  await sleep(700);
  await ev('(function(){var b=document.querySelector("#wxCopy");if(b)b.click();return 1;})()');
  await sleep(900);
  const clip = await ev('(async function(){try{var items=await navigator.clipboard.read();var out={};for(var it of items){for(var t of it.types){var b=await it.getType(t);var s=await b.text();out[t]=s.length;}}return JSON.stringify(out);}catch(e){return "READ_FAIL "+e.name;}})()');
  const parsed = typeof clip === 'string' && clip.startsWith('{') ? JSON.parse(clip) : {};
  const htmlLen = parsed['text/html'] || 0;
  const plainLen = parsed['text/plain'] || 0;
  if (htmlLen < 50) problems.push(mode + ' 视图：text/html 只有 ' + htmlLen + ' 字节');
  if (plainLen < 5) problems.push(mode + ' 视图：text/plain 缺失或为空（' + plainLen + ' 字节）');
  console.log(mode + ' 视图 → html=' + htmlLen + ' 字节, plain=' + plainLen + ' 字节');
}

if (errors.length) problems.push('页面报错：' + errors[0]);

ws.close();
child.kill();
if (server) server.close();
try { fs.rmSync(profile, { recursive: true, force: true }); } catch (e) {}

if (problems.length) {
  problems.forEach((p) => console.log('✗ ' + p));
  console.log('复制测试失败（' + problems.length + ' 项）');
  process.exit(1);
}
console.log('PASS：两个视图都能把 html 与纯文本写进剪贴板');