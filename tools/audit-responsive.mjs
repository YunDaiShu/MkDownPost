/* tools/audit-responsive.mjs — 多分辨率回归检查（一条命令跑完）
   用法：node tools/audit-responsive.mjs [baseUrl] [--shots=dir]
   检查：渲染成功 / 控制台报错 / 横向溢出 / 移动端点击区 44px / 页头与内容对齐 / 栅格列数
   退出码：有失败 = 1（可直接接入 CI） */

import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const BASE = (process.argv.find((a) => !a.startsWith('-') && a.startsWith('http')) || 'https://yundaishu.github.io/MkDownPost/');
const shotsArg = process.argv.find((a) => a.startsWith('--shots='));
const SHOTS = shotsArg ? shotsArg.split('=')[1] : null;

const SIZES = [
  { name: '375', w: 375, h: 812, mobile: true },
  { name: '768', w: 768, h: 1024, mobile: false },
  { name: '1440', w: 1440, h: 900, mobile: false },
  { name: '1920', w: 1920, h: 1080, mobile: false },
  { name: '2560', w: 2560, h: 1440, mobile: false }
];
const ROUTES = [
  { name: '首页', hash: '#/', waitFor: '.card' },
  { name: '编辑器', hash: '#/editor', waitFor: '#ta' },
  { name: '主题库', hash: '#/themes', waitFor: '.theme-card' },
  { name: '关于', hash: '#/about', waitFor: '.about-table' },
  { name: '文章', hash: '#/article/getting-started', waitFor: '.article__body' }
];

const EDGE = [
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Google/Chrome/Application/chrome.exe'
].find((p) => fs.existsSync(p));
if (!EDGE) { console.error('未找到 Edge/Chrome'); process.exit(3); }

const port = 9600 + (process.pid % 200);
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'mdp-audit-'));
const child = spawn(EDGE, ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-first-run',
  '--force-device-scale-factor=1', '--remote-debugging-port=' + port, '--user-data-dir=' + profile, 'about:blank'],
  { stdio: 'ignore', windowsHide: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function wsUrl() {
  for (let i = 0; i < 80; i++) {
    try {
      const j = await (await fetch('http://127.0.0.1:' + port + '/json/version')).json();
      if (j.webSocketDebuggerUrl) return j.webSocketDebuggerUrl;
    } catch { /* 等启动 */ }
    await sleep(150);
  }
  throw new Error('浏览器未就绪');
}

const ws = new WebSocket(await wsUrl());
await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });

let seq = 0;
const pending = new Map();
let errors = [];
ws.onmessage = (ev) => {
  const m = JSON.parse(ev.data);
  if (m.method === 'Runtime.exceptionThrown') {
    errors.push(String((m.params.exceptionDetails && m.params.exceptionDetails.text) || 'exception'));
  }
  if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') {
    errors.push((m.params.args || []).map((a) => a.value || a.description || '').join(' ').slice(0, 120));
  }
  if (m.id && pending.has(m.id)) {
    const { resolve, reject } = pending.get(m.id);
    pending.delete(m.id);
    m.error ? reject(new Error(m.error.message)) : resolve(m.result);
  }
};
const send = (method, params = {}, sessionId) => {
  const id = ++seq;
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject });
    ws.send(JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) }));
  });
};

const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
const { sessionId: S } = await send('Target.attachToTarget', { targetId, flatten: true });
await send('Page.enable', {}, S);
await send('Runtime.enable', {}, S);

