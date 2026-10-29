/* src/adapters/taptap.js — TapTap：Markdown 兼容差异处理（表格/任务列表降级） */
export default {
  key: 'taptap',
  name: 'TapTap',
  status: 'beta',
  desc: '任务列表降级 ☑/☐、表格转等宽文本',
  transform(md, { renderMarkdown }) {
    const notes = [];
    const { element } = renderMarkdown(md);
    const clone = element.cloneNode(true);
    clone.querySelectorAll('.md-anchor, .md-copy, .md-codebar').forEach((n) => n.remove());

    // 任务列表降级为普通符号列表
    clone.querySelectorAll('input[type="checkbox"]').forEach((box) => {
      const li = box.closest('li');
      const mark = box.checked ? '☑ ' : '☐ ';
      if (li) { li.insertBefore(document.createTextNode(mark), li.firstChild); }
      box.remove();
      notes.push('任务列表已降级为 ☑/☐ 文本（平台不支持 checkbox）');
    });

    // 表格转纯文本描述
    clone.querySelectorAll('.md-table').forEach((tbl) => {
      const rows = Array.from(tbl.querySelectorAll('tr')).map((tr) =>
        Array.from(tr.children).map((c) => c.textContent.trim()).join(' | '));
      const pre = document.createElement('pre');
      pre.setAttribute('style', 'white-space:pre-wrap;font-size:13px;');
      pre.textContent = rows.join('\n');
      tbl.replaceWith(pre);
      notes.push('表格已转为等宽文本（平台表格支持不稳定）');
    });

    notes.push('平台对 HTML 片段支持有限：建议粘贴后手动确认列表与图片');
    return { html: clone.innerHTML, notes };
  }
};
