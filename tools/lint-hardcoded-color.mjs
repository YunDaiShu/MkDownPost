/* tools/lint-hardcoded-color.mjs — 检查手写组件样式里的硬编码颜色
   规则：
   - 只查手写的组件/页面样式（base/layout/components/markdown/editor/pages/cc-fx）
   - 跳过生成产物：bundle/rest/critical/themes*.css（这些本质就是颜色定义）
   - 允许 box-shadow / 遮罩 / 渐变里用 rgba(0,0,0,...) 这类透明叠加
   - 其余 #hex 与 rgb()/hsl() 字面量视为违规
*/
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const DIR = path.join(ROOT, 'assets/styles');

const CHECK = ['base.css', 'layout.css', 'components.css', 'markdown.css', 'editor.css', 'pages.css', 'cc-fx.css'];
const GENERATED = /^(bundle|rest|critical)\.css$|^themes.*\.css$/;

const HEX = /#[0-9a-fA-F]{3,8}\b/g;
const FUNC = /\b(rgb|rgba|hsl|hsla)\(/g;
const ALLOW_LINE = /box-shadow|text-shadow|filter:|backdrop-filter|mask|gradient/i;

let bad = 0;
const offenders = [];

for (const f of fs.readdirSync(DIR)) {
  if (!f.endsWith('.css')) continue;
  if (GENERATED.test(f)) continue;
  if (!CHECK.includes(f)) continue;   // 未登记的新文件不检查，避免误报

  const lines = fs.readFileSync(path.join(DIR, f), 'utf8').split('\n');
  lines.forEach((line, i) => {
    if (ALLOW_LINE.test(line)) return;              // 阴影/遮罩/渐变里的透明叠加允许
    // var(--c-x, #fff) 里的回退值是合法写法，先剥离再扫描
    const scan = line.replace(/var\([^)]*\)/g, 'var()');
    const hits = [...(scan.match(HEX) || []), ...(scan.match(FUNC) || [])];
    if (hits.length) {
      bad += hits.length;
      offenders.push({ file: f, line: i + 1, hits: [...new Set(hits)].slice(0, 4), text: line.trim().slice(0, 70) });
    }
  });
}

if (bad) {
  offenders.slice(0, 15).forEach((o) => console.log('✗ ' + o.file + ':' + o.line + ' → ' + o.hits.join(', ') + '   ' + o.text));
  console.log('硬编码颜色 ' + bad + ' 处（应改为 var(--c-*)）');
  process.exit(1);
}
console.log('PASS：手写组件样式无硬编码颜色（已跳过生成产物与阴影/渐变）');
