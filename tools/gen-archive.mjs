/* tools/gen-archive.mjs — 把 content-index.json 渲染成首页的「全部文章」链接列表
   写进 index.html 的 archive:start / archive:end 标记之间，保证静态 HTML 里就有全部内链。 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const index = JSON.parse(fs.readFileSync(path.join(ROOT, 'content-index.json'), 'utf8'));
const htmlPath = path.join(ROOT, 'index.html');
let html = fs.readFileSync(htmlPath, 'utf8');

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const groups = new Map();
for (const a of index) {
  const tag = (a.tags && a.tags[0]) || '其他';
  if (!groups.has(tag)) groups.set(tag, []);
  groups.get(tag).push(a);
}

let list = '<div class="archive">';
for (const [tag, items] of groups) {
  list += '<div class="archive__group"><h3 class="archive__tag">' + esc(tag) + '</h3><ul class="archive__list">';
  for (const a of items) {
    list += '<li><a href="/MkDownPost/a/' + a.slug + '.html">' + esc(a.title) + '</a></li>';
  }
  list += '</ul></div>';
}
list += '</div>';

const start = '<!-- archive:start -->';
const end = '<!-- archive:end -->';
const i = html.indexOf(start);
const j = html.indexOf(end);
if (i < 0 || j < 0) {
  console.error('index.html 里找不到 archive 标记');
  process.exit(1);
}
html = html.slice(0, i + start.length) + '\n' + list + '\n      ' + html.slice(j);
html = html.replace(/<span id="archiveCount">\d+<\/span>/, '<span id="archiveCount">' + index.length + '</span>');
fs.writeFileSync(htmlPath, html, 'utf8');
console.log('归档已生成：' + index.length + ' 篇，' + groups.size + ' 个分组');
