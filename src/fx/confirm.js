/* src/fx/confirm.js — 导出成功的确认动效（渐进增强）
   设计约束：
   1. 即时反馈零依赖：光环用纯 CSS keyframes，点击当帧就出现，不等任何下载
   2. anime.js 作为增强：空闲时预取（prewarm），到位后才补粒子；没到位就不补，绝不延迟
   3. 失败/离线/减少动效 → 只保留光环或完全跳过，功能不受影响
   4. 生成节点动画结束即移除，不留 DOM 垃圾
*/
let animeMod = null;
let prewarmStarted = false;

const reduced = () => {
  try { return matchMedia('(prefers-reduced-motion: reduce)').matches; } catch { return false; }
};

const idle = (fn) => {
  if (typeof requestIdleCallback === 'function') requestIdleCallback(fn, { timeout: 2500 });
  else setTimeout(fn, 1200);
};

async function loadAnime() {
  if (animeMod !== null) return animeMod;
  try {
    const m = await import('../../assets/vendor/anime.es.js');
    animeMod = m.default || m;
  } catch {
    animeMod = false;
  }
  return animeMod;
}

/** 空闲预取：用户一旦开始用编辑器，就在浏览器空闲时把动画库拉进来 */
export function prewarmConfirmFx() {
  if (prewarmStarted || reduced()) return;
  prewarmStarted = true;
  idle(() => { loadAnime(); });
}

/** 在 anchor 上播一次确认反馈：光环立即出现（CSS），粒子在有 anime 时叠加 */
export function confirmFlash(anchor) {
  if (!anchor || reduced()) return false;

  const host = document.createElement('span');
  host.className = 'fx-confirm';
  host.setAttribute('aria-hidden', 'true');
  const ring = document.createElement('span');
  ring.className = 'fx-confirm__ring';
  host.appendChild(ring);
  anchor.appendChild(host);

  const cleanup = () => { if (host.isConnected) host.remove(); };
  setTimeout(cleanup, 900);

  // anime.js 已就绪 → 同步补粒子；未就绪 → 不等待、不补
  const anime = animeMod && animeMod !== false ? animeMod : null;
  if (anime) {
    const dots = [];
    const COUNT = 10;
    for (let i = 0; i < COUNT; i++) {
      const d = document.createElement('span');
      d.className = 'fx-confirm__dot';
      host.appendChild(d);
      dots.push(d);
    }
    try {
      anime({
        targets: dots,
        translateX: (el, i) => Math.cos((Math.PI * 2 * i) / COUNT) * (26 + (i % 3) * 7),
        translateY: (el, i) => Math.sin((Math.PI * 2 * i) / COUNT) * (26 + (i % 3) * 7),
        scale: [{ value: 1, duration: 1 }, { value: 0.2, duration: 520 }],
        opacity: { value: [1, 0], duration: 560 },
        delay: (el, i) => i * 14,
        duration: 560,
        easing: 'easeOutQuad'
      });
    } catch {
      /* 动画库异常不影响功能 */
    }
  }
  return true;
}

export function isMotionAllowed() { return !reduced(); }
export function isAnimeReady() { return !!animeMod && animeMod !== false; }
