import { derivePaletteCached as derivePalette } from '../theme-custom.js';
import { mountReactbitsFX } from '../fx/reactbits.js?v=b6b5c267';
/* src/pages/home.js — 首页：定位 + 编辑器入口 + 精选内容 + 主题预览墙
   所有列表都用 DOM 构建（textContent 写入），避免字符串拼 HTML 造成的结构错乱与 XSS 风险。 */
import { THEMES } from '../../data/themes.js?v=b6b5c267';

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
  try { index = await (await fetch('./content-index.json?c=vmvuufnog')).json(); } catch { index = []; }
  const featured = index.filter((a) => a.featured).slice(0, 9);

  root.replaceChildren();

  // Hero
  const hero = el('section', 'hero');
  const h1 = el('h1', 'hero__title', '你只管写，');
  h1.appendChild(el('span', 'hero__accent', '排版交给它'));

  // 首屏唯一的「亮元素」：用真实排版规则渲染一张公众号样例（DOM，不是插画）
  const stage = el('div', 'hero__stage');
  const device = el('div', 'hero__device');
  const heroBar = el('div', 'hero__device-bar');
  ['#FF5F57', '#FEBC2E', '#28C840'].forEach(function (c) {
    const dot = el('i', 'hero__device-dot');
    dot.style.background = c;
    heroBar.appendChild(dot);
  });
  const deviceBody = el('div', 'hero__device-body');
  const band = el('div', 'hero__band', '十一月线下分享会');
  const lead = el('p', 'hero__device-lead', '时间与地点写清楚，读者一眼就能决定来不来。');
  const heroTbl = el('table', 'hero__table');
  const heroThead = el('thead');
  const heroTrh = el('tr');
  ['时间段', '环节', '嘉宾'].forEach(function (t) { heroTrh.appendChild(el('th', '', t)); });
  heroThead.appendChild(heroTrh);
  const heroTbody = el('tbody');
  [['14:00', '开场与自我介绍', '主持'], ['14:20', '从 Markdown 到排版', '待定'], ['15:50', '圆桌讨论', '全体']].forEach(function (row) {
    const tr = el('tr');
    row.forEach(function (c) { tr.appendChild(el('td', '', c)); });
    heroTbody.appendChild(tr);
  });
  heroTbl.append(heroThead, heroTbody);
  deviceBody.append(band, lead, heroTbl);
  device.append(heroBar, deviceBody);
  stage.appendChild(device);

  const heroInner = el('div', 'hero__inner');
  const heroCopy = el('div', 'hero__copy');
  heroCopy.append(h1, el('p', 'hero__sub', '左边敲字，右边就是公众号里的样子。147 套主题任选，写完点一下复制，直接粘进公众号后台。'));

  const cta = el('div', 'hero__cta');
  const start = el('a', 'btn btn--primary', '开始写作');
  start.href = '#/editor';
  const browse = el('a', 'btn', '浏览主题（' + THEMES.length + ' 套）');
  browse.href = '#/themes';
  cta.append(start, browse);
  heroCopy.appendChild(cta);
  heroCopy.appendChild(el('p', 'hero__note', '不使用任何 AI · 不上传你的内容 · 无账号系统'));
  heroInner.append(heroCopy, stage);
  hero.appendChild(heroInner);

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
  const more = el('a', 'section__more', '查看全部（' + index.length + ' 篇）→');
  more.href = '#/articles';
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
  THEMES.slice(0, 18).forEach((t) => { if (t && t.brand) strip.appendChild(buildChip(t)); });
  sec2.append(head2, strip);

  // ===== 三步流程 =====
  const flow3 = el('section', 'home__section flow3');
  const fhead = el('div', 'section__head');
  fhead.appendChild(el('h2', 'section__title', '三步走完一篇'));
  flow3.appendChild(fhead);
  const steps = el('div', 'flow3__grid');
  [
    ['1', '写 Markdown', '左边写，右边实时预览。支持标题、表格、代码块、公式。'],
    ['2', '选主题与风格', '147 套、7 套代码主题、8 种设计风格，互不打架。'],
    ['3', '复制到公众号', '一键复制内联样式富文本，粘进公众号不丢格式。']
  ].forEach(function (it) {
    const card = el('div', 'flow3__item');
    card.appendChild(el('span', 'flow3__num', it[0]));
    card.appendChild(el('h3', 'flow3__title', it[1]));
    card.appendChild(el('p', 'flow3__desc', it[2]));
    steps.appendChild(card);
  });
  flow3.appendChild(steps);

  // ===== 同稿多主题 =====
  const same = el('section', 'home__section same');
  const shead = el('div', 'section__head');
  shead.appendChild(el('h2', 'section__title', '同一段字，三种气质'));
  const more3 = el('a', 'section__more', '换主题 →');
  more3.href = '#/themes';
  shead.appendChild(more3);
  same.appendChild(shead);
  const picks = THEMES.filter(function (t) { return t && t.brand; }).slice(0, 3);
  const sgrid = el('div', 'same__grid');
  picks.forEach(function (t) {
    const card = el('article', 'same__card');
    const label = el('div', 'same__label');
    label.appendChild(el('span', 'same__dot', ''));
    label.lastChild.style.background = t.brand;
    label.appendChild(el('span', 'same__name', t.name));
    const body = el('div', 'same__body');
    const h = el('h3', 'same__h');
    h.style.color = t.brand;
    h.textContent = '标题示例 Heading';
    const p = el('p', 'same__p');
    p.textContent = '正文示例：写一份 Markdown，导出各平台可用的排版结果。';
    const q = el('blockquote', 'same__q');
    q.style.borderLeftColor = t.brand;
    q.textContent = '引用块也会跟随主色。';
    body.append(h, p, q);
    card.append(label, body);
    sgrid.appendChild(card);
  });
  same.appendChild(sgrid);

  // ===== 排版示例 =====
  const demo = el('section', 'home__section demo');
  const dhead = el('div', 'section__head');
  dhead.appendChild(el('h2', 'section__title', '能做到的排版'));
  demo.appendChild(dhead);
  const sheet = el('div', 'demo__sheet');
  const dnum = el('h3', 'demo__h');
  const badge = el('span', 'demo__badge', '01');
  dnum.append(badge, document.createTextNode('实时预览与内联导出'));
  const dcall = el('div', 'demo__callout');
  dcall.appendChild(el('div', 'demo__callout-title', '核心洞察'));
  dcall.appendChild(el('p', '', '好的创作工具不该让作者在「写什么」和「怎么涂颜色」之间反复横跳。'));
  const dtable = el('table', 'demo__table');
  const thead = el('thead');
  const trh = el('tr');
  ['排版维度', '传统套路', '现代审美'].forEach(function (h) { trh.appendChild(el('th', '', h)); });
  thead.appendChild(trh);
  const tbody = el('tbody');
  [['色彩使用', '多色混搭', '单一主色'], ['表格呈现', '全封闭网格', '极简三线表']].forEach(function (row) {
    const tr = el('tr');
    row.forEach(function (c) { tr.appendChild(el('td', '', c)); });
    tbody.appendChild(tr);
  });
  dtable.append(thead, tbody);
  sheet.append(dnum, dcall, dtable);
  demo.appendChild(sheet);

  root.append(hero, features, sec, sec2, flow3, same, demo);
  // 铅字车间方向：首页保持静止，不挂装饰动效。
}
