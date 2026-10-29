/* src/pages/articles.js — 全部内容：按主题分组折叠 + 搜索 */
const el = (tag, cls, text) => {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text !== undefined) n.textContent = text;
  return n;
};

/* 标签 → 分组（第一个命中的分组生效） */
const GROUPS = [
  { key: 'start', name: '入门与上手', tags: ['入门', '教程', '说明'], hint: '第一次来先看这几篇' },
  { key: 'syntax', name: 'Markdown 语法', tags: ['语法', '速查', '参考'], hint: '写法与坑' },
  { key: 'adv', name: '进阶与原理', tags: ['进阶', '规范', '原理', '公式', '图表', '排错'], hint: '解析器、标准、边界情况' },
  { key: 'theme', name: '主题与排版', tags: ['主题', '排版', '无障碍', '性能'], hint: '令牌、明暗、字号与间距' },
  { key: 'write', name: '写作方法', tags: ['方法', '自检'], hint: '从提纲到发布' },
  { key: 'platform', name: '平台与导出', tags: ['导出', '平台'], hint: '公众号、小黑盒、TapTap、PDF' },
  { key: 'site', name: '本站与 FAQ', tags: ['本站', '隐私', 'FAQ', '生态', '其他'], hint: '站点结构、存储、常见问题' }
];

function groupOf(a) {
  const tags = a.tags || [];
  for (const g of GROUPS) if (tags.some((t) => g.tags.includes(t))) return g.key;
  return 'site';
}

function card(a) {
  const c = el('a', 'card');
  c.href = '#/article/' + a.slug;
  c.appendChild(el('h3', 'card__title', a.title || a.slug));
  if (a.excerpt) c.appendChild(el('p', 'card__desc', a.excerpt));
  const meta = [(a.tags || []).slice(0, 2).join(' · '), (a.readingTime || 3) + ' 分钟'].filter(Boolean).join(' · ');
  c.appendChild(el('p', 'card__meta', meta));
  return c;
}

export default async function render(root) {
  let index = [];
  try { index = await (await fetch('./content-index.json?c=vmvtlpdi6')).json(); } catch { index = []; }

  root.replaceChildren();
  const sec = el('section', 'section');
  const head = el('div', 'section__head');
  const back = el('a', 'section__more', '回到首页 →');
  back.href = '#/';
  head.append(el('h1', 'section__title', '全部内容（' + index.length + ' 篇）'), back);

  const tools = el('div', 'theme-tools');
  const search = document.createElement('input');
  search.className = 'theme-search';
  search.type = 'search';
  search.placeholder = '搜索标题、摘要或标签…';
  search.setAttribute('aria-label', '搜索文章');
  tools.append(search);

  const count = el('p', 'muted');
  const wrap = el('div', 'article-groups');
  sec.append(head, tools, count, wrap);

  const paint = (q) => {
    const query = (q || '').trim().toLowerCase();
    wrap.replaceChildren();
    let shown = 0;

    GROUPS.forEach((g, gi) => {
      const list = index.filter((a) => groupOf(a) === g.key && (!query ||
        (a.title + ' ' + (a.excerpt || '') + ' ' + (a.tags || []).join(' ') + ' ' + a.slug).toLowerCase().includes(query)));
      if (!list.length) return;

      const details = document.createElement('details');
      details.className = 'article-group';
      details.open = !!query || gi === 0;      // 搜索时全展开；默认展开第一组

      const summary = document.createElement('summary');
      summary.className = 'article-group__head';
      summary.append(
        el('span', 'article-group__name', g.name),
        el('span', 'article-group__count', list.length + ' 篇'),
        el('span', 'article-group__hint', g.hint)
      );
      details.appendChild(summary);

      const grid = el('div', 'cards');
      list.forEach((a) => grid.appendChild(card(a)));
      details.appendChild(grid);
      wrap.appendChild(details);
      shown += list.length;
    });

    if (!shown) wrap.appendChild(el('p', 'muted', '没有匹配的内容。'));
    count.textContent = query ? '匹配 ' + shown + ' / ' + index.length + ' 篇' : '共 ' + index.length + ' 篇，分为 ' + GROUPS.length + ' 组';
  };

  search.addEventListener('input', () => paint(search.value));
  paint('');
  root.append(sec);
}
