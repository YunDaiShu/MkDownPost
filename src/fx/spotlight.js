/* src/fx/spotlight.js — 卡片光斑跟随（原生实现，无依赖）
   做法：把指针位置写进 CSS 变量 --mx/--my，由 .card::before 的径向渐变呈现。
   约束：
   1. 只在支持 hover 的精确指针设备上启用（触屏跳过）
   2. 减少动效 / 卡片不可见时直接不挂监听
   3. 单个委托监听 + rAF 节流，避免每张卡各挂一个监听
   4. 只写 CSS 变量，不触发重排（渐变由合成层绘制）
*/
let bound = false;
let raf = 0;
let pending = null;

const reduced = () => {
  try { return matchMedia('(prefers-reduced-motion: reduce)').matches; } catch { return false; }
};
const finePointer = () => {
  try { return matchMedia('(hover: hover) and (pointer: fine)').matches; } catch { return false; }
};

const flush = () => {
  raf = 0;
  const { el, x, y } = pending || {};
  if (!el || !el.isConnected) return;
  const r = el.getBoundingClientRect();
  el.style.setProperty('--mx', (x - r.left) + 'px');
  el.style.setProperty('--my', (y - r.top) + 'px');
};

export function initSpotlight() {
  if (bound || reduced() || !finePointer()) return false;
  bound = true;

  const TARGET = '.card, .pcard, .theme-card';

  document.addEventListener('pointermove', (e) => {
    const el = e.target && e.target.closest ? e.target.closest(TARGET) : null;
    if (!el) return;
    pending = { el, x: e.clientX, y: e.clientY };
    if (!raf) raf = requestAnimationFrame(flush);
  }, { passive: true });

  // 指针离开卡片时把光斑淡出（清空坐标，CSS 用 :hover 控制透明度）
  document.addEventListener('pointerout', (e) => {
    const el = e.target && e.target.closest ? e.target.closest(TARGET) : null;
    if (!el) return;
    el.style.removeProperty('--mx');
    el.style.removeProperty('--my');
  }, { passive: true });

  return true;
}
