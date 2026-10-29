/* src/editor/shortcuts.js — 编辑器快捷键（走 keymap，可自定义）+ Tab 缩进 */
import { match } from './keymap.js?v=vmvte42ix';

export function initShortcuts(ta, { onSave, onInsertCode, onUndo, onAction } = {}) {
  const wrap = (before, after, placeholder) => {
    const s = ta.selectionStart, e = ta.selectionEnd;
    const sel = ta.value.slice(s, e) || placeholder || '';
    const next = ta.value.slice(0, s) + before + sel + after + ta.value.slice(e);
    ta.value = next;
    ta.selectionStart = s + before.length;
    ta.selectionEnd = s + before.length + sel.length;
    ta.dispatchEvent(new Event('input', { bubbles: true }));
  };

  ta.addEventListener('keydown', (e) => {
    const id = match(e);
    if (id) {
      const handled = ['bold', 'italic', 'link', 'code', 'save', 'undo', 'redo'].includes(id);
      if (handled) { e.preventDefault(); e.stopPropagation(); }
      if (id === 'bold') return wrap('**', '**', '粗体');
      if (id === 'italic') return wrap('*', '*', '斜体');
      if (id === 'link') return wrap('[', '](https://)', '链接文字');
      if (id === 'code') return onInsertCode && onInsertCode();
      if (id === 'save') return onSave && onSave();
      if (id === 'undo') return onUndo && onUndo(false);
      if (id === 'redo') return onUndo && onUndo(true);
      if (onAction) return onAction(id);
    }
    if (e.key === 'Tab') {
      e.preventDefault();
      const s = ta.selectionStart, en = ta.selectionEnd;
      ta.value = ta.value.slice(0, s) + '  ' + ta.value.slice(en);
      ta.selectionStart = ta.selectionEnd = s + 2;
      ta.dispatchEvent(new Event('input', { bubbles: true }));
      return;
    }
    if (e.key === 'Escape') ta.blur();
  });
}
