/* src/components/shortcut-sheet.js — 快捷键帮助 + 自定义改键（? 打开，Esc 关闭） */
import { list, setCombo, resetAll, conflict, isCustom, comboOf } from '../editor/keymap.js?v=vmvtlfqcx';

let host = null;
let lastFocus = null;
let capturing = null;   // { id, btn }

const pretty = (combo) => combo
  .replace(/mod/g, navigator.platform.includes('Mac') ? '⌘' : 'Ctrl')
  .replace(/shift/g, 'Shift').replace(/alt/g, 'Alt')
  .replace(/\+/g, ' + ').replace(/^./, (c) => c.toUpperCase());

function groupOf(items) {
  const map = new Map();
  items.forEach((it) => {
    if (!map.has(it.group)) map.set(it.group, []);
    map.get(it.group).push(it);
  });
  return map;
}

function body() {
  const items = list();
  const groups = groupOf(items);
  let html = '';
  for (const [g, rows] of groups) {
    html += '<div class="sheet__group"><h3>' + g + '</h3><dl>';
    rows.forEach((it) => {
      html += '<div class="sheet__row">' +
        '<dt><kbd>' + pretty(it.combo) + '</kbd></dt>' +
        '<dd>' + it.label + '</dd>' +
        (it.editable
          ? '<button class="sheet__edit" type="button" data-edit="' + it.id + '">' + (isCustom(it.id) ? '已改' : '改') + '</button>'
          : '') +
        '</div>';
    });
    html += '</dl></div>';
  }
  return html;
}

function build() {
  host = document.createElement('div');
  host.className = 'sheet';
  host.setAttribute('role', 'dialog');
  host.setAttribute('aria-modal', 'true');
  host.setAttribute('aria-label', '快捷键');
  host.innerHTML = [
    '<div class="sheet__panel">',
    '<div class="sheet__head"><b>键盘快捷键</b>',
    '<button class="sheet__reset" type="button">恢复默认</button>',
    '<button class="sheet__close" type="button" aria-label="关闭">×</button></div>',
    '<p class="sheet__tip">点「改」后按下新的组合键即可；Esc 取消。</p>',
    '<div class="sheet__body">' + body() + '</div>',
    '</div>'
  ].join('');
  document.body.appendChild(host);

  host.addEventListener('click', (e) => {
    if (e.target === host || e.target.closest('.sheet__close')) { close(); return; }
    if (e.target.closest('.sheet__reset')) {
      resetAll();
      host.querySelector('.sheet__body').innerHTML = body();
      return;
    }
    const btn = e.target.closest('[data-edit]');
    if (btn) {
      capturing = { id: btn.getAttribute('data-edit'), btn };
      btn.textContent = '按键…';
      btn.classList.add('is-capturing');
    }
  });

  document.addEventListener('keydown', onKey, true);
}

function onKey(e) {
  if (!host) return;
  if (capturing) {
    e.preventDefault();
    e.stopPropagation();
    if (e.key === 'Escape') {
      capturing.btn.textContent = '改';
      capturing.btn.classList.remove('is-capturing');
      capturing = null;
      return;
    }
    const combo = comboOf(e);
    if (!combo || ['mod', 'shift', 'alt', 'control', 'meta'].includes(combo)) return;
    const dup = conflict(combo, capturing.id);
    if (dup) {
      capturing.btn.textContent = '冲突：' + pretty(dup.combo);
      setTimeout(() => { if (capturing) capturing.btn.textContent = '按键…'; }, 1200);
      return;
    }
    setCombo(capturing.id, combo);
    capturing = null;
    host.querySelector('.sheet__body').innerHTML = body();
    return;
  }
  if (e.key === 'Escape') { e.preventDefault(); close(); }
  if (e.key === 'Tab') { e.preventDefault(); host.querySelector('.sheet__close').focus(); }
}

export function openSheet() {
  if (host) return;
  lastFocus = document.activeElement;
  build();
  host.querySelector('.sheet__close').focus();
}

export function close() {
  if (!host) return;
  host.remove(); host = null; capturing = null;
  document.removeEventListener('keydown', onKey, true);
  if (lastFocus && lastFocus.focus) lastFocus.focus();
}

export function toggleSheet() { if (host) close(); else openSheet(); }

/** 全局快捷键（走 keymap，可用自定义键） */
export function bindShortcutSheet({ onThemeNext, onThemePrev, onMode } = {}) {
  document.addEventListener('keydown', (e) => {
    const tag = (e.target && e.target.tagName || '').toLowerCase();
    if (tag === 'input' || tag === 'textarea') return;
    const combo = comboOf(e);
    const items = list();
    const hit = items.find((it) => it.combo === combo);
    if (!hit) return;
    if (combo === '?') { e.preventDefault(); toggleSheet(); return; }
    if (hit.id === 'theme-next') { e.preventDefault(); onThemeNext && onThemeNext(); }
    if (hit.id === 'theme-prev') { e.preventDefault(); onThemePrev && onThemePrev(); }
    if (hit.id === 'mode') { e.preventDefault(); onMode && onMode(); }
  });
}
