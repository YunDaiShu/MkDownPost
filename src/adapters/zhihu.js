/* src/adapters/zhihu.js — 知乎：保留结构，代码块需可读，表格不宜过宽 */
export default {
  key: 'zhihu', name: '知乎', status: 'stable',
  desc: '结构保留、代码块限宽、表格横向滚动',
  transform(md, { renderMarkdown }) {
    const notes = [];
    let src = md;
    if (/\$\$[\s\S]+?\$\$/.test(src)) notes.push('知乎不支持公式渲染，$$...$$ 会显示为原文，建议改写成图片');
    const { element } = renderMarkdown(src);
    const clone = element.cloneNode(true);
    clone.querySelectorAll('.md-anchor, .md-copy, .md-codebar').forEach((n) => n.remove());
    clone.querySelectorAll('pre').forEach((pre) => pre.setAttribute('style', 'max-width:100%;overflow-x:auto;font-size:13px;'));
    clone.querySelectorAll('table').forEach((t) => t.setAttribute('style', 'max-width:100%;font-size:13px;'));
    notes.push('代码块与表格已限宽，避免撑破专栏正文宽度');
    return { html: clone.innerHTML, notes };
  }
};
