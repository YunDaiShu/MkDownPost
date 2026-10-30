/* tools/check-artifacts.mjs — 校验构建产物是否与源文件一致（不使用 git diff，避免时间戳抖动）
   检查项：
   1. assets/styles/critical.css  == tokens+base+layout+components 拼接
   2. assets/styles/rest.css      == themes+themes.generated+markdown+editor+pages+cc-fx 拼接
   3. index.html 内联的 <style id="critical"> 与 critical.css 内容一致
   4. a/ 下静态页数量 == content-index.json 条目数
   5. sitemap.xml 的 URL 数 == 文章数 + 1
   6. sitemap.txt 行数与 sitemap.xml 一致
   运行：node tools/check-artifacts.mjs
*/
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const S = path.join(ROOT, 'assets/styles');
const CRITICAL = ['tokens.css', 'base.css', 'layout.css', 'components.css'];
const REST = ['themes.css', 'themes.generated.css', 'markdown.css', 'editor.css', 'pages.css', 'cc-fx.css'];

const read = (f) => '/* ===== ' + f + ' ===== */\n' + fs.readFileSync(path.join(S, f), 'utf8').trimEnd() + '\n';
const expectCritical = CRITICAL.map(read).join('\n');
const expectRest = REST.map(read).join('\n');

const problems = [];
const same = (a, b) => a.replace(/\r\n/g, '\n').trim() === b.replace(/\r\n/g, '\n').trim();

if (!fs.existsSync(path.join(S, 'critical.css'))) problems.push('缺少 critical.css');
else if (!same(fs.readFileSync(path.join(S, 'critical.css'), 'utf8'), expectCritical)) problems.push('critical.css 与源文件不一致，请运行 node tools/bundle-css.mjs');

if (!fs.existsSync(path.join(S, 'rest.css'))) problems.push('缺少 rest.css');
else if (!same(fs.readFileSync(path.join(S, 'rest.css'), 'utf8'), expectRest)) problems.push('rest.css 与源文件不一致，请运行 node tools/bundle-css.mjs');

const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const inlineMatch = html.match(/<style id="critical">([\s\S]*?)<\/style>/);
if (!inlineMatch) problems.push('index.html 缺少内联 <style id="critical">，请运行 node tools/bundle-css.mjs');
else if (!same(inlineMatch[1], expectCritical)) problems.push('index.html 内联关键样式与 critical.css 不一致，请运行 node tools/bundle-css.mjs');

const index = JSON.parse(fs.readFileSync(path.join(ROOT, 'content-index.json'), 'utf8'));
const pagesDir = path.join(ROOT, 'a');
const pages = fs.existsSync(pagesDir) ? fs.readdirSync(pagesDir).filter((f) => f.endsWith('.html')) : [];
if (pages.length !== index.length) problems.push('a/ 静态页 ' + pages.length + ' 个，与文章数 ' + index.length + ' 不符，请运行 node tools/build-seo.mjs');

const missingPages = index.filter((a) => !pages.includes(a.slug + '.html')).map((a) => a.slug);
if (missingPages.length) problems.push('缺少静态页：' + missingPages.slice(0, 5).join(', '));

if (!fs.existsSync(path.join(ROOT, 'sitemap.xml'))) problems.push('缺少 sitemap.xml');
else {
  const sm = fs.readFileSync(path.join(ROOT, 'sitemap.xml'), 'utf8');
  const n = (sm.match(/<url>/g) || []).length;
  if (n !== index.length + 1) problems.push('sitemap.xml URL 数 ' + n + '，应为文章数+1 = ' + (index.length + 1) + '，请运行 node tools/build-seo.mjs');
  if (/<loc>[^<]*#/.test(sm)) problems.push('sitemap.xml 含带 # 的 URL（规范不允许）');
  const today = new Date().toISOString().slice(0, 10);
  if (/<lastmod>(?!\d{4}-\d{2}-\d{2})/.test(sm)) problems.push('sitemap.xml 的 lastmod 格式错误');
  if (new RegExp('<lastmod>(?:(?!' + today + ')\\d{4}-\\d{2}-\\d{2})[^<]*</lastmod>').test('') ) { /* noop */ }
}

if (!fs.existsSync(path.join(ROOT, 'sitemap.txt'))) problems.push('缺少 sitemap.txt');
else {
  const lines = fs.readFileSync(path.join(ROOT, 'sitemap.txt'), 'utf8').split('\n').filter((l) => l.trim());
  if (lines.length !== index.length + 1) problems.push('sitemap.txt 行数 ' + lines.length + '，应为 ' + (index.length + 1));
}

if (problems.length) {
  problems.forEach((p) => console.log('✗ ' + p));
  console.log('产物校验失败（' + problems.length + ' 项）');
  process.exit(1);
}
console.log('PASS：构建产物与源文件一致（critical / rest / 内联样式 / ' + pages.length + ' 个静态页 / sitemap）');
