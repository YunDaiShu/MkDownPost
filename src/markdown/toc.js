/* src/markdown/toc.js — 自动目录：折叠、当前章节高亮、平滑滚动 */

export function buildTOC(headings, host, { onNavigate } = {}) {
  if (!host) return;
  if (!headings.length) { host.hidden = true; return; }
  host.hidden = false;

  const list = headings.filter((h) => h.level >= 2 && h.level <= 4);
  host.innerHTML = '<div class="toc__head"><span class="toc__title">本页目录</span>' +
    '<button class="toc__toggle" type="button" aria-expanded="true">收起</button></div>' +
    '<ul class="toc__list">' + list.map((h) =>
      '<li class="toc__item toc__item--l' + h.level + '"><a href="#' + h.id + '">' + h.text + '</a></li>').join('') +
    '</ul>';

  const toggle = host.querySelector('.toc__toggle');
  const ul = host.querySelector('.toc__list');
  toggle.addEventListener('click', () => {
    const open = toggle.getAttribute('aria-expanded') === 'true';
    toggle.setAttribute('aria-expanded', open ? 'false' : 'true');
    toggle.textContent = open ? '展开' : '收起';
    ul.hidden = open;
  });

  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  host.querySelectorAll('a[href^="#"]').forEach((a) => {
    a.addEventListener('click', (e) => {
      const el = document.getElementById(a.getAttribute('href').slice(1));
      if (!el) return;
      e.preventDefault();
      el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
      onNavigate && onNavigate();
    });
  });

  const links = new Map(list.map((h) => [h.id, host.querySelector('a[href="#' + h.id + '"]')]));
  const io = new IntersectionObserver((entries) => {
    entries.forEach((en) => {
      const link = links.get(en.target.id);
      if (!link) return;
      link.classList.toggle('is-active', en.isIntersecting);
    });
  }, { rootMargin: '-20% 0px -70% 0px' });
  headings.forEach((h) => { const el = document.getElementById(h.id); if (el) io.observe(el); });
}
