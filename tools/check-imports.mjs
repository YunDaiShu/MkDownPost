/* tools/check-imports.mjs — 检查 src/ 下所有相对 import 是否指向真实文件（忽略 ?v= 版本戳） */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const SRC = path.join(ROOT, 'src');
const files = [];
(function walk(dir) {
  for (const n of fs.readdirSync(dir)) {
    const f = path.join(dir, n);
    if (fs.statSync(f).isDirectory()) walk(f);
    else if (n.endsWith('.js')) files.push(f);
  }
})(SRC);

const bad = [];
for (const f of files) {
  const src = fs.readFileSync(f, 'utf8');
  for (const m of src.matchAll(/from\s+'(\.{1,2}\/[^']+)'/g)) {
    const clean = m[1].split('?')[0];
    if (!fs.existsSync(path.resolve(path.dirname(f), clean))) bad.push(path.relative(ROOT, f) + ' → ' + m[1]);
  }
  for (const m of src.matchAll(/import\(\s*'(\.{1,2}\/[^']+)'/g)) {
    const clean = m[1].split('?')[0];
    if (!fs.existsSync(path.resolve(path.dirname(f), clean))) bad.push(path.relative(ROOT, f) + ' → import(' + m[1] + ')');
  }
}

if (bad.length) { console.log('断链导入 ' + bad.length + ' 处：'); bad.forEach((b) => console.log('  ✗ ' + b)); process.exit(1); }
console.log('PASS：' + files.length + ' 个模块的相对导入全部有效');
