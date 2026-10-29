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

/** 导出为 Word 可打开的 .doc（HTML + Office 命名空间，保留内联样式） */
export function exportWordHTML(container, name = 'draft', title = '未命名') {
  const cs = getComputedStyle(document.documentElement);
  const v = (k) => cs.getPropertyValue(k).trim();
  const body = container.cloneNode(true);
  body.querySelectorAll('.md-anchor, .md-copy, .md-codebar').forEach((n) => n.remove());

  const html = '<html xmlns:o="urn:schemas-microsoft-com:office:office" ' +
    'xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">' +
    '<head><meta charset="utf-8"><title>' + title + '</title>' +
    '<!--[if gte mso 9]><xml><w:WordDocument><w:View>Print</w:View></w:WordDocument></xml><![endif]-->' +
    '<style>' +
    '@page { size: A4; margin: 2cm; }' +
    'body { font-family: "Microsoft YaHei", "PingFang SC", sans-serif; font-size: 11pt; line-height: 1.75; color: ' + v('--c-text') + '; }' +
    'h1 { font-size: 20pt; color: ' + v('--c-primary-text') + '; }' +
    'h2 { font-size: 15pt; color: ' + v('--c-primary-text') + '; border-left: 3px solid ' + v('--c-primary') + '; padding-left: 8px; }' +
    'h3 { font-size: 13pt; color: ' + v('--c-primary-text') + '; }' +
    'a { color: ' + v('--c-link') + '; }' +
    'blockquote { border-left: 3px solid ' + v('--c-quote-bar') + '; background: ' + v('--c-primary-bg') + '; padding: 8px 12px; margin: 10px 0; }' +
    'pre { background: ' + v('--c-code-bg') + '; padding: 10px; font-family: Consolas, monospace; font-size: 9.5pt; white-space: pre-wrap; }' +
    'code { font-family: Consolas, monospace; background: ' + v('--c-code-bg') + '; }' +
    'table { border-collapse: collapse; width: 100%; } ' +
    'th, td { border: 1px solid ' + v('--c-border') + '; padding: 6px 10px; font-size: 10.5pt; }' +
    'th { background: ' + v('--c-primary-soft') + '; }' +
    'img { max-width: 100%; }' +
    '</style></head><body>' + body.innerHTML + '</body></html>';

  download(name + '.doc', html, 'application/msword;charset=utf-8');
}

/** 打印模板：minimal（黑白省墨） / brand（带主题色） */
export function printDocWithTemplate(container, template = 'brand') {
  const cs = getComputedStyle(document.documentElement);
  const v = (k) => cs.getPropertyValue(k).trim();
  const brand = template === 'brand';
  const w = window.open('', '_blank', 'width=900,height=1200');
  if (!w) return;
  w.document.write('<meta charset="utf-8"><title>打印</title><style>' +
    'body{font:11pt/1.8 -apple-system,"PingFang SC","Microsoft YaHei",sans-serif;color:' + (brand ? v('--c-text') : '#111') + ';margin:32px;max-width:720px}' +
    'h1{font-size:20pt;' + (brand ? 'color:' + v('--c-primary-text') + ';' : '') + '}' +
    'h2{font-size:15pt;' + (brand ? 'color:' + v('--c-primary-text') + ';border-left:3px solid ' + v('--c-primary') + ';padding-left:8px;' : 'border-bottom:1px solid #ddd;padding-bottom:4px;') + '}' +
    'h3{font-size:13pt}' +
    'a{color:' + (brand ? v('--c-link') : '#0b57d0') + ';text-decoration:none}' +
    'blockquote{margin:12px 0;padding:8px 14px;' + (brand ? 'border-left:3px solid ' + v('--c-quote-bar') + ';background:' + v('--c-primary-bg') + ';' : 'border-left:3px solid #ddd;color:#444;') + '}' +
    'pre{background:' + (brand ? v('--c-code-bg') : '#f6f8fa') + ';padding:12px;border-radius:8px;overflow:auto;font-size:9.5pt}' +
    'table{border-collapse:collapse;width:100%}th,td{border:1px solid ' + (brand ? v('--c-border') : '#ddd') + ';padding:6px 10px}' +
    'img{max-width:100%}@media print{a{color:inherit}}' +
    '</style>');
  w.document.write(container.innerHTML);
  w.document.close();
  setTimeout(() => { w.focus(); w.print(); }, 300);
}

/** 导出 PNG 长图：SVG foreignObject 包住渲染后的 HTML → canvas → PNG
    优点：不引第三方库；缺点：外链图片需允许 CORS，否则会被跳过。 */
export async function exportPng(container, name = 'draft', { width = 750, scale = 2 } = {}) {
  const cs = getComputedStyle(document.documentElement);
  const v = (k) => cs.getPropertyValue(k).trim();
  const clone = container.cloneNode(true);
  clone.querySelectorAll('.md-anchor, .md-copy, .md-codebar').forEach((n) => n.remove());

  const css = [
    'body{font-family:-apple-system,"PingFang SC","Microsoft YaHei",sans-serif;color:' + v('--c-text') + ';background:' + v('--c-bg') + ';}',
    'h1{font-size:24px;color:' + v('--c-primary-text') + ';}',
    'h2{font-size:19px;color:' + v('--c-primary-text') + ';border-left:3px solid ' + v('--c-primary') + ';padding-left:10px;}',
    'h3{font-size:16px;color:' + v('--c-primary-text') + ';}',
    'p,li{font-size:15px;line-height:1.9;}',
    'a{color:' + v('--c-link') + ';}',
    'code{font-family:Menlo,Consolas,monospace;background:' + v('--c-code-bg') + ';padding:1px 4px;border-radius:4px;}',
    'pre{background:' + v('--c-code-bg') + ';padding:12px;border-radius:8px;white-space:pre-wrap;}',
    'blockquote{border-left:3px solid ' + v('--c-quote-bar') + ';background:' + v('--c-primary-bg') + ';padding:8px 14px;margin:12px 0;}',
    'table{border-collapse:collapse;width:100%;}th,td{border:1px solid ' + v('--c-border') + ';padding:6px 10px;font-size:13px;}',
    'th{background:' + v('--c-primary-soft') + ';}',
    'img{max-width:100%;}'
  ].join('');

  const html = '<div xmlns="http://www.w3.org/1999/xhtml" style="width:' + width + 'px;padding:24px;box-sizing:border-box;">' +
    '<style>' + css + '</style>' + clone.innerHTML + '</div>';

  // 先量高度
  const measure = document.createElement('div');
  measure.style.cssText = 'position:absolute;left:-9999px;top:0;width:' + width + 'px;';
  measure.innerHTML = '<style>' + css + '</style>' + clone.innerHTML;
  document.body.appendChild(measure);
  const height = Math.ceil(measure.getBoundingClientRect().height) + 48;
  measure.remove();

  const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="' + width + '" height="' + height + '">' +
    '<foreignObject width="100%" height="100%">' + html + '</foreignObject></svg>';

  const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);

  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = width * scale;
      canvas.height = height * scale;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = v('--c-bg');
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.scale(scale, scale);
      ctx.drawImage(img, 0, 0);
      URL.revokeObjectURL(url);
      canvas.toBlob((b) => {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(b);
        a.download = name + '.png';
        document.body.appendChild(a); a.click(); a.remove();
        setTimeout(() => URL.revokeObjectURL(a.href), 2000);
        resolve(true);
      }, 'image/png');
    };
    img.onerror = () => { URL.revokeObjectURL(url); resolve(false); };
    img.src = url;
  });
}
