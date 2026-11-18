/* src/pages/wechat.js — 微信排版工具
   设计约束：一切视觉走 MkDownPost 既有令牌（--c-* / --r-* / --sp-* / --dur-*）。
   只借鉴参考站的"左编辑 + 右手机预览 + 一键复制"结构，配色/圆角/动效全部用本站。
*/
import { renderMarkdown } from '../markdown/renderer.js';
import { exportInlineHTML } from '../editor/export.js';

const PRESETS = {
  standard: { label: '标准', fs: 16, lh: 1.75, ls: 0, gap: '1em' },
  loose: { label: '宽松', fs: 16, lh: 2.0, ls: 0.01, gap: '1.4em' },
  compact: { label: '紧凑', fs: 15, lh: 1.62, ls: 0, gap: '0.8em' },
  large: { label: '大字', fs: 18, lh: 1.85, ls: 0.01, gap: '1.2em' }
};

const SAMPLE = [
  '# 欢迎使用微信排版工具',
  '',
  '左边写 Markdown，右边就是粘进公众号后的样子。样式全部内联，粘贴不会丢。',
  '',
  '## 三步走完',
  '',
  '1. 在左侧写或粘贴稿子',
  '2. 选一个排版预设',
  '3. 点「一键复制到公众号」',
  '',
  '> 复制的是富文本，直接粘到公众号编辑器里即可。',
  '',
  '### 支持的元素',
  '',
  '- 标题、列表、引用、表格',
  '- 行内代码与代码块',
  '- 图片与外链',
  '',
  '| 元素 | 公众号表现 |',
  '| --- | --- |',
  '| 标题 | 自动层级 |',
  '| 代码块 | 等宽 + 底纹 |',
  '',
  '现在，把上面的示例全选删掉，换成你自己的稿子。'
].join('\n');

export default function renderWechat(root) {
  const KEY = 'mdp:v1:wechat';
  let saved = {};
  try { saved = JSON.parse(localStorage.getItem(KEY) || '{}'); } catch (e) { saved = {}; }

  const options = Object.keys(PRESETS).map(function (k) {
    return '<option value="' + k + '">' + PRESETS[k].label + '</option>';
  }).join('');

  root.innerHTML = [
    '<div class="wx">',
    '  <header class="wx__bar">',
    '    <div class="wx__titles">',
    '      <h1 class="wx__h1">微信排版工具</h1>',
    '      <p class="wx__sub">左边写，右边就是粘进公众号后的样子</p>',
    '    </div>',
    '    <div class="wx__actions">',
    '      <label class="editor__style">',
    '        <span>排版</span>',
    '        <select id="wxPreset" aria-label="排版预设">' + options + '</select>',
    '      </label>',
    '      <button class="btn btn--primary" id="wxCopy" type="button">一键复制到公众号</button>',
    '    </div>',
    '  </header>',
    '  <div class="wx__split">',
    '    <section class="wx__pane wx__pane--edit">',
    '      <textarea class="wx__ta" id="wxTa" spellcheck="false" aria-label="Markdown 输入"></textarea>',
    '    </section>',
    '    <section class="wx__pane wx__pane--preview">',
    '      <div class="wx__phone"><div class="wx__phone-inner">',
    '        <div class="md-body wx__body" id="wxPreview"></div>',
    '      </div></div>',
    '    </section>',
    '  </div>',
    '  <footer class="wx__status">',
    '    <span id="wxCount">0 字</span>',
    '    <span id="wxMsg" class="wx__msg">样式内联导出，粘贴不丢格式</span>',
    '  </footer>',
    '</div>'
  ].join('');

  const ta = root.querySelector('#wxTa');
  const preview = root.querySelector('#wxPreview');
  const presetSel = root.querySelector('#wxPreset');
  const msg = root.querySelector('#wxMsg');
  const count = root.querySelector('#wxCount');
  const copyBtn = root.querySelector('#wxCopy');

  ta.value = saved.text || SAMPLE;
  presetSel.value = saved.preset || 'standard';

  function applyPreset(key) {
    const p = PRESETS[key] || PRESETS.standard;
    preview.style.fontSize = p.fs + 'px';
    preview.style.lineHeight = String(p.lh);
    preview.style.letterSpacing = p.ls ? p.ls + 'em' : 'normal';
    preview.querySelectorAll('p, li').forEach(function (el) { el.style.marginBottom = p.gap; });
  }

  let timer = null;
  function render() {
    try {
      const res = renderMarkdown(ta.value);     // { html, element, headings, engine }
      preview.innerHTML = '';
      if (res && res.element && res.element.nodeType === 1) preview.appendChild(res.element);
      else if (res && typeof res.html === 'string') preview.innerHTML = res.html;
    } catch (e) {
      preview.textContent = '渲染失败：' + (e && e.message ? e.message : e);
    }
    applyPreset(presetSel.value);
    count.textContent = ta.value.replace(/\s/g, '').length + ' 字';
    try { localStorage.setItem(KEY, JSON.stringify({ text: ta.value, preset: presetSel.value })); } catch (e) {}
  }

  ta.addEventListener('input', function () { clearTimeout(timer); timer = setTimeout(render, 180); });
  presetSel.addEventListener('change', function () { applyPreset(presetSel.value); render(); });

  copyBtn.addEventListener('click', async function () {
    const html = exportInlineHTML(preview, '公众号稿件');
    const text = preview.innerText;
    try {
      if (navigator.clipboard && window.ClipboardItem) {
        await navigator.clipboard.write([new ClipboardItem({
          'text/html': new Blob([html], { type: 'text/html' }),
          'text/plain': new Blob([text], { type: 'text/plain' })
        })]);
      } else {
        const range = document.createRange();
        range.selectNodeContents(preview);
        const sel = window.getSelection();
        sel.removeAllRanges(); sel.addRange(range);
        document.execCommand('copy');
        sel.removeAllRanges();
      }
      msg.textContent = '已复制 ' + html.length + ' 字符，去公众号 Ctrl+V';
      msg.classList.add('is-ok');
    } catch (e) {
      msg.textContent = '复制失败：' + (e && e.message ? e.message : '浏览器不支持');
      msg.classList.remove('is-ok');
    }
    setTimeout(function () { msg.textContent = '样式内联导出，粘贴不丢格式'; msg.classList.remove('is-ok'); }, 4000);
  });

  render();
  return { destroy: function () {} };
}
