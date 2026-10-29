/* src/pages/themes.js — 主题库页：100 套，分组筛选 + 搜索 + 点击即应用 + 复制变量 */
import { THEMES } from '../../data/themes.js?v=vmvtkir4i';
import { apply, get, exportCSS } from '../theme-manager.js?v=vmvtkir4i';
import { toast } from '../components/theme-switcher.js?v=vmvtkir4i';
import { derivePalette } from '../theme-custom.js?v=vmvtkir4i';

const GROUP_LABEL = {
  ai: 'AI', social: '社交', game: '游戏', dev: '开发', tool: '工具', lang: '语言',
  system: '系统', framework: '框架', media: '媒体', browser: '浏览器', design: '设计',
  cms: '建站', cn: '国内', infra: '基础设施', misc: '其他'
};

export default function render(root, params) {
  const focus = params && params.query && params.query.get ? params.query.get('theme') : null;
  const state = { group: 'all', q: '' };

  const groups = ['all', ...Array.from(new Set(THEMES.map((t) => t.group || 'misc')))];

  root.innerHTML = [
    '<section class="section">',
    '<div class="section__head"><h1 class="section__title">主题库（' + THEMES.length + ' 套）</h1>',
    '<button class="btn" type="button" id="copyAll">复制当前主题 CSS 变量</button></div>',
    '<p class="muted">点击任意主题立即生效（不刷新页面）。色值为近似取色，非官方规范；替换只需改 <code>data/themes.js</code> 或 <code>tools/gen-themes.mjs</code>。</p>',
    '<div class="theme-tools">',
    '<input class="theme-search" type="search" id="themeSearch" placeholder="搜索主题名…" aria-label="搜索主题" />',
    '<div class="theme-groups" role="group" aria-label="按分组筛选">',
    groups.map((g) => {
      const n = g === 'all' ? THEMES.length : THEMES.filter((t) => (t.group || 'misc') === g).length;
      return '<button class="tsw__chip' + (g === 'all' ? ' is-on' : '') + '" type="button" data-g="' + g + '" aria-pressed="' + (g === 'all') + '">' + (g === 'all' ? '全部' : (GROUP_LABEL[g] || g)) + ' ' + n + '</button>';
    }).join(''),
    '</div></div>',
    '<p class="muted" id="themeCount"></p>',
    '<div class="theme-grid" id="themeGrid"></div>',
    '</section>'
  ].join('');

  const grid = root.querySelector('#themeGrid');
  const count = root.querySelector('#themeCount');

  function visible() {
    const q = state.q.trim().toLowerCase();
    if (q) return THEMES.filter((t) => (t.name + ' ' + t.key + ' ' + (t.note || '')).toLowerCase().includes(q));
    return THEMES.filter((t) => state.group === 'all' || (t.group || 'misc') === state.group);
  }

  function paint(animate) {
    const list = visible();
    if (animate) {
      grid.classList.add('is-switching');
      setTimeout(() => {
        grid.classList.remove('is-switching');
        [...grid.children].forEach((c, i) => c.style.setProperty('--d', Math.min(i, 24) * 18 + 'ms'));
      }, 120);
    }
    root.querySelectorAll('.theme-card').forEach((c) => {
      const n = c.querySelector('.theme-card__note');
      if (n && !n.dataset.group) n.dataset.group = n.textContent;
    });
    count.textContent = '显示 ' + list.length + ' / ' + THEMES.length + ' 套';
    const dark = document.documentElement.getAttribute('data-mode') === 'dark';
    grid.innerHTML = list.map((t) => {
      const pal = derivePalette(dark ? t.brand.dark : t.brand.light, dark ? 'dark' : 'light');
      const dots = [pal['--c-primary'], pal['--c-primary-soft'], pal['--c-bg'], pal['--c-text'], pal['--c-link']]
        .map((c) => '<i style="background:' + c + '"></i>').join('');
      const on = t.key === get();
      return [
      '<article class="theme-card' + (on ? ' is-on' : '') + '" data-key="' + t.key + '"' + (t.key === focus ? ' data-focus="1"' : '') + ' aria-current="' + on + '">',
      '<header class="theme-card__head">',
      '<span class="pcard__dots">' + dots + '</span>',
      '<h2 class="theme-card__name">' + t.name + (t.note ? '<span class="theme-card__desc">' + t.note + '</span>' : '') + '</h2>',
      '<span class="theme-card__note">' + (on ? '正在使用' : (GROUP_LABEL[t.group] || t.group || '')) + '</span>',
      '</header>',
      '<div class="theme-card__prev">',
      '<h3 class="theme-card__demo-h" style="color:' + t.brand.light + '">标题示例 Heading</h3>',
      '<p class="theme-card__demo-p">正文示例：写一份 Markdown，导出各平台可用排版。</p>',
      '<p class="theme-card__demo-p"><a href="#/themes" onclick="return false" style="color:' + t.brand.light + '">链接</a> · <code>行内代码</code></p>',
      '</div>',
      '<footer class="theme-card__foot">',
      '<button class="btn" type="button" data-apply="' + t.key + '">应用</button>',
      '<button class="btn" type="button" data-copy="' + t.key + '">复制变量</button>',
      '</footer></article>'
    ].join(''); }).join('');
  }

  root.addEventListener('input', (e) => {
    if (e.target.id === 'themeSearch') { state.q = e.target.value; paint(true); }
  });

  root.addEventListener('click', async (e) => {
    // 整卡可点：点任意位置即应用（不再必须点「应用」）
    const cardEl = e.target.closest('.theme-card');
    if (cardEl && !e.target.closest('[data-copy]')) {
      const k = cardEl.dataset.key;
      apply(k);
      toast('已应用 ' + k);
      // 原地切换：绝不重绘网格（否则 100 张卡的入场动画会全部重播、hover 状态丢失）
      root.querySelectorAll('.theme-card').forEach((c) => {
        const on = c.dataset.key === k;
        c.classList.toggle('is-on', on);
        c.setAttribute('aria-current', String(on));
      });
      return;
    }
    const chip = e.target.closest('[data-g]');
    if (chip) {
      state.group = chip.getAttribute('data-g');
      root.querySelectorAll('[data-g]').forEach((c) => {
        const on = c === chip;
        c.classList.toggle('is-on', on);
        c.setAttribute('aria-pressed', on ? 'true' : 'false');
      });
      paint(true);
      return;
    }
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
      return;
    }
    if (e.target.id === 'copyAll') {
      try { await navigator.clipboard.writeText(exportCSS()); toast('已复制当前主题 CSS 变量'); }
      catch { toast('复制失败'); }
    }
  });

  paint(false);
  // 从首页跳来：滚到该主题并闪一下，随后清掉标记（不留永久描边）
  const focusCard = focus ? grid.querySelector('.theme-card[data-key="' + focus + '"]') : null;
  if (focusCard) {
    focusCard.scrollIntoView({ block: 'center' });
    setTimeout(() => { focusCard.removeAttribute('data-focus'); }, 1500);   /* focusFlashDone */
  }
  [...grid.children].forEach((c, i) => c.style.setProperty('--d', Math.min(i, 24) * 18 + 'ms'));
}
