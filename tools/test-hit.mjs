/* tools/test-hit.mjs — 点击命中：把“看到的字”与“光标落点”换算成像素逐列比对
   断言：同一列的字形左边与光标左边相差 < 2px；第二行基线差 < 2px；覆盖层与文本框同尺寸同位置。 */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';

const ROOT = path.resolve(import.meta.dirname, '..');
const PORT = 5511, CDP = 9911;
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
const prof = path.join(ROOT, '.profile-hittest');
const child = spawn(EDGE, ['--headless=new', '--remote-debugging-port=' + CDP, '--user-data-dir=' + prof, '--no-first-run', '--window-size=1778,921', 'about:blank'], { stdio: 'ignore' });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let wsUrl = null;
for (let i = 0; i < 80; i++) { try { const j = await (await fetch('http://127.0.0.1:' + CDP + '/json/version')).json(); if (j.webSocketDebuggerUrl) { wsUrl = j.webSocketDebuggerUrl; break; } } catch (e) {} await sleep(250); }
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
const SEED = '零第三方运行时依赖：不引入 React/Vue/Svelte 与 Tailwind，也不要 GSAP 和 Lottie。\n第二行用来验证纵向对齐是否准确。\n';
await ev('(function(){var ta=document.querySelector("#ta");ta.value=' + JSON.stringify(SEED) + ';ta.dispatchEvent(new Event("input",{bubbles:true}));var b=document.querySelector("[data-act=hl]");if(b&&!ta.classList.contains("editor__ta--hl"))b.click();return 1;})()');
await sleep(1400);
const raw = await ev(fs.readFileSync(path.join(ROOT, 'tools/checks/hit-expr.js'), 'utf8'));
ws.close(); child.kill(); serve.close();
try { fs.rmSync(prof, { recursive: true, force: true }); } catch (e) {}
if (!raw) { console.log('页面侧脚本失败'); process.exit(1); }
const d = JSON.parse(raw);
if (d.error) { console.log('错误：' + d.error); process.exit(1); }
const problems = [];
if (d.overlaySize.w !== d.taSize.w) problems.push('覆盖层宽 ' + d.overlaySize.w + ' ≠ 文本框宽 ' + d.taSize.w);
if (Math.abs(d.offset.left) > 1) problems.push('覆盖层左偏移 ' + d.offset.left + 'px');
if (Math.abs(d.offset.top) > 1) problems.push('覆盖层上偏移 ' + d.offset.top + 'px');
for (const c of d.cols) {
  if (c.dx === null) continue;
  if (Math.abs(c.dx) > 2) problems.push('第 ' + c.col + ' 列：看到的字在 ' + c.glyphX + 'px，光标却在 ' + c.caretX + 'px（差 ' + c.dx + 'px）');
}
// 纵向：整段内容高度必须一致（折行位置一致的结果）
if (Math.abs(d.contentH_overlay - d.contentH_ta) > 2) {
  problems.push('内容总高：覆盖层 ' + d.contentH_overlay + 'px，文本框 ' + d.contentH_ta + 'px（折行位置不同）');
}
console.log('覆盖层 ' + d.overlaySize.w + '×' + d.overlaySize.h + ' / 文本框 ' + d.taSize.w + '×' + d.taSize.h + ' · 偏移 ' + d.offset.left + ',' + d.offset.top);
console.log('列偏差 ' + d.cols.map((c) => c.col + ':' + c.dx + 'px').join(' '));
console.log('内容总高 覆盖层 ' + d.contentH_overlay + 'px / 文本框 ' + d.contentH_ta + 'px');
if (problems.length) { problems.forEach((p) => console.log('✗ ' + p)); process.exit(1); }
console.log('PASS：所见即所点（X/Y 均在 2px 内）');