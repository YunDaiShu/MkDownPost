/* tools/bundle-css.mjs — 把 10 个样式表按固定顺序合并成 bundle.css（减少首屏请求数） */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const ORDER = ['tokens.css','base.css','layout.css','components.css','themes.css','themes.generated.css','markdown.css','editor.css','pages.css','cc-fx.css'];
const out = path.join(ROOT, 'assets/styles/bundle.css');

const parts = ORDER.map((f) => {
  const p = path.join(ROOT, 'assets/styles', f);
  if (!fs.existsSync(p)) { console.warn('缺少 ' + f); return ''; }
  return '/* ===== ' + f + ' ===== */\n' + fs.readFileSync(p, 'utf8').trimEnd() + '\n';
});
const css = parts.join('\n');
fs.writeFileSync(out, css, 'utf8');
console.log('bundle.css ' + Math.round(css.length / 1024) + 'KB，合并 ' + ORDER.length + ' 个文件 → 1 个请求');
