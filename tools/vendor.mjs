/* tools/vendor.mjs — 可选：把第三方库下载到 vendor/（一次性本地操作，运行时不再联网）
   用法：node tools/vendor.mjs
   说明：不下载也能跑（内置解析器 + 无高亮）。下载后自动启用 marked / highlight.js / DOMPurify。 */

import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const VENDOR = path.join(ROOT, 'vendor');

const FILES = [
  ['marked.min.js', 'https://cdn.jsdelivr.net/npm/marked@12.0.2/marked.min.js'],
  ['highlight.min.js', 'https://cdn.jsdelivr.net/npm/@highlightjs/cdn-assets@11.9.0/highlight.min.js'],
  ['github-dark.min.css', 'https://cdn.jsdelivr.net/npm/@highlightjs/cdn-assets@11.9.0/styles/github-dark.min.css']
];

fs.mkdirSync(VENDOR, { recursive: true });

for (const [name, url] of FILES) {
  const dest = path.join(VENDOR, name);
  if (fs.existsSync(dest)) { console.log('已存在 → ' + name); continue; }
  try {
    const res = await fetch(url);
    if (!res.ok) { console.log('失败 ' + res.status + ' → ' + name); continue; }
    fs.writeFileSync(dest, Buffer.from(await res.arrayBuffer()));
    console.log('已下载 → vendor/' + name);
  } catch (e) {
    console.log('网络错误 → ' + name + ' (' + (e && e.message) + ')');
  }
}
console.log('\n完成。index.html 中按需引入：<script src="./vendor/marked.min.js"></script>');
