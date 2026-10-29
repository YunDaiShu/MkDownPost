/* src/pages/articles.js — 全部内容：按 content-index.json 顺序列出所有文章 */
const el = (tag, cls, text) => {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text !== undefined) n.textContent = text;
  return n;
};

function card(a) {
  const c = el('a', 'card');
  c.href = '#/article/' + a.slug;
  c.appendChild(el('h3', 'card__title', a.title || a.slug));
  if (a.excerpt) c.appendChild(el('p', 'card__desc', a.excerpt));
  const meta = [(a.tags || []).join(' · '), (a.readingTime || 3) + ' 分钟'].filter(Boolean).join(' · ');
  c.appendChild(el('p', 'card__meta', meta));
  return c;
}

export default async function render(root) {
  let index = [];
  try { index = await (await fetch('./content-index.json?c=vmvtkyvi2')).json(); } catch { index = []; }

  root.replaceChildren();
  const sec = el('section', 'section');
  const head = el('div', 'section__head');
  const back = el('a', 'section__more', '回到首页 →');
  back.href = '#/';
  head.append(el('h2', 'section__title', '全部内容（' + index.length + ' 篇）'), back);

  // 与主题库一致：搜索框 + 分组胶囊 + 卡片网格
  const tools = el('div', 'theme-tools');
  const search = document.createElement('input');
  search.className = 'theme-search';
  search.type = 'search';
  search.placeholder = '搜索标题或标签…';
  search.setAttribute('aria-label', '搜索文章');

  const bar = el('div', 'theme-groups');
  bar.setAttribute('role', 'group');
  bar.setAttribute('aria-label', '按标签筛选');

  const grid = el('div', 'cards');
  const state = { tag: 'all', q: '' };

  const tags = ['all', ...new Set(index.flatMap((a) => a.tags || []))];
  tags.forEach((t) => {
    const n = t === 'all' ? index.length : index.filter((a) => (a.tags || []).includes(t)).length;
    const b = el('button', 'tsw__chip' + (t === 'all' ? ' is-on' : ''), (t === 'all' ? '全部' : t) + ' ' + n);
    b.type = 'button';
    b.dataset.tag = t;
    b.setAttribute('aria-pressed', String(t === 'all'));
    b.addEventListener('click', () => { state.tag = t; paint(); });
    bar.appendChild(b);
  });

  function paint() {
    const q = state.q.trim().toLowerCase();
    const list = index.filter((a) => {
      const okTag = state.tag === 'all' || (a.tags || []).includes(state.tag);
      const okQ = !q || (a.title + ' ' + a.slug + ' ' + (a.excerpt || '') + ' ' + (a.tags || []).join(' ')).toLowerCase().includes(q);
      return okTag && okQ;
    });
    grid.replaceChildren();
    if (!list.length) grid.appendChild(el('p', 'muted', '没有匹配的内容。'));
    list.forEach((a) => grid.appendChild(card(a)));
    bar.querySelectorAll('.tsw__chip').forEach((b) => {
      const on = b.dataset.tag === state.tag;
      b.classList.toggle('is-on', on);
      b.setAttribute('aria-pressed', String(on));
    });
    count.textContent = '显示 ' + list.length + ' / ' + index.length + ' 篇';
  }

  const count = el('p', 'muted');
  search.addEventListener('input', () => { state.q = search.value; paint(); });

  tools.append(search, bar);
  paint();
  sec.append(head, tools, count, grid);
  root.append(sec);
}
