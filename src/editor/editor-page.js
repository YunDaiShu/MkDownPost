/* src/editor/editor-page.js — 编辑器：工具栏 / 分栏 / 行号 / 预览 / 状态栏 / 导出（无任何 AI 功能） */
import { renderMarkdown } from '../markdown/renderer.js?v=vmvtgt26r';
import { initSplitPane } from './split-pane.js?v=vmvtgt26r';
import { initShortcuts } from './shortcuts.js?v=vmvtgt26r';
import { initAutosave } from './autosave.js?v=vmvtgt26r';
import { exportMarkdown, exportInlineHTMLFile, printDoc, exportWordHTML, printDocWithTemplate, exportPng, exportPdf } from './export.js';
import { initTabs, saveAll, addTab, closeTab, renameTab, updateText } from './tabs.js?v=vmvtgt26r';
import { toast } from '../components/theme-switcher.js?v=vmvtgt26r';
import { mountHighlight } from './highlight-layer.js?v=vmvtgt26r';
import { mountMathPreview } from './math-preview.js?v=vmvtgt26r';
import { streamReveal, thinking, noteCards } from '../components/cc-fx.js?v=vmvtgt26r';
import * as Adapters from '../adapters/index.js?v=vmvtgt26r';

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
  { act: 'history', label: '编辑历史', icon: S('<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.5 2"/>') },
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
  { act: 'hl', label: '语法高亮（默认关闭）', icon: S('<path d="M4 20l6-6"/><path d="M14 4l6 6-6 6-6-6z"/>') },
  { act: 'hr', label: '分隔线', icon: S('<path d="M3 12h18"/><path d="M6 6h12M6 18h12" opacity=".35"/>') }
];

