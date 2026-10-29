/* src/adapters/github.js — GitHub README：原生 Markdown 风格 HTML，含任务列表 */
export default {
  key: 'github', name: 'GitHub README', status: 'stable',
  desc: '原生 GFM：保留任务列表 checkbox 与脚注引用',
  transform(md, { renderMarkdown }) {
    const notes = [];
    const { element } = renderMarkdown(md);
    const clone = element.cloneNode(true);
    clone.querySelectorAll('.md-anchor, .md-copy, .md-codebar').forEach((n) => n.remove());
    clone.querySelectorAll('input[type="checkbox"]').forEach((box) => box.removeAttribute('disabled'));
    notes.push('任务列表 checkbox 保留（GitHub 原生支持）');
    notes.push('Mermaid：GitHub 已原生支持 \`\`\`mermaid 代码块，无需转换');
    return { html: clone.innerHTML, notes };
  }
};
