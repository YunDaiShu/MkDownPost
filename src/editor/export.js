/* src/editor/export.js — 导出：.md 文件 / 内联样式 HTML（公众号适配）/ 打印 */
function download(filename, content, mime = 'text/markdown;charset=utf-8') {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function exportMarkdown(md, name = 'draft') {
  download(name + '.md', md);
}

/** 全内联样式：把当前主题色写进每个元素，便于粘贴到公众号编辑器 */
export function exportInlineHTML(container, title = '未命名') {
  const cs = getComputedStyle(document.documentElement);
  const v = (k) => cs.getPropertyValue(k).trim();
  const base = 'font-size:16px;line-height:1.8;color:' + v('--c-text') + ';';
  const clone = container.cloneNode(true);
  clone.querySelectorAll('.md-anchor, .md-copy, .md-codebar').forEach((n) => n.remove());

  clone.querySelectorAll('*').forEach((el) => {
    const tag = el.tagName.toLowerCase();
    if (/^h[1-4]$/.test(tag)) {
      el.setAttribute('style', 'font-weight:600;color:' + v('--c-primary-text') + ';margin:24px 0 12px;' +
        (tag === 'h2' ? 'padding-left:12px;border-left:3px solid ' + v('--c-primary') + ';' : ''));
    } else if (tag === 'p' || tag === 'li' || tag === 'td' || tag === 'th') {
      el.setAttribute('style', base);
    } else if (tag === 'a') {
      el.setAttribute('style', 'color:' + v('--c-link') + ';text-decoration:none;');
    } else if (tag === 'blockquote') {
      el.setAttribute('style', 'margin:16px 0;padding:8px 16px;border-left:3px solid ' + v('--c-quote-bar') + ';background:' + v('--c-primary-bg') + ';' + base);
    } else if (tag === 'pre') {
      el.setAttribute('style', 'margin:16px 0;padding:12px;background:' + v('--c-code-bg') + ';border-radius:8px;overflow:auto;');
    } else if (tag === 'code') {
      el.setAttribute('style', 'font-family:Menlo,Consolas,monospace;font-size:13px;background:' + v('--c-code-bg') + ';border-radius:4px;padding:0 4px;');
    } else if (tag === 'table') {
      el.setAttribute('style', 'width:100%;border-collapse:collapse;font-size:14px;');
    } else if (tag === 'th') {
      el.setAttribute('style', base + 'background:' + v('--c-primary-soft') + ';border:1px solid ' + v('--c-border') + ';padding:8px 12px;text-align:left;font-weight:600;');
    } else if (tag === 'td') {
      el.setAttribute('style', base + 'border:1px solid ' + v('--c-border') + ';padding:8px 12px;');
    } else if (tag === 'img') {
      el.setAttribute('style', 'max-width:100%;height:auto;border-radius:8px;display:block;margin:12px 0;');
    } else if (tag === 'hr') {
      el.setAttribute('style', 'border:0;height:1px;background:' + v('--c-divider') + ';margin:24px 0;');
    }
  });

  const wrap = document.createElement('div');
  wrap.setAttribute('style', 'max-width:680px;margin:0 auto;' + base);
  wrap.innerHTML = clone.innerHTML;
  return '<!doctype html><meta charset="utf-8"><title>' + title + '</title>' + wrap.outerHTML;
}

export function exportInlineHTMLFile(container, name = 'draft', title = '未命名') {
  download(name + '.html', exportInlineHTML(container, title), 'text/html;charset=utf-8');
}

export function printDoc(container) {
  const w = window.open('', '_blank', 'width=900,height=1200');
  if (!w) return;
  w.document.write('<meta charset="utf-8"><title>打印</title><style>body{font:16px/1.8 -apple-system,"PingFang SC","Microsoft YaHei",sans-serif;color:#111;margin:32px}img{max-width:100%}pre{background:#f6f8fa;padding:12px;border-radius:8px;overflow:auto}blockquote{border-left:3px solid #ccc;margin:16px 0;padding:8px 16px;color:#555}table{border-collapse:collapse}td,th{border:1px solid #ddd;padding:6px 10px}</style>');
  w.document.write(container.innerHTML);
  w.document.close();
  setTimeout(() => { w.focus(); w.print(); }, 300);
}
