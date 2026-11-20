/* tools/gen-modulepreload.mjs — 扫描 main.js 的静态依赖图，把 <link rel="modulepreload"> 写进 index.html
   目的：GitHub Pages 单请求 RTT 较高，串行 import 会拖成数秒；预加载后浏览器可并行拉取。 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const START = 'src/main.js';
const MARK_OPEN = '<!-- modulepreload:start -->';
const MARK_CLOSE = '<!-- modulepreload:end -->';

const resolve = (fromFile, rel) => path.posix.normalize(path.posix.join(path.posix.dirname(fromFile), rel));

const seen = new Set();
const queue = [START];
while (queue.length) {
  const file = queue.shift();
  if (seen.has(file)) continue;
  seen.add(file);
  const abs = path.join(ROOT, file);
  if (!fs.existsSync(abs)) continue;
  const src = fs.readFileSync(abs, 'utf8');
  const re = /(?:^|[^.])\bfrom\s*['"](\.[^'"?]+)/g;   // 只取静态 from，不算 import() 动态路由
  let m;
  while ((m = re.exec(src))) queue.push(resolve(file, m[1]));
}

const files = [...seen].filter((f) => f !== START).sort();
const htmlPath = path.join(ROOT, 'index.html');
let html = fs.readFileSync(htmlPath, 'utf8');
const stamp = (html.match(/rest\.css\?v=([a-z0-9]+)/) || [])[1] || '0';

const links = ['  ' + MARK_OPEN]
  .concat(files.map((f) => '  <link rel="modulepreload" href="./' + f + '?v=' + stamp + '">'))
  .concat(['  ' + MARK_CLOSE])
  .join('\n');

if (html.includes(MARK_OPEN)) {
  const start = html.indexOf(MARK_OPEN);
  const end = html.indexOf(MARK_CLOSE) + MARK_CLOSE.length;
  html = html.slice(0, start) + links + html.slice(end);
} else {
  const anchorRe = /<link rel="modulepreload"[^>]*src\/main\.js[^>]*>/;
  const anchor = html.match(anchorRe);
  if (anchor) html = html.replace(anchor[0], anchor[0] + '\n' + links);
  else html = html.replace('</head>', links + '\n</head>');
}
fs.writeFileSync(htmlPath, html, 'utf8');
console.log('modulepreload ' + files.length + ' 个模块');
