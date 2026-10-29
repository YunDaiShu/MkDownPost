/* src/markdown/code-blocks.js — 代码块：语言标签、复制按钮（1.5s 反馈）、超 40 行内部滚动 */

const LANG_LABEL = { js: 'JavaScript', javascript: 'JavaScript', ts: 'TypeScript', typescript: 'TypeScript',
  py: 'Python', python: 'Python', sh: 'Shell', bash: 'Shell', json: 'JSON', yaml: 'YAML', yml: 'YAML',
  css: 'CSS', html: 'HTML', rust: 'Rust', go: 'Go', text: '纯文本' };

export function decorateCodeBlocks(root, { copy } = {}) {
  root.querySelectorAll('pre > code').forEach((code) => {
    const pre = code.parentElement;
    if (pre.parentElement && pre.parentElement.classList.contains('md-codeblock')) return;

    const lang = (code.className.match(/language-([\w+-]+)/) || [])[1] || 'text';

    // 语法高亮：vendor 未下载时跳过，不影响内容
    if (window.hljs && lang !== 'mermaid' && lang !== 'mm') {
      try { window.hljs.highlightElement(code); } catch { /* 忽略 */ }
    }
    const lines = code.textContent.split('\n').length;

    const wrap = document.createElement('div');
    wrap.className = 'md-codeblock';
    const bar = document.createElement('div');
    bar.className = 'md-codebar';
    bar.innerHTML = '<span class="md-lang">' + (LANG_LABEL[lang] || lang) + '</span>';

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'md-copy';
    btn.textContent = '复制';
    btn.addEventListener('click', async () => {
      try { await navigator.clipboard.writeText(code.textContent); } catch { /* 忽略 */ }
      btn.textContent = '已复制';
      btn.classList.add('is-done');
      setTimeout(() => { btn.textContent = '复制'; btn.classList.remove('is-done'); }, 1500);
      copy && copy('已复制代码');
    });
    bar.appendChild(btn);

    pre.replaceWith(wrap);
    wrap.appendChild(bar);
    wrap.appendChild(pre);
    if (lines > 40) wrap.classList.add('is-long');
  });
}
