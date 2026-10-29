/* src/components/theme-switcher.js — 主题切换器（100 套：分组筛选 + 搜索 + 实时小样 + 复制变量）
   快捷键：T 循环 / Shift+T 反向 / Esc 关闭 */

import { list, get, apply, cycle, exportCSS } from '../theme-manager.js';
import { applyCustom, readCustom } from '../theme-custom.js';

const GROUP_LABEL = {
  ai: 'AI', social: '社交', game: '游戏', dev: '开发', tool: '工具',
  lang: '语言', system: '系统', framework: '框架', media: '媒体',
  browser: '浏览器', design: '设计', cms: '建站', cn: '国内', infra: '基础设施', misc: '其他'
};

let el = null;
let toastEl = null;
let state = { group: 'all', q: '' };

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
  try { await navigator.clipboard.writeText(text); toast(okMsg || '已复制'); }
  catch { toast('复制失败，请手动选择复制'); }
}

function groups() {
  const set = new Set(list().map((t) => t.group || 'misc'));
  return ['all', ...Array.from(set)];
}

function filtered() {
  const q = state.q.trim().toLowerCase();
  // 有搜索词时跨分组搜索（否则用户会以为"搜不到"）
  if (q) {
    return list().filter((t) => (t.name + ' ' + t.key + ' ' + (t.note || '')).toLowerCase().includes(q));
  }
  return list().filter((t) => state.group === 'all' || (t.group || 'misc') === state.group);
}

function renderBody() {
  const cur = get();
  const dark = document.documentElement.getAttribute('data-mode') === 'dark';
  const items = filtered();

  const chips = groups().map((g) => {
    const on = state.group === g;
    const label = g === 'all' ? '全部' : (GROUP_LABEL[g] || g);
    const n = g === 'all' ? list().length : list().filter((t) => (t.group || 'misc') === g).length;
    return '<button class="tsw__chip' + (on ? ' is-on' : '') + '" type="button" data-group="' + g + '" aria-pressed="' + on + '">' + label + ' ' + n + '</button>';
  }).join('');

  const grid = items.map((t) => {
    const brand = dark ? t.brand.dark : t.brand.light;
    return '<button class="tsw__item" type="button" role="listitem" data-theme-key="' + t.key + '" aria-pressed="' + (t.key === cur) + '" title="' + t.name + ' · ' + (t.note || '') + '">' +
      '<span class="tsw__row"><span class="tsw__dot" style="background:' + brand + '"></span><span class="tsw__name">' + t.name + '</span></span>' +
      '<span class="tsw__prev" style="--c-primary-text:' + brand + '"><b>标题示例</b>正文与 <code>代码</code></span>' +
      '</button>';
  }).join('') || '<p class="tsw__empty">没有匹配的主题</p>';

  return { chips, grid, count: items.length };
}

function mount() {
  el = document.createElement('div');
  el.className = 'tsw';
  el.setAttribute('role', 'dialog');
  el.setAttribute('aria-label', '选择主题');
  const b = renderBody();
  el.innerHTML = [
    '<div class="tsw__head">',
    '<span class="tsw__title">主题库（' + list().length + ' 套）</span>',
    '<input class="tsw__search" type="search" placeholder="搜索主题名…" aria-label="搜索主题" />',
    '<span class="tsw__hint">T 循环 · Esc 关闭</span>',
    '</div>',
    '<div class="tsw__chips" role="group" aria-label="按分组筛选">' + b.chips + '</div>',
    '<div class="tsw__grid" role="list">' + b.grid + '</div>',
    '<div class="tsw__foot">',
    '<button class="btn btn--primary" type="button" data-act="copy">复制当前主题 CSS 变量</button>',
    '<button class="btn" type="button" data-act="cycle">下一个主题</button>',
    '<label class="tsw__custom" title="自定义主色">',
    '<input type="color" id="tswColor" value="' + (readCustom() || '#4A7CF7') + '" aria-label="自定义主色" />',
    '<span>自定义</span></label>',
    '<button class="btn" type="button" data-act="close" style="margin-left:auto">关闭</button>',
    '</div>'
  ].join('');

  el.querySelector('#tswColor').addEventListener('input', (ev) => {
    applyCustom(ev.target.value);
  });

  const search = el.querySelector('.tsw__search');
  search.addEventListener('input', () => {
    state.q = search.value;
    const nb = renderBody();
    el.querySelector('.tsw__grid').innerHTML = nb.grid;
  });

  el.addEventListener('click', (e) => {
    const g = e.target.closest('[data-group]');
    if (g) {
      state.group = g.getAttribute('data-group');
      const nb = renderBody();
      el.querySelector('.tsw__chips').innerHTML = nb.chips;
      el.querySelector('.tsw__grid').innerHTML = nb.grid;
      return;
    }
    const item = e.target.closest('[data-theme-key]');
    if (item) {
      const key = item.getAttribute('data-theme-key');
      apply(key);
      el.querySelectorAll('[data-theme-key]').forEach((b2) => b2.setAttribute('aria-pressed', b2.getAttribute('data-theme-key') === key ? 'true' : 'false'));
      toast('已应用 ' + key);
      return;
    }
    const act = e.target.closest('[data-act]');
    if (!act) return;
    if (act.dataset.act === 'copy') copyText(exportCSS(), '已复制当前主题 CSS 变量');
    if (act.dataset.act === 'cycle') { const k = cycle(1); refresh(); toast('已应用 ' + k); }
    if (act.dataset.act === 'close') close();
    if (act.dataset.act === 'custom') { const hex = el.querySelector('#tswColor').value; applyCustom(hex); toast('已应用自定义主色 ' + hex); }
  });

  document.body.appendChild(el);
  el.querySelector('[data-act="copy"]').focus();
  document.addEventListener('keydown', onKey, true);
}

function refresh() {
  if (!el) return;
  const nb = renderBody();
  el.querySelector('.tsw__chips').innerHTML = nb.chips;
  el.querySelector('.tsw__grid').innerHTML = nb.grid;
}

function onKey(e) {
  if (!el) return;
  if (e.key === 'Escape') { e.preventDefault(); close(); }
}

export function open() {
  if (!el) mount(); else refresh();
  document.getElementById('themeBtn')?.setAttribute('aria-expanded', 'true');
}

export function close() {
  if (!el) return;
  el.remove(); el = null;
  document.removeEventListener('keydown', onKey, true);
  const btn = document.getElementById('themeBtn');
  if (btn) { btn.setAttribute('aria-expanded', 'false'); btn.focus(); }
}

export function toggle() { if (el) close(); else open(); }
export function isOpen() { return !!el; }

export function bindShortcuts() {
  // T / Shift+T 已由 src/editor/keymap.js 统一接管，这里仅保留主题变更时的刷新
  document.addEventListener('theme:change', () => { if (el) refresh(); });
}
