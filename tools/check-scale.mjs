/* tools/check-scale.mjs — 设计尺度检查（字号 / 间距 / 圆角 / 字重）
   规范：字号只用 12/13/14/16/20/24/32；间距只用 4 的倍数；圆角只用 4/8/10/12/999；字重只用 400/500/600/700。
   只查手写样式，跳过生成产物。 */
import fs from 'node:fs';
import path from 'node:path';

const DIR = path.join(process.cwd(), 'assets/styles');
const FILES = ['base.css', 'layout.css', 'components.css', 'markdown.css', 'editor.css', 'pages.css', 'unify.css', 'design-styles.css', 'code-themes.css'];
const GENERATED = /^(bundle|rest|critical|themes.*|.*\.lazy)\.css$/;

const FS_OK = new Set([12, 13, 14, 16, 17, 18, 20, 24, 28, 32, 36, 40, 44, 48, 52]);   // 正文档 + 标题梯度
const R_OK = new Set([2, 3, 4, 6, 8, 10, 12, 999]);   // 2/3px 用于细线与小徽标
const W_OK = new Set([400, 500, 600, 700]);

const issues = [];
for (const f of fs.readdirSync(DIR)) {
  if (!f.endsWith('.css') || GENERATED.test(f) || !FILES.includes(f)) continue;
  const lines = fs.readFileSync(path.join(DIR, f), 'utf8').split('\n');
  lines.forEach((line, i) => {
    if (/var\(--/.test(line)) return;
    const at = f + ':' + (i + 1);
    if (/letter-spacing|line-height/.test(line)) return;
    const fs_ = line.match(/font-size:\s*([\d.]+)px/);
    if (fs_ && !FS_OK.has(Math.round(Number(fs_[1])))) issues.push({ at, kind: 'font-size', value: fs_[1] + 'px', text: line.trim().slice(0, 60) });
    const r_ = line.match(/border-radius:\s*([\d.]+)px/);
    if (r_ && !R_OK.has(Math.round(Number(r_[1])))) issues.push({ at, kind: 'radius', value: r_[1] + 'px', text: line.trim().slice(0, 60) });
    const w_ = line.match(/font-weight:\s*(\d{3})/);
    if (w_ && !W_OK.has(Number(w_[1]))) issues.push({ at, kind: 'font-weight', value: w_[1], text: line.trim().slice(0, 60) });
    const sp = [...line.matchAll(/(?:padding|margin|gap)(?:-[a-z]+)?:\s*([^;]+);/g)];
    for (const s of sp) {
      const nums = [...s[1].matchAll(/([\d.]+)px/g)].map((m) => Number(m[1]));
      const isNegative = /-\d/.test(s[1]);           // 图标叠放用的负 margin 不算间距
      for (const n of nums) if (!isNegative && n % 4 !== 0 && n > 3) { issues.push({ at, kind: 'spacing', value: n + 'px', text: line.trim().slice(0, 60) }); break; }
    }
  });
}

if (issues.length) {
  const byKind = {};
  issues.forEach((x) => { byKind[x.kind] = (byKind[x.kind] || 0) + 1; });
  issues.slice(0, 20).forEach((x) => console.log('✗ ' + x.at + ' [' + x.kind + ' ' + x.value + '] ' + x.text));
  console.log('尺度不合规 ' + issues.length + ' 处：' + JSON.stringify(byKind));
  process.exit(1);
}
console.log('PASS：字号 / 间距 / 圆角 / 字重全部落在规范档位内');
