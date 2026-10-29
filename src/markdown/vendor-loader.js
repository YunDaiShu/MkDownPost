/* src/markdown/vendor-loader.js — 渲染期依赖按需加载（首屏不加载 marked/highlight） */
const loaded = new Map();

function ensureScript(src, key) {
  if (typeof window === 'undefined') return Promise.resolve(false);
  if (loaded.has(key)) return loaded.get(key);
  const p = new Promise((resolve) => {
    if (document.querySelector('script[data-vendor="' + key + '"]')) { resolve(true); return; }
    const el = document.createElement('script');
    el.src = src;
    el.dataset.vendor = key;
    el.async = true;
    el.onload = () => resolve(true);
    el.onerror = () => resolve(false);
    document.head.appendChild(el);
  });
  loaded.set(key, p);
  return p;
}

export function ensureMarked() {
  if (typeof window.marked !== 'undefined' && window.marked && typeof window.marked.parse === 'function') return Promise.resolve(true);
  return ensureScript('./vendor/marked.min.js', 'marked');
}

export function ensureHighlight() {
  if (typeof window.hljs !== 'undefined') return Promise.resolve(true);
  return ensureScript('./vendor/highlight.min.js', 'hljs');
}

export function ensureRenderers() {
  return Promise.all([ensureMarked(), ensureHighlight()]);
}
