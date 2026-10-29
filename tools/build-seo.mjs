/* tools/build-seo.mjs — 静态化与 SEO 构建（零依赖）
   产出：
   1. a/<slug>.html     每篇文章的独立静态页（可被搜索引擎单独收录）
   2. sitemap.xml       站点地图
   3. robots.txt        爬虫规则 + sitemap 指向
   4. feed.xml          RSS 2.0
   5. 在 index.html 注入 og:image 与 JSON-LD（SoftwareApplication）
   运行：node tools/build-seo.mjs
*/
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const SITE = 'https://yundaishu.github.io/MkDownPost';
const BRAND = 'MkDownPost · 码稿';
const OG_IMAGE = SITE + '/assets/img/og.png';

/* ---------- 载入 marked（复用本地 vendor，不联网） ---------- */
const markedSrc = fs.readFileSync(path.join(ROOT, 'vendor/marked.min.js'), 'utf8');
const shim = { exports: {} };
new Function('module', 'exports', markedSrc + '\n;return module.exports;')(shim, shim.exports);
const marked = shim.exports.marked || shim.exports;
const md2html = (md) => marked.parse(md, { gfm: true, breaks: false });

/* ---------- 读取索引与正文 ---------- */
const index = JSON.parse(fs.readFileSync(path.join(ROOT, 'content-index.json'), 'utf8'));
const critical = fs.readFileSync(path.join(ROOT, 'assets/styles/critical.css'), 'utf8');
const restUrl = '/assets/styles/rest.css';
const markdownCss = fs.readFileSync(path.join(ROOT, 'assets/styles/markdown.css'), 'utf8');

const esc = (s) => String(s || '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const date = (s) => (s && /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : '2026-10-01');

/* ---------- 1. 静态文章页 ---------- */
const outDir = path.join(ROOT, 'a');
fs.rmSync(outDir, { recursive: true, force: true });
fs.mkdirSync(outDir, { recursive: true });

let built = 0;
for (const a of index) {
  const mdPath = path.join(ROOT, 'content', a.slug + '.md');
  if (!fs.existsSync(mdPath)) continue;
  const md = fs.readFileSync(mdPath, 'utf8');
  let body = md2html(md);
  // 去掉正文里的首个 h1（页面已用 article__title 呈现）
  body = body.replace(/^\s*<h1[^>]*>[\s\S]*?<\/h1>/, '');

  // 相关文章：优先同标签，不足 5 篇用其他文章补齐（保证静态页之间有内链）
  const sameTag = index.filter((x) => x.slug !== a.slug && (x.tags || []).some((t) => (a.tags || []).includes(t)));
  const related = sameTag.concat(index.filter((x) => x.slug !== a.slug && !sameTag.includes(x))).slice(0, 5);
  const url = SITE + '/a/' + a.slug + '.html';

  const jsonld = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: a.title,
    description: a.excerpt || a.title,
    datePublished: date(a.date),
    dateModified: date(a.date),
    inLanguage: 'zh-CN',
    author: { '@type': 'Person', name: 'YunDaiShu', url: 'https://github.com/YunDaiShu' },
    publisher: { '@type': 'Organization', name: BRAND },
    mainEntityOfPage: { '@type': 'WebPage', '@id': url },
    keywords: (a.tags || []).join(',')
  };

  const html = `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="msvalidate.01" content="C30BA0BC89F9D292D21F191114015D76">
<title>${esc(a.title)} · ${esc(BRAND)}</title>
<meta name="description" content="${esc(a.excerpt || a.title)}">
<link rel="canonical" href="${url}">
<meta property="og:type" content="article">
<meta property="og:title" content="${esc(a.title)}">
<meta property="og:description" content="${esc(a.excerpt || a.title)}">
<meta property="og:url" content="${url}">
<meta property="og:image" content="${OG_IMAGE}">
<meta property="article:published_time" content="${date(a.date)}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(a.title)}">
<meta name="twitter:description" content="${esc(a.excerpt || a.title)}">
<meta name="twitter:image" content="${OG_IMAGE}">
<script type="application/ld+json">${JSON.stringify(jsonld)}</script>
<link rel="stylesheet" href="${restUrl}">
<style>${critical}</style>
<style>
.article-wrap { max-width: 760px; margin: 0 auto; padding: 40px 20px 80px; }
.article-title { font-size: 32px; line-height: 1.3; margin: 0 0 12px; }
.article-meta { color: #6b7280; font-size: 13px; margin-bottom: 32px; }
.article-meta a { color: inherit; }
.related { margin-top: 56px; padding-top: 20px; border-top: 1px solid #e5e7eb; }
.related h2 { font-size: 15px; margin: 0 0 12px; color: #374151; }
.related ul { list-style: none; padding: 0; margin: 0; }
.related li { padding: 6px 0; }
.backbar { display: flex; gap: 12px; align-items: center; padding: 12px 20px; border-bottom: 1px solid #e5e7eb; font-size: 14px; }
.backbar a { color: #2563eb; text-decoration: none; }
${markdownCss}
</style>
</head>
<body>
<div class="backbar"><a href="/MkDownPost/">← 回到 MkDownPost</a><a href="/MkDownPost/#/article/${a.slug}">在编辑器中打开</a></div>
<main class="article-wrap markdown-body">
<h1 class="article-title">${esc(a.title)}</h1>
<p class="article-meta">${esc((a.tags || []).join(' · '))} · ${a.readingTime || 5} 分钟 · ${date(a.date)}</p>
${body}
${related.length ? '<nav class="related"><h2>相关文章</h2><ul>' + related.map((r) => '<li><a href="/MkDownPost/a/' + r.slug + '.html">' + esc(r.title) + '</a></li>').join('') + '</ul></nav>' : ''}
</article>
</main>
</body>
</html>`;
  fs.writeFileSync(path.join(outDir, a.slug + '.html'), html, 'utf8');
  built++;
}

