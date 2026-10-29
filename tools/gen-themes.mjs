/* tools/gen-themes.mjs — 生成扩展主题（42 套）与全部 50 套清单
   用法：node tools/gen-themes.mjs
   产出：assets/styles/themes.generated.css、data/themes.generated.js
   规则：与手调 8 套同一算法；--c-primary-text 自动压暗到 WCAG AA(≥4.6)。 */

import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const SEEDS = [
  ['vscode', 'VS Code', 'dev', '#007ACC', '#4DA6FF'],
  ['notion', 'Notion', 'tool', '#37352F', '#E8E8E6'],
  ['figma', 'Figma', 'tool', '#F24E1E', '#FF7A5C'],
  ['linear', 'Linear', 'tool', '#5E6AD2', '#8B96FF'],
  ['vercel', 'Vercel', 'dev', '#000000', '#FFFFFF'],
  ['nextjs', 'Next.js', 'dev', '#000000', '#FFFFFF'],
  ['tailwind', 'Tailwind', 'dev', '#38BDF8', '#7DD3FC'],
  ['vite', 'Vite', 'dev', '#646CFF', '#9AA0FF'],
  ['rust', 'Rust', 'lang', '#B7410E', '#E07A50'],
  ['go', 'Go', 'lang', '#00ADD8', '#5CD5F0'],
  ['python', 'Python', 'lang', '#3776AB', '#6FA8DC'],
  ['typescript', 'TypeScript', 'lang', '#3178C6', '#69A8E8'],
  ['apple', 'Apple', 'system', '#0071E3', '#5AA6F0'],
  ['material', 'Material', 'system', '#6750A4', '#9B86D9'],
  ['bootstrap', 'Bootstrap', 'framework', '#7952B3', '#A98EDB'],
  ['discord', 'Discord', 'social', '#5865F2', '#8B94FF'],
  ['slack', 'Slack', 'social', '#4A154B', '#C77DD1'],
  ['telegram', 'Telegram', 'social', '#0088CC', '#4FB6E8'],
  ['youtube', 'YouTube', 'media', '#FF0000', '#FF6B6B'],
  ['netflix', 'Netflix', 'media', '#E50914', '#FF5A63'],
  ['spotify', 'Spotify', 'media', '#1DB954', '#5BE58C'],
  ['steam', 'Steam', 'game', '#171A21', '#7BA7D7'],
  ['playstation', 'PlayStation', 'game', '#003791', '#4A7FD4'],
  ['xbox', 'Xbox', 'game', '#107C10', '#5BC15B'],
  ['nintendo', 'Nintendo', 'game', '#E60012', '#FF5B66'],
  ['miui', 'MIUI', 'system', '#FF6900', '#FF9A4D'],
  ['harmonyos', 'HarmonyOS', 'system', '#007DFF', '#5FAEFF'],
  ['windows', 'Windows', 'system', '#0078D4', '#4FA3E8'],
  ['chrome', 'Chrome', 'browser', '#4285F4', '#7AAAF8'],
  ['firefox', 'Firefox', 'browser', '#FF7139', '#FFA07A'],
  ['safari', 'Safari', 'browser', '#006CFF', '#5AA0FF'],
  ['dribbble', 'Dribbble', 'design', '#EA4C89', '#FF80B0'],
  ['behance', 'Behance', 'design', '#1769FF', '#5A96FF'],
  ['medium', 'Medium', 'media', '#000000', '#FFFFFF'],
  ['substack', 'Substack', 'media', '#FF6719', '#FF9A63'],
  ['wordpress', 'WordPress', 'cms', '#21759B', '#5AA3C4'],
  ['ghost', 'Ghost', 'cms', '#15171A', '#9CA3AF'],
  ['juejin', '掘金', 'cn', '#1E80FF', '#5CA6FF'],
  ['csdn', 'CSDN', 'cn', '#FC5531', '#FF8A70'],
  ['oschina', '开源中国', 'cn', '#1E9E49', '#57C97C'],
  ['gitee', 'Gitee', 'cn', '#C71D23', '#F05A5F'],
  ['cloudflare', 'Cloudflare', 'infra', '#F38020', '#FFA866'],
  ['arc', 'Arc', 'browser', '#FCBF00', '#FFD84D'],
  ['brave', 'Brave', 'browser', '#FB542B', '#FF8763'],
  ['opera', 'Opera', 'browser', '#FF1B2D', '#FF5A66'],
  ['vivaldi', 'Vivaldi', 'browser', '#EF3939', '#FF6B6B'],
  ['edge', 'Edge', 'browser', '#0F6CBD', '#4F9BE0'],
  ['torbrowser', 'Tor', 'browser', '#7D4698', '#A87CC0'],
  ['ubuntu', 'Ubuntu', 'system', '#E95420', '#FF8B5C'],
  ['fedora', 'Fedora', 'system', '#51A2DA', '#7FBEEA'],
  ['debian', 'Debian', 'system', '#A80030', '#D63B5F'],
  ['archlinux', 'Arch Linux', 'system', '#1793D1', '#4FB4E3'],
  ['linuxmint', 'Linux Mint', 'system', '#86BE43', '#A9D46F'],
  ['redhat', 'Red Hat', 'system', '#EE0000', '#FF5252'],
  ['android', 'Android', 'system', '#3DDC84', '#6EE7A5'],
  ['ios', 'iOS', 'system', '#007AFF', '#4FA8FF'],
  ['macos', 'macOS', 'system', '#1D1D1F', '#A1A1A6'],
  ['electron', 'Electron', 'dev', '#47848F', '#6FA9B2'],
  ['tauri', 'Tauri', 'dev', '#FFC131', '#FFD766'],
  ['svelte', 'Svelte', 'dev', '#FF3E00', '#FF7043'],
  ['vue', 'Vue', 'dev', '#41B883', '#6ED0A2'],
  ['reactjs', 'React', 'dev', '#61DAFB', '#9BE7FC'],
  ['angular', 'Angular', 'dev', '#DD0031', '#FF5A78'],
  ['nuxt', 'Nuxt', 'dev', '#00DC82', '#57E8A6'],
  ['remix', 'Remix', 'dev', '#3992FF', '#78B4FF'],
  ['astro', 'Astro', 'dev', '#BC52EE', '#D186F5'],
  ['deno', 'Deno', 'dev', '#70FFAF', '#A6FFCA'],
  ['bun', 'Bun', 'dev', '#FBF0DF', '#FFFFFF'],
  ['webpack', 'webpack', 'dev', '#8DD6F9', '#B3E5FB'],
  ['rollup', 'Rollup', 'dev', '#EC4A3F', '#FF7C73'],
  ['esbuild', 'esbuild', 'dev', '#FFCF00', '#FFE04D'],
  ['swc', 'SWC', 'dev', '#22C55E', '#5CE58C'],
  ['jest', 'Jest', 'dev', '#C21325', '#E8576A'],
  ['vitest', 'Vitest', 'dev', '#729B1B', '#9BC44B'],
  ['playwright', 'Playwright', 'dev', '#2EAD33', '#5FCB63'],
  ['cypress', 'Cypress', 'dev', '#17202C', '#4A5866'],
  ['storybook', 'Storybook', 'dev', '#FF4785', '#FF7BA6'],
  ['chromatic', 'Chromatic', 'dev', '#FF4400', '#FF7A4D'],
  ['sass', 'Sass', 'dev', '#CC6699', '#E595B8'],
  ['less', 'Less', 'dev', '#1D365D', '#4C6B8F'],
  ['postcss', 'PostCSS', 'dev', '#DD3A0A', '#FF6B3D'],
  ['prisma', 'Prisma', 'dev', '#2D3748', '#5A6B82'],
  ['drizzle', 'Drizzle', 'dev', '#C5F74F', '#D9FA8A'],
  ['supabase', 'Supabase', 'dev', '#3ECF8E', '#74E5B3'],
  ['firebase', 'Firebase', 'dev', '#FFCA28', '#FFDA6B'],
  ['mongodb', 'MongoDB', 'dev', '#47A248', '#77C878'],
  ['postgresql', 'PostgreSQL', 'dev', '#4169E1', '#7A98F0'],
  ['redis', 'Redis', 'dev', '#DC382D', '#FF6B62'],
  ['mysql', 'MySQL', 'dev', '#00758F', '#3FA5BF'],
  ['sqlite', 'SQLite', 'dev', '#003B57', '#3A7590'],
  ['docker', 'Docker', 'dev', '#2496ED', '#62B6F5'],
  ['kubernetes', 'Kubernetes', 'dev', '#326CE5', '#6D9BF0'],
  ['terraform', 'Terraform', 'dev', '#7B42BC', '#A97DE0'],
  ['ansible', 'Ansible', 'dev', '#EE0000', '#FF5252'],
  ['nginx', 'NGINX', 'dev', '#009639', '#43C077'],
  ['grafana', 'Grafana', 'dev', '#F46800', '#FF9A4D'],
  ['prometheus', 'Prometheus', 'dev', '#E6522C', '#FF8A6B'],
  ['jenkins', 'Jenkins', 'dev', '#D24939', '#F0796A'],
  ['gitlab', 'GitLab', 'dev', '#FC6D26', '#FF9A66'],
  ['bitbucket', 'Bitbucket', 'dev', '#0052CC', '#4C8AE6'],
  ['jira', 'Jira', 'dev', '#0052CC', '#4C8AE6'],
  ['confluence', 'Confluence', 'dev', '#172B4D', '#4F6B96'],
  ['trello', 'Trello', 'dev', '#0079BF', '#4BA3D6'],
  ['asana', 'Asana', 'dev', '#F06A6A', '#FF9D9D'],
  ['monday', 'monday.com', 'dev', '#FF3D57', '#FF7488'],
  ['clickup', 'ClickUp', 'dev', '#7B68EE', '#A695FF'],
  ['airtable', 'Airtable', 'dev', '#FFBF00', '#FFD54D'],
  ['coda', 'Coda', 'dev', '#F46A54', '#FF9C8B'],
  ['miro', 'Miro', 'design', '#FFD02F', '#FFE070'],
  ['canva', 'Canva', 'design', '#00C4CC', '#5FDFE4'],
  ['adobexd', 'Adobe XD', 'design', '#FF61F6', '#FF95FA'],
  ['sketch', 'Sketch', 'design', '#F7B500', '#FFCF4D'],
  ['invision', 'InVision', 'design', '#FF3366', '#FF7099'],
  ['framer', 'Framer', 'design', '#0099FF', '#55BEFF'],
  ['webflow', 'Webflow', 'design', '#4353FF', '#8B96FF'],
  ['spline', 'Spline', 'design', '#F24E1E', '#FF8463'],
  ['pinterest', 'Pinterest', 'social', '#E60023', '#FF4D66'],
  ['reddit', 'Reddit', 'social', '#FF4500', '#FF7A4D'],
  ['linkedin', 'LinkedIn', 'social', '#0A66C2', '#4A94E0'],
  ['twitter', 'X', 'social', '#000000', '#E7E9EA'],
  ['facebook', 'Facebook', 'social', '#1877F2', '#5CA6F7'],
  ['instagram', 'Instagram', 'social', '#E4405F', '#FF7A96'],
  ['threads', 'Threads', 'social', '#000000', '#B0B3B8'],
  ['mastodon', 'Mastodon', 'social', '#6364FF', '#9A9BFF'],
  ['weibo', '微博', 'cn', '#E6162D', '#FF5A6E'],
  ['douban', '豆瓣', 'cn', '#2E963B', '#5FC16C'],
  ['baidu', '百度', 'cn', '#2932E1', '#6B72F0'],
  ['alipay', '支付宝', 'cn', '#1677FF', '#5AA0FF'],
  ['taobao', '淘宝', 'cn', '#FF5000', '#FF844D'],
  ['jd', '京东', 'cn', '#E1251B', '#FF5E56'],
  ['meituan', '美团', 'cn', '#FFC300', '#FFD955'],
  ['didi', '滴滴', 'cn', '#FF7F41', '#FFA877'],
  ['byd', '比亚迪', 'cn', '#E60012', '#FF5B66'],
  ['huawei', '华为', 'cn', '#CF0A2C', '#FF4D6A'],
  ['xiaomi', '小米', 'system', '#FF6900', '#FF9A4D']
];

