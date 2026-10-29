/* tools/bundle-css.mjs — 拆成 critical（内联进 HTML）+ rest（非阻塞加载）
   目的：首屏不再被 160KB+ 的样式表阻塞，关键样式直接内联 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const CRITICAL = ['tokens.css', 'base.css', 'layout.css', 'components.css'];
const REST = ['themes.css', 'themes.generated.css', 'markdown.css', 'editor.css', 'pages.css', 'cc-fx.css'];

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
html = html.replace(/<link rel="stylesheet" href="\.\/assets\/styles\/rest\.css[^>]*>/, '');
html = html.replace('<style id="critical">', '<link rel="stylesheet" href="./assets/styles/rest.css?v=stamp0" media="print" onload="this.media=\'all\'">\n  <style id="critical">');

fs.writeFileSync(htmlPath, html, 'utf8');
console.log('critical ' + Math.round(criticalCss.length / 1024) + 'KB 内联；rest ' + Math.round(restCss.length / 1024) + 'KB 非阻塞');
