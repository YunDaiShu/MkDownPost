/* src/pages/themes.js — 主题展示页：全部主题大图预览卡 + 点击即应用 + 复制变量 */
import { THEMES } from '../../data/themes.js';
import { apply, get, exportCSS } from '../theme-manager.js';
import { toast } from '../components/theme-switcher.js';

export default function render(root, params) {
  const focus = params.query && params.query.get ? params.query.get('theme') : null;

  root.innerHTML = `
    <section class="section">
      <div class="section__head">
        <h1 class="section__title">主题库</h1>
        <button class="btn" type="button" id="copyAll">复制当前主题 CSS 变量</button>
      </div>
      <p class="muted">点击任意主题立即生效（不刷新页面）。色值为近似取色，非官方规范；替换只需改 <code>data/themes.js</code>。</p>
      <div class="theme-grid">
        ${THEMES.map((t) => `
          <article class="theme-card" data-key="${t.key}" ${t.key === focus ? 'data-focus="1"' : ''}>
            <header class="theme-card__head">
              <span class="theme-card__dot" style="background:${t.brand.light}"></span>
              <h2 class="theme-card__name">${t.name}</h2>
              <span class="theme-card__note">${t.note}</span>
            </header>
            <div class="theme-card__prev" style="--demo:#${t.brand.light.replace('#','')}">
              <h3 class="theme-card__demo-h">标题示例 Heading</h3>
              <p class="theme-card__demo-p">正文示例：写一份 Markdown，导出各平台可用排版。</p>
              <p class="theme-card__demo-p"><a href="#/themes" onclick="return false">链接</a> · <code>行内代码</code></p>
            </div>
            <footer class="theme-card__foot">
              <button class="btn" type="button" data-apply="${t.key}">应用</button>
              <button class="btn" type="button" data-copy="${t.key}">复制变量</button>
            </footer>
          </article>`).join('')}
      </div>
    </section>`;

  root.addEventListener('click', async (e) => {
    const a = e.target.closest('[data-apply]');
    if (a) {
      const k = a.dataset.apply;
      apply(k);
      toast('已应用 ' + k);
      root.querySelectorAll('.theme-card').forEach((c) => c.setAttribute('aria-current', c.dataset.key === get() ? 'true' : 'false'));
      return;
    }
    const c = e.target.closest('[data-copy]');
    if (c) {
      apply(c.dataset.copy);
      try { await navigator.clipboard.writeText(exportCSS()); toast('已复制 ' + c.dataset.copy + ' 的 CSS 变量'); }
      catch { toast('复制失败，请手动选择'); }
    }
    if (e.target.id === 'copyAll') {
      try { await navigator.clipboard.writeText(exportCSS()); toast('已复制当前主题 CSS 变量'); }
      catch { toast('复制失败'); }
    }
  });
  root.querySelectorAll('.theme-card').forEach((c) => c.setAttribute('aria-current', c.dataset.key === get() ? 'true' : 'false'));
}
