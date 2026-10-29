/* src/editor/editor-page.js — 编辑器：工具栏 / 分栏 / 行号 / 预览 / 状态栏 / 导出（无任何 AI 功能） */
import { renderMarkdown } from '../markdown/renderer.js';
import { initSplitPane } from './split-pane.js';
import { initShortcuts } from './shortcuts.js';
import { initAutosave, loadDraft } from './autosave.js';
import { exportMarkdown, exportInlineHTMLFile, printDoc } from './export.js';
import { toast } from '../components/theme-switcher.js';
import { mountHighlight } from './highlight-layer.js';
import { streamReveal, thinking, noteCards } from '../components/cc-fx.js';
import * as Adapters from '../adapters/index.js';

const SAMPLE = [
  '# 在公众号里也能好看的排版',
  '',
  '这是一段正文，包含 **加粗**、*斜体*、~~删除线~~、`行内代码`，以及一个[链接](https://example.com)。',
  '',
  '## 二级标题会自动带主题色竖线',
  '',
  '- 支持无序列表',
  '- [x] 支持任务列表',
  '- [ ] 勾选状态走主题色',
  '',
  '| 平台 | 状态 | 备注 |',
  '| --- | --- | --- |',
  '| 公众号 | 稳定 | 全内联样式 |',
  '| 小黑盒 | 稳定 | 标题/图片规则 |',
  '',
  '> 引用块：左侧主色竖条 + 主色浅底。',
  '',
  '```js',
  'const price = 12;',
  'console.log(\'复制按钮在右上角\', price);',
  '```',
  '',
  '$$a^2 + b^2 = c^2$$',
  '',
  '```mermaid',
  'flowchart LR',
  '  A[写 Markdown] --> B[实时预览]',
  '  B --> C[导出各平台]',
  '```'
].join('\n');

const S = (d, extra = '') => '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + d + extra + '</svg>';

