/* tools/vendor.mjs — 一次性下载第三方库到 vendor/（运行时不再联网）
   用法：node tools/vendor.mjs
   产物：marked、highlight.js、mermaid、katex（含字体） */

import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const VENDOR = path.join(ROOT, 'vendor');
const CDN = 'https://cdn.jsdelivr.net/npm/';

const FILES = [
  ['marked.min.js', CDN + 'marked@12.0.2/marked.min.js'],
  ['highlight.min.js', CDN + '@highlightjs/cdn-assets@11.9.0/highlight.min.js'],
  ['github.min.css', CDN + '@highlightjs/cdn-assets@11.9.0/styles/github.min.css'],
  ['github-dark.min.css', CDN + '@highlightjs/cdn-assets@11.9.0/styles/github-dark.min.css'],
  ['mermaid.min.js', CDN + 'mermaid@10.9.1/dist/mermaid.min.js'],
  ['katex/katex.min.js', CDN + 'katex@0.16.11/dist/katex.min.js'],
  ['katex/katex.min.css', CDN + 'katex@0.16.11/dist/katex.min.css']
];

// KaTeX 字体（CSS 内引用的标准集合）
const KATEX_FONTS = [
  'KaTeX_AMS-Regular', 'KaTeX_Caligraphic-Bold', 'KaTeX_Caligraphic-Regular',
  'KaTeX_Fraktur-Bold', 'KaTeX_Fraktur-Regular', 'KaTeX_Main-Bold', 'KaTeX_Main-BoldItalic',
  'KaTeX_Main-Italic', 'KaTeX_Main-Regular', 'KaTeX_Math-BoldItalic', 'KaTeX_Math-Italic',
  'KaTeX_SansSerif-Bold', 'KaTeX_SansSerif-Italic', 'KaTeX_SansSerif-Regular',
  'KaTeX_Script-Regular', 'KaTeX_Size1-Regular', 'KaTeX_Size2-Regular', 'KaTeX_Size3-Regular',
  'KaTeX_Size4-Regular', 'KaTeX_Typewriter-Regular'
].map((n) => ['katex/fonts/' + n + '.woff2', CDN + 'katex@0.16.11/dist/fonts/' + n + '.woff2']);

fs.mkdirSync(VENDOR, { recursive: true });

let ok = 0, fail = 0;
for (const [name, url] of [...FILES, ...KATEX_FONTS]) {
  const dest = path.join(VENDOR, name);
  if (fs.existsSync(dest)) { ok++; continue; }
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  try {
    const res = await fetch(url);
    if (!res.ok) { console.log('✗ ' + res.status + ' ' + name); fail++; continue; }
    fs.writeFileSync(dest, Buffer.from(await res.arrayBuffer()));
    ok++;
  } catch (e) {
    console.log('✗ 网络 ' + name + ' ' + (e && e.message));
    fail++;
  }
}
console.log('完成：成功 ' + ok + ' 个，失败 ' + fail + ' 个');
console.log(fail ? '注意：缺失的库会走降级路径（图表显示源码、公式保留原文）' : '全部就绪，刷新页面即生效');
