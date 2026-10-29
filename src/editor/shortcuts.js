/* src/editor/shortcuts.js — 编辑器快捷键与 Tab 缩进
   Cmd/Ctrl+B 加粗 · I 斜体 · K 链接 · S 保存草稿 · / 插入代码块 · Tab 缩进 */
export function initShortcuts(ta, { onSave, onInsertCode, toast, onUndo } = {}) {
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
    const mod = e.metaKey || e.ctrlKey;
    if (mod && e.key.toLowerCase() === 'b') { e.preventDefault(); wrap('**', '**', '粗体'); return; }
    if (mod && e.key.toLowerCase() === 'i') { e.preventDefault(); wrap('*', '*', '斜体'); return; }
    if (mod && e.key.toLowerCase() === 'k') { e.preventDefault(); wrap('[', '](https://)', '链接文字'); return; }
    if (mod && e.key.toLowerCase() === 's') { e.preventDefault(); onSave && onSave(); return; }
    if (mod && e.key === '/') { e.preventDefault(); onInsertCode && onInsertCode(); return; }
    if (e.key === 'Tab') {
      e.preventDefault();
      const s = ta.selectionStart, en = ta.selectionEnd;
      ta.value = ta.value.slice(0, s) + '  ' + ta.value.slice(en);
      ta.selectionStart = ta.selectionEnd = s + 2;
      ta.dispatchEvent(new Event('input', { bubbles: true }));
      return;
    }
    if (e.key === 'Escape') { ta.blur(); }
  });
}
