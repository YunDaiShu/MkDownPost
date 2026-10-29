/* src/pages/article.js — 文章详情：Markdown 渲染 + 侧边 TOC + 阅读进度 + 上下篇 */
import { renderMarkdown } from '../markdown/renderer.js?v=vmvtgoo76';
import { buildTOC } from '../markdown/toc.js?v=vmvtgoo76';
import { toast } from '../components/theme-switcher.js?v=vmvtgoo76';
import { streamReveal } from '../components/cc-fx.js?v=vmvtgoo76';

export default async function render(root, params) {
  const slug = params.slug;
  root.innerHTML = '<p class="muted">加载中…</p>';

  let index = [];
  try { index = await (await fetch('./content-index.json')).json(); } catch { index = []; }
  const i = index.findIndex((a) => a.slug === slug);
  const meta = index[i];

  if (!meta) {
    root.innerHTML = `<div class="empty-state">
      <svg viewBox="0 0 80 80" width="80" height="80" fill="none" stroke="currentColor" stroke-width="2"><circle cx="34" cy="34" r="18"/><path d="M48 48l14 14" stroke-linecap="round"/></svg>
      <h1>没有这篇文章</h1><p class="muted">它可能已被移除，或链接有误。</p>
      <a class="btn btn--primary" href="#/">回首页</a></div>`;
    return;
  }

  let md = '';
  try { md = await (await fetch('./content/' + slug + '.md')).text(); }
  catch { md = '# ' + meta.title + '\n\n内容加载失败，请检查 content/' + slug + '.md 是否存在。'; }

  const out = renderMarkdown(md, { onCopy: toast });
  const prev = index[i - 1], next = index[i + 1];

  root.innerHTML = `
    <div class="readbar"><span class="readbar__fill" id="readFill"></span></div>
    <div class="article">
      <article class="article__main">
        <nav class="crumbs" aria-label="面包屑"><a href="#/">首页</a><span>›</span><span class="crumbs__cur">${meta.title}</span></nav>
        <h1 class="article__title">${meta.title}</h1>
        <p class="article__meta"><a href="#/editor" id="openInEditor">在编辑器中打开</a> · ${meta.date || ''} · ${(meta.tags || []).join(' / ')} · ${meta.readingTime || 3} 分钟</p>
        <div class="article__body" id="articleBody"></div>
        <nav class="article__nav" aria-label="上下篇">
          ${prev ? '<a class="btn" href="#/article/' + prev.slug + '">‹ ' + prev.title + '</a>' : '<span></span>'}
          ${next ? '<a class="btn" href="#/article/' + next.slug + '">' + next.title + ' ›</a>' : '<span></span>'}
        </nav>
      </article>
      <aside class="article__side"><div class="toc" id="tocHost"></div></aside>
    </div>`;

  // 挂真实元素（保留事件与异步装饰），而不是 innerHTML
  // deDupTitle：正文首个 h1 与页面标题一致时移除，避免同一标题出现两次
  const bodyEl = out.element;
  const firstH1 = bodyEl.querySelector('h1');
  if (firstH1 && firstH1.textContent.trim().replace(/#/g, '').trim() === String(meta.title).trim()) firstH1.remove();
  root.querySelector('#articleBody').appendChild(bodyEl);

  const openBtn = root.querySelector('#openInEditor');
  if (openBtn) openBtn.addEventListener('click', (e) => {
    e.preventDefault();
    try { localStorage.setItem('mdp:v1:draft', JSON.stringify({ text: md, updatedAt: Date.now() })); } catch {}
    location.hash = '#/editor';
  });

  streamReveal(out.element, { step: 22 });

  buildTOC(out.headings, root.querySelector('#tocHost'), { onNavigate: () => {} });

  const fill = root.querySelector('#readFill');
  const onScroll = () => {
    const h = document.documentElement;
    const p = h.scrollTop / Math.max(1, h.scrollHeight - h.clientHeight);
    fill.style.width = Math.round(p * 100) + '%';
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
}
