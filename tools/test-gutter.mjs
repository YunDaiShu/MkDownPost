/* tools/test-gutter.mjs — 回归：行号槽、镜像层、高亮层三者必须与 textarea 逐行对齐
   症状对照：点第 N 行却落在第 N+1 行、行号显示 73 而实际在第 70 行。
   断言：mirror 内容宽 == textarea 内容宽；三者总行高一致；行号顶部位置 == 累计行高。 */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';

const ROOT = path.resolve(import.meta.dirname, '..');
const PORT = 5477, CDP = 9877;
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.webm': 'video/webm', '.woff2': 'font/woff2' };
if (!fs.existsSync(path.join(ROOT, 'index.html'))) { console.log('不在仓库根目录'); process.exit(1); }
const srv = http.createServer((q, r) => {
  const rel = decodeURIComponent((q.url || '/').split('?')[0]);
  const f = path.join(ROOT, rel === '/' ? '/index.html' : rel);
  if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); r.end('nf'); return; }
  r.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
  r.end(fs.readFileSync(f));
});
await new Promise((res) => srv.listen(PORT, '127.0.0.1', res));

const EDGE = ['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', 'C:/Program Files/Microsoft/Edge/Application/msedge.exe'].find((p) => fs.existsSync(p));
const prof = path.join(ROOT, '.profile-guttertest');
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
const ev = async (expr) => { const r = await S('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true, userGesture: true }); if (r.exceptionDetails) return 'EXC'; return r.result && r.result.value; };

const sample = [
  '| 组件 | 职责 |',
  '',
  'StepFlow：分步演示容器，负责步进、进度、键盘左右键与 aria-live 播报当前步骤，并且在窄屏下要自动折行。',
  '',
  'CodeCompare：源码与渲染结果左右对照；超长地址 https://example.com/a/very/long/path/that/should/wrap/somewhere/inside 必须能断开。',
].join('\n').repeat(8);

await ev('(function(){var ta=document.querySelector("#ta");ta.value=' + JSON.stringify(sample) + ';ta.dispatchEvent(new Event("input",{bubbles:true}));var b=document.querySelector("[data-act=hl]");if(b&&!ta.classList.contains("editor__ta--hl"))b.click();return 1;})()');
await sleep(1400);

const m = await ev('(function(){var ta=document.querySelector("#ta"),mir=document.querySelector("#mirror"),gut=document.querySelector("#gutter"),hl=document.querySelector(".editor__hl");var c=getComputedStyle(ta),mc=getComputedStyle(mir);var lh=parseFloat(c.lineHeight),padT=parseFloat(c.paddingTop),padB=parseFloat(c.paddingBottom);var taContentW=ta.clientWidth-parseFloat(c.paddingLeft)-parseFloat(c.paddingRight);var mirContentW=mir.clientWidth-parseFloat(mc.paddingLeft)-parseFloat(mc.paddingRight);var taRows=(ta.scrollHeight-padT-padB)/lh;var mirRows=0;for(var i=0;i<mir.children.length;i++)mirRows+=mir.children[i].offsetHeight;mirRows=mirRows/lh;var hcs=hl?getComputedStyle(hl):null;var hlRows=hl?(hl.scrollHeight-parseFloat(hcs.paddingTop)-parseFloat(hcs.paddingBottom))/parseFloat(hcs.lineHeight):-1;var acc=0,drift=0;for(var k=0;k<gut.children.length;k++){var want=acc*lh+padT;var got=gut.children[k].getBoundingClientRect().top-gut.getBoundingClientRect().top+gut.scrollTop;if(Math.abs(want-got)>1.5){drift=Math.max(drift,Math.abs(want-got));}acc+=mir.children[k]?mir.children[k].offsetHeight/lh:1;}return JSON.stringify({taContentW:Math.round(taContentW),mirContentW:Math.round(mirContentW),taRows:Math.round(taRows),mirRows:Math.round(mirRows),hlRows:Math.round(hlRows),gutterDrift:Math.round(drift)});})()');

const d = JSON.parse(m);
const problems = [];
if (d.mirContentW !== d.taContentW) problems.push('镜像内容宽 ' + d.mirContentW + ' ≠ 文本框内容宽 ' + d.taContentW);
if (Math.abs(d.mirRows - d.taRows) > 1) problems.push('镜像行数 ' + d.mirRows + ' ≠ 文本框行数 ' + d.taRows);
if (d.hlRows >= 0 && Math.abs(d.hlRows - d.taRows) > 1) problems.push('高亮层行数 ' + d.hlRows + ' ≠ 文本框行数 ' + d.taRows);
if (d.gutterDrift > 2) problems.push('行号与文字累计错位 ' + d.gutterDrift + 'px');

ws.close(); child.kill(); srv.close();
try { fs.rmSync(prof, { recursive: true, force: true }); } catch (e) {}

console.log('宽 ' + d.taContentW + '/' + d.mirContentW + ' · 行数 文本框 ' + d.taRows + ' / 镜像 ' + d.mirRows + ' / 高亮层 ' + d.hlRows + ' · 行号漂移 ' + d.gutterDrift + 'px');
if (problems.length) { problems.forEach((p) => console.log('✗ ' + p)); process.exit(1); }
console.log('PASS：行号槽、镜像层、高亮层与文本框逐行对齐');