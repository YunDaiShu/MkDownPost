/* tools/check-interaction.mjs — 交互规范守卫（CI 用）
   校验 5 件事：
   1. 层叠顺序：<style id="critical"> 必须在 rest.css 之前（否则基础层会盖掉功能层）
   2. hover 规范：边框族 = 边框主色 + 前景加深；组内族 = 专用 hover 底色 + 前景加深
   3. 焦点规范：关键可点元素都有 2px 主色 focus-visible 描边
   4. 图标光学重量：顶栏三个图标的 stroke-width 固定为 1.8 / 2.2 / 2
   5. 明暗两套令牌的对比度下限（hover 底、hover 边框、焦点环、正文）

   任何一项不符即 exit 1，避免"改着改着又散了"。
*/
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const problems = [];
const report = [];

/* ---------- 通用：CSS 解析 + 层叠求解 ---------- */
const parseRules = (rawCss, baseOrder) => {
  const out = [];
  let order = baseOrder;
  const css = rawCss.replace(/\/\*[\s\S]*?\*\//g, '');
  for (const m of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    const selText = m[1].replace(/\s+/g, ' ').trim();
    if (!selText || selText.startsWith('@')) continue;
    const decl = {};
    for (const d of m[2].split(';')) {
      const i = d.indexOf(':');
      if (i < 0) continue;
      decl[d.slice(0, i).trim()] = d.slice(i + 1).trim();
    }
    for (const one of selText.split(',')) {
      const sel = one.trim();
      const ids = (sel.match(/#[\w-]+/g) || []).length;
      const cls = (sel.match(/\.[\w-]+|\[[^\]]+\]|:(?!:)[\w-]+/g) || []).length;
      const els = (sel.match(/(^|[\s>+~])[a-zA-Z][\w-]*/g) || []).length + (sel.match(/::[\w-]+/g) || []).length;
      out.push({ sel, decl, order: order++, spec: ids * 100 + cls * 10 + els });
    }
  }
  return out;
};

const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');

/* ---------- 1. 层叠顺序 ---------- */
const iCritical = html.indexOf('<style id="critical">');
const iRest = html.indexOf('rest.css?v=');
if (iCritical < 0) problems.push('index.html 缺少内联 critical 样式');
else if (iRest >= 0 && iCritical > iRest) problems.push('层叠顺序反了：critical 必须早于 rest.css（否则 components.css 会盖掉 pages/editor）');
else report.push('层叠顺序：critical 在 rest 之前 ✓');

const cStart = html.indexOf('<style id="critical">') + '<style id="critical">'.length;
const criticalCss = html.slice(cStart, html.indexOf('</style>', cStart));
const restCss = fs.readFileSync(path.join(ROOT, 'assets/styles/rest.css'), 'utf8');
const rules = [...parseRules(criticalCss, 0), ...parseRules(restCss, 100000)];

const winner = (target, state) => {
  const exact = target + state;
  let cands = rules.filter((r) => r.sel === exact);
  if (!cands.length) cands = rules.filter((r) => r.sel.split(' ').pop() === exact);
  if (!cands.length) return null;
  cands.sort((a, b) => (a.spec - b.spec) || (a.order - b.order));
  const merged = {};
  for (const c of cands) Object.assign(merged, c.decl);
  return merged;
};

/* ---------- 2. hover 规范 ---------- */
const borderFamily = ['.icon-btn', '.btn', '.card', '.theme-card', '.tsw__chip', '.editor__tool'];
const groupFamily = ['.seg__btn', '.nav a', '.editor__menu button'];

for (const sel of borderFamily) {
  const d = winner(sel, ':hover');
  if (!d) { problems.push(sel + ' 没有 :hover 规则'); continue; }
  if ((d['border-color'] || '') !== 'var(--c-primary)') problems.push(sel + ' :hover 的边框应为 var(--c-primary)，实际 ' + (d['border-color'] || '(未设置)'));
  if ((d.color || '') !== 'var(--c-text)') problems.push(sel + ' :hover 的前景应为 var(--c-text)，实际 ' + (d.color || '(未设置)'));
  const bg = d.background || d['background-color'] || '';
  if (bg && bg !== 'transparent') problems.push(sel + ' :hover 不应改变底色（规范是只变边框），实际 ' + bg);
}
for (const sel of groupFamily) {
  const d = winner(sel, ':hover');
  if (!d) { problems.push(sel + ' 没有 :hover 规则'); continue; }
  const bg = d.background || d['background-color'] || '';
  if (!bg.startsWith('var(--c-hover-bg')) problems.push(sel + ' :hover 的底色应为 var(--c-hover-bg)，实际 ' + (bg || '(未设置)'));
  if ((d.color || '') !== 'var(--c-text)') problems.push(sel + ' :hover 的前景应为 var(--c-text)，实际 ' + (d.color || '(未设置)'));
}
if (!problems.length) report.push('hover 规范：' + borderFamily.length + ' 个边框族 + ' + groupFamily.length + ' 个组内族全部符合 ✓');

/* ---------- 3. 焦点规范 ---------- */
const focusRequired = ['.icon-btn', '.btn', '.card', '.theme-card', '.nav a', '.tsw__chip', '.editor__tool', '.seg__btn'];
for (const sel of focusRequired) {
  const d = winner(sel, ':focus-visible');
  if (!d) { problems.push(sel + ' 缺少 :focus-visible'); continue; }
  if (!/var\(--c-focus-ring\)/.test(d.outline || '')) problems.push(sel + ' :focus-visible 应使用 var(--c-focus-ring)，实际 ' + (d.outline || '(未设置)'));
}
if (!problems.length) report.push('焦点规范：' + focusRequired.length + ' 个元素均有主色描边 ✓');

/* ---------- 4. 图标光学重量 ---------- */
const expectStroke = { ghBtn: '1.8', themeBtn: '2.2', modeBtn: '2' };
for (const [id, want] of Object.entries(expectStroke)) {
  const seg = html.slice(html.indexOf('id="' + id + '"'), html.indexOf('id="' + id + '"') + 700);
  const got = (seg.match(/stroke-width="([\d.]+)"/) || [])[1];
  if (got !== want) problems.push('#' + id + ' 的 stroke-width 应为 ' + want + '（用于光学配平），实际 ' + (got || '(未设置)'));
}
if (!problems.length) report.push('图标光学重量：1.8 / 2.2 / 2 符合配平结果 ✓');

/* ---------- 5. 明暗对比度下限 ---------- */
const tokensCss = fs.readFileSync(path.join(ROOT, 'assets/styles/tokens.css'), 'utf8');
const readTokens = (block) => {
  const out = {};
  for (const m of block.matchAll(/(--c-[\w-]+)\s*:\s*([^;]+);/g)) out[m[1]] = m[2].trim();
  return out;
};
const lightBlock = tokensCss.slice(0, tokensCss.indexOf('[data-mode="dark"]'));
const darkBlock = tokensCss.slice(tokensCss.indexOf('[data-mode="dark"]'));
const light = readTokens(lightBlock);

// --c-primary / --c-focus-ring 等由主题文件提供，这里取默认主题（deepseek）的暗色调色板
const themesCss = fs.readFileSync(path.join(ROOT, 'assets/styles/themes.css'), 'utf8');
const pick = (re) => { const i = themesCss.search(re); if (i < 0) return {}; const start = themesCss.indexOf('{', i); const end = themesCss.indexOf('}', start); return readTokens(themesCss.slice(start, end)); };
const dark = { ...light, ...pick(/\[data-theme="deepseek"\]\[data-mode="dark"\]/), ...readTokens(darkBlock) };

const parseColor = (s) => {
  s = (s || '').trim();
  if (s.startsWith('#')) {
    const h = s.slice(1);
    const n = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
    return [parseInt(n.slice(0, 2), 16), parseInt(n.slice(2, 4), 16), parseInt(n.slice(4, 6), 16), 1];
  }
  const m = s.match(/rgba?\(([^)]+)\)/);
  if (m) {
    const p = m[1].split(',').map(Number);
    return [p[0], p[1], p[2], p.length > 3 ? p[3] : 1];
  }
  return null;
};
const lum = (c) => {
  const f = (x) => { x /= 255; return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4); };
  return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]);
};
const contrast = (a, b) => { const l1 = lum(a), l2 = lum(b); return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05); };
const flatten = (fg, bg) => [fg[0] * fg[3] + bg[0] * (1 - fg[3]), fg[1] * fg[3] + bg[1] * (1 - fg[3]), fg[2] * fg[3] + bg[2] * (1 - fg[3]), 1];

for (const [name, t, minHoverBg] of [['亮色', light, 1.15], ['暗色', dark, 1.35]]) {
  const surface = parseColor(t['--c-surface']);
  const hoverBg = parseColor(t['--c-hover-bg']);
  const primary = parseColor(t['--c-primary']);
  const ring = parseColor(t['--c-focus-ring']);
  const text = parseColor(t['--c-text']);
  if (!surface || !hoverBg || !primary || !ring || !text) { problems.push(name + ' 令牌解析失败，检查 tokens.css'); continue; }

  const cHoverBg = contrast(flatten(hoverBg, surface), surface);
  const cHoverBorder = contrast(primary, surface);
  const cRing = contrast(ring, surface);
  const cText = contrast(text, surface);

  if (cHoverBg < minHoverBg) problems.push(name + ' hover 底色对比度 ' + cHoverBg.toFixed(2) + ':1，低于下限 ' + minHoverBg + ':1（hover 会看不见）');
  if (cHoverBorder < 3) problems.push(name + ' hover 边框对比度 ' + cHoverBorder.toFixed(2) + ':1，低于 3:1');
  if (cRing < 3) problems.push(name + ' 焦点环对比度 ' + cRing.toFixed(2) + ':1，低于 3:1');
  if (cText < 7) problems.push(name + ' 正文对比度 ' + cText.toFixed(2) + ':1，低于 7:1');
  report.push(name + '：hover 底 ' + cHoverBg.toFixed(2) + ' / hover 边框 ' + cHoverBorder.toFixed(2) + ' / 焦点环 ' + cRing.toFixed(2) + ' / 正文 ' + cText.toFixed(2));
}

/* ---------- 输出 ---------- */
report.forEach((r) => console.log('✓ ' + r));
if (problems.length) {
  problems.forEach((p) => console.log('✗ ' + p));
  console.log('交互规范校验失败（' + problems.length + ' 项）');
  process.exit(1);
}
console.log('PASS：交互规范全部符合（层叠顺序 / hover 两族 / 焦点 / 图标配平 / 明暗对比度）');
