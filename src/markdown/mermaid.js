/* src/markdown/mermaid.js — Mermaid：空闲预加载 + 进度反馈 + 超时降级
   3.3MB 的包不适合阻塞首屏：页面空闲时后台拉取，用户点「渲染图表」时通常已命中缓存。 */

const SRC = './vendor/mermaid.min.js';
let loading = null;
let cachedUrl = null;

function injectScript(url) {
  return new Promise((resolve) => {
    const s = document.createElement('script');
    s.src = url;
    s.onload = () => {
      try { window.mermaid.initialize({ startOnLoad: false, theme: 'default', securityLevel: 'strict' }); } catch { /* 忽略 */ }
      resolve(window.mermaid || null);
    };
    s.onerror = () => resolve(null);
    document.head.appendChild(s);
  });
}

/** 带进度地加载（onProgress 0~1），成功后用 blob URL 注入并缓存 */
export function preloadMermaid(onProgress) {
  if (window.mermaid) return Promise.resolve(window.mermaid);
  if (loading) return loading;

  loading = (async () => {
    try {
      const res = await fetch(SRC);
      if (!res.ok) return null;
      const total = Number(res.headers.get('content-length') || 0);
      const reader = res.body && res.body.getReader ? res.body.getReader() : null;
      let buf;
      if (reader) {
        const chunks = [];
        let got = 0;
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          chunks.push(value);
          got += value.length;
          if (onProgress) onProgress(total ? got / total : Math.min(0.95, got / 3400000));
        }
        buf = new Blob(chunks, { type: 'text/javascript' });
      } else {
        buf = new Blob([await res.text()], { type: 'text/javascript' });
      }
      cachedUrl = URL.createObjectURL(buf);
      return await injectScript(cachedUrl);
    } catch {
      return null;
    }
  })();
  return loading;
}

/** 页面空闲时后台预取，避免用户点击后才等 40 秒 */
export function warmUpMermaid(hasMermaid) {
  if (!hasMermaid) return;
  // 3.3MB 会挤占带宽：延迟 12s 且仅在空闲时预取，保证 KaTeX / 高亮等小库先加载
  setTimeout(() => {
    const idle = window.requestIdleCallback || ((cb) => setTimeout(cb, 500));
    idle(() => { preloadMermaid(); }, { timeout: 5000 });
  }, 12000);
}

const esc = (s) => String(s).replace(/[<>&]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c]));

export function upgradeMermaid(root) {
  const codes = root.querySelectorAll('code.language-mermaid, code.language-mm');
  if (codes.length) warmUpMermaid(true);

  codes.forEach((code, i) => {
    const pre = code.parentElement;
    const src = code.textContent;

    const wrap = document.createElement('div');
    wrap.className = 'md-mermaid';
    wrap.innerHTML =
      '<div class="md-mermaid__bar">' +
      '<span class="md-mermaid__label">Mermaid 图表 · 3.3MB 按需加载</span>' +
      '<button class="md-mermaid__btn" type="button">渲染图表</button>' +
      '</div>' +
      '<pre class="md-mermaid__src"><code>' + esc(src) + '</code></pre>';

    pre.replaceWith(wrap);
    const btn = wrap.querySelector('.md-mermaid__btn');

    btn.addEventListener('click', async () => {
      btn.disabled = true;
      const t0 = Date.now();
      const tick = setInterval(() => {
        const s = Math.round((Date.now() - t0) / 1000);
        btn.textContent = '加载中… ' + s + 's';
      }, 500);

      const timer = setTimeout(() => { if (!window.mermaid) loading = null; }, 90000);
      const mermaid = await preloadMermaid((p) => { btn.textContent = '加载中… ' + Math.round(p * 100) + '%'; });
      clearInterval(tick); clearTimeout(timer);

      if (!mermaid) {
        btn.disabled = false;
        btn.textContent = '重试';
        if (!wrap.querySelector('.md-mermaid__err')) {
          wrap.querySelector('.md-mermaid__src').insertAdjacentHTML('afterend',
            '<p class="md-mermaid__err">图表库未就绪（体积 3.3MB，网络慢时需等待）。源码已保留在上方。</p>');
        }
        return;
      }
      try {
        const { svg } = await mermaid.render('mmd' + i + '_' + Date.now(), src);
        wrap.querySelector('.md-mermaid__src').outerHTML = '<div class="md-mermaid__svg">' + svg + '</div>';
        btn.remove();
      } catch (err) {
        btn.disabled = false;
        btn.textContent = '重试';
        wrap.querySelector('.md-mermaid__src').insertAdjacentHTML('afterend',
          '<p class="md-mermaid__err">渲染失败：' + String((err && err.message) || err).slice(0, 120) + '</p>');
      }
    });
  });
}
