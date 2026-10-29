/* src/theme-custom.js — 自定义主色：取一个颜色，推导完整 23 令牌（AA 保证）
   与 tools/gen-themes.mjs 同一套算法；结果存 localStorage: mdp:v1:custom */

const KEY = 'mdp:v1:custom';

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

const NEUTRAL = {
  light: { bg: '#FBFCFD', surface: '#FFFFFF', surface2: '#F4F6F8', text: '#171B21', text2: '#454C54', muted: '#6E7780', border: '#E3E7EB', divider: '#EDF0F2', codeBg: '#F6F8FA', codeBar: '#EEF1F4' },
  dark: { bg: '#0F1318', surface: '#161B22', surface2: '#1C232C', text: '#E7EBF0', text2: '#AEB6BF', muted: '#828C96', border: '#263039', divider: '#1E262E', codeBg: '#11161C', codeBar: '#1A2129' }
};

export function derivePalette(hex, mode = 'light') {
  const dark = mode === 'dark';
  const n = NEUTRAL[dark ? 'dark' : 'light'];
  const primary = hex.toUpperCase();
  const pText = toAA(primary, n.bg);
  return {
    '--c-primary': primary,
    '--c-primary-text': pText,
    '--c-primary-soft': mix(n.surface, primary, dark ? 0.22 : 0.16),
    '--c-primary-bg': mix(n.bg, primary, dark ? 0.14 : 0.07),
    '--c-link': pText,
    '--c-link-hover': dark ? mix(pText, '#FFFFFF', 0.18) : mix(pText, '#000000', 0.22),
    '--c-quote-bar': primary,
    '--c-selection-bg': mix(n.bg, primary, dark ? 0.3 : 0.22),
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

export function saveCustom(hex) {
  try { localStorage.setItem(KEY, JSON.stringify({ hex })); } catch { /* 忽略 */ }
}
export function readCustom() {
  try { const j = JSON.parse(localStorage.getItem(KEY) || 'null'); return j && j.hex ? j.hex : null; } catch { return null; }
}

/** 应用到当前文档（data-theme=custom + 内联变量，优先级最高） */
export function applyCustom(hex) {
  const mode = document.documentElement.getAttribute('data-mode') === 'dark' ? 'dark' : 'light';
  const pal = derivePalette(hex, mode);
  const html = document.documentElement;
  Object.entries(pal).forEach(([k, val]) => html.style.setProperty(k, val));
  html.setAttribute('data-theme', 'custom');
  html.setAttribute('data-theme-group', 'misc');
  saveCustom(hex);
  document.dispatchEvent(new CustomEvent('theme:change', { detail: { key: 'custom' } }));
  return pal;
}

/** 明暗切换后重新推导自定义主题 */
export function reapplyCustomIfActive() {
  const hex = readCustom();
  if (!hex) return false;
  if (document.documentElement.getAttribute('data-theme') !== 'custom') return false;
  applyCustom(hex);
  return true;
}

/** 清除内联变量并回到某套内置主题 */
export function clearCustom() {
  const html = document.documentElement;
  Object.keys(derivePalette('#000000', 'light')).forEach((k) => html.style.removeProperty(k));
  try { localStorage.removeItem(KEY); } catch { /* 忽略 */ }
}

/** 导出当前配色为 JSON（可分享给别人导入） */
export function exportThemeJson(name = 'mkdownpost-theme') {
  const cs = getComputedStyle(document.documentElement);
  const vars = {};
  Object.keys(derivePalette('#000000', 'light')).forEach((k) => {
    vars[k] = cs.getPropertyValue(k).trim();
  });
  const payload = {
    format: 'mkdownpost-theme@1',
    name,
    theme: document.documentElement.getAttribute('data-theme'),
    mode: document.documentElement.getAttribute('data-mode'),
    vars
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name + '.json';
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1500);
  return payload;
}

/** 导入配色 JSON（校验格式 → 应用变量） */
export async function importThemeJson(file) {
  const text = await file.text();
  let payload;
  try { payload = JSON.parse(text); } catch { return { ok: false, reason: '不是合法的 JSON' }; }
  if (!payload || payload.format !== 'mkdownpost-theme@1' || !payload.vars) {
    return { ok: false, reason: '不是 MkDownPost 配色文件' };
  }
  const html = document.documentElement;
  const known = Object.keys(derivePalette('#000000', 'light'));
  let applied = 0;
  known.forEach((k) => {
    const val = payload.vars[k];
    if (typeof val === 'string' && /^#[0-9a-f]{3,8}$/i.test(val.trim())) {
      html.style.setProperty(k, val.trim());
      applied++;
    }
  });
  html.setAttribute('data-theme', 'custom');
  document.dispatchEvent(new CustomEvent('theme:change', { detail: { key: 'custom' } }));
  return { ok: applied > 0, applied, name: payload.name || '' };
}
