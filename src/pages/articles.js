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
  try { index = await (await fetch('./content-index.json?c=vmvtku1jt')).json(); } catch { index = []; }

  root.replaceChildren();
  const sec = el('section', 'section');
  const head = el('div', 'section__head');
  const back = el('a', 'section__more', '回到首页 →');
  back.href = '#/';
  head.append(el('h2', 'section__title', '全部内容（' + index.length + ' 篇）'), back);

  // 按标签分组筛选条
  const tags = ['全部', ...new Set(index.flatMap((a) => a.tags || []))];
  const bar = el('div', 'chips');
  const grid = el('div', 'cards cards--wide');

  const paint = (tag) => {
    grid.replaceChildren();
    const list = tag === '全部' ? index : index.filter((a) => (a.tags || []).includes(tag));
    list.forEach((a) => grid.appendChild(card(a)));
    bar.querySelectorAll('.chip').forEach((b) => b.classList.toggle('is-on', b.dataset.tag === tag));
  };

  tags.forEach((t) => {
    const b = el('button', 'chip', t === '全部' ? '全部 ' + index.length : t);
    b.type = 'button';
    b.dataset.tag = t;
    b.addEventListener('click', () => paint(t));
    bar.appendChild(b);
  });

  paint('全部');
  sec.append(head, bar, grid);
  root.append(sec);
}
