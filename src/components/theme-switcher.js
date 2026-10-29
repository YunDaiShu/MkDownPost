/* src/components/theme-switcher.js — 配色面板（色点卡片 / 分组 / 搜索 / 自定义主色 / 复制变量）
   卡片用 4 个重叠色点表达该主题的配色：主色 / 底色 / 文字 / 强调。 */

import { list, get, apply, cycle, exportCSS } from '../theme-manager.js?v=vmvtm7iqv';
import { applyCustom, readCustom, derivePalette, exportThemeJson, importThemeJson } from '../theme-custom.js?v=vmvtm7iqv';

const GROUP_LABEL = {
  ai: 'AI', social: '社交', game: '游戏', dev: '开发', tool: '工具', lang: '语言',
  system: '系统', framework: '框架', media: '媒体', browser: '浏览器', design: '设计',
  cms: '建站', cn: '国内', infra: '基础设施', misc: '其他'
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

/** 5 个色点全部来自该主题真实推导出的令牌：主色 / 浅底 / 底色 / 文字 / 强调 */
function swatches(theme, dark) {
  const pal = derivePalette(dark ? theme.brand.dark : theme.brand.light, dark ? 'dark' : 'light');
  return [pal['--c-primary'], pal['--c-primary-soft'], pal['--c-bg'], pal['--c-text'], pal['--c-link']];
}

function dotRow(theme, dark) {
  return '<span class="pcard__dots">' + swatches(theme, dark)
    .map((c) => '<i style="background:' + c + '"></i>').join('') + '</span>';
}

function groups() {
  const set = new Set(list().map((t) => t.group || 'misc'));
  return ['all', ...Array.from(set)];
}

function filtered() {
  const q = state.q.trim().toLowerCase();
  if (q) return list().filter((t) => (t.name + ' ' + t.key + ' ' + (t.note || '')).toLowerCase().includes(q));
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

  const custom = readCustom();
  const customCard = custom ? (
    '<article class="pcard pcard--custom' + (cur === 'custom' ? ' is-on' : '') + '" data-apply-custom="1" tabindex="0">' +
    '<span class="pcard__dots">' + (() => { const pal = derivePalette(custom, dark ? 'dark' : 'light'); return [pal['--c-primary'], pal['--c-primary-soft'], pal['--c-bg'], pal['--c-text'], pal['--c-link']].map((c) => '<i style="background:' + c + '"></i>').join(''); })() + '</span>' +
    '<span class="pcard__name">自定义</span>' +
    '<span class="pcard__sub">' + custom.toUpperCase() + '</span></article>'
  ) : '';

  const cards = items.map((t) => {
    const on = t.key === cur;
    return '<article class="pcard' + (on ? ' is-on' : '') + '" data-theme-key="' + t.key + '" role="listitem" tabindex="0" aria-pressed="' + on + '" title="' + t.name + ' · ' + (t.note || '') + '">' +
      dotRow(t, dark) +
      '<span class="pcard__name">' + t.name + '</span>' +
      '<span class="pcard__sub">' + (on ? '正在使用' : (GROUP_LABEL[t.group] || t.group || '')) + '</span>' +
      '</article>';
  }).join('');

  return { chips, cards: customCard + cards };
}

function paintGrid() {
  const g = el.querySelector('.tsw__grid');
  if (g) g.innerHTML = renderBody().cards;
}

function mount() {
  el = document.createElement('div');
  el.className = 'tsw';
  el.setAttribute('role', 'dialog');
  el.setAttribute('aria-label', '配色');
  const b = renderBody();
  el.innerHTML = [
    '<div class="tsw__head"><div><b class="tsw__title">配色</b>' +
    '<p class="tsw__desc">开启后界面用这套配色。卡片上的 4 个圆点分别是：主色 / 底色 / 文字 / 强调。</p></div>' +
    '<button class="tsw__close" type="button" aria-label="关闭">×</button></div>',
    '<div class="tsw__toolbar"><input class="tsw__search" type="search" placeholder="搜索配色…" aria-label="搜索配色" /></div>',
    '<div class="tsw__chips" role="group" aria-label="按分组筛选">' + b.chips + '</div>',
    '<div class="tsw__grid pgrid" role="list">' + b.cards + '</div>',
    '<div class="tsw__foot">',
    '<label class="tsw__custom" title="自定义主色"><input type="color" id="tswColor" value="' + (readCustom() || '#4A7CF7') + '" aria-label="自定义主色" /><span>自定义</span></label>',
    '<button class="btn btn--primary" type="button" data-act="copy">复制当前配色变量</button>',
    '<button class="btn" type="button" data-act="theme-json">导出 JSON</button>',
    '<label class="btn" style="cursor:pointer">导入 JSON<input type="file" id="themeFile" accept="application/json" class="visually-hidden" /></label>',
    '<button class="btn" type="button" data-act="cycle">下一个</button>',
    '</div>'
  ].join('');

  el.querySelector('#tswColor').addEventListener('input', (ev) => {
    applyCustom(ev.target.value);
    paintGrid();
  });

  el.querySelector('#themeFile').addEventListener('change', async (ev) => {
    const f = ev.target.files && ev.target.files[0];
    if (!f) return;
    const res = await importThemeJson(f);
    toast(res.ok ? ('已导入配色' + (res.name ? '：' + res.name : '') + '（' + res.applied + ' 个变量）') : ('导入失败：' + res.reason));
    paintGrid();
    ev.target.value = '';
  });

  el.querySelector('.tsw__search').addEventListener('input', (ev) => {
    state.q = ev.target.value;
    paintGrid();
  });

  const pick = (key) => {
    apply(key);
    paintGrid();
    toast('已应用 ' + key);
  };

  el.addEventListener('click', (e) => {
    if (e.target.closest('.tsw__close')) { close(); return; }
    const g = e.target.closest('[data-group]');
    if (g) {
      state.group = g.getAttribute('data-group');
      const nb = renderBody();
      el.querySelector('.tsw__chips').innerHTML = nb.chips;
      el.querySelector('.tsw__grid').innerHTML = nb.cards;
      return;
    }
    if (e.target.closest('[data-apply-custom]')) {
      const hex = readCustom();
      if (hex) { applyCustom(hex); paintGrid(); toast('已应用自定义主色'); }
      return;
    }
    const card = e.target.closest('[data-theme-key]');
    if (card) { pick(card.getAttribute('data-theme-key')); return; }
    const act = e.target.closest('[data-act]');
    if (!act) return;
    if (act.dataset.act === 'copy') copyText(exportCSS(), '已复制当前配色变量');
    if (act.dataset.act === 'cycle') { const k = cycle(1); paintGrid(); toast('已应用 ' + k); }
    if (act.dataset.act === 'theme-json') { exportThemeJson(); toast('已导出配色 JSON'); }
  });

  el.addEventListener('keydown', (e) => {
    const card = e.target.closest('[data-theme-key]');
    if (card && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); pick(card.getAttribute('data-theme-key')); }
  });

  document.body.appendChild(el);
  el.querySelector('.tsw__close').focus();
  document.addEventListener('keydown', onKey, true);
}

function refresh() {
  if (!el) return;
  const nb = renderBody();
  el.querySelector('.tsw__chips').innerHTML = nb.chips;
  el.querySelector('.tsw__grid').innerHTML = nb.cards;
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
  document.addEventListener('theme:change', () => { if (el) refresh(); });
}
