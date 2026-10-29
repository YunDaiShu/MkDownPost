/* src/editor/split-pane.js — 可拖拽分隔条（pointer events，双击复位 50%） */
export function initSplitPane(root, { key = 'mdp:v1:split' } = {}) {
  const bar = root.querySelector('.editor__splitter');
  const left = root.querySelector('.editor__pane--edit');
  if (!bar || !left) return;

  const saved = Number(localStorage.getItem(key) || 50);
  setPct(saved);

  function setPct(pct) {
    const p = Math.max(24, Math.min(76, pct));
    left.style.flexBasis = p + '%';
    bar.setAttribute('aria-valuenow', String(Math.round(p)));
  }

  let dragging = false;
  bar.addEventListener('pointerdown', (e) => {
    dragging = true;
    bar.setPointerCapture(e.pointerId);
    bar.classList.add('is-active');
    document.body.style.cursor = 'col-resize';
  });
  bar.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    const rect = root.getBoundingClientRect();
    setPct(((e.clientX - rect.left) / rect.width) * 100);
  });
  const stop = () => {
    if (!dragging) return;
    dragging = false;
    bar.classList.remove('is-active');
    document.body.style.cursor = '';
    try { localStorage.setItem(key, String(parseFloat(left.style.flexBasis))); } catch { /* 忽略 */ }
  };
  bar.addEventListener('pointerup', stop);
  bar.addEventListener('pointercancel', stop);
  bar.addEventListener('dblclick', () => setPct(50));
  bar.addEventListener('keydown', (e) => {
    const cur = parseFloat(left.style.flexBasis) || 50;
    if (e.key === 'ArrowLeft') { setPct(cur - 4); e.preventDefault(); }
    if (e.key === 'ArrowRight') { setPct(cur + 4); e.preventDefault(); }
  });
}
