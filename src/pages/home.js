import { derivePalette } from '../theme-custom.js';
/* src/pages/home.js — 首页：定位 + 编辑器入口 + 精选内容 + 主题预览墙
   所有列表都用 DOM 构建（textContent 写入），避免字符串拼 HTML 造成的结构错乱与 XSS 风险。 */
import { THEMES } from '../../data/themes.js?v=vmvtixrcv';

const el = (tag, cls, text) => {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text !== undefined) n.textContent = text;
  return n;
};

function buildCard(a) {
  const card = el('a', 'card');
  card.href = '#/article/' + a.slug;
  card.appendChild(el('h3', 'card__title', a.title || a.slug));
  if (a.excerpt) card.appendChild(el('p', 'card__desc', a.excerpt));
  const meta = [(a.tags || []).join(' · '), (a.readingTime || 3) + ' 分钟'].filter(Boolean).join(' · ');
  card.appendChild(el('p', 'card__meta', meta));
  return card;
}

function buildChip(t) {
  const a = el('a', 'theme-chip');
  a.href = '#/themes?theme=' + t.key;
  const dark = document.documentElement.getAttribute('data-mode') === 'dark';
  const pal = derivePalette(dark ? t.brand.dark : t.brand.light, dark ? 'dark' : 'light');
  // 与主题库 / 配色面板一致：5 个重叠色点
  const dots = el('span', 'pcard__dots');
  [pal['--c-primary'], pal['--c-primary-soft'], pal['--c-bg'], pal['--c-text'], pal['--c-link']]
    .forEach((c) => { const i = document.createElement('i'); i.style.background = c; dots.appendChild(i); });
  a.append(dots, el('span', 'theme-chip__name', t.name), el('span', 'theme-chip__note', t.note));
  return a;
}

export default async function render(root) {
  let index = [];
  try { index = await (await fetch('./content-index.json')).json(); } catch { index = []; }
  const featured = index.filter((a) => a.featured).slice(0, 9);

  root.replaceChildren();

  // Hero
  const hero = el('section', 'hero');
  const h1 = el('h1', 'hero__title', '写 Markdown，');
  h1.appendChild(el('span', 'hero__accent', '一键拿到各平台能用的排版'));
  hero.append(
    h1,
    el('p', 'hero__sub', '面向公众号、小黑盒、TapTap 创作者的写作与排版工作台。左边写，右边看，导出即可粘贴。')
  );
  const cta = el('div', 'hero__cta');
  const start = el('a', 'btn btn--primary', '开始写作');
  start.href = '#/editor';
  const browse = el('a', 'btn', '浏览主题（' + THEMES.length + ' 套）');
  browse.href = '#/themes';
  cta.append(start, browse);
  hero.append(cta, el('p', 'hero__note', '不使用任何 AI · 不上传你的内容 · 无账号系统'));

  // 能力三栏
  const features = el('section', 'features');
  [['实时预览', '左侧编辑右侧渲染，支持表格、代码块、任务列表、公式与图形。'],
   ['主题化排版', THEMES.length + ' 套品牌主题 × 明暗双色，所有元素随主题联动，可一键复制配色变量。'],
   ['平台适配导出', '公众号全内联样式、小黑盒结构与图片规则、TapTap 兼容降级，导出并附处理说明。']
  ].forEach(([t, d]) => {
    const f = el('article', 'feature');
    f.append(el('h2', null, t), el('p', null, d));
    features.appendChild(f);
  });

  // 精选内容
  const sec = el('section', 'section');
  const head = el('div', 'section__head');
  const more = el('a', 'section__more', '去写自己的 →');
  more.href = '#/editor';
  head.append(el('h2', 'section__title', '精选内容'), more);
  const cards = el('div', 'cards');
  if (featured.length) featured.forEach((a) => cards.appendChild(buildCard(a)));
  else cards.appendChild(el('p', 'muted', '还没有精选内容：在 content/ 放 .md 并在 content-index.json 标注 featured。'));
  sec.append(head, cards);

  // 主题预览墙
  const sec2 = el('section', 'section');
  const head2 = el('div', 'section__head');
  const more2 = el('a', 'section__more', '查看全部 →');
  more2.href = '#/themes';
  head2.append(el('h2', 'section__title', '主题预览墙'), more2);
  const strip = el('div', 'theme-strip');
  THEMES.slice(0, 12).forEach((t) => { if (t && t.brand) strip.appendChild(buildChip(t)); });
  sec2.append(head2, strip);

  root.append(hero, features, sec, sec2);
}
