/* src/editor/highlight-layer.js — 编辑器语法高亮（textarea 透明文字 + 底层着色 <pre>）
   做法：textarea 文字透明、caret 保留；底层 pre 用同一字体/内边距渲染着色后的 HTML，双向同步滚动。 */

const esc = (s) => s.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));

/** 极简 Markdown token 着色（不追求完整语法，只求可读的层次） */
export function highlightMarkdown(src) {
  const lines = src.split('\n');
  let inFence = false;
  const out = lines.map((line) => {
    // 围栏：开/关行本身按代码色，中间整行也按代码色
    const fence = /^\s*(`{3,}|~{3,})/.test(line);
    if (fence) {
      inFence = !inFence;
      return '<span class="tok-codeblock">' + esc(line) + '</span>';
    }
    if (inFence) return '<span class="tok-codeblock">' + esc(line) + '</span>';

    // 围栏代码块内：整行按代码色
    let s = esc(line);

    // 标题
    const h = line.match(/^(#{1,6})\s(.*)$/);
    if (h) return '<span class="tok-h">' + esc(h[1]) + ' ' + esc(h[2]) + '</span>';

    // 引用
    if (/^\s*>/.test(line)) return '<span class="tok-quote">' + s + '</span>';

    // 列表
    if (/^\s*([-*+]|\d+\.)\s/.test(line)) s = '<span class="tok-list">' + s + '</span>';

    // 分隔线
    if (/^\s*([-*_])(\s*\1){2,}\s*$/.test(line)) return '<span class="tok-hr">' + s + '</span>';

    // 表格行
    if (/^\s*\|/.test(line)) s = '<span class="tok-table">' + s + '</span>';

    // 行内：代码 / 粗体 / 斜体 / 链接 / 删除线
    s = s.replace(/`([^`\n]*)`/g, '<span class="tok-code">`$1`</span>');
    s = s.replace(/\*\*([^*\n]+)\*\*/g, '<span class="tok-bold">**$1**</span>');
    s = s.replace(/~~([^~\n]+)~~/g, '<span class="tok-del">~~$1~~</span>');
    s = s.replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<span class="tok-em">*$2*</span>');
    s = s.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<span class="tok-link">[$1]</span><span class="tok-url">($2)</span>');
    s = s.replace(/(^|\s)(#{1,6}\s)/g, '$1<span class="tok-h">$2</span>');
    return s;
  });
  // 结尾补一个换行，保证最后一行高度与 textarea 一致
  return out.join('\n') + '\n';
}

/** 挂载高亮层：返回 update() 供输入/滚动时调用 */
export function mountHighlight(ta, host, initialFontSize) {
  const pre = document.createElement('pre');
  pre.className = 'editor__hl';
  pre.setAttribute('aria-hidden', 'true');
  const code = document.createElement('code');
  pre.appendChild(code);
  host.insertBefore(pre, ta);

  let raf = 0;
  const paint = () => {
    code.innerHTML = highlightMarkdown(ta.value);
    pre.scrollTop = ta.scrollTop;
    pre.scrollLeft = ta.scrollLeft;
  };
  const schedule = () => { if (raf) return; raf = requestAnimationFrame(() => { raf = 0; paint(); }); };

  // 字号必须与 textarea 完全一致，否则两层错位（文字被"切块"）
  const setFontSize = (px) => {
    const v = (px || 16) + 'px';
    pre.style.fontSize = v;
    pre.style.lineHeight = '1.7';   // 与 .editor__ta 保持一致，避免逐行错位
  };
  setFontSize(initialFontSize);
  ta.classList.add('editor__ta--hl');
  ta.addEventListener('input', schedule);
  ta.addEventListener('scroll', () => { pre.scrollTop = ta.scrollTop; pre.scrollLeft = ta.scrollLeft; });
  paint();

  return { update: schedule, setFontSize, destroy: () => { ta.classList.remove('editor__ta--hl'); pre.remove(); } };
}