const hex2rgb = (h) => { const s = h.replace('#', ''); return [0, 2, 4].map((i) => parseInt(s.slice(i, i + 2), 16)); };
const rgb2hex = (r, g, b) => '#' + [r, g, b].map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('').toUpperCase();
const mix = (a, b, t) => { const A = hex2rgb(a), B = hex2rgb(b); return rgb2hex(A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t, A[2] + (B[2] - A[2]) * t); };
const lum = (h) => { const [r, g, b] = hex2rgb(h).map((v) => { const c = v / 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); }); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
const ratio = (a, b) => { const L1 = lum(a), L2 = lum(b); const [hi, lo] = L1 > L2 ? [L1, L2] : [L2, L1]; return (hi + 0.05) / (lo + 0.05); };
const toAA = (color, bg, target = 4.6) => {
  let c = color; const darkBg = lum(bg) > 0.5;
  for (let i = 0; i < 40 && ratio(c, bg) < target; i++) c = darkBg ? mix(c, '#000000', 0.08) : mix(c, '#FFFFFF', 0.08);
  return c;
};

function vars(brand, mode) {
  const dark = mode === 'dark';
  const n = dark
    ? { bg: '#0F1318', surface: '#161B22', surface2: '#1C232C', text: '#E7EBF0', text2: '#AEB6BF', muted: '#828C96', border: '#263039', divider: '#1E262E', codeBg: '#11161C', codeBar: '#1A2129' }
    : { bg: '#FBFCFD', surface: '#FFFFFF', surface2: '#F4F6F8', text: '#171B21', text2: '#454C54', muted: '#6E7780', border: '#E3E7EB', divider: '#EDF0F2', codeBg: '#F6F8FA', codeBar: '#EEF1F4' };
  const primary = brand;
  const pText = toAA(primary, n.bg);
  const link = toAA(pText, n.bg);
  return {
    '--c-primary': primary, '--c-primary-text': pText,
    '--c-primary-soft': mix(n.surface, primary, dark ? 0.22 : 0.16),
    '--c-primary-bg': mix(n.bg, primary, dark ? 0.14 : 0.07),
    '--c-link': link, '--c-link-hover': dark ? mix(link, '#FFFFFF', 0.18) : mix(link, '#000000', 0.22),
    '--c-quote-bar': primary, '--c-selection-bg': mix(n.bg, primary, dark ? 0.3 : 0.22),
    '--c-focus-ring': dark ? primary : pText,
    '--c-bg': n.bg, '--c-surface': n.surface, '--c-surface-2': n.surface2,
    '--c-text': n.text, '--c-text-secondary': n.text2, '--c-text-muted': n.muted,
    '--c-border': n.border, '--c-divider': n.divider,
    '--c-code-bg': n.codeBg, '--c-code-bar': n.codeBar,
    '--c-success': dark ? '#3DDC84' : '#0B7A3B',
    '--c-warning': dark ? '#FFB454' : '#8A5300',
    '--c-danger': dark ? '#FF6B6B' : '#B01B1B'
  };
}

