/* src/adapters/csdn.js — CSDN：兼容性保守，去掉自定义容器，表格转标准 table */
export default {
  key: 'csdn', name: 'CSDN', status: 'stable',
  desc: '保守兼容：移除自定义容器、表格标准化',
  transform(md, { renderMarkdown }) {
    const notes = [];
    const { element } = renderMarkdown(md);
    const clone = element.cloneNode(true);
    clone.querySelectorAll('.md-anchor, .md-copy, .md-codebar').forEach((n) => n.remove());
    clone.querySelectorAll('.md-table').forEach((box) => box.replaceWith(box.querySelector('table') || box));
    clone.querySelectorAll('.md-imgwrap').forEach((wrap) => wrap.replaceWith(wrap.querySelector('img') || wrap));
    notes.push('已移除自定义容器（.md-table / .md-imgwrap），只保留标准标签');
    notes.push('CSDN 自带代码高亮，粘贴后语言可能被重置，需手动选择');
    return { html: clone.innerHTML, notes };
  }
};