export default function render(root) {
  root.innerHTML = `
    <div class="editor">
      <div class="tabs" role="tablist" aria-label="草稿标签" id="tabBar"></div>

      <div class="editor__bar" role="toolbar" aria-label="编辑工具栏">
        ${TOOLS.map((t) => t.sep
          ? '<span class="editor__sep" aria-hidden="true"></span>'
          : '<button class="editor__tool" type="button" data-act="' + t.act + '" aria-label="' + t.label + '" title="' + t.label + '">' + t.icon + '</button>').join('')}
        <input type="file" id="fileInput" accept=".md,.markdown,.txt" class="visually-hidden" />
        <span class="editor__spacer"></span>
        <div class="seg" role="group" aria-label="字号">
          <button class="seg__btn" type="button" data-fs="15">小</button>
          <button class="seg__btn is-on" type="button" data-fs="16">中</button>
          <button class="seg__btn" type="button" data-fs="18">大</button>
        </div>
        <div class="seg" role="group" aria-label="行宽">
          <button class="seg__btn is-on" type="button" data-lw="680">标准</button>
          <button class="seg__btn" type="button" data-lw="820">宽</button>
        </div>
        <label class="editor__chk"><input type="checkbox" id="syncScroll" checked /> 同步滚动</label>
        <button class="btn" type="button" id="exportBtn" aria-haspopup="menu" aria-expanded="false">导出 ▾</button>
        <div class="editor__menu" id="exportMenu" role="menu" hidden>
          <button role="menuitem" type="button" data-exp="md">下载 .md</button>
          <button role="menuitem" type="button" data-exp="html">导出内联样式 HTML</button>
          <button role="menuitem" type="button" data-exp="word">导出 Word（.doc）</button>
          <button role="menuitem" type="button" data-exp="pdf">导出 PDF（A4 · 无打印框）</button>
          <button role="menuitem" type="button" data-exp="print">打印预览（主题色）</button>
          <button role="menuitem" type="button" data-exp="print-min">打印预览（极简黑白）</button>
          <button role="menuitem" type="button" data-exp="png">导出 PNG 长图</button>
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
          <textarea class="editor__ta" id="ta" spellcheck="false" wrap="off" aria-label="Markdown 输入"></textarea>
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

      <div id="historyPanel" class="hist" hidden></div>
      <div id="ccPanel" hidden></div>

      <div class="editor__status">
        <span id="statusSave" class="editor__saved"><i class="cc-status-dot"></i>未保存</span>
        <span class="editor__spacer"></span>
        <span id="wordCount">0 字</span>
        <span id="readTime">约 0 分钟</span>
        <span id="cursorPos">行 1 · 列 1</span>
      </div>
    </div>`;

  /* ---------- 偏好持久化（字号 / 行宽 / 同步滚动） ---------- */
  const PREFS_KEY = 'mdp:v1:prefs';
  const readPrefs = () => { try { return JSON.parse(localStorage.getItem(PREFS_KEY) || '{}'); } catch { return {}; } };
  const savePrefs = (patch) => {
    try { localStorage.setItem(PREFS_KEY, JSON.stringify({ ...readPrefs(), ...patch })); } catch { /* 忽略 */ }
  };
  const prefs = readPrefs();

  const ta = root.querySelector('#ta');
  const gutter = root.querySelector('#gutter');
  const preview = root.querySelector('#preview');
  const emptyHint = root.querySelector('#emptyHint');
  const statusSave = root.querySelector('#statusSave');
  const wordCount = root.querySelector('#wordCount');
  const readTime = root.querySelector('#readTime');
  const cursorPos = root.querySelector('#cursorPos');

  /* ---------- 多标签页 ---------- */
  const tabState = initTabs(SAMPLE);
  let tabs = tabState.tabs;
  let activeTab = tabState.active;

  const tabBar = root.querySelector('#tabBar');

  function currentTab() { return tabs.find((t) => t.id === activeTab) || tabs[0]; }

  function persist() {
    tabs = updateText(tabs, activeTab, ta.value);
    saveAll(tabs, activeTab);
  }

  function paintTabs() {
    tabBar.innerHTML = tabs.map((t) => {
      const on = t.id === activeTab;
      return '<div class="tabs__item' + (on ? ' is-on' : '') + '" role="tab" aria-selected="' + on + '" data-tab="' + t.id + '">' +
        '<span class="tabs__name" data-rename="' + t.id + '" title="双击重命名">' + (t.name || '未命名') + '</span>' +
        (tabs.length > 1 ? '<button class="tabs__close" type="button" data-close="' + t.id + '" aria-label="关闭标签">×</button>' : '') +
        '</div>';
    }).join('') + '<button class="tabs__add" type="button" id="tabAdd" aria-label="新建标签">+</button>';
  }

  function switchTo(id) {
    if (id === activeTab) return;
    persist();
    activeTab = id;
    saveAll(tabs, activeTab);
    ta.value = currentTab().text || '';
    ta.dispatchEvent(new Event('input', { bubbles: true }));
    paintTabs();
    ta.focus();
  }

  tabBar.addEventListener('click', (e) => {
    const closeBtn = e.target.closest('[data-close]');
    if (closeBtn) {
      const id = closeBtn.getAttribute('data-close');
      const r2 = closeTab(tabs, activeTab, id);
      tabs = r2.tabs; activeTab = r2.active;
      saveAll(tabs, activeTab);
      ta.value = currentTab().text || '';
      ta.dispatchEvent(new Event('input', { bubbles: true }));
      paintTabs();
      return;
    }
    if (e.target.closest('#tabAdd')) {
      persist();
      const r3 = addTab(tabs);
      tabs = r3.tabs; activeTab = r3.active;
      saveAll(tabs, activeTab);
      ta.value = '';
      ta.dispatchEvent(new Event('input', { bubbles: true }));
      paintTabs();
      ta.focus();
      return;
    }
    const item = e.target.closest('[data-tab]');
    if (item) switchTo(item.getAttribute('data-tab'));
  });

  tabBar.addEventListener('dblclick', (e) => {
    const nameEl = e.target.closest('[data-rename]');
    if (!nameEl) return;
    const id = nameEl.getAttribute('data-rename');
    const cur = tabs.find((t) => t.id === id);
    const next = prompt('标签名', cur ? cur.name : '');
    if (next !== null) { tabs = renameTab(tabs, id, next.trim()); saveAll(tabs, activeTab); paintTabs(); }
  });

  paintTabs();
  ta.value = currentTab().text || SAMPLE;


  /* ---------- 编辑历史（自管栈，用于按钮置灰） ---------- */
  const history = { stack: [{ v: ta.value, t: Date.now() }], at: 0, timer: null };
  const undoBtn = root.querySelector('[data-act="undo"]');
  const redoBtn = root.querySelector('[data-act="redo"]');
  function syncHistoryBtn() {
    if (undoBtn) undoBtn.disabled = history.at <= 0;
    if (redoBtn) redoBtn.disabled = history.at >= history.stack.length - 1;
  }
  function pushHistory() {
    const v = ta.value;
    if (v === history.stack[history.at].v) return;
    history.stack = history.stack.slice(0, history.at + 1);
    history.stack.push({ v, t: Date.now() });
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

  /* ---------- 语法高亮：默认关闭，需要时手动开（叠加层有重影风险） ---------- */
  const HL_KEY = 'mdp:v1:prefs';
  const readHlPref = () => { try { return JSON.parse(localStorage.getItem(HL_KEY) || '{}').highlight === true; } catch { return false; } };
  const saveHlPref = (on) => { try { const p = JSON.parse(localStorage.getItem(HL_KEY) || '{}'); localStorage.setItem(HL_KEY, JSON.stringify({ ...p, highlight: on })); } catch { /* 忽略 */ } };
  let hl = null;
  const hlBtn = root.querySelector('[data-act="hl"]');
  const setHlButton = (on) => { if (hlBtn) { hlBtn.classList.toggle('is-on', on); hlBtn.setAttribute('aria-pressed', String(on)); } };
  function enableHighlight() {
    if (hl) return;
    hl = mountHighlight(ta, ta.parentElement, (() => { try { return (JSON.parse(localStorage.getItem(HL_KEY) || '{}').fontSize) || 16; } catch { return 16; } })());
    if (hl && hl.setFontSize) hl.setFontSize(prefs.fontSize || 16);
    setHlButton(true);
  }
  function disableHighlight() {
    if (hl && hl.destroy) hl.destroy();
    hl = null;
    setHlButton(false);
  }
  if (readHlPref()) enableHighlight();
  mountMathPreview(ta, ta.parentElement.closest('.editor__pane--edit'));
  const paintAll = () => { hl.update(); };
  ta.addEventListener('input', paintAll);
  ta.addEventListener('input', () => { persist(); });

  ta.addEventListener('input', update);
  let syncing = false;
  ta.addEventListener('scroll', () => {
    gutter.scrollTop = ta.scrollTop;
    const chk = root.querySelector('#syncScroll');
    if (!chk || !chk.checked || syncing) return;
    const max = ta.scrollHeight - ta.clientHeight;
    if (max <= 0) return;
    const p = ta.scrollTop / max;
    // 真正滚动的是右侧容器（#preview 只是内容），别对着内容设 scrollTop
    const pane = preview.closest('.editor__pane--preview') || preview;
    const pMax = pane.scrollHeight - pane.clientHeight;
    if (pMax <= 0) return;
    syncing = true;
    pane.scrollTop = p * pMax;
    requestAnimationFrame(() => { syncing = false; });
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
      if (act === 'undo') { doUndo(false); return; }
      if (act === 'redo') { doUndo(true); return; }
      if (act === 'history') { toggleHistoryPanel(); return; }
      if (act === 'hl') {
        if (hl) { disableHighlight(); saveHlPref(false); toast('已关闭语法高亮'); }
        else { enableHighlight(); saveHlPref(true); toast('已开启语法高亮'); }
        return;
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
    if (b.dataset.exp === 'print') { printDocWithTemplate(preview, 'brand'); toast('已打开打印预览：在「打印机」里选「另存为 PDF」才保存文件'); }
    if (b.dataset.exp === 'print-min') { printDocWithTemplate(preview, 'minimal'); toast('已打开打印窗口：在「打印机」里选「另存为 PDF」即可保存'); }
    if (b.dataset.exp === 'word') { exportWordHTML(preview, 'mkdownpost-doc', '导出稿'); toast('已导出 Word：打开时若提示格式不符，点「是」即可'); }
    if (b.dataset.exp === 'pdf') {
      toast('正在生成 PDF…');
      exportPdf(preview, 'mkdownpost').then((r2) => toast(r2.ok ? ('已生成 PDF（' + r2.pages + ' 页）') : ('PDF 失败：' + r2.reason)));
    }
    if (b.dataset.exp === 'png') {
      toast('正在生成长图…');
      exportPng(preview, 'mkdownpost').then((ok) => toast(ok ? '已导出 PNG 长图' : '长图生成失败（图片跨域限制）'));
    }
    if (b.dataset.exp === 'platform') { openPlatformPanel(); }
  });

  // 字号 / 行宽
  const syncChk = root.querySelector('#syncScroll');
  const fsBtns = [...root.querySelectorAll('[data-fs]')];
  const lwBtns = [...root.querySelectorAll('[data-lw]')];

  const applyFontSize = (v) => { ta.style.fontSize = v + 'px'; preview.style.fontSize = v + 'px'; if (hl && hl.setFontSize) hl.setFontSize(v); };
  const applyLineWidth = (v) => { preview.style.maxWidth = v + 'px'; preview.style.margin = '0 auto'; };
  const mark = (btns, attr, val) => btns.forEach((b) => {
    const on = String(b.getAttribute(attr)) === String(val);
    b.classList.toggle('is-on', on);
    b.setAttribute('aria-pressed', String(on));
  });

  const fsInit = prefs.fontSize || 16;
  if (hl && hl.setFontSize) hl.setFontSize(fsInit);
  const lwInit = prefs.lineWidth || 680;
  applyFontSize(fsInit); mark(fsBtns, 'data-fs', fsInit);
  applyLineWidth(lwInit); mark(lwBtns, 'data-lw', lwInit);
  if (typeof prefs.syncScroll === 'boolean') syncChk.checked = prefs.syncScroll;

  fsBtns.forEach((b) => b.addEventListener('click', () => {
    const v = Number(b.getAttribute('data-fs'));
    applyFontSize(v); mark(fsBtns, 'data-fs', v); savePrefs({ fontSize: v });
  }));
  lwBtns.forEach((b) => b.addEventListener('click', () => {
    const v = Number(b.getAttribute('data-lw'));
    applyLineWidth(v); mark(lwBtns, 'data-lw', v); savePrefs({ lineWidth: v });
  }));
  syncChk.addEventListener('change', (e) => savePrefs({ syncScroll: e.target.checked }));

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

  /* ---------- 历史面板（时间线） ---------- */
  function jumpTo(i) {
    history.at = i;
    ta.value = history.stack[i].v;
    ta.dispatchEvent(new Event('input', { bubbles: true }));
    syncHistoryBtn();
    paintHistory();
  }

  function paintHistory() {
    const box = root.querySelector('#historyPanel');
    if (!box || box.hidden) return;
    box.innerHTML = '<div class="hist__head"><b>编辑历史</b><span class="muted">' + history.stack.length + ' 个版本</span>' +
      '<button class="hist__close" type="button" aria-label="关闭">×</button></div><ol class="hist__list">' +
      history.stack.map((h, i) => {
        const d = new Date(h.t);
        const time = String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0') + ':' + String(d.getSeconds()).padStart(2, '0');
        const first = (h.v.split('\n').find((l) => l.trim()) || '（空）').slice(0, 28);
        return '<li><button type="button" data-hist="' + i + '" class="hist__item' + (i === history.at ? ' is-on' : '') + '">' +
          '<span class="hist__time">' + time + '</span><span class="hist__txt">' + first.replace(/[<>&]/g, '') + '</span>' +
          '<span class="hist__size">' + h.v.length + '</span></button></li>';
      }).join('') + '</ol>';
  }

  function toggleHistoryPanel() {
    const box = root.querySelector('#historyPanel');
    if (!box) return;
    box.hidden = !box.hidden;
    if (!box.hidden) paintHistory();
  }

  root.querySelector('#historyPanel').addEventListener('click', (e) => {
    if (e.target.closest('.hist__close')) { root.querySelector('#historyPanel').hidden = true; return; }
    const b = e.target.closest('[data-hist]');
    if (b) jumpTo(Number(b.getAttribute('data-hist')));
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
