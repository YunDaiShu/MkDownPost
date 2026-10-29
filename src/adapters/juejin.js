/* src/adapters/juejin.js — 掘金：技术向，保留代码语言标签，图片加说明 */
export default {
  key: 'juejin', name: '掘金', status: 'stable',
  desc: '保留代码语言标签，图片居中并加 alt 说明',
  transform(md, { renderMarkdown }) {
    const notes = [];
    const { element } = renderMarkdown(md);
    const clone = element.cloneNode(true);
    clone.querySelectorAll('.md-anchor, .md-copy').forEach((n) => n.remove());
    clone.querySelectorAll('img').forEach((img) => {
      img.setAttribute('style', 'display:block;margin:16px auto;max-width:100%;border-radius:8px;');
      if (img.alt) notes.push('图片保留 alt：「' + img.alt + '」');
    });
    notes.push('代码块顶栏保留语言名（掘金编辑器识别常见语言）');
    return { html: clone.innerHTML, notes };
  }
};
