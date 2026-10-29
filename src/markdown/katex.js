/* src/markdown/katex.js — KaTeX：行内 $...$ / 块级 $$...$$；库缺失或失败时保留原文 */

let loading = null;
function loadKatex() {
  if (window.katex) return Promise.resolve(window.katex);
  if (loading) return loading;
  loading = new Promise((resolve) => {
    const css = document.createElement('link');
    css.rel = 'stylesheet';
    css.href = './vendor/katex/katex.min.css';
    document.head.appendChild(css);
    const s = document.createElement('script');
    s.src = './vendor/katex/katex.min.js';
    s.onload = () => resolve(window.katex || null);
    s.onerror = () => resolve(null);
    document.head.appendChild(s);
  });
  return loading;
}

const INLINE = /\$([^$\n]+)\$/g;
const BLOCK = /\$\$([\s\S]+?)\$\$/g;

export function upgradeMath(root) {
  const text = root.textContent || '';
  if (text.indexOf('$') === -1) return;

  loadKatex().then((katex) => {
    if (!katex) return; // 失败不阻断正文，保留原始 $...$
    root.querySelectorAll('p, li, td, blockquote').forEach((el) => {
      if (el.querySelector('code, pre')) return;
      let html = el.innerHTML;
      let touched = false;
      html = html.replace(BLOCK, (m, expr) => {
        try { touched = true; return katex.renderToString(expr, { displayMode: true, throwOnError: false }); }
        catch { return m; }
      });
      html = html.replace(INLINE, (m, expr) => {
        try { touched = true; return katex.renderToString(expr, { displayMode: false, throwOnError: false }); }
        catch { return m; }
      });
      if (touched) el.innerHTML = html;
    });
  });
}
