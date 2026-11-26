/* tools/check-hl-metrics.mjs — 守住语法高亮层：token 样式只准改颜色
   背景：高亮层与 textarea 是两层叠字，任何影响字形宽度/行高的属性都会造成重影。
   允许：color / background / border-radius / text-decoration / position / left / top / bottom / width(仅伪元素) / content
   禁止：font-weight / font-style / font-family / font-size / line-height / letter-spacing /
        padding* / margin* / border*(左侧竖线除外，必须写在伪元素上) / display / width(元素自身) / text-transform */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const css = fs.readFileSync(path.join(ROOT, 'assets/styles/editor.css'), 'utf8')
  .replace(/\/\*[\s\S]*?\*\//g, ' ');   // 去掉注释，避免把注释当成选择器

const FORBIDDEN = /(^|[;\s{])(font-weight|font-style|font-family|font-size|line-height|letter-spacing|word-spacing|text-transform|padding(-[a-z]+)?|margin(-[a-z]+)?|display|border|border-(top|right|bottom|left|width)|width|height|min-width)\s*:/;

const problems = [];
const ruleRe = /([^{}]*\.editor__hl[^{}]*)\{([^}]*)\}/g;
let m;
while ((m = ruleRe.exec(css))) {
  const selector = m[1].replace(/\s+/g, ' ').trim();
  const body = m[2];
  const isPseudo = selector.includes('::before') || selector.includes('::after');
  const decls = body.split(';').map((d) => d.trim()).filter(Boolean);
  for (const d of decls) {
    const prop = d.split(':')[0].trim().toLowerCase();
    if (!FORBIDDEN.test(' ' + d)) continue;
    // 伪元素允许定位与尺寸（它不参与文字排版）
    if (isPseudo && /^(position|left|top|bottom|right|width|height|content|background|border-radius)$/.test(prop)) continue;
    // 容器本身（.editor__hl）允许 font-size / line-height / padding：它由 JS 与 textarea 同步
    // 容器与 textarea 自身同族：字号/行高/内边距必须一致，这类属性允许（由 JS 同步）
    const parts = selector.split(',').map((x) => x.trim()).filter(Boolean);
    const containerOnly = parts.every((p) => /^\.(editor__hl|editor__ta)$/.test(p));
    if (containerOnly) continue;
    problems.push(selector + ' { ' + d + ' }');
  }
}

if (problems.length) {
  problems.forEach((p) => console.log('✗ 高亮层出现了会影响字位的属性：' + p));
  console.log('高亮层度量检查失败（' + problems.length + ' 项）：这些属性会让底层文字与 textarea 错位，选中时出现重影');
  process.exit(1);
}
console.log('PASS：语法高亮层只改颜色，不改字位');