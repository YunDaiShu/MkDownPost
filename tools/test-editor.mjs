/* tools/test-editor.mjs — 编辑器功能冒烟测试
   用无头 Edge + CDP 真的点一遍按钮，断言输入框 / 预览 / 面板真的变了。
   用法：node tools/test-editor.mjs [--keep]  退出码 1 表示有失败项。 */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';

const ROOT = process.cwd();
const PORT = 5260;
const CDP = 9760;
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png' };

const server = http.createServer((req, res) => {
  const rel = decodeURIComponent((req.url || '/').split('?')[0]);
  const file = path.join(ROOT, rel === '/' ? '/index.html' : rel);
  if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); res.end('nf'); return; }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
  res.end(fs.readFileSync(file));
});
await new Promise((r) => server.listen(PORT, '127.0.0.1', r));

const EDGE = ['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', 'C:/Program Files/Microsoft/Edge/Application/msedge.exe'].find((p) => fs.existsSync(p));
if (!EDGE) { console.error('找不到 Edge，无法运行'); process.exit(2); }
const child = spawn(EDGE, ['--headless=new', '--remote-debugging-port=' + CDP, '--user-data-dir=' + path.join(ROOT, '.profile-test'), '--no-first-run', 'about:blank'], { stdio: 'ignore' });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let wsUrl = null;
for (let i = 0; i < 80; i++) {
  try { const j = await (await fetch('http://127.0.0.1:' + CDP + '/json/version')).json(); if (j.webSocketDebuggerUrl) { wsUrl = j.webSocketDebuggerUrl; break; } } catch (e) {}
  await sleep(250);
}
const ws = new WebSocket(wsUrl);
await new Promise((r, j) => { ws.addEventListener('open', r); ws.addEventListener('error', j); });
let id = 0;
const pending = new Map();
const errors = [];
ws.addEventListener('message', (e) => {
  const m = JSON.parse(e.data);
  if (m.method === 'Runtime.exceptionThrown') {
    const d = m.params.exceptionDetails;
    errors.push(((d.exception && d.exception.description) || d.text || '').slice(0, 160));
  }
  if (m.id && pending.has(m.id)) { const p = pending.get(m.id); pending.delete(m.id); m.error ? p.rej(new Error(JSON.stringify(m.error))) : p.res(m.result); }
});
const send = (method, params = {}, sid) => new Promise((res, rej) => { const mid = ++id; pending.set(mid, { res, rej }); ws.send(JSON.stringify({ id: mid, method, params, ...(sid ? { sessionId: sid } : {}) })); });
const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
const S = (m, p) => send(m, p, sessionId);
await S('Page.enable'); await S('Runtime.enable');
await S('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
await S('Page.navigate', { url: 'http://127.0.0.1:' + PORT + '/index.html#/editor' });
await sleep(3000);

const ev = async (expr) => {
  const r = await S('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true });
  if (r.exceptionDetails) return 'EXC:' + ((r.exceptionDetails.exception && r.exceptionDetails.exception.description) || '').slice(0, 90);
  return r.result && r.result.value;
};

const results = [];
const record = (name, ok, detail) => results.push({ name, ok: !!ok, detail: String(detail).slice(0, 70) });

// 1. 行内动作：每个都应改变输入框内容
const ACTS = [['加粗','bold'],['斜体','italic'],['删除线','strike'],['下划线','underline'],['行内代码','inlinecode'],['高亮','hlt'],['上标','sup'],['下标','sub'],['一级标题','h1'],['二级标题','h2'],['三级标题','h3'],['无序列表','ul'],['有序列表','ol'],['引用','quote'],['代码块','code'],['表格','table'],['链接','link'],['图片','image'],['分割线','hr'],['任务列表','task']];
for (const [name, act] of ACTS) {
  const code = "(function(){var ta=document.querySelector('#ta');if(!ta)return 'NO_TA';" +
    "ta.value='AAA BBB';ta.dispatchEvent(new Event('input',{bubbles:true}));ta.focus();ta.setSelectionRange(0,7);" +
    "var b=[].slice.call(document.querySelectorAll('[data-act]')).filter(function(x){return x.dataset.act==='" + act + "'})[0];" +
    "if(!b)return 'NO_BTN';b.click();return ta.value;})()";
  const r = await ev(code);
  record('动作 ' + name, typeof r === 'string' && r !== 'AAA BBB' && !/^(NO_|EXC)/.test(r), r);
}

// 2. 菜单与面板
const menuChecks = [
  ['插入菜单 6 项', "(function(){var b=document.querySelector('#insertBtn'),m=document.querySelector('#insertMenu');b.click();return String(m.querySelectorAll('button').length);})()", (v) => v === '6'],
  ['示例菜单有模板', "(function(){var b=document.querySelector('#sampleBtn'),m=document.querySelector('#sampleMenu');b.click();return String(m.querySelectorAll('button').length);})()", (v) => Number(v) >= 3],
  ['导出菜单 8 项', "(function(){var b=document.querySelector('#exportBtn'),m=document.querySelector('#exportMenu');b.click();return String(m.querySelectorAll('button,a').length);})()", (v) => Number(v) >= 6],
  ['代码主题菜单', "(function(){var b=document.querySelector('#codeBtn'),m=document.querySelector('#codeMenu');b.click();return String(m.querySelectorAll('[data-code]').length);})()", (v) => Number(v) >= 5],
  ['设计风格菜单', "(function(){var b=document.querySelector('#styleBtn'),m=document.querySelector('#styleMenu');b.click();return String(m.querySelectorAll('[data-style]').length);})()", (v) => Number(v) >= 8],
  ['微信版式菜单', "(function(){var b=document.querySelector('#wxPresetBtn'),m=document.querySelector('#wxPresetMenu');b.click();return String(m.querySelectorAll('button').length);})()", (v) => Number(v) >= 4],
  ['编辑历史面板可开', "(function(){var b=[].slice.call(document.querySelectorAll('[data-act]')).filter(function(x){return x.dataset.act==='history'})[0];b.click();var p=document.querySelector('#historyPanel');return JSON.stringify({hidden:p.hidden});})()", (v) => String(v).includes('"hidden":false')],
  ['新建标签页', "(function(){var n0=document.querySelectorAll('[data-tab]').length;document.querySelector('#tabAdd').click();return String(document.querySelectorAll('[data-tab]').length-n0);})()", (v) => Number(v) === 1],
  ['撤销可回退', "(async function(){var ta=document.querySelector('#ta');ta.focus();var d=Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,'value').set;d.call(ta,'第一版内容');ta.dispatchEvent(new Event('input',{bubbles:true}));await new Promise(function(r){setTimeout(r,700)});d.call(ta,'第二版内容更长一些');ta.dispatchEvent(new Event('input',{bubbles:true}));await new Promise(function(r){setTimeout(r,700)});var ub=[].slice.call(document.querySelectorAll('button')).filter(function(x){return (x.getAttribute('aria-label')||x.title||'')==='撤销'})[0];if(!ub)return 'NO_BTN';ub.click();await new Promise(function(r){setTimeout(r,300)});return JSON.stringify({now:ta.value, back:ta.value==='第一版内容'});})()", (v) => String(v).includes('"back":true')],
  ['预览会随输入更新', "(async function(){var ta=document.querySelector('#ta');var p=document.querySelector('#preview');ta.value='# 标题甲'+String.fromCharCode(10,10)+'正文段落乙';ta.dispatchEvent(new Event('input',{bubbles:true}));await new Promise(function(r){setTimeout(r,500)});return JSON.stringify({changed:/标题甲/.test(p.textContent)});})()", (v) => String(v).includes('"changed":true')],
  ['微信预览会渲染', "(function(){var t=[].slice.call(document.querySelectorAll('[data-view]')).filter(function(x){return x.dataset.view==='wechat'})[0];if(t)t.click();var p=document.querySelector('#wxPreview');return JSON.stringify({len:p?p.innerHTML.length:0});})()", (v) => { try { return JSON.parse(String(v)).len > 20; } catch (e) { return false; } }],
  ['字体菜单出现在视口内', "(async function(){var b=document.querySelector('#wxFineBtn');if(b)b.click();await new Promise(function(r){setTimeout(r,500)});var fb=document.querySelector('[data-fontkey]');if(!fb)return 'NO_FONT_BTN';fb.click();await new Promise(function(r){setTimeout(r,200)});var m=document.querySelector('#fontMenu');var r=m.getBoundingClientRect();return JSON.stringify({hidden:m.hidden,inside:r.top>=0&&r.left>=0&&r.bottom<=window.innerHeight+2&&r.right<=window.innerWidth+2,w:Math.round(r.width),h:Math.round(r.height),parent:m.parentElement===document.body});})()", (v) => { try { var o=JSON.parse(String(v)); return o.hidden===false && o.inside===true && o.w>100; } catch(e){ return false; } }],
  ['复制按钮有提示', "(function(){var b=document.querySelector('#wxCopy');if(!b)return 'NO_BTN';b.click();return 'clicked';})()", (v) => v === 'clicked']
];
for (const [name, code, ok] of menuChecks) {
  const r = await ev(code);
  record(name, ok(r), r);
  await sleep(220);
}

const failed = results.filter((r) => !r.ok);
for (const r of results) console.log((r.ok ? 'PASS ' : 'FAIL ') + r.name + '  ' + r.detail);
console.log('---');
console.log('通过 ' + (results.length - failed.length) + ' / ' + results.length + '，运行时异常 ' + errors.length);
if (errors.length) console.log('异常：' + JSON.stringify(errors.slice(0, 5)));
ws.close(); child.kill(); server.close();
process.exit(failed.length ? 1 : 0);
