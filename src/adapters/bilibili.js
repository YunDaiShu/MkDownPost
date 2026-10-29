/* src/adapters/bilibili.js — B站专栏：图片必须外链可访问，代码块降级为引用 */
export default {
  key: 'bilibili', name: 'B 站专栏', status: 'beta',
  desc: '代码块降级为引用块（专栏不支持代码样式）',
  transform(md, { renderMarkdown }) {
    const notes = [];
    const { element } = renderMarkdown(md);
    const clone = element.cloneNode(true);
    clone.querySelectorAll('.md-anchor, .md-copy, .md-codebar').forEach((n) => n.remove());
    clone.querySelectorAll('pre').forEach((pre) => {
      const bq = document.createElement('blockquote');
      bq.setAttribute('style', 'white-space:pre-wrap;font-family:Menlo,Consolas,monospace;font-size:13px;');
      bq.textContent = pre.textContent;
      pre.replaceWith(bq);
    });
    notes.push('代码块已降级为引用块（专栏正文不支持等宽底色代码样式）');
    notes.push('B 站专栏图片必须是可公开访问的链接，本地上传图需先传图床');
    return { html: clone.innerHTML, notes };
  }
};