const css = ['/* themes.generated.css — 由 tools/gen-themes.mjs 生成，请勿手改 */', ''];
const meta = [];
let worst = 99;

for (const [key, name, group, l, d] of SEEDS.slice(0, 92)) {
  for (const [mode, brand] of [['light', l], ['dark', d]]) {
    const v = vars(brand, mode);
    const sel = mode === 'light' ? '[data-theme="' + key + '"]:not([data-mode="dark"])' : '[data-theme="' + key + '"][data-mode="dark"]';
    css.push(sel + '{' + Object.entries(v).map(([k, val]) => k + ':' + val).join(';') + '}');
    const r = Math.min(ratio(v['--c-text'], v['--c-bg']), ratio(v['--c-primary-text'], v['--c-bg']));
    worst = Math.min(worst, r);
  }
  meta.push({ key, name, group, brand: { light: l, dark: d }, note: name + ' 品牌色（近似取色）' });
}

fs.writeFileSync(path.join(ROOT, 'assets/styles/themes.generated.css'), css.join('\n') + '\n');
fs.writeFileSync(path.join(ROOT, 'data/themes.generated.js'),
  '/* data/themes.generated.js — 由 tools/gen-themes.mjs 生成，请勿手改 */\nexport const GENERATED = ' +
  JSON.stringify(meta, null, 2) + ';\n');

console.log('已生成 ' + meta.length + ' 套扩展主题；最低对比度 ' + worst.toFixed(2) + ':1');
console.log('注意：若最低值 < 4.5，请调整 seeds 后重跑。');
