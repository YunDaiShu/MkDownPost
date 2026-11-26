/* tools/test-metrics.mjs — 断言「用户看到的字」与「光标判定用的字」是同一套度量
   症状：鼠标点在某字上，光标却落在别的字上（X 轴错位），或落在别的行（Y 轴错位）。
   检查：字体族/字号/行高/字距/换行规则 + 实测字符串宽度（字形步进）。 */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';

const ROOT = path.resolve(import.meta.dirname, '..');
const PORT = 5499, CDP = 9899;
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.webm': 'video/webm', '.woff2': 'font/woff2' };
const serve = http.createServer((q, r) => {
  const rel = decodeURIComponent((q.url || '/').split('?')[0]);
  const f = path.join(ROOT, rel === '/' ? '/index.html' : rel);
  if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); r.end('nf'); return; }
  r.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
  r.end(fs.readFileSync(f));
});
await new Promise((res) => serve.listen(PORT, '127.0.0.1', res));

const EDGE = ['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', 'C:/Program Files/Microsoft/Edge/Application/msedge.exe'].find((p) => fs.existsSync(p));
const prof = path.join(ROOT, '.profile-metricstest');
const child = spawn(EDGE, ['--headless=new', '--remote-debugging-port=' + CDP, '--user-data-dir=' + prof, '--no-first-run', '--window-size=1778,921', 'about:blank'], { stdio: 'ignore' });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let wsUrl = null;
for (let i = 0; i < 80; i++) {
  try { const j = await (await fetch('http://127.0.0.1:' + CDP + '/json/version')).json(); if (j.webSocketDebuggerUrl) { wsUrl = j.webSocketDebuggerUrl; break; } } catch (e) {}
  await sleep(250);
}
const ws = new WebSocket(wsUrl);
await new Promise((res, rej) => { ws.addEventListener('open', res); ws.addEventListener('error', rej); });
let id = 0; const pend = new Map();
ws.addEventListener('message', (e) => { const m = JSON.parse(e.data); if (m.id && pend.has(m.id)) { const p = pend.get(m.id); pend.delete(m.id); m.error ? p.rej(new Error(JSON.stringify(m.error))) : p.res(m.result); } });
const send = (m, p = {}, sid) => new Promise((res, rej) => { const mid = ++id; pend.set(mid, { res, rej }); ws.send(JSON.stringify({ id: mid, method: m, params: p, ...(sid ? { sessionId: sid } : {}) })); });
const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
const S = (m, p) => send(m, p, sessionId);
await S('Page.enable'); await S('Runtime.enable');
await S('Page.navigate', { url: 'http://127.0.0.1:' + PORT + '/index.html#/editor' });
await sleep(3200);
const ev = async (expr) => { const r = await S('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true, userGesture: true }); if (r.exceptionDetails) return null; return r.result && r.result.value; };

const SEED = '零第三方运行时依赖：不引入 React/Vue/Svelte 与 Tailwind。\n\n第二条：纯 HTML + CSS + ES modules，浏览器直接跑。\n';
await ev('(function(){var ta=document.querySelector("#ta");ta.value=' + JSON.stringify(SEED) + ';ta.dispatchEvent(new Event("input",{bubbles:true}));var b=document.querySelector("[data-act=hl]");if(b&&!ta.classList.contains("editor__ta--hl"))b.click();return 1;})()');
await sleep(1300);

const exprFile = path.join(ROOT, 'tools/checks/metrics-expr.js');
const raw = await ev(fs.readFileSync(exprFile, 'utf8'));
ws.close(); child.kill(); serve.close();
try { fs.rmSync(prof, { recursive: true, force: true }); } catch (e) {}

if (!raw) { console.log('页面侧脚本执行失败'); process.exit(1); }
const d = JSON.parse(raw);
const problems = [];
if (!d.pre || !d.code) { console.log('高亮层未挂载，无法比较'); process.exit(1); }
if (d.ta.fam !== d.code.fam) problems.push('字体族不一致：文本框 ' + d.ta.fam + ' / 高亮层 ' + d.code.fam);
if (d.ta.size !== d.code.size) problems.push('字号不一致：' + d.ta.size + ' / ' + d.code.size);
if (d.ta.lh !== d.pre.lh) problems.push('行高不一致：' + d.ta.lh + ' / ' + d.pre.lh);
if (d.ta.ls !== d.code.ls) problems.push('字距不一致：' + d.ta.ls + ' / ' + d.code.ls);
if (d.ta.ow !== d.pre.ow) problems.push('overflow-wrap 不一致：' + d.ta.ow + ' / ' + d.pre.ow);
if (!d.sameAdvance) problems.push('同一段文字宽度不同：文本框 ' + d.taAdvance + 'px / 高亮层 ' + d.codeAdvance + 'px（光标会落在错误的字上）');

console.log('字体 ' + d.ta.fam);
console.log('字号 ' + d.ta.size + ' · 行高 ' + d.ta.lh + ' · 字距 ' + d.ta.ls);
console.log('同一段文字宽度 文本框 ' + d.taAdvance + 'px / 高亮层 ' + d.codeAdvance + 'px');
if (problems.length) { problems.forEach((p) => console.log('✗ ' + p)); process.exit(1); }
console.log('PASS：两层字形度量完全一致（点击位置与光标位置同源）');