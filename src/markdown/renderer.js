/* src/markdown/renderer.js — 渲染管线总装
   md → 引擎(marked 或内置) → sanitize → 后处理(标题锚点/代码块/表格/图片/懒加载占位)
   返回 { html, headings }；Mermaid/KaTeX 在 M4 接入，此处先留占位钩子。 */

import { sanitize } from './sanitize.js?v=vmvtpmrt6';
import { parse as builtinParse } from './builtin-md.js?v=vmvtpmrt6';
import { decorateHeadings } from './heading-anchors.js?v=vmvtpmrt6';
import { decorateCodeBlocks } from './code-blocks.js?v=vmvtpmrt6';
import { decorateImages } from './images.js?v=vmvtpmrt6';
import { upgradeMermaid } from './mermaid.js?v=vmvtpmrt6';
import { upgradeMath } from './katex.js?v=vmvtpmrt6';

/** 引擎选择：优先 marked（若 vendor 存在），否则内置解析器 —— 两者输出均经 sanitize */
function engineReady() {
  return typeof window.marked !== 'undefined' && typeof window.marked.parse === 'function';
}

export function renderMarkdown(md, { onCopy } = {}) {
  const raw = engineReady() ? window.marked.parse(md, { gfm: true, breaks: false }) : builtinParse(md);
  const clean = sanitize(raw);

  const box = document.createElement('div');
  box.className = 'markdown-body';
  box.innerHTML = clean;

  // 表格外层已有 .md-table；图片补属性；外链补 rel
  box.querySelectorAll('img').forEach((img) => {
    if (!img.getAttribute('loading')) img.setAttribute('loading', 'lazy');
    img.classList.add('md-img');
    if (!img.hasAttribute('width')) img.setAttribute('decoding', 'async');
  });
  box.querySelectorAll('a[href^="http"]').forEach((a) => a.setAttribute('rel', 'noopener noreferrer'));

  const headings = decorateHeadings(box, { copy: onCopy });
  decorateCodeBlocks(box, { copy: onCopy });
  decorateImages(box);
  upgradeMermaid(box);
  upgradeMath(box);

  return { html: box.innerHTML, element: box, headings, engine: engineReady() ? 'marked' : 'builtin' };
}
