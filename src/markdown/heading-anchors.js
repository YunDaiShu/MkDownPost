/* src/markdown/heading-anchors.js — 标题 id、悬停锚点、复制链接 */

const slugify = (s) => String(s).trim().toLowerCase()
  .replace(/[\s]+/g, '-')
  .replace(/[^\w\u4e00-\u9fa5-]/g, '')
  .replace(/-+/g, '-') || 'section';

export function decorateHeadings(root, { copy } = {}) {
  const used = new Map();
  const headings = [];
  root.querySelectorAll('h1,h2,h3,h4').forEach((h) => {
    let id = h.id || slugify(h.textContent);
    const n = used.get(id) || 0;
    used.set(id, n + 1);
    if (n) id = id + '-' + (n + 1);
    h.id = id;

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'md-anchor';
    btn.setAttribute('aria-label', '复制本节链接');
    btn.textContent = '#';
    btn.addEventListener('click', () => {
      const url = location.origin + location.pathname + location.search + '#' + id;
      if (navigator.clipboard) navigator.clipboard.writeText(url).then(() => copy && copy('已复制链接'), () => copy && copy('复制失败'));
      history.replaceState(null, '', '#' + id);
    });
    h.appendChild(btn);

    headings.push({ level: Number(h.tagName.slice(1)), text: h.textContent.replace('#', '').trim(), id });
  });
  return headings;
}
