/* src/editor/autosave.js — 草稿自动保存（debounce 800ms）+ 保存时间提示 */
const KEY = 'mdp:v1:draft';

export function loadDraft() {
  try { return JSON.parse(localStorage.getItem(KEY) || 'null'); } catch { return null; }
}

export function initAutosave(ta, { onStatus } = {}) {
  let timer = null;
  let lastSaved = null;

  const save = () => {
    try {
      const payload = { text: ta.value, updatedAt: Date.now() };
      localStorage.setItem(KEY, JSON.stringify(payload));
      lastSaved = new Date(payload.updatedAt);
      const hh = String(lastSaved.getHours()).padStart(2, '0');
      const mm = String(lastSaved.getMinutes()).padStart(2, '0');
      onStatus && onStatus('已保存于 ' + hh + ':' + mm);
    } catch {
      onStatus && onStatus('保存失败（浏览器禁用了本地存储）');
    }
  };

  ta.addEventListener('input', () => {
    onStatus && onStatus('正在编辑…');
    clearTimeout(timer);
    timer = setTimeout(save, 800);
  });

  window.addEventListener('beforeunload', () => { clearTimeout(timer); save(); });
  return { save, getLastSaved: () => lastSaved };
}
