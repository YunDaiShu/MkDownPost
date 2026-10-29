/* src/markdown/builtin-md.js — 零依赖 Markdown 兜底解析器
   支持：ATX 标题、围栏代码、引用、有序/无序/任务列表、表格、分隔线、段落；
   行内：代码、粗体、斜体、删除线、链接、图片、自动链接。
   先整体转义 HTML，再插入自有标签 —— 结构上即防 XSS，sanitize 只做二次保险。 */

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/** 行内解析 */
function inline(text) {
  let s = esc(text);
  s = s.replace(/`([^`\n]+)`/g, (m, code) => '<code>' + code + '</code>');
  s = s.replace(/!\[([^\]]*)\]\((\S+?)(?:\s+"([^"]*)")?\)/g,
    (m, alt, src, title) => '<img src="' + src + '" alt="' + alt + '"' + (title ? ' title="' + title + '"' : '') + ' loading="lazy" />');
  s = s.replace(/\[([^\]]+)\]\((\S+?)(?:\s+"([^"]*)")?\)/g,
    (m, txt, href, title) => '<a href="' + href + '"' + (title ? ' title="' + title + '"' : '') + ' rel="noopener noreferrer">' + txt + '</a>');
  s = s.replace(/(^|[^"'=])(https?:\/\/[^\s<]+)/g, (m, pre, url) => pre + '<a href="' + url + '" rel="noopener noreferrer">' + url + '</a>');
  s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  s = s.replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<em>$2</em>');
  s = s.replace(/~~([^~]+)~~/g, '<del>$1</del>');
  s = s.replace(/==([^=]+)==/g, '<mark>$1</mark>');
  return s;
}

/** 表格块 */
function table(lines) {
  const head = lines[0].split('|').slice(1, -1).map((c) => c.trim());
  const rows = lines.slice(2).map((l) => l.split('|').slice(1, -1).map((c) => c.trim()));
  const th = head.map((c) => '<th>' + inline(c) + '</th>').join('');
  const tb = rows.map((r) => '<tr>' + r.map((c) => '<td>' + inline(c) + '</td>').join('') + '</tr>').join('');
  return '<div class="md-table"><table><thead><tr>' + th + '</tr></thead><tbody>' + tb + '</tbody></table></div>';
}

export function parse(src) {
  const lines = String(src).replace(/\r\n?/g, '\n').split('\n');
  const out = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // 围栏代码
    const fence = line.match(/^\s*(`{3,}|~{3,})\s*([\w+-]*)\s*$/);
    if (fence) {
      const mark = fence[1][0], lang = fence[2] || '';
      const buf = [];
      i++;
      while (i < lines.length && !new RegExp('^\\s*' + mark + '{3,}\\s*$').test(lines[i])) { buf.push(lines[i]); i++; }
      i++;
      out.push('<pre class="md-pre"><code class="language-' + (lang || 'text') + '">' + esc(buf.join('\n')) + '</code></pre>');
      continue;
    }

    // ATX 标题
    const h = line.match(/^(#{1,6})\s+(.*)$/);
    if (h) { const lv = h[1].length; out.push('<h' + lv + '>' + inline(h[2].trim()) + '</h' + lv + '>'); i++; continue; }

    // 分隔线
    if (/^\s*([-*_])(\s*\1){2,}\s*$/.test(line)) { out.push('<hr />'); i++; continue; }

    // 引用
    if (/^\s*>/.test(line)) {
      const buf = [];
      while (i < lines.length && /^\s*>/.test(lines[i])) { buf.push(lines[i].replace(/^\s*>\s?/, '')); i++; }
      out.push('<blockquote>' + parse(buf.join('\n')) + '</blockquote>');
      continue;
    }

    // 表格（表头 + |---| 分隔行）
    if (/\|/.test(line) && i + 1 < lines.length && /^\s*\|?\s*:?-{2,}/.test(lines[i + 1])) {
      const buf = [line];
      i++;
      while (i < lines.length && /\|/.test(lines[i])) { buf.push(lines[i]); i++; }
      out.push(table(buf));
      continue;
    }

    // 列表
    if (/^\s*([-*+]|\d+\.)\s+/.test(line)) {
      const ordered = /^\s*\d+\./.test(line);
      const items = [];
      while (i < lines.length && /^\s*([-*+]|\d+\.)\s+/.test(lines[i])) {
        let body = lines[i].replace(/^\s*([-*+]|\d+\.)\s+/, '');
        let cls = '', checked = null;
        const task = body.match(/^\[([ xX])\]\s+(.*)$/);
        if (task) { checked = task[1].toLowerCase() === 'x'; body = task[2]; cls = ' class="task"'; }
        const box = checked === null ? '' :
          '<input type="checkbox" disabled' + (checked ? ' checked' : '') + ' aria-label="任务" /> ';
        items.push('<li' + cls + '>' + box + inline(body) + '</li>');
        i++;
      }
      const tag = ordered ? 'ol' : 'ul';
      const cls = items.some((s) => s.includes('class="task"')) ? ' class="task-list"' : '';
      out.push('<' + tag + cls + '>' + items.join('') + '</' + tag + '>');
      continue;
    }

    // 空行
    if (/^\s*$/.test(line)) { i++; continue; }

    // 段落
    const buf = [];
    while (i < lines.length && !/^\s*$/.test(lines[i]) && !/^(#{1,6})\s|^\s*>|^\s*([-*+]|\d+\.)\s|^\s*(`{3,}|~{3,})/.test(lines[i]) && !/\|/.test(lines[i])) {
      buf.push(lines[i]); i++;
    }
    if (buf.length) out.push('<p>' + inline(buf.join(' ')) + '</p>');
    else { i++; }
  }
  return out.join('\n');
}
