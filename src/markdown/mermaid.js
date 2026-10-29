/* src/markdown/mermaid.js — Mermaid 懒加载：进入视口才渲染；失败降级为源码 + 提示 */

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

export function upgradeMermaid(root) {
  const blocks = Array.from(root.querySelectorAll('code.language-mermaid, code.language-mm'));
  blocks.forEach((code, i) => {
    const pre = code.parentElement;
    const wrap = document.createElement('div');
    wrap.className = 'md-mermaid';
    wrap.innerHTML = '<div class="md-mermaid__ph">Mermaid 图表（滚动到可见区域时渲染）</div>';
    pre.replaceWith(wrap);

    const io = new IntersectionObserver(async (entries) => {
      if (!entries.some((e) => e.isIntersecting)) return;
      io.disconnect();
      const mermaid = await loadMermaid();
      if (!mermaid) {
        wrap.innerHTML = '<pre class="md-mermaid__src"><code>' + code.textContent.replace(/[<>&]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c])) + '</code></pre>' +
          '<p class="md-mermaid__err">图表库未加载（可执行 node tools/vendor.mjs 下载 mermaid），以上为源码</p>';
        return;
      }
      try {
        const { svg } = await mermaid.render('mmd' + i + '_' + Date.now(), code.textContent);
        wrap.innerHTML = svg;
      } catch (err) {
        wrap.innerHTML = '<pre class="md-mermaid__src"><code>' + code.textContent + '</code></pre>' +
          '<p class="md-mermaid__err">图表渲染失败：' + String(err && err.message || err).slice(0, 120) + '</p>';
      }
    }, { threshold: 0.1 });
    io.observe(wrap);
  });
}
