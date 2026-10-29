/* src/pages/home.js — 首页：定位 + 编辑器入口 + 精选内容 + 主题预览墙 */
import { THEMES } from '../../data/themes.js';

export default async function render(root) {
  let index = [];
  try { index = await (await fetch('./content-index.json')).json(); } catch { index = []; }
  const featured = index.filter((a) => a.featured).slice(0, 6);

  const cardHTML = featured.length
    ? featured.map((a) => [
        '<a class="card" href="#/article/' + a.slug + '">',
        '<h3 class="card__title">' + a.title + '</h3>',
        '<p class="card__desc">' + (a.excerpt || '') + '</p>',
        '<p class="card__meta">' + (a.tags || []).join(' · ') + ' · ' + (a.readingTime || 3) + ' 分钟</p>',
        '</a>'
      ].join('')).join('')
    : '<p class="muted">还没有精选内容：在 content/ 放 .md 并在 content-index.json 标注 featured。</p>';

  root.innerHTML = [
    '<section class="hero">',
    '<h1 class="hero__title">写 Markdown，<span class="hero__accent">一键拿到各平台能用的排版</span></h1>',
    '<p class="hero__sub">面向公众号、小黑盒、TapTap 创作者的写作与排版工作台。左边写，右边看，导出即可粘贴。</p>',
    '<div class="hero__cta"><a class="btn btn--primary" href="#/editor">开始写作</a><a class="btn" href="#/themes">浏览主题（' + THEMES.length + ' 套）</a></div>',
    '<p class="hero__note">不使用任何 AI · 不上传你的内容 · 无账号系统</p>',
    '</section>',

    '<section class="features">',
    '<article class="feature"><h2>实时预览</h2><p>左侧编辑右侧渲染，支持表格、代码块、任务列表、公式与图形。</p></article>',
    '<article class="feature"><h2>主题化排版</h2><p>' + THEMES.length + ' 套品牌主题 × 明暗双色，所有元素随主题联动，可一键复制配色变量。</p></article>',
    '<article class="feature"><h2>平台适配导出</h2><p>公众号全内联样式、小黑盒结构与图片规则、TapTap 兼容降级，导出并附处理说明。</p></article>',
    '</section>',

    '<section class="section">',
    '<div class="section__head"><h2 class="section__title">精选内容</h2><a class="section__more" href="#/editor">去写自己的 →</a></div>',
    '<div class="cards">' + cardHTML + '</div>',
    '</section>',

    '<section class="section">',
    '<div class="section__head"><h2 class="section__title">主题预览墙</h2><a class="section__more" href="#/themes">查看全部 →</a></div>',
    '<div class="theme-strip" id="themeStrip"></div>',
    '</section>'
  ].join('');

  // 主题条用 DOM 构建：避免超长模板字符串与选择器依赖
  let strip = root.querySelector('#themeStrip');
  if (!strip) {
    strip = document.createElement('div');
    strip.className = 'theme-strip';
    root.appendChild(strip);
  }
  THEMES.slice(0, 12).forEach((t) => {
    if (!t || !t.brand) return;
    const a = document.createElement('a');
    a.className = 'theme-chip';
    a.href = '#/themes?theme=' + t.key;
    const dot = document.createElement('span');
    dot.className = 'theme-chip__dot';
    dot.style.background = t.brand.light;
    const name = document.createElement('span');
    name.className = 'theme-chip__name';
    name.textContent = t.name;
    const note = document.createElement('span');
    note.className = 'theme-chip__note';
    note.textContent = t.note;
    a.append(dot, name, note);
    strip.appendChild(a);
  });
}