const TOOLS = [
  { act: 'new', label: '新建', icon: S('<path d="M14 3H7a2 2 0 00-2 2v14a2 2 0 002 2h10a2 2 0 002-2V8z"/><path d="M14 3v5h5"/>') },
  { act: 'open', label: '打开 .md', icon: S('<path d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>') },
  { sep: 1 },
  { act: 'undo', label: '撤销', icon: S('<path d="M9 14L4 9l5-5"/><path d="M4 9h10a6 6 0 010 12H9"/>') },
  { act: 'redo', label: '重做', icon: S('<path d="M15 14l5-5-5-5"/><path d="M20 9H10a6 6 0 000 12h5"/>') },
  { sep: 1 },
  { act: 'h1', label: '一级标题', icon: S('<path d="M5 5v14M13 5v14M5 12h8"/>', '<text x="15" y="21" font-size="9" fill="currentColor" stroke="none">1</text>') },
  { act: 'h2', label: '二级标题', icon: S('<path d="M5 5v14M13 5v14M5 12h8"/>', '<text x="15" y="21" font-size="9" fill="currentColor" stroke="none">2</text>') },
  { act: 'h3', label: '三级标题', icon: S('<path d="M5 5v14M13 5v14M5 12h8"/>', '<text x="15" y="21" font-size="9" fill="currentColor" stroke="none">3</text>') },
  { sep: 1 },
  { act: 'bold', label: '加粗', icon: S('<path d="M7 4h6a4 4 0 010 8H7z"/><path d="M7 12h7a4 4 0 010 8H7z"/>') },
  { act: 'italic', label: '斜体', icon: S('<path d="M10 4h8M6 20h8M14 4l-4 16"/>') },
  { act: 'underline', label: '下划线', icon: S('<path d="M6 4v7a6 6 0 0012 0V4"/><path d="M4 20h16"/>') },
  { act: 'strike', label: '删除线', icon: S('<path d="M4 12h16"/><path d="M8 7a4 4 0 018 0M8 17a4 4 0 008 0"/>') },
  { act: 'hlt', label: '高亮', icon: S('<path d="M4 20l6-6"/><path d="M14 4l6 6-6 6-6-6z"/>') },
  { act: 'sup', label: '上标', icon: S('<path d="M4 18l5-10 5 10M6 14h6"/>', '<text x="16" y="10" font-size="8" fill="currentColor" stroke="none">2</text>') },
  { act: 'sub', label: '下标', icon: S('<path d="M4 16l5-10 5 10M6 12h6"/>', '<text x="16" y="22" font-size="8" fill="currentColor" stroke="none">2</text>') },
  { sep: 1 },
  { act: 'quote', label: '引用', icon: S('<path d="M7 7h4v4a4 4 0 01-4 4V7z"/><path d="M15 7h4v4a4 4 0 01-4 4V7z"/>') },
  { act: 'code', label: '代码块', icon: S('<path d="M9 8l-4 4 4 4"/><path d="M15 8l4 4-4 4"/>') },
  { act: 'inlinecode', label: '行内代码', icon: S('<path d="M8 9l-3 3 3 3"/><path d="M16 9l3 3-3 3"/><path d="M13 6l-2 12"/>') },
  { act: 'link', label: '链接', icon: S('<path d="M10 13a4 4 0 006 0l2-2a4 4 0 00-6-6l-1 1"/><path d="M14 11a4 4 0 00-6 0l-2 2a4 4 0 006 6l1-1"/>') },
  { act: 'image', label: '图片', icon: S('<rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="8.5" cy="10" r="1.5"/><path d="M21 16l-5-5-7 7"/>') },
  { act: 'table', label: '表格', icon: S('<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 10h18M9 10v9M15 10v9"/>') },
  { act: 'ul', label: '无序列表', icon: S('<path d="M9 7h11M9 12h11M9 17h11"/><circle cx="5" cy="7" r="1.4" fill="currentColor" stroke="none"/><circle cx="5" cy="12" r="1.4" fill="currentColor" stroke="none"/><circle cx="5" cy="17" r="1.4" fill="currentColor" stroke="none"/>') },
  { act: 'ol', label: '有序列表', icon: S('<path d="M10 7h10M10 12h10M10 17h10"/>', '<text x="3" y="9" font-size="7" fill="currentColor" stroke="none">1</text><text x="3" y="14" font-size="7" fill="currentColor" stroke="none">2</text><text x="3" y="19" font-size="7" fill="currentColor" stroke="none">3</text>') },
  { act: 'task', label: '任务列表', icon: S('<rect x="3" y="5" width="6" height="6" rx="1.5"/><path d="M4.5 8l1.5 1.5 2.5-3"/><path d="M12 8h9M12 16h9"/><rect x="3" y="13" width="6" height="6" rx="1.5"/>') },
  { act: 'hr', label: '分隔线', icon: S('<path d="M3 12h18"/><path d="M6 6h12M6 18h12" opacity=".35"/>') }
];

