/* src/editor/keymap.js — 可自定义快捷键
   组合串统一为 "mod+shift+z" 形式；mod = Ctrl 或 Cmd。存 localStorage: mdp:v1:keys */

const KEY = 'mdp:v1:keys';

export const DEFAULTS = [
  { id: 'bold', label: '加粗', combo: 'mod+b', group: '编辑', editable: true },
  { id: 'italic', label: '斜体', combo: 'mod+i', group: '编辑', editable: true },
  { id: 'link', label: '插入链接', combo: 'mod+k', group: '编辑', editable: true },
  { id: 'code', label: '插入代码块', combo: 'mod+/', group: '编辑', editable: true },
  { id: 'save', label: '保存草稿', combo: 'mod+s', group: '文件', editable: true },
  { id: 'undo', label: '撤销', combo: 'mod+z', group: '文件', editable: true },
  { id: 'redo', label: '重做', combo: 'mod+shift+z', group: '文件', editable: true },
  { id: 'help', label: '快捷键帮助', combo: '?', group: '全局', editable: true },
  { id: 'theme-next', label: '下一个主题', combo: 't', group: '全局', editable: true },
  { id: 'theme-prev', label: '上一个主题', combo: 'shift+t', group: '全局', editable: true },
  { id: 'mode', label: '明暗切换', combo: 'shift+d', group: '全局', editable: true }
];

let current = null;

function read() {
  try { return JSON.parse(localStorage.getItem(KEY) || '{}'); } catch { return {}; }
}
function write(obj) {
  try { localStorage.setItem(KEY, JSON.stringify(obj)); } catch { /* 忽略 */ }
}

/** 当前生效的快捷键表（默认 + 本地覆盖） */
export function list() {
  if (current) return current;
  const over = read();
  current = DEFAULTS.map((d) => ({ ...d, combo: over[d.id] || d.combo }));
  return current;
}

function invalidate() { current = null; }

/** 把 KeyboardEvent 归一成组合串 */
export function comboOf(e) {
  const parts = [];
  if (e.ctrlKey || e.metaKey) parts.push('mod');
  if (e.altKey) parts.push('alt');
  if (e.shiftKey) parts.push('shift');
  let k = (e.key || '').toLowerCase();
  if (k === ' ') k = 'space';
  if (k === 'escape') k = 'esc';
  if (!['control', 'meta', 'alt', 'shift'].includes(k)) parts.push(k);
  return parts.join('+');
}

/** 事件 → 动作 id（找不到返回 null） */
export function match(e) {
  const c = comboOf(e);
  const hit = list().find((it) => it.combo === c);
  return hit ? hit.id : null;
}

/** 冲突检查：返回已有的相同组合项（除自己） */
export function conflict(combo, selfId) {
  return list().find((it) => it.combo === combo && it.id !== selfId) || null;
}

export function setCombo(id, combo) {
  const over = read();
  over[id] = combo;
  write(over);
  invalidate();
}

export function resetAll() {
  write({});
  invalidate();
}

export function isCustom(id) {
  return Object.prototype.hasOwnProperty.call(read(), id);
}