const PROBE = `(() => {
  const q = (s) => document.querySelector(s);
  const box = (s) => { const e = q(s); if (!e) return null; const r = e.getBoundingClientRect(); return { x: Math.round(r.x), w: Math.round(r.width), h: Math.round(r.height) }; };
  const ctrl = [...document.querySelectorAll('.nav a, .icon-btn, .btn, .editor__tool, .pill, .tab, .theme-card button, .sres-more')]
    .map((e) => ({ c: String(e.className).slice(0, 20), h: Math.round(e.getBoundingClientRect().height) }))
    .filter((x) => x.h > 0 && x.h < 44);
  const grid = q('.cards') || q('.theme-grid');
  return {
    rendered: (document.getElementById('app') || { innerHTML: '' }).innerHTML.length,
    title: document.title,
    overflow: document.documentElement.scrollWidth > innerWidth + 1,
    brandX: (box('.brand') || {}).x,
    mainLeft: (() => {
      const m = q('.app-main'); if (!m) return undefined;
      const r = m.getBoundingClientRect(); const pl = parseFloat(getComputedStyle(m).paddingLeft);
      const fullBleed = r.width >= innerWidth - 2;   // 全宽工作台：页头应与内容（含内边距）对齐
      return Math.round(fullBleed ? r.x + pl : r.x);
    })(),
    cols: grid ? getComputedStyle(grid).gridTemplateColumns.split(' ').length : 0,
    heroFont: q('.hero__title') ? getComputedStyle(q('.hero__title')).fontSize : null,
    smallTargets: ctrl.slice(0, 4),
    smallCount: ctrl.length
  };
})()`;

const rows = [];
let fails = 0;

for (const s of SIZES) {
  await send('Emulation.setDeviceMetricsOverride', { width: s.w, height: s.h, deviceScaleFactor: 1, mobile: s.mobile }, S);
  for (const r of ROUTES) {
    errors = [];
    await send('Page.navigate', { url: BASE + '?' + Date.now() + r.hash }, S);
    let ok = false;
    for (let i = 0; i < 60; i++) {
      const res = await send('Runtime.evaluate', {
        expression: '!!document.querySelector(' + JSON.stringify(r.waitFor) + ')', returnByValue: true
      }, S);
      if (res.result && res.result.value === true) { ok = true; break; }
      await sleep(100);
    }
    await sleep(250);

    const ev = await send('Runtime.evaluate', { expression: PROBE, returnByValue: true }, S);
    const d = ev.result.value || {};
    const problems = [];
    if (!ok || d.rendered < 400) problems.push('未渲染');
    if (errors.length) problems.push('控制台报错: ' + errors[0]);
    if (d.overflow) problems.push('横向溢出');
    if (s.mobile && d.smallCount) problems.push(d.smallCount + ' 个点击区<44px（如 ' + (d.smallTargets[0] ? d.smallTargets[0].c + ' ' + d.smallTargets[0].h + 'px' : '?') + '）');
    if (s.w >= 1280 && d.brandX !== undefined && d.mainLeft !== undefined && Math.abs(d.brandX - d.mainLeft) > 2) {
      problems.push('页头与内容未对齐(' + d.brandX + ' vs ' + d.mainLeft + ')');
    }

    if (problems.length) fails++;
    rows.push({ size: s.name, route: r.name, ok: problems.length === 0, problems, cols: d.cols, hero: d.heroFont });

    if (SHOTS) {
      fs.mkdirSync(SHOTS, { recursive: true });
      const shot = await send('Page.captureScreenshot', { format: 'png' }, S);
      fs.writeFileSync(path.join(SHOTS, s.name + '-' + r.name + '.png'), Buffer.from(shot.data, 'base64'));
    }
  }
}

// 输出表格
const pad = (t, n) => String(t).padEnd(n, ' ');
console.log(pad('尺寸', 7) + pad('页面', 8) + pad('结果', 6) + pad('列数', 5) + '备注');
console.log('-'.repeat(72));
for (const r of rows) {
  console.log(pad(r.size, 7) + pad(r.route, 8) + pad(r.ok ? 'PASS' : 'FAIL', 6) + pad(r.cols || '-', 5) + (r.problems.join('; ') || ''));
}
console.log('-'.repeat(72));
console.log(rows.length + ' 项检查，失败 ' + fails + ' 项');

ws.close();
child.kill();
await sleep(200);
try { fs.rmSync(profile, { recursive: true, force: true }); } catch { /* 忽略 */ }
process.exit(fails ? 1 : 0);
