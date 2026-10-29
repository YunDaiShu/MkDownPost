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
  ['cloudflare', 'Cloudflare', 'infra', '#F38020', '#FFA866']
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

for (const [key, name, group, l, d] of SEEDS) {
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
