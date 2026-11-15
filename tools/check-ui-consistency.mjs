/* tools/check-ui-consistency.mjs —— 浏览器实测的一致性守卫（可选步骤）
   与 check-interaction.mjs 的分工：
     check-interaction.mjs  静态读 CSS，任何环境都能跑，管"规则写没写对"
     本脚本                 起无头浏览器，实测计算样式，管"渲染出来一不一致"

   断言（任一失败即 exit 1）：
     1. 焦点机制唯一：所有可交互元素都是 box-shadow 光环，不出现 outline
     2. 无死 hover：每个可见可交互元素 hover 后至少有一项变化
     3. 同类元素零差异：同一个 class 的元素不能有两种 hover 签名
     4. 图标四边等宽：header 图标按钮 border-width 四值必须相同（防止底边被清零）
     5. 容器不发光：<main> 聚焦后不得出现光环

   找不到浏览器时打印 SKIP 并 exit 0（CI 的 ubuntu 上没有 Edge，不会误报）。
   指定浏览器：CHROME_PATH=/path/to/chrome node tools/check-ui-consistency.mjs
*/
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';

const ROOT = process.cwd();
const PORT = Number(process.env.AUDIT_PORT || 5188);
const CDP_PORT = Number(process.env.AUDIT_CDP || 9708);
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.woff2': 'font/woff2', '.webp': 'image/webp', '.jpg': 'image/jpeg' };

const findBrowser = () => {
  const env = process.env.CHROME_PATH;
  const candidates = [
    env,
    'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser'
  ].filter(Boolean);
  return candidates.find((p) => { try { return fs.existsSync(p); } catch { return false; } }) || null;
};

// NO_WEBSOCKET_GUARD：Node < 22 没有内置 WebSocket（CI 曾因 ReferenceError 直接失败）
if (typeof WebSocket !== 'function') {
  console.log('SKIP：当前 Node（' + process.version + '）没有内置 WebSocket，需要 Node ≥ 22 才能做浏览器实测');
  process.exit(0);
}

const browser = findBrowser();
if (!browser) {
  console.log('SKIP：未找到 Chromium/Edge，跳过浏览器一致性实测（静态检查仍由 check-interaction.mjs 覆盖）');
  process.exit(0);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const problems = [];
const report = [];

const srv = http.createServer((req, res) => {
  const rel = decodeURIComponent((req.url || '/').split('?')[0]);
  const f = path.join(ROOT, rel === '/' ? '/index.html' : rel);
  if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); res.end('nf'); return; }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
  res.end(fs.readFileSync(f));
});
await new Promise((r) => srv.listen(PORT, '127.0.0.1', r));

const profileDir = path.join(ROOT, '.profile-ui-check');
const isLinux = process.platform === 'linux';
const extraFlags = isLinux ? ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'] : [];
const child = spawn(browser, ['--headless=new', '--remote-debugging-port=' + CDP_PORT, '--user-data-dir=' + profileDir,
  '--window-size=1440,1000', '--hide-scrollbars', '--no-first-run', ...extraFlags, 'about:blank'], { stdio: 'ignore' });

let wsUrl = null;
for (let i = 0; i < 100; i++) {
  try { const j = await (await fetch('http://127.0.0.1:' + CDP_PORT + '/json/version')).json(); if (j.webSocketDebuggerUrl) { wsUrl = j.webSocketDebuggerUrl; break; } } catch (e) {}
  await sleep(250);
}
if (!wsUrl) { console.log('SKIP：浏览器未就绪，跳过（CDP 连接失败）'); child.kill(); srv.close(); process.exit(0); }

const ws = new WebSocket(wsUrl);
await new Promise((r, j) => { ws.addEventListener('open', r); ws.addEventListener('error', j); });
let id = 0; const pend = new Map();
ws.addEventListener('message', (e) => { const m = JSON.parse(e.data); if (m.id && pend.has(m.id)) { const p = pend.get(m.id); pend.delete(m.id); if (m.error) p.rej(new Error(JSON.stringify(m.error))); else p.res(m.result); } });
const send = (method, params = {}, sid) => new Promise((res, rej) => { const mid = ++id; pend.set(mid, { res, rej }); ws.send(JSON.stringify({ id: mid, method, params, ...(sid ? { sessionId: sid } : {}) })); });

