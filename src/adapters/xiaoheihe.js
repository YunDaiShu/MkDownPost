/* src/adapters/xiaoheihe.js — 小黑盒：保留 Markdown 结构，标题/图片/链接按平台习惯调整 */
export default {
  key: 'xiaoheihe',
  name: '小黑盒',
  status: 'stable',
  desc: '标题层级降级、链接新窗口、图片限宽',
  transform(md, { renderMarkdown }) {
    const notes = [];
    let src = md;
    // 小黑盒对三级以下标题显示较弱：h4 降为加粗段落
    src = src.replace(/^#{4,6}\s+(.*)$/gm, '**$1**');
    if (src !== md) notes.push('已把 4–6 级标题降级为加粗文本（平台对深层标题支持弱）');

    const { element } = renderMarkdown(src);
    const clone = element.cloneNode(true);
    clone.querySelectorAll('.md-anchor, .md-copy, .md-codebar').forEach((n) => n.remove());
    clone.querySelectorAll('img').forEach((img) => {
      img.setAttribute('style', 'max-width:100%;height:auto;border-radius:6px;');
    });
    clone.querySelectorAll('a').forEach((a) => {
      a.setAttribute('style', 'color:#FF6B00;text-decoration:none;');
      a.setAttribute('target', '_blank');
    });
    notes.push('链接加 target=_blank，图片限制最大宽度');
    notes.push('建议正文首图使用 16:9，平台卡片裁切更完整');
    return { html: clone.innerHTML, notes };
  }
};
