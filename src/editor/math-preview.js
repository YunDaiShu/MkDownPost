/* src/editor/math-preview.js — 光标落在 $...$ / $$...$$ 里时，实时用 KaTeX 预览该公式
   不侵入编辑区排版：以浮动小卡片呈现，Esc / 移出公式即隐藏。 */
import { loadKatex } from '../markdown/katex.js?v=vmvu7gd13';

const MATH = /(\$\$[\s\S]+?\$\$|\$[^$\n]+\$)/g;

function findMathAt(text, pos) {
  MATH.lastIndex = 0;
  let m;
  while ((m = MATH.exec(text))) {
    const start = m.index;
    const end = start + m[0].length;
    if (pos >= start && pos <= end) {
      return { raw: m[0], expr: m[0].replace(/^\$\$?|\$\$?$/g, '').trim(), display: m[0].startsWith('$$') };
    }
  }
  return null;
}

export function mountMathPreview(ta, host) {
  const card = document.createElement('div');
  card.className = 'math-preview';
  card.hidden = true;
  card.setAttribute('aria-live', 'polite');
  card.innerHTML = '<div class="math-preview__src"></div><div class="math-preview__body"></div>';
  host.appendChild(card);

  const srcEl = card.querySelector('.math-preview__src');
  const bodyEl = card.querySelector('.math-preview__body');
  let pending = 0;

  async function render() {
    const found = findMathAt(ta.value, ta.selectionStart);
    if (!found) { card.hidden = true; return; }
    srcEl.textContent = found.raw;
    card.hidden = false;                       // 先显示源码，避免"没反应"
    bodyEl.textContent = '公式库加载中…';
    const katex = await loadKatex();
    if (!katex) { bodyEl.textContent = '公式库未加载（可运行 node tools/vendor.mjs）'; return; }
    try {
      bodyEl.innerHTML = katex.renderToString(found.expr, { displayMode: found.display, throwOnError: false });
    } catch (e) {
      bodyEl.textContent = '公式语法有误';
    }
    card.hidden = false;
  }

  const schedule = () => {
    cancelAnimationFrame(pending);
    pending = requestAnimationFrame(render);
  };

  ta.addEventListener('keyup', schedule);
  ta.addEventListener('click', schedule);
  ta.addEventListener('input', schedule);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') card.hidden = true;
  });

  card.addEventListener('click', (e) => {
    if (e.target.closest('.math-preview__close')) card.hidden = true;
  });

  return { destroy: () => card.remove() };
}
