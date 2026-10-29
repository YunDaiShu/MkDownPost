/* src/markdown/mermaid.js — Mermaid：点击才渲染（不自动加载 3.3MB 包），失败降级为源码 */

let loading = null;
function loadMermaid() {
  if (window.mermaid) return Promise.resolve(window.mermaid);
  if (loading) return loading;
  loading = new Promise((resolve) => {
    const s = document.createElement('script');
    s.src = './vendor/mermaid.min.js';
    s.onload = () => {
      try { window.mermaid.initialize({ startOnLoad: false, theme: 'default', securityLevel: 'strict' }); } catch { /* 忽略 */ }
      resolve(window.mermaid || null);
    };
    s.onerror = () => resolve(null);
    document.head.appendChild(s);
  });
  return loading;
}

const esc = (s) => String(s).replace(/[<>&]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c]));

export function upgradeMermaid(root) {
  root.querySelectorAll('code.language-mermaid, code.language-mm').forEach((code, i) => {
    const pre = code.parentElement;
    const src = code.textContent;

    const wrap = document.createElement('div');
    wrap.className = 'md-mermaid';
    wrap.innerHTML =
      '<div class="md-mermaid__bar">' +
      '<span class="md-mermaid__label">Mermaid 图表</span>' +
      '<button class="md-mermaid__btn" type="button">渲染图表</button>' +
      '</div>' +
      '<pre class="md-mermaid__src"><code>' + esc(src) + '</code></pre>';

    pre.replaceWith(wrap);

    const btn = wrap.querySelector('.md-mermaid__btn');
    btn.addEventListener('click', async () => {
      btn.disabled = true;
      btn.textContent = '渲染中…';
      const mermaid = await loadMermaid();
      if (!mermaid) {
        wrap.querySelector('.md-mermaid__src').insertAdjacentHTML('afterend',
          '<p class="md-mermaid__err">图表库未加载（可运行 node tools/vendor.mjs 下载），以上为源码</p>');
        btn.textContent = '无法渲染';
        return;
      }
      try {
        const { svg } = await mermaid.render('mmd' + i + '_' + Date.now(), src);
        wrap.querySelector('.md-mermaid__src').outerHTML = '<div class="md-mermaid__svg">' + svg + '</div>';
        btn.remove();
      } catch (err) {
        wrap.querySelector('.md-mermaid__src').insertAdjacentHTML('afterend',
          '<p class="md-mermaid__err">渲染失败：' + String((err && err.message) || err).slice(0, 120) + '</p>');
        btn.disabled = false;
        btn.textContent = '重试';
      }
    });
  });
}
