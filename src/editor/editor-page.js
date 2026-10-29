/* src/editor/editor-page.js — 编辑器：工具栏 / 分栏 / 行号 / 预览 / 状态栏 / 导出（无任何 AI 功能） */
import { renderMarkdown } from '../markdown/renderer.js';
import { initSplitPane } from './split-pane.js';
import { initShortcuts } from './shortcuts.js';
import { initAutosave, loadDraft } from './autosave.js';
import { exportMarkdown, exportInlineHTMLFile, printDoc } from './export.js';
import { toast } from '../components/theme-switcher.js';
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

const TOOLS = [
  { act: 'undo', label: '撤销', icon: '↺' },
  { act: 'redo', label: '重做', icon: '↻' },
  { sep: 1 },
  { act: 'h1', label: '一级标题', icon: 'H1' },
  { act: 'h2', label: '二级标题', icon: 'H2' },
  { act: 'h3', label: '三级标题', icon: 'H3' },
  { sep: 1 },
  { act: 'bold', label: '加粗', icon: 'B' },
  { act: 'italic', label: '斜体', icon: 'I' },
  { act: 'strike', label: '删除线', icon: 'S' },
  { sep: 1 },
  { act: 'ul', label: '无序列表', icon: '•' },
  { act: 'ol', label: '有序列表', icon: '1.' },
  { act: 'quote', label: '引用', icon: '❝' },
  { act: 'code', label: '代码块', icon: '{ }' },
  { act: 'table', label: '表格', icon: '▦' },
  { act: 'link', label: '链接', icon: '🔗' },
  { act: 'image', label: '图片', icon: '🖼' }
];

export default function render(root) {
  root.innerHTML = `
    <div class="editor">
      <div class="editor__bar" role="toolbar" aria-label="编辑工具栏">
        ${TOOLS.map((t) => t.sep
          ? '<span class="editor__sep" aria-hidden="true"></span>'
          : '<button class="editor__tool" type="button" data-act="' + t.act + '" aria-label="' + t.label + '" title="' + t.label + '">' + t.icon + '</button>').join('')}
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
      if (act === 'undo') { ta.focus(); document.execCommand('undo'); return; }
      if (act === 'redo') { ta.focus(); document.execCommand('redo'); return; }
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
    });
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
  initShortcuts(ta, {
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
