/* src/adapters/jianshu.js — 简书：极简，标题层级降一档，去掉多余修饰 */
export default {
  key: 'jianshu', name: '简书', status: 'stable',
  desc: '标题降一档、去掉多余修饰，贴近简书排版习惯',
  transform(md, { renderMarkdown }) {
    const notes = [];
    const demoted = md.replace(/^(#{1,5})\s/gm, (m, hashes) => '#'.repeat(hashes.length + 1) + ' ');
    const { element } = renderMarkdown(demoted);
    const clone = element.cloneNode(true);
    clone.querySelectorAll('.md-anchor, .md-copy, .md-codebar').forEach((n) => n.remove());
    if (demoted !== md) notes.push('标题层级整体降一档（简书正文标题偏大）');
    return { html: clone.innerHTML, notes };
  }
};
