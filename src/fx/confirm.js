/* src/fx/confirm.js — 导出成功的确认动效
   设计约束：
   1. anime.js 走动态 import，不点导出就永远不下载（首屏零成本）
   2. 加载失败 / 用户开启"减少动态效果" → 静默跳过，绝不影响导出功能
   3. 动画只动 transform / opacity，不动布局，避免触发重排
   4. 所有生成节点在动画结束后移除，不留 DOM 垃圾
*/
let animeMod = null;

const reduced = () => {
  try { return matchMedia('(prefers-reduced-motion: reduce)').matches; } catch { return false; }
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

/** 在 anchor 元素上播一次确认动效；返回 Promise，失败永不 reject */
export async function confirmFlash(anchor, opts = {}) {
  if (!anchor || reduced()) return false;
  const anime = await loadAnime();
  if (!anime) return false;

  const host = document.createElement('span');
  host.className = 'fx-confirm';
  host.setAttribute('aria-hidden', 'true');
  anchor.appendChild(host);

  const ring = document.createElement('span');
  ring.className = 'fx-confirm__ring';
  host.appendChild(ring);

  const dots = [];
  const COUNT = 10;
  for (let i = 0; i < COUNT; i++) {
    const d = document.createElement('span');
    d.className = 'fx-confirm__dot';
    host.appendChild(d);
    dots.push(d);
  }

  const base = (() => {
    const r = anchor.getBoundingClientRect();
    return { x: r.width / 2, y: r.height / 2 };
  })();

  try {
    anime({
      targets: ring,
      scale: [0.4, 1.35],
      opacity: [0.55, 0],
      duration: 620,
      easing: 'easeOutQuart'
    });
    anime({
      targets: dots,
      translateX: (el, i) => Math.cos((Math.PI * 2 * i) / COUNT) * (26 + (i % 3) * 7),
      translateY: (el, i) => Math.sin((Math.PI * 2 * i) / COUNT) * (26 + (i % 3) * 7),
      scale: [{ value: 1, duration: 1 }, { value: 0.2, duration: 520 }],
      opacity: { value: [1, 0], duration: 560 },
      delay: (el, i) => i * 14,
      duration: 560,
      easing: 'easeOutQuad',
      begin() { host.style.left = base.x + 'px'; host.style.top = base.y + 'px'; }
    });
  } catch {
    /* 动画库异常不影响功能 */
  }

  setTimeout(() => host.remove(), 900);
  return true;
}

export function isMotionAllowed() { return !reduced(); }
