/* src/components/theme-switcher.js — 主题切换器（色板网格 + 实时小样 + 复制 CSS 变量）
   快捷键：T 循环 / Shift+T 反向 / Esc 关闭 */

import { list, get, apply, cycle, exportCSS } from '../theme-manager.js';

let el = null;
let toastEl = null;

function ensureToast() {
  if (toastEl) return toastEl;
  toastEl = document.createElement('div');
  toastEl.className = 'toast';
  toastEl.setAttribute('role', 'status');
  toastEl.setAttribute('aria-live', 'polite');
  document.body.appendChild(toastEl);
  return toastEl;
}
export function toast(msg) {
  const t = ensureToast();
  t.textContent = msg;
  t.classList.add('is-on');
  clearTimeout(t._timer);
  t._timer = setTimeout(() => t.classList.remove('is-on'), 1800);
}

async function copyText(text, okMsg) {
  try {
    await navigator.clipboard.writeText(text);
    toast(okMsg || '已复制');
  } catch {
    toast('复制失败，请手动选择复制');
  }
}

function renderGrid() {
  const cur = get();
  return list().map((t) => {
    const brand = t.brand[document.documentElement.getAttribute('data-mode') === 'dark' ? 'dark' : 'light'];
    return `
      <button class="tsw__item" type="button" role="listitem" data-theme-key="${t.key}"
              aria-pressed="${t.key === cur}" title="${t.name} · ${t.note}">
        <span class="tsw__row">
          <span class="tsw__dot" style="background:${brand}"></span>
          <span class="tsw__name">${t.name}</span>
        </span>
        <span class="tsw__prev" style="--c-primary-text:${brand}">
          <b>标题示例</b>
          正文与 <code>代码</code>
        </span>
      </button>`;
  }).join('');
}

function mount() {
  el = document.createElement('div');
  el.className = 'tsw';
  el.setAttribute('role', 'dialog');
  el.setAttribute('aria-label', '选择主题');
  el.innerHTML = `
    <div class="tsw__head">
      <span class="tsw__title">主题库（8 套）</span>
      <span class="tsw__hint">T 循环 · Shift+T 反向 · Esc 关闭</span>
    </div>
    <div class="tsw__grid" role="list">${renderGrid()}</div>
    <div class="tsw__foot">
      <button class="btn btn--primary" type="button" data-act="copy">复制当前主题 CSS 变量</button>
      <button class="btn" type="button" data-act="cycle">下一个主题</button>
      <button class="btn" type="button" data-act="close" style="margin-left:auto">关闭</button>
    </div>`;

  el.addEventListener('click', (e) => {
    const item = e.target.closest('[data-theme-key]');
    if (item) {
      const key = item.getAttribute('data-theme-key');
      apply(key);
      el.querySelectorAll('[data-theme-key]').forEach((b) =>
        b.setAttribute('aria-pressed', b.getAttribute('data-theme-key') === key ? 'true' : 'false'));
      toast('已应用 ' + key);
      return;
    }
    const act = e.target.closest('[data-act]');
    if (!act) return;
    if (act.dataset.act === 'copy') copyText(exportCSS(), '已复制当前主题 CSS 变量');
    if (act.dataset.act === 'cycle') { const k = cycle(1); refresh(); toast('已应用 ' + k); }
    if (act.dataset.act === 'close') close();
  });

  document.body.appendChild(el);
  el.querySelector('[data-act="copy"]').focus();
  document.addEventListener('keydown', onKey, true);
}

function refresh() {
  if (!el) return;
  el.querySelector('.tsw__grid').innerHTML = renderGrid();
}

function onKey(e) {
  if (!el) return;
  if (e.key === 'Escape') { e.preventDefault(); close(); }
}

export function open() {
  if (!el) mount(); else refresh();
  const btn = document.getElementById('themeBtn');
  if (btn) btn.setAttribute('aria-expanded', 'true');
}

export function close() {
  if (!el) return;
  el.remove();
  el = null;
  document.removeEventListener('keydown', onKey, true);
  const btn = document.getElementById('themeBtn');
  if (btn) { btn.setAttribute('aria-expanded', 'false'); btn.focus(); }
}

export function toggle() {
  if (el) close(); else open();
}

export function isOpen() {
  return !!el;
}

/** 全局快捷键：T 循环 / Shift+T 反向（输入框内不触发） */
export function bindShortcuts() {
  document.addEventListener('keydown', (e) => {
    const tag = (e.target && e.target.tagName || '').toLowerCase();
    if (tag === 'input' || tag === 'textarea' || e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.key === 't' || e.key === 'T') {
      e.preventDefault();
      const k = cycle(e.shiftKey ? -1 : 1);
      if (el) refresh();
      toast('已应用 ' + k);
    }
  });
  document.addEventListener('theme:change', () => { if (el) refresh(); });
}
