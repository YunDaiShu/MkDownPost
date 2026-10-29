/* tools/lint-hardcoded-color.mjs — 检查组件样式里是否有硬编码颜色
   规则：assets/styles 下除 tokens.css / themes*.css 外，不允许出现 #hex 或 rgb()/hsl() 字面量。 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const DIR = path.join(ROOT, 'assets/styles');
const ALLOW = new Set(['tokens.css', 'highlights.css']);
const HEX = /#[0-9a-fA-F]{3,8}\b/g;
const FUNC = /\b(rgb|rgba|hsl|hsla)\(/g;

let bad = 0;
for (const f of fs.readdirSync(DIR)) {
  if (!f.endsWith('.css')) continue;
  if (f.startsWith('themes')) continue;
  if (ALLOW.has(f)) continue;
  const src = fs.readFileSync(path.join(DIR, f), 'utf8');
  const hits = [...(src.match(HEX) || []), ...(src.match(FUNC) || [])];
  if (hits.length) {
    bad += hits.length;
    console.log('✗ ' + f + ' → ' + hits.slice(0, 6).join(', ') + (hits.length > 6 ? ' …(' + hits.length + ')' : ''));
  }
}
console.log(bad ? '硬编码颜色 ' + bad + ' 处（应改为 var(--c-*)）' : 'PASS：组件样式无硬编码颜色');
process.exit(bad ? 1 : 0);
