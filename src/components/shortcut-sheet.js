/* src/components/shortcut-sheet.js — 快捷键帮助面板（? 打开，Esc 关闭，焦点陷阱） */
let host = null;
let lastFocus = null;

const GROUPS = [
  { title: '编辑', items: [['⌘/Ctrl + B', '加粗'], ['⌘/Ctrl + I', '斜体'], ['⌘/Ctrl + K', '插入链接'], ['⌘/Ctrl + /', '插入代码块'], ['Tab', '缩进两格']] },
  { title: '文件', items: [['⌘/Ctrl + S', '保存草稿'], ['⌘/Ctrl + Z', '撤销'], ['⌘/Ctrl + Shift + Z', '重做']] },
  { title: '全局', items: [['T', '下一个主题'], ['Shift + T', '上一个主题'], ['Shift + D', '明暗切换'], ['?', '打开本帮助'], ['Esc', '关闭弹层 / 离开输入框']] }
];

function build() {
  host = document.createElement('div');
  host.className = 'sheet';
  host.setAttribute('role', 'dialog');
  host.setAttribute('aria-modal', 'true');
  host.setAttribute('aria-label', '快捷键');
  host.innerHTML = [
    '<div class="sheet__panel">',
    '<div class="sheet__head"><b>键盘快捷键</b><button class="sheet__close" type="button" aria-label="关闭">×</button></div>',
    GROUPS.map((g) => '<div class="sheet__group"><h3>' + g.title + '</h3><dl>' +
      g.items.map(([k, d]) => '<div class="sheet__row"><dt><kbd>' + k + '</kbd></dt><dd>' + d + '</dd></div>').join('') +
      '</dl></div>').join(''),
    '</div>'
  ].join('');
  document.body.appendChild(host);
  host.addEventListener('click', (e) => { if (e.target === host || e.target.closest('.sheet__close')) close(); });
  document.addEventListener('keydown', onKey, true);
}

function onKey(e) {
  if (!host) return;
  if (e.key === 'Escape') { e.preventDefault(); close(); }
  if (e.key === 'Tab') {
    e.preventDefault();
    host.querySelector('.sheet__close').focus();
  }
}

export function openSheet() {
  if (host) return;
  lastFocus = document.activeElement;
  build();
  host.querySelector('.sheet__close').focus();
}

export function close() {
  if (!host) return;
  host.remove(); host = null;
  document.removeEventListener('keydown', onKey, true);
  if (lastFocus && lastFocus.focus) lastFocus.focus();
}

export function toggleSheet() { if (host) close(); else openSheet(); }

/** 全局 ? 快捷键 */
export function bindShortcutSheet() {
  document.addEventListener('keydown', (e) => {
    const tag = (e.target && e.target.tagName || '').toLowerCase();
    if (tag === 'input' || tag === 'textarea' || e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.key === '?') { e.preventDefault(); toggleSheet(); }
  });
}
