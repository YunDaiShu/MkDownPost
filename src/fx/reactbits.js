/* src/fx/reactbits.js — 参考 reactbits.dev 的两个小动效，纯指针事件，无依赖
   1) TiltedCard：指针在卡片内移动时做轻微 3D 倾斜（最大 4°，克制）
   2) Magnetic：主按钮在指针靠近时轻微跟随（最大 6px）
   两者都尊重 prefers-reduced-motion，且只在桌面指针设备启用。 */

const REDUCED = () => window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const FINE = () => window.matchMedia && window.matchMedia('(pointer: fine)').matches;

function bindTilt(el, maxDeg) {
  let raf = 0, tx = 0, ty = 0;
  const apply = () => {
    raf = 0;
    el.style.transform = 'perspective(700px) rotateX(' + tx.toFixed(2) + 'deg) rotateY(' + ty.toFixed(2) + 'deg) translateY(-1px)';
  };
  el.addEventListener('pointermove', (e) => {
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - 0.5;
    const py = (e.clientY - r.top) / r.height - 0.5;
    tx = -py * maxDeg;
    ty = px * maxDeg;
    el.style.setProperty('--mx', ((px + 0.5) * 100).toFixed(1) + '%');
    el.style.setProperty('--my', ((py + 0.5) * 100).toFixed(1) + '%');
    if (!raf) raf = requestAnimationFrame(apply);
  });
  el.addEventListener('pointerleave', () => {
    el.style.transform = '';
  });
}

function bindMagnetic(el, maxShift) {
  el.addEventListener('pointermove', (e) => {
    const r = el.getBoundingClientRect();
    const dx = (e.clientX - (r.left + r.width / 2)) / (r.width / 2);
    const dy = (e.clientY - (r.top + r.height / 2)) / (r.height / 2);
    el.style.transform = 'translate(' + (dx * maxShift).toFixed(2) + 'px,' + (dy * maxShift).toFixed(2) + 'px)';
  });
  el.addEventListener('pointerleave', () => { el.style.transform = ''; });
}

export function mountReactbitsFX(root) {
  if (!root || REDUCED() || !FINE()) return () => {};
  const cards = Array.from(root.querySelectorAll('.card')).slice(0, 9);
  cards.forEach((c) => bindTilt(c, 4));
  const ctas = Array.from(root.querySelectorAll('.btn--primary')).slice(0, 4);
  ctas.forEach((b) => bindMagnetic(b, 6));
  return () => {};
}
