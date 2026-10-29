/* src/editor/tabs.js — 编辑器多标签页（localStorage: mdp:v1:tabs / mdp:v1:active）
   设计原则：单个标签的数据就是"草稿"，切换时先落盘当前文本，避免丢字。 */

const KEY_TABS = 'mdp:v1:tabs';
const KEY_ACTIVE = 'mdp:v1:active';

const uid = () => 'tab_' + Math.random().toString(36).slice(2, 9);

function read() {
  try {
    const j = JSON.parse(localStorage.getItem(KEY_TABS) || 'null');
    if (Array.isArray(j) && j.length) return j;
  } catch { /* 忽略 */ }
  return null;
}
function write(tabs, active) {
  try {
    localStorage.setItem(KEY_TABS, JSON.stringify(tabs));
    localStorage.setItem(KEY_ACTIVE, active);
  } catch { /* 忽略 */ }
}

/** 初始化标签集合：迁移旧草稿或在没有数据时创建第一个 */
export function initTabs(seedText) {
  let tabs = read();
  if (!tabs) {
    const legacy = (() => {
      try { return JSON.parse(localStorage.getItem('mdp:v1:draft') || 'null'); } catch { return null; }
    })();
    tabs = [{ id: uid(), name: '未命名 1', text: (legacy && legacy.text) || seedText || '' }];
    write(tabs, tabs[0].id);
    return { tabs, active: tabs[0].id };
  }
  let active = null;
  try { active = localStorage.getItem(KEY_ACTIVE); } catch { /* 忽略 */ }
  if (!active || !tabs.some((t) => t.id === active)) active = tabs[0].id;
  return { tabs, active };
}

export function saveAll(tabs, active) { write(tabs, active); }

export function addTab(tabs, name) {
  const t = { id: uid(), name: name || ('未命名 ' + (tabs.length + 1)), text: '' };
  return { tabs: [...tabs, t], active: t.id };
}

export function closeTab(tabs, active, id) {
  if (tabs.length <= 1) return { tabs, active };
  const rest = tabs.filter((t) => t.id !== id);
  const nextActive = id === active ? rest[Math.max(0, tabs.findIndex((t) => t.id === id) - 1)].id : active;
  return { tabs: rest, active: nextActive };
}

export function renameTab(tabs, id, name) {
  return tabs.map((t) => (t.id === id ? { ...t, name: name || t.name } : t));
}

export function updateText(tabs, active, text) {
  return tabs.map((t) => (t.id === active ? { ...t, text } : t));
}