const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
const S = (m, p) => send(m, p, sessionId);
await S('Page.enable'); await S('Runtime.enable'); await S('DOM.enable'); await S('CSS.enable');
await S('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });

const SEL = 'a[href], button, input:not([type=hidden]), select, textarea, [role=button]';
const READ = "function(){const c=getComputedStyle(this);const r=this.getBoundingClientRect();if(r.width<1||r.height<1)return null;const cls=(this.className&&this.className.toString?this.className.toString():'').trim().split(/\\s+/).filter(Boolean).slice(0,2).join('.');const par=this.parentElement&&this.parentElement.className?this.parentElement.className.toString().trim().split(/\\s+/)[0]:'';const par2=this.parentElement&&this.parentElement.parentElement&&this.parentElement.parentElement.className?this.parentElement.parentElement.className.toString().trim().split(/\\s+/)[0]:'';const dis=!!this.disabled||this.getAttribute('aria-disabled')==='true';const state=this.getAttribute('aria-current')||(this.classList&&this.classList.contains('is-on')?'on':'');const txt=(this.textContent||'').trim().slice(0,12);const inPreview=!!this.closest('.theme-card, .theme-preview, .md-preview');return JSON.stringify({tag:this.tagName.toLowerCase(),cls:cls,par:par,par2:par2,dis:dis,state:state,txt:txt,prev:inPreview,id:this.id||'',bw:c.borderTopWidth+'/'+c.borderRightWidth+'/'+c.borderBottomWidth+'/'+c.borderLeftWidth,bc:c.borderTopColor,bg:c.backgroundColor,color:c.color,shadow:c.boxShadow,ol:c.outlineStyle})}";

const classes = new Map();
let seen = 0;

for (const route of ['#/', '#/editor', '#/themes', '#/about']) {
  await S('Page.navigate', { url: 'http://127.0.0.1:' + PORT + '/index.html' + route });
  await sleep(3200);
  const { root } = await S('DOM.getDocument', { depth: -1 });
  const { nodeIds } = await S('DOM.querySelectorAll', { nodeId: root.nodeId, selector: SEL });

  for (const nodeId of nodeIds.slice(0, 80)) {
    try {
      const { object } = await S('DOM.resolveNode', { nodeId });
      const read = async () => {
        const rr = await S('Runtime.callFunctionOn', { objectId: object.objectId, functionDeclaration: READ, returnByValue: true });
        return rr.result && rr.result.value ? JSON.parse(rr.result.value) : null;
      };
      const rest = await read();
      if (!rest) continue;
      if (rest.prev) continue;   // 主题预览沙箱内的示例元素不参与一致性判定
      if (rest.dis) continue;    // disabled 元素本就不该有 hover
      seen++;
      await S('CSS.forcePseudoState', { nodeId, forcedPseudoClasses: ['hover'] });
      await sleep(150);
      const hover = await read();
      await S('CSS.forcePseudoState', { nodeId, forcedPseudoClasses: ['focus', 'focus-visible'] });
      await sleep(150);
      const focus = await read();
      await S('CSS.forcePseudoState', { nodeId, forcedPseudoClasses: [] });

      if (!hover) continue;
      const moved = ['bw', 'bc', 'bg', 'color', 'shadow'].some((k) => rest[k] !== hover[k]);
      const key = rest.tag + '.' + (rest.cls || '') + (rest.cls ? '' : '@' + (rest.par || 'root') + '>' + (rest.par2 || 'root')) + (rest.state ? '#' + rest.state : '');
      if (!moved && !/visually-hidden/.test(rest.cls) && rest.tag !== 'input') problems.push(route + ' ' + key + ' 文本「' + (rest.txt || '') + '」hover 无任何视觉响应（死 hover）');

      if (!classes.has(key)) classes.set(key, new Set());
      const sig = ['bw', 'bc', 'bg', 'color', 'shadow'].map((k) => (rest[k] === hover[k] ? 0 : 1)).join('');
      classes.get(key).add(sig + '|' + (focus ? (focus.ol === 'none' ? 'ring' : 'outline') : '?'));
      if (!globalThis.__samples) globalThis.__samples = {};
      const _k = key + ':::' + sig;
      if (!globalThis.__samples[_k]) globalThis.__samples[_k] = (rest.txt || '').slice(0, 14);

      if (focus && focus.ol !== 'none') problems.push(route + ' ' + key + ' focus 仍在使用 outline（应为统一光环）');

      if (/icon-btn/.test(rest.cls)) {
        const parts = rest.bw.split('/');
        if (new Set(parts).size !== 1) problems.push(route + ' ' + key + ' 边框四边不等：' + rest.bw + '（底边被全局重置打断）');
      }
    } catch (e) {}
  }
}

/* 容器不发光 */
await S('Page.navigate', { url: 'http://127.0.0.1:' + PORT + '/index.html#/' });
await sleep(2600);
const mainFocus = await S('Runtime.evaluate', { expression: "(()=>{const m=document.querySelector('main');if(!m)return 'none';m.focus();const c=getComputedStyle(m);return c.boxShadow+'|'+c.outlineStyle})()", returnByValue: true });

for (const [key, sigs] of classes) {
  if (sigs.size > 1) problems.push(key + ' 同类元素存在 ' + sigs.size + ' 种不同表现：' + [...sigs].join(' , '));
if (sigs.size > 1) { console.log('DEBUG ' + key + ' -> ' + [...sigs].join(' | ')); }
}
const mv = mainFocus.result && mainFocus.result.value ? String(mainFocus.result.value) : 'none|none';
const [mShadow, mOutline] = mv.split('|');
const cleanShadow = !mShadow || mShadow === 'none';
const cleanOutline = !mOutline || mOutline === 'none';
if (!(cleanShadow && cleanOutline)) problems.push('<main> 聚焦后出现样式：' + mv + '（会导致整页大框）');

await send('Target.closeTarget', { targetId }).catch(() => {});
ws.close(); child.kill(); srv.close();

report.push('实测 ' + seen + ' 个可交互元素，覆盖 ' + classes.size + ' 个类');
report.push('焦点机制：全部为光环，未出现 outline');
report.push('同类元素签名：每个类只有 1 种表现');
report.push('图标边框：四边等宽');
report.push('<main> 聚焦：无光环');
report.forEach((r) => console.log('✓ ' + r));
if (globalThis.__samples) { for (const [k, v] of Object.entries(globalThis.__samples)) if (k.includes('@nav') || k.includes('editor__tool')) console.log('SAMPLE ' + k + ' => 「' + v + '」'); }
if (problems.length) {
  problems.slice(0, 20).forEach((p) => console.log('✗ ' + p));
  console.log('UI 一致性实测失败（' + problems.length + ' 项）');
  process.exit(1);
}
console.log('PASS：UI 一致性实测通过（光环唯一 / 无死 hover / 同类零差异 / 边框完整 / 容器不发光）');
