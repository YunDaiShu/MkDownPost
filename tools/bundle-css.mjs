/* tools/bundle-css.mjs — 拆成 critical（内联进 HTML）+ rest（非阻塞加载）
   目的：首屏不再被 160KB+ 的样式表阻塞，关键样式直接内联 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const CRITICAL = ['tokens.css', 'base.css', 'layout.css', 'components.css'];
const REST = ['themes.css', 'themes.generated.css', 'markdown.css', 'editor.css', 'pages.css', 'cc-fx.css', 'unify.css'];

const read = (f) => {
  const p = path.join(ROOT, 'assets/styles', f);
  if (!fs.existsSync(p)) { console.warn('缺少 ' + f); return ''; }
  return '/* ===== ' + f + ' ===== */\n' + fs.readFileSync(p, 'utf8').trimEnd() + '\n';
};

const criticalCss = CRITICAL.map(read).join('\n');
const restCss = REST.map(read).join('\n');

fs.writeFileSync(path.join(ROOT, 'assets/styles/critical.css'), criticalCss, 'utf8');
fs.writeFileSync(path.join(ROOT, 'assets/styles/rest.css'), restCss, 'utf8');

// 同步 index.html：内联 critical，rest 用 media 技巧异步加载
const htmlPath = path.join(ROOT, 'index.html');
let html = fs.readFileSync(htmlPath, 'utf8');

html = html.replace(/<style id="critical">[\s\S]*?<\/style>/, '<style id="critical">\n' + criticalCss + '</style>');
if (!html.includes('<style id="critical">')) {
  html = html.replace(/<link rel="stylesheet" href="\.\/assets\/styles\/bundle\.css[^>]*>/, '');
  html = html.replace('</head>', '  <style id="critical">\n' + criticalCss + '</style>\n</head>');
}
// 保留已有的 ?v= 版本戳（没有才用 stamp0），避免每次构建都改写 index.html
const stampMatch = html.match(/rest\.css\?v=([a-z0-9]+)/);
const stamp = stampMatch ? stampMatch[1] : 'stamp0';
html = html.replace(/<link rel="stylesheet" href="\.\/assets\/styles\/rest\.css[^>]*>/, '');
// 关键样式必须在前、功能样式在后，否则 components.css 会盖掉 pages/editor 的同类规则（层叠反了）
const critOpen = html.indexOf('<style id="critical">');
const critClose = html.indexOf('</style>', critOpen);
if (critOpen >= 0 && critClose > critOpen) {
  html = html.slice(0, critClose + 8) +
    '\n  <link rel="stylesheet" href="./assets/styles/rest.css?v=' + stamp + '" media="print" onload="this.media=\'all\'">' +
    html.slice(critClose + 8);
}

fs.writeFileSync(htmlPath, html, 'utf8');
console.log('critical ' + Math.round(criticalCss.length / 1024) + 'KB 内联；rest ' + Math.round(restCss.length / 1024) + 'KB 非阻塞');
