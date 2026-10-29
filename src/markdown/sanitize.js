/* src/markdown/sanitize.js — DOM 白名单净化（禁止内联事件与 javascript: 链接）
   不依赖 DOMPurify：解析到游离文档 → 白名单遍历 → 序列化。 */

const ALLOW_TAGS = new Set(['H1','H2','H3','H4','H5','H6','P','BR','HR','STRONG','EM','DEL','MARK','CODE','PRE','BLOCKQUOTE','UL','OL','LI','A','IMG','TABLE','THEAD','TBODY','TR','TH','TD','DIV','SPAN','INPUT','SUP','SUB','KBD','FIGURE','FIGCAPTION']);
const ALLOW_ATTR = new Set(['href','src','alt','title','class','id','type','checked','disabled','loading','colspan','rowspan','lang']);
// 允许：http(s) / mailto / 锚点 / 绝对路径 / ./ 与 ../ / 以及 "dir/file.ext" 这类无协议相对路径
const SAFE_URL = /^(https?:|mailto:|#|data:image\/|\/|\.{0,2}\/|[a-z0-9._-]+\/)/i;

export function sanitize(html, doc = document) {
  const host = doc.implementation.createHTMLDocument('md');
  host.body.innerHTML = html;

  const walk = (node) => {
    const kids = Array.from(node.children);
    for (const el of kids) {
      walk(el);
      if (!ALLOW_TAGS.has(el.tagName)) {
        // 不在白名单：保留文本，丢弃标签
        el.replaceWith(...Array.from(el.childNodes));
        continue;
      }
      for (const attr of Array.from(el.attributes)) {
        const name = attr.name.toLowerCase();
        if (name.startsWith('on') || !ALLOW_ATTR.has(name)) { el.removeAttribute(attr.name); continue; }
        if ((name === 'href' || name === 'src') && !SAFE_URL.test(attr.value.trim())) el.removeAttribute(attr.name);
      }
      if (el.tagName === 'A' && el.getAttribute('href') && !el.getAttribute('rel')) {
        el.setAttribute('rel', 'noopener noreferrer');
      }
    }
  };
  walk(host.body);
  return host.body.innerHTML;
}
