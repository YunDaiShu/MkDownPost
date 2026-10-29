/* src/adapters/wechat.js — 公众号：全内联样式、字号收敛、图片 max-width、去掉不支持的标签 */
const INLINE = {
  h1: 'font-size:22px;font-weight:700;line-height:1.4;margin:28px 0 14px;',
  h2: 'font-size:19px;font-weight:700;line-height:1.5;margin:26px 0 12px;border-left:3px solid currentColor;padding-left:10px;',
  h3: 'font-size:17px;font-weight:600;margin:22px 0 10px;',
  h4: 'font-size:16px;font-weight:600;margin:20px 0 8px;',
  p: 'font-size:16px;line-height:1.9;margin:16px 0;letter-spacing:.2px;',
  li: 'font-size:16px;line-height:1.9;margin:8px 0;',
  blockquote: 'margin:18px 0;padding:12px 16px;border-left:3px solid #d0d7de;background:#f7f8fa;color:#4b5563;font-size:15px;line-height:1.8;',
  pre: 'margin:18px 0;padding:14px;background:#f6f8fa;border-radius:8px;overflow-x:auto;font-size:13px;line-height:1.7;',
  code: 'font-family:Menlo,Consolas,monospace;font-size:13px;background:#f2f3f5;border-radius:4px;padding:1px 4px;',
  table: 'width:100%;border-collapse:collapse;font-size:14px;margin:18px 0;',
  th: 'border:1px solid #e5e6eb;background:#f2f3f5;padding:8px 10px;text-align:left;font-weight:600;',
  td: 'border:1px solid #e5e6eb;padding:8px 10px;',
  img: 'max-width:100%;height:auto;display:block;margin:16px auto;border-radius:8px;',
  hr: 'border:0;height:1px;background:#e5e6eb;margin:26px 0;',
  a: 'color:#576b95;text-decoration:none;'
};

export default {
  key: 'wechat',
  name: '微信公众号',
  status: 'stable',
  desc: '全内联样式、字号收敛、图片 max-width、剔除锚点跳转',
  transform(md, { renderMarkdown }) {
    const notes = [];
    const { element } = renderMarkdown(md);
    const clone = element.cloneNode(true);
    clone.querySelectorAll('.md-anchor, .md-copy, .md-codebar, .md-imgwrap.is-loading').forEach((n) => n.remove());
    clone.querySelectorAll('*').forEach((el) => {
      const tag = el.tagName.toLowerCase();
      const style = INLINE[tag];
      if (style) el.setAttribute('style', style);
      if (tag === 'div') { el.replaceWith(...Array.from(el.childNodes)); return; }
      if (tag === 'input') { el.remove(); }
      if (tag === 'a' && el.getAttribute('href') && el.getAttribute('href').startsWith('#')) {
        el.removeAttribute('href');
        notes.push('已移除页内锚点链接（公众号不支持锚点跳转）');
      }
    });
    notes.push('已转为全内联样式：不依赖 <style>，可直接粘贴进公众号编辑器');
    notes.push('图片使用原始外链：公众号编辑器可能会转存，粘贴后请确认图片是否正常');
    notes.push('公众号不支持 <script>/<iframe>/锚点跳转，已剔除');
    return { html: clone.innerHTML, notes };
  }
};