export default function render(root) {
  root.innerHTML = `
    <div class="editor">
      <div class="editor__bar" role="toolbar" aria-label="编辑工具栏">
        ${TOOLS.map((t) => t.sep
          ? '<span class="editor__sep" aria-hidden="true"></span>'
          : '<button class="editor__tool" type="button" data-act="' + t.act + '" aria-label="' + t.label + '" title="' + t.label + '">' + t.icon + '</button>').join('')}
        <input type="file" id="fileInput" accept=".md,.markdown,.txt" class="visually-hidden" />
        <span class="editor__spacer"></span>
        <label class="editor__sel"><span class="visually-hidden">字号</span>
          <select id="fontSize" aria-label="字号"><option value="15">小</option><option value="16" selected>中</option><option value="18">大</option></select>
        </label>
        <label class="editor__sel"><span class="visually-hidden">行宽</span>
          <select id="lineWidth" aria-label="行宽"><option value="680" selected>标准</option><option value="820">宽</option></select>
        </label>
        <label class="editor__chk"><input type="checkbox" id="syncScroll" checked /> 同步滚动</label>
        <button class="btn" type="button" id="exportBtn" aria-haspopup="menu" aria-expanded="false">导出 ▾</button>
        <div class="editor__menu" id="exportMenu" role="menu" hidden>
          <button role="menuitem" type="button" data-exp="md">下载 .md</button>
          <button role="menuitem" type="button" data-exp="html">导出内联样式 HTML</button>
          <button role="menuitem" type="button" data-exp="print">打印 / 存 PDF</button>
          <button role="menuitem" type="button" data-exp="platform">平台适配导出…</button>
        </div>
      </div>

      <div class="editor__tabs" role="tablist" aria-label="编辑与预览切换">
        <button class="editor__tab is-on" role="tab" aria-selected="true" data-tab="edit" type="button">编辑</button>
        <button class="editor__tab" role="tab" aria-selected="false" data-tab="preview" type="button">预览</button>
      </div>

      <div class="editor__split">
        <section class="editor__pane editor__pane--edit" aria-label="Markdown 编辑区">
          <div class="editor__gutter" id="gutter" aria-hidden="true"></div>
          <textarea class="editor__ta" id="ta" spellcheck="false" aria-label="Markdown 输入"></textarea>
          <div class="editor__empty" id="emptyHint">
            <p><b>把 .md 文件拖进来</b>，或直接开始写</p>
            <ul class="editor__keys">
              <li><kbd>⌘/Ctrl</kbd>+<kbd>B</kbd> 加粗 · <kbd>I</kbd> 斜体 · <kbd>K</kbd> 链接</li>
              <li><kbd>⌘/Ctrl</kbd>+<kbd>S</kbd> 保存草稿 · <kbd>⌘/Ctrl</kbd>+<kbd>/</kbd> 插入代码块</li>
              <li><kbd>Tab</kbd> 缩进两格 · <kbd>Esc</kbd> 离开输入框</li>
            </ul>
          </div>
        </section>

        <div class="editor__splitter" role="separator" aria-orientation="vertical" aria-valuemin="24" aria-valuemax="76" aria-valuenow="50" tabindex="0" title="拖动调整宽度，双击复位"></div>

        <section class="editor__pane editor__pane--preview" aria-label="预览">
          <div class="editor__preview markdown-body" id="preview"></div>
        </section>
      </div>

      <div id="ccPanel" hidden></div>

      <div class="editor__status">
        <span id="statusSave" class="editor__saved"><i class="cc-status-dot"></i>未保存</span>
        <span class="editor__spacer"></span>
        <span id="wordCount">0 字</span>
        <span id="readTime">约 0 分钟</span>
        <span id="cursorPos">行 1 · 列 1</span>
      </div>
    </div>`;

  const ta = root.querySelector('#ta');
  const gutter = root.querySelector('#gutter');
  const preview = root.querySelector('#preview');
  const emptyHint = root.querySelector('#emptyHint');
  const statusSave = root.querySelector('#statusSave');
  const wordCount = root.querySelector('#wordCount');
  const readTime = root.querySelector('#readTime');
  const cursorPos = root.querySelector('#cursorPos');

  const draft = loadDraft();
  ta.value = (draft && draft.text) || SAMPLE;

  /* ---------- 编辑历史（自管栈，用于按钮置灰） ---------- */
  const history = { stack: [ta.value], at: 0, timer: null };
  const undoBtn = root.querySelector('[data-act="undo"]');
  const redoBtn = root.querySelector('[data-act="redo"]');
  function syncHistoryBtn() {
    if (undoBtn) undoBtn.disabled = history.at <= 0;
    if (redoBtn) redoBtn.disabled = history.at >= history.stack.length - 1;
  }
  function pushHistory() {
    const v = ta.value;
    if (v === history.stack[history.at]) return;
    history.stack = history.stack.slice(0, history.at + 1);
    history.stack.push(v);
    if (history.stack.length > 120) history.stack.shift();
    history.at = history.stack.length - 1;
    syncHistoryBtn();
  }
  const initHistory = () => {
    ta.addEventListener('input', () => { clearTimeout(history.timer); history.timer = setTimeout(pushHistory, 250); });
    ta.addEventListener('blur', () => { clearTimeout(history.timer); pushHistory(); });
    syncHistoryBtn();
  };
  initHistory();

  const autosave = initAutosave(ta, { onStatus: (t) => { statusSave.textContent = t; } });
  if (draft && draft.updatedAt) {
    const d = new Date(draft.updatedAt);
    statusSave.textContent = '已保存于 ' + String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
  }

  const syncGutter = () => {
    const lines = ta.value.split('\n').length;
    if (gutter.childElementCount !== lines) {
      gutter.innerHTML = Array.from({ length: lines }, (_, i) => '<span>' + (i + 1) + '</span>').join('');
    }
    gutter.scrollTop = ta.scrollTop;
  };

  let timer = null;
  const update = () => {
    const val = ta.value;
    emptyHint.hidden = val.trim().length > 0;
    syncGutter();

    const raw = val.replace(/[#>*\-\[\]()|`~]/g, ' ').replace(/\s+/g, ' ').trim();
    const chars = raw.length;
    wordCount.textContent = chars + ' 字';
    readTime.textContent = '约 ' + Math.max(1, Math.round(chars / 350)) + ' 分钟';

    clearTimeout(timer);
    timer = setTimeout(() => {
      const out = renderMarkdown(val, { onCopy: toast });
      // 用真实元素替换：保留 Mermaid/KaTeX/灯箱/复制按钮的事件与异步装饰
      preview.replaceChildren(out.element);
      preview.querySelectorAll('img').forEach((img) => { img.style.cursor = 'zoom-in'; });
    }, 180);
  };

  const hl = mountHighlight(ta, ta.parentElement);
  const paintAll = () => { hl.update(); };
  ta.addEventListener('input', paintAll);

  ta.addEventListener('input', update);
  ta.addEventListener('scroll', () => {
    gutter.scrollTop = ta.scrollTop;
    if (!root.querySelector('#syncScroll').checked) return;
    const p = ta.scrollTop / Math.max(1, ta.scrollHeight - ta.clientHeight);
    preview.scrollTop = p * (preview.scrollHeight - preview.clientHeight);
  });
  ta.addEventListener('keyup', () => {
    const upto = ta.value.slice(0, ta.selectionStart);
    const line = upto.split('\n').length;
    const col = upto.length - upto.lastIndexOf('\n');
    cursorPos.textContent = '行 ' + line + ' · 列 ' + col;
  });
  ta.addEventListener('dragover', (e) => { e.preventDefault(); });
  ta.addEventListener('drop', async (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files && e.dataTransfer.files[0];
    if (!file) return;
    ta.value = await file.text();
    ta.dispatchEvent(new Event('input', { bubbles: true }));
    toast('已打开 ' + file.name);
  });

  // 工具栏
  const insert = (before, after = '', ph = '') => {
    const s = ta.selectionStart, en = ta.selectionEnd;
    const sel = ta.value.slice(s, en) || ph;
    ta.value = ta.value.slice(0, s) + before + sel + after + ta.value.slice(en);
    ta.selectionStart = s + before.length;
    ta.selectionEnd = s + before.length + sel.length;
    ta.dispatchEvent(new Event('input', { bubbles: true }));
    ta.focus();
  };
  const linePrefix = (prefix) => {
    const s = ta.selectionStart;
    const start = ta.value.lastIndexOf('\n', s - 1) + 1;
    ta.value = ta.value.slice(0, start) + prefix + ta.value.slice(start);
    ta.dispatchEvent(new Event('input', { bubbles: true }));
  };

  root.querySelectorAll('.editor__tool').forEach((btn) => {
    btn.addEventListener('click', () => {
      const act = btn.dataset.act;
      if (act === 'undo') {
        clearTimeout(history.timer); pushHistory();
        if (history.at > 0) { history.at--; ta.value = history.stack[history.at]; ta.dispatchEvent(new Event('input', { bubbles: true })); }
        syncHistoryBtn(); return;
      }
      if (act === 'redo') {
        if (history.at < history.stack.length - 1) { history.at++; ta.value = history.stack[history.at]; ta.dispatchEvent(new Event('input', { bubbles: true })); }
        syncHistoryBtn(); return;
      }
      if (act === 'h1') return linePrefix('# ');
      if (act === 'h2') return linePrefix('## ');
      if (act === 'h3') return linePrefix('### ');
      if (act === 'bold') return insert('**', '**', '粗体');
      if (act === 'italic') return insert('*', '*', '斜体');
      if (act === 'strike') return insert('~~', '~~', '删除线');
      if (act === 'ul') return linePrefix('- ');
      if (act === 'ol') return linePrefix('1. ');
      if (act === 'quote') return linePrefix('> ');
      if (act === 'code') return insert('\n```js\n', '\n```\n', 'console.log(1)');
      if (act === 'table') return insert('\n| 列 1 | 列 2 |\n| --- | --- |\n| 值 1 | 值 2 |\n');
      if (act === 'link') return insert('[', '](https://)', '链接文字');
      if (act === 'image') return insert('![', '](https://)', '图片描述');
      if (act === 'underline') return insert('<u>', '</u>', '下划线');
      if (act === 'hlt') return insert('==', '==', '高亮');
      if (act === 'sup') return insert('^', '^', '上标');
      if (act === 'sub') return insert('~', '~', '下标');
      if (act === 'inlinecode') return insert('`', '`', '代码');
      if (act === 'hr') return insert('\n\n---\n\n');
      if (act === 'task') return linePrefix('- [ ] ');
      if (act === 'new') { ta.value = ''; ta.dispatchEvent(new Event('input', { bubbles: true })); toast('已新建空白文档'); return; }
      if (act === 'open') { root.querySelector('#fileInput').click(); return; }
    });
  });

  root.querySelector('#fileInput').addEventListener('change', async (e) => {
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    ta.value = await f.text();
    ta.dispatchEvent(new Event('input', { bubbles: true }));
    toast('已打开 ' + f.name);
    e.target.value = '';
  });

  // 导出
  const exportBtn = root.querySelector('#exportBtn');
  const exportMenu = root.querySelector('#exportMenu');
  exportBtn.addEventListener('click', () => {
    const open = exportMenu.hidden;
    exportMenu.hidden = !open;
    exportBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
  });
  const closeExportMenu = () => { exportMenu.hidden = true; exportBtn.setAttribute('aria-expanded', 'false'); };
  document.addEventListener('click', (e) => {
    if (!exportMenu.hidden && !e.target.closest('#exportMenu') && !e.target.closest('#exportBtn')) closeExportMenu();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !exportMenu.hidden) closeExportMenu();
    if (e.key === 'Escape' && !panel.hidden) panel.hidden = true;
  });

  exportMenu.addEventListener('click', (e) => {
    const b = e.target.closest('[data-exp]');
    if (!b) return;
    exportMenu.hidden = true;
    exportBtn.setAttribute('aria-expanded', 'false');
    if (b.dataset.exp === 'md') { exportMarkdown(ta.value, 'mkdownpost-draft'); toast('已下载 .md'); }
    if (b.dataset.exp === 'html') { exportInlineHTMLFile(preview, 'mkdownpost-export', '导出稿'); toast('已导出内联样式 HTML'); }
    if (b.dataset.exp === 'print') { printDoc(preview); }
    if (b.dataset.exp === 'platform') { openPlatformPanel(); }
  });

  // 字号 / 行宽
  root.querySelector('#fontSize').addEventListener('change', (e) => {
    ta.style.fontSize = e.target.value + 'px';
    preview.style.fontSize = e.target.value + 'px';
  });
  root.querySelector('#lineWidth').addEventListener('change', (e) => {
    preview.style.maxWidth = e.target.value + 'px';
    preview.style.margin = '0 auto';
  });

  // 移动端标签切换
  root.querySelectorAll('.editor__tab').forEach((tab) => {
    tab.addEventListener('click', () => {
      const which = tab.dataset.tab;
      root.querySelectorAll('.editor__tab').forEach((t) => {
        t.classList.toggle('is-on', t === tab);
        t.setAttribute('aria-selected', t === tab ? 'true' : 'false');
      });
      root.querySelector('.editor').setAttribute('data-tab', which);
    });
  });

  initSplitPane(root.querySelector('.editor'));
  const doUndo = (isRedo) => {
    clearTimeout(history.timer); pushHistory();
    if (isRedo) { if (history.at < history.stack.length - 1) { history.at++; ta.value = history.stack[history.at]; ta.dispatchEvent(new Event('input', { bubbles: true })); } }
    else if (history.at > 0) { history.at--; ta.value = history.stack[history.at]; ta.dispatchEvent(new Event('input', { bubbles: true })); }
    syncHistoryBtn();
  };

  initShortcuts(ta, {
    onUndo: doUndo,
    onSave: () => { autosave.save(); toast('草稿已保存'); },
    onInsertCode: () => insert('\n```js\n', '\n```\n', 'console.log(1)'),
    toast
  });

  /* ---------- 平台适配面板（Claude Code 风格：思考态 → 结果卡片 → 复制） ---------- */
  const panel = root.querySelector('#ccPanel');
  let activePlat = null;

  function openPlatformPanel() {
    panel.hidden = false;
    const ads = Adapters.list();
    panel.innerHTML = [
      '<div class="cc-panel">',
      '<div class="cc-panel__head"><span class="cc-spin">✳</span><b>平台适配导出</b>',
      '<span class="muted" style="margin-left:auto;font-size:12px">选平台 → 看处理说明 → 复制 HTML</span></div>',
      '<div class="cc-panel__body"><div class="cc-plat" id="ccPlats">',
      ads.map((a) => '<button class="cc-plat__chip" type="button" data-plat="' + a.key + '" data-status="' + a.status + '">' + a.name + '</button>').join(''),
      '</div><div id="ccResult"></div></div>',
      '<div class="cc-panel__foot"><button class="btn" type="button" id="ccCopy">复制 HTML</button>',
      '<button class="btn" type="button" id="ccClose" style="margin-left:auto">关闭</button></div>',
      '</div>'
    ].join('');

    panel.querySelector('#ccClose').addEventListener('click', () => { panel.hidden = true; });
    panel.querySelectorAll('[data-plat]').forEach((chip) => {
      chip.addEventListener('click', () => runAdapter(chip.dataset.plat, chip));
    });
    panel.querySelector('#ccCopy').addEventListener('click', async () => {
      if (!activePlat) { toast('先选一个平台'); return; }
      try { await navigator.clipboard.writeText(activePlat.html); toast('已复制 ' + activePlat.name + ' 的 HTML'); }
      catch { toast('复制失败，请手动选择'); }
    });
    panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  async function runAdapter(key, chip) {
    const result = panel.querySelector('#ccResult');
    panel.querySelectorAll('[data-plat]').forEach((c) => c.classList.toggle('is-on', c === chip));
    result.innerHTML = '';
    const ad = Adapters.get(key);
    const stop = thinking(result, '正在适配 ' + ad.name);
    await new Promise((r) => setTimeout(r, 260));
    stop();

    const out = Adapters.run(key, ta.value);
    activePlat = { name: ad.name, html: out.html };

    const cards = noteCards(out.notes, { title: ad.name + ' · 处理说明' });
    result.appendChild(cards);

    const prev = document.createElement('div');
    prev.className = 'cc-panel';
    prev.innerHTML = '<div class="cc-panel__head"><span class="cc-card__dot"></span>渲染预览（' + ad.name + '）</div>';
    const body = document.createElement('div');
    body.className = 'cc-panel__body markdown-body';
    body.innerHTML = out.html;
    prev.appendChild(body);
    result.appendChild(prev);
    streamReveal(result.querySelector('.cc-cards') || result, { step: 40 });
  }

  update();
  streamReveal(preview, { step: 30 });
  ta.focus({ preventScroll: true });
}
