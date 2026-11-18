/* tools/stamp-version.mjs — 内容哈希版本戳（缓存击穿 + SW 更新）
   背景：所有资源引用写作 ?v=<token>，若 token 是写死常量，
   Service Worker 的"带版本戳资源缓存优先"策略会让旧文件永久驻留。
   本脚本用源码内容哈希生成 token，保证内容一变 URL 就变。

   用法：
     node tools/stamp-version.mjs          写入新版本戳
     node tools/stamp-version.mjs --check  只校验（不一致则 exit 1，CI 用）
*/
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const ROOT = process.cwd();
const CHECK = process.argv.includes('--check');

const SOURCE_GLOBS = [
  'src', 'assets/styles'
];
const IGNORE = /(^|\/)(\.profile|node_modules|\.git)/;
const GENERATED = new Set([
  'assets/styles/bundle.css', 'assets/styles/rest.css', 'assets/styles/critical.css'
]);

const collect = (p, out = []) => {
  const abs = path.join(ROOT, p);
  if (!fs.existsSync(abs)) return out;
  const st = fs.statSync(abs);
  if (st.isDirectory()) {
    for (const e of fs.readdirSync(abs, { withFileTypes: true })) {
      const rel = path.posix.join(p, e.name);
      if (IGNORE.test(rel)) continue;
      if (e.isDirectory()) collect(rel, out);
      else if (/\.(js|mjs|css|html)$/.test(e.name) && !GENERATED.has(rel)) out.push(rel);
    }
  } else if (/\.(js|mjs|css|html)$/.test(p) && !GENERATED.has(p)) out.push(p);
  return out;
};

const files = [...new Set(SOURCE_GLOBS.flatMap((g) => collect(g)))].sort();
const h = crypto.createHash('sha256');
for (const f of files) {
  // 哈希前抹掉现有版本戳，避免"改戳→改内容→改戳"自激
  const buf = fs.readFileSync(path.join(ROOT, f), 'utf8')
    .replace(/\?v=[a-z0-9]+/g, '?v=@STAMP@')
    .replace(/const VERSION = '[^']*';/g, "const VERSION = '@STAMP@';");
  h.update(f + '\u0000' + buf + '\u0000');
}
const stamp = h.digest('hex').slice(0, 8);

const targets = [...new Set([
  ...files.filter((f) => /\.(html|js)$/.test(f)),
  'index.html', 'sw.js', '404.html'
])].filter((f) => fs.existsSync(path.join(ROOT, f)));
let changed = 0;
const stale = [];
for (const f of targets) {
  const abs = path.join(ROOT, f);
  const txt = fs.readFileSync(abs, 'utf8');
  const found = [...new Set([...txt.matchAll(/\?v=([a-z0-9]+)/g)].map((m) => m[1]))];
  if (!found.length) continue;
  if (found.every((v) => v === stamp)) continue;
  if (CHECK) { stale.push(f + ' (' + found.join(',') + ' → ' + stamp + ')'); continue; }
  fs.writeFileSync(abs, txt.replace(/\?v=[a-z0-9]+/g, '?v=' + stamp), 'utf8');
  changed++;
}

// sw.js：版本号跟随内容哈希，旧缓存会在 activate 时被清掉
const swPath = path.join(ROOT, 'sw.js');
if (fs.existsSync(swPath)) {
  const sw = fs.readFileSync(swPath, 'utf8');
  const versionOk = new RegExp("const VERSION = 'v" + stamp + "'").test(sw);
  const precacheOk = !/'(\.\/[^'?]+)'/g.test(sw) || sw.includes('?v=' + stamp);
  if (!versionOk || !precacheOk) {
    if (CHECK) { stale.push('sw.js (VERSION 未跟随内容哈希)'); }
    else {
      let next = sw.replace(/const VERSION = '[^']*';/, "const VERSION = 'v" + stamp + "';");
      next = next.replace(/'(\.\/[^']+?)'/g, (mm, p1) => (p1.includes('?v=') ? mm : "'" + p1 + '?v=' + stamp + "'"));
      fs.writeFileSync(swPath, next, 'utf8');
      changed++;
    }
  }
}

if (CHECK) {
  if (stale.length) {
    console.log('版本戳过期（' + stale.length + ' 个文件），请运行 node tools/stamp-version.mjs');
    stale.slice(0, 8).forEach((s) => console.log('  ✗ ' + s));
    process.exit(1);
  }
  console.log('PASS：版本戳与内容哈希一致（' + stamp + '），缓存可正常击穿');
} else {
  console.log('版本戳 = ' + stamp + '，更新 ' + changed + ' 个文件');
}
