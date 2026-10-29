/* src/components/cc-fx.js — Claude Code 风格交互动效
   提供：流式逐块揭示（带闪烁光标）、思考态 spinner、工具调用卡片、错峰进入。 */

const reduce = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

/** 在容器末尾放一个闪烁块状光标 */
export function caret(parent) {
  const c = document.createElement('span');
  c.className = 'cc-caret';
  parent.appendChild(c);
  return c;
}

/** 逐块揭示（模拟 token 流）：默认每块 26ms，总时长封顶 900ms */
export async function streamReveal(host, { step = 26, cap = 900 } = {}) {
  if (!host || reduce()) return;
  const blocks = Array.from(host.children);
  if (!blocks.length) return;
  const per = Math.min(step, cap / blocks.length);
  blocks.forEach((b) => b.classList.add('cc-hidden'));
  const c = caret(host);
  for (const b of blocks) {
    b.classList.remove('cc-hidden');
    b.classList.add('cc-in');
    await wait(per);
  }
  c.remove();
  blocks.forEach((b) => b.classList.remove('cc-in'));
}

/** 思考态：返回一个 stop() 用来移除 */
export function thinking(host, label = '正在处理') {
  const box = document.createElement('div');
  box.className = 'cc-thinking';
  box.innerHTML = '<span class="cc-spin" aria-hidden="true">✳</span><span class="cc-thinking__label"></span>';
  box.querySelector('.cc-thinking__label').textContent = label;
  box.setAttribute('role', 'status');
  host.appendChild(box);
  return () => box.remove();
}

/** 工具调用风格卡片列表（适配说明 / 处理结果） */
export function noteCards(notes, { title = '处理说明' } = {}) {
  const wrap = document.createElement('div');
  wrap.className = 'cc-cards';
  const head = document.createElement('div');
  head.className = 'cc-cards__head';
  head.textContent = title + ' · ' + notes.length + ' 条';
  wrap.appendChild(head);
  notes.forEach((n, i) => {
    const card = document.createElement('div');
    card.className = 'cc-card';
    card.style.animationDelay = Math.min(i * 45, 400) + 'ms';
    const bar = document.createElement('div');
    bar.className = 'cc-card__bar';
    bar.innerHTML = '<span class="cc-card__dot" aria-hidden="true"></span><span class="cc-card__name"></span><span class="cc-card__tag">note</span>';
    bar.querySelector('.cc-card__name').textContent = n;
    card.appendChild(bar);
    wrap.appendChild(card);
  });
  return wrap;
}

/** 错峰进入（用于列表/卡片） */
export function staggerIn(nodes, step = 40) {
  if (reduce()) return;
  Array.from(nodes).forEach((n, i) => {
    n.style.animationDelay = Math.min(i * step, 600) + 'ms';
    n.classList.add('cc-fade');
  });
}