/* ---------- 2. sitemap.xml ---------- */
const today = new Date().toISOString().slice(0, 10);
/* 只收录"真实可访问、无 hash 片段"的 URL：
   hash 路由（/#/themes 等）不是独立页面，sitemap 规范禁止带 #，会导致整份被拒 */
const urls = [
  { loc: SITE + '/', pri: '1.0', freq: 'weekly' }
].concat(index.map((a) => ({ loc: SITE + '/a/' + a.slug + '.html', pri: '0.7', freq: 'monthly', lastmod: date(a.date) })));

const sitemap = '<?xml version="1.0" encoding="UTF-8"?>\n' +
  '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
  urls.map((u) => '  <url><loc>' + u.loc + '</loc><lastmod>' + (u.lastmod || today) + '</lastmod><changefreq>' + u.freq + '</changefreq><priority>' + u.pri + '</priority></url>').join('\n') +
  '\n</urlset>\n';
fs.writeFileSync(path.join(ROOT, 'sitemap.xml'), sitemap, 'utf8');

/* ---------- 3. robots.txt ---------- */
fs.writeFileSync(path.join(ROOT, 'robots.txt'),
  'User-agent: *\nAllow: /\n\nSitemap: ' + SITE + '/sitemap.xml\n', 'utf8');

/* ---------- 4. feed.xml（RSS 2.0，最近 30 篇） ---------- */
const items = index.slice(0, 30).map((a) => {
  const link = SITE + '/a/' + a.slug + '.html';
  return '    <item>\n' +
    '      <title>' + esc(a.title) + '</title>\n' +
    '      <link>' + link + '</link>\n' +
    '      <guid isPermaLink="true">' + link + '</guid>\n' +
    '      <pubDate>' + new Date(date(a.date) + 'T09:00:00+08:00').toUTCString() + '</pubDate>\n' +
    '      <description>' + esc(a.excerpt || a.title) + '</description>\n' +
    '      <category>' + esc((a.tags || [])[0] || '其他') + '</category>\n' +
    '    </item>';
}).join('\n');

fs.writeFileSync(path.join(ROOT, 'feed.xml'),
  '<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0">\n  <channel>\n' +
  '    <title>' + BRAND + '</title>\n' +
  '    <link>' + SITE + '/</link>\n' +
  '    <description>面向公众号、小黑盒、TapTap 创作者的 Markdown 写作与排版工作台</description>\n' +
  '    <language>zh-CN</language>\n' +
  '    <lastBuildDate>' + new Date().toUTCString() + '</lastBuildDate>\n' +
  items + '\n  </channel>\n</rss>\n', 'utf8');

/* ---------- 5. index.html 注入 og:image + JSON-LD ---------- */
const htmlPath = path.join(ROOT, 'index.html');
let html = fs.readFileSync(htmlPath, 'utf8');
const appLd = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'MkDownPost 码稿',
  applicationCategory: 'WritingApplication',
  operatingSystem: 'Web',
  url: SITE + '/',
  description: '面向公众号、小黑盒、TapTap 创作者的 Markdown 写作与排版工作台：100 套主题、9 个平台适配、导出 PDF/Word/PNG。',
  offers: { '@type': 'Offer', price: '0', priceCurrency: 'CNY' },
  author: { '@type': 'Person', name: 'YunDaiShu', url: 'https://github.com/YunDaiShu' }
};
if (!html.includes('application/ld+json')) {
  html = html.replace('</head>', '  <script type="application/ld+json">' + JSON.stringify(appLd) + '</script>\n</head>');
}
if (!html.includes('property="og:image"')) {
  html = html.replace('<meta property="og:type" content="website" />',
    '<meta property="og:type" content="website" />\n  <meta property="og:url" content="' + SITE + '/" />\n  <meta property="og:image" content="' + OG_IMAGE + '" />\n  <meta name="twitter:image" content="' + OG_IMAGE + '" />');
}
if (!html.includes('rel="canonical"')) {
  html = html.replace('<meta name="description"', '<link rel="canonical" href="' + SITE + '/" />\n  <meta name="description"');
}
if (!html.includes('rel="alternate" type="application/rss+xml"')) {
  html = html.replace('</head>', '  <link rel="alternate" type="application/rss+xml" title="MkDownPost 更新" href="' + SITE + '/feed.xml" />\n</head>');
}
fs.writeFileSync(htmlPath, html, 'utf8');

console.log('静态页 ' + built + ' 篇；sitemap ' + urls.length + ' 条；feed ' + index.slice(0, 30).length + ' 条；robots + JSON-LD 完成');
