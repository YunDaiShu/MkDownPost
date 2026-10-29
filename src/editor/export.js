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
  w.document.write('<div class="hint">在打印对话框的「目标打印机」中选择「<b>另存为 PDF</b>」，再点保存。</div>');
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
  // Word 打开的是本地文件：相对路径必裂图 → 一律转绝对 URL
  body.querySelectorAll('img').forEach((img) => {
    const raw = img.getAttribute('src') || '';
    try { img.setAttribute('src', new URL(raw, location.href).href); } catch { /* 保留原值 */ }
    img.removeAttribute('loading');
    img.setAttribute('style', 'max-width:100%;height:auto;');
  });
  // Word 不认识 <span> 包装层，剥掉只留图片
  body.querySelectorAll('.md-imgwrap').forEach((w) => w.replaceWith(...Array.from(w.childNodes)));

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
  w.document.write('<meta charset="utf-8"><title>导出 PDF · MkDownPost</title><style>' +
    '.hint{position:fixed;left:0;right:0;top:0;padding:10px 16px;background:#fffbe6;border-bottom:1px solid #ffe58f;font-size:13px;color:#874d00;z-index:9}' +
    '@media print{.hint{display:none}}' +
    'body{padding-top:48px}' +
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

/** 按需加载本地 vendor 脚本（同一 URL 只加载一次） */
function loadScriptOnce(src) {
  return new Promise((resolve) => {
    if (document.querySelector('script[data-lib="' + src + '"]')) { resolve(true); return; }
    const el = document.createElement('script');
    el.src = src;
    el.dataset.lib = src;
    el.onload = () => resolve(true);
    el.onerror = () => resolve(false);
    document.head.appendChild(el);
  });
}

/** 导出 PNG 长图：html2canvas 渲染（与 PDF 同一条管线，避免 foreignObject 在真实浏览器失败） */
export async function exportPng(container, name = 'draft', { scale = 2, width = 714 } = {}) {
  const ok = await loadScriptOnce('./vendor/html2canvas.min.js');
  if (!ok || !window.html2canvas) return false;
  const cs = getComputedStyle(document.documentElement);
  const bg = cs.getPropertyValue('--c-bg').trim() || '#ffffff';
  const host = document.createElement('div');
  host.setAttribute('aria-hidden', 'true');
  host.style.cssText = 'position:fixed;left:-10000px;top:0;width:' + (width + 64) + 'px;padding:32px;background:' + bg + ';box-sizing:border-box';
  const clone = container.cloneNode(true);
  clone.style.cssText = 'width:' + width + 'px;max-width:none;max-height:none;overflow:visible;height:auto;';
  clone.querySelectorAll('.md-anchor, .md-copy, .md-codebar').forEach((n) => n.remove());
  host.appendChild(clone);
  document.body.appendChild(host);
  try {
    const canvas = await window.html2canvas(host, { scale, backgroundColor: bg, useCORS: true, logging: false, width: width + 64, windowWidth: width + 64 });
    return await new Promise((resolve) => {
      canvas.toBlob((blob) => {
        if (!blob) { resolve(false); return; }
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = name + '.png';
        document.body.appendChild(a); a.click(); a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 2000);
        resolve(true);
      }, 'image/png');
    });
  } catch (e) { return false; } finally { host.remove(); }
}
export async function exportPdf(container, name = 'draft') {
  const okA = await loadScriptOnce('./vendor/html2canvas.min.js');
  const okB = await loadScriptOnce('./vendor/jspdf.umd.min.js');
  if (!okA || !okB || !window.html2canvas || !window.jspdf) {
    return { ok: false, reason: 'PDF 库未就绪（可运行 node tools/vendor.mjs）' };
  }

  const cs = getComputedStyle(document.documentElement);
  const bg = cs.getPropertyValue('--c-bg').trim() || '#ffffff';
  const textColor = cs.getPropertyValue('--c-text').trim() || '#111111';

  // A4 版心：96dpi 下 A4 宽 794px，左右各留 40px 边距 → 版心 714px
  const CONTENT_W = 714;
  const MARGIN_PX = 40;

  // 离屏克隆：脱开预览窗的宽度/高度/滚动限制，否则只会截到可见区域
  const host = document.createElement('div');
  host.setAttribute('aria-hidden', 'true');
  host.style.cssText = [
    'position:fixed', 'left:-10000px', 'top:0',
    'width:' + (CONTENT_W + MARGIN_PX * 2) + 'px',
    'padding:' + MARGIN_PX + 'px',
    'background:' + bg,
    'color:' + textColor,
    'box-sizing:border-box',
    'font:16px/1.8 -apple-system,"PingFang SC","Microsoft YaHei",sans-serif'
  ].join(';');

  const clone = container.cloneNode(true);
  clone.style.cssText = 'width:' + CONTENT_W + 'px;max-width:none;max-height:none;overflow:visible;height:auto;';
  clone.querySelectorAll('.md-anchor, .md-copy, .md-codebar').forEach((n) => n.remove());
  host.appendChild(clone);
  document.body.appendChild(host);

  try {
    const canvas = await window.html2canvas(host, {
      scale: 2, backgroundColor: bg, useCORS: true, logging: false,
      width: CONTENT_W + MARGIN_PX * 2,
      windowWidth: CONTENT_W + MARGIN_PX * 2
    });

    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF({ unit: 'pt', format: 'a4', orientation: 'portrait' });
    const pageW = pdf.internal.pageSize.getWidth();
    const pageH = pdf.internal.pageSize.getHeight();

    // 图片整体宽度铺满页宽；一页对应的“源像素高度”按 A4 比例换算
    const pxPerPt = canvas.width / pageW;
    const sliceH = Math.floor(pageH * pxPerPt);
    const pages = Math.max(1, Math.ceil(canvas.height / sliceH));

    for (let i = 0; i < pages; i++) {
      if (i > 0) pdf.addPage();
      const sy = i * sliceH;
      const h = Math.min(sliceH, canvas.height - sy);
      if (h <= 0) break;
      const slice = document.createElement('canvas');
      slice.width = canvas.width;
      slice.height = h;
      const ctx = slice.getContext('2d');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, slice.width, slice.height);
      ctx.drawImage(canvas, 0, sy, canvas.width, h, 0, 0, canvas.width, h);
      pdf.addImage(slice.toDataURL('image/jpeg', 0.92), 'JPEG', 0, 0, pageW, (h * pageW) / canvas.width);
    }

    const blob = pdf.output('blob');
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = name + '.pdf';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 3000);
    return { ok: true, pages, bytes: blob.size };
  } catch (e) {
    return { ok: false, reason: String((e && e.message) || e).slice(0, 120) };
  } finally {
    host.remove();
  }
}
