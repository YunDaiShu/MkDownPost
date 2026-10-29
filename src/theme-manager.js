/* src/theme-manager.js — 主题管理器
   优先级：?theme= → localStorage → 系统偏好；切换 200ms 过渡、不刷新、不闪屏。
   暴露 window.themes 便于控制台调试。 */

import { THEMES, themeMeta } from '../data/themes.js';

const KEY_THEME = 'mdp:v1:theme';
const KEY_MODE = 'mdp:v1:mode';
const ORDER = THEMES.map((t) => t.key);
let current = null;

const readLS = (k) => { try { return localStorage.getItem(k); } catch { return null; } };
const writeLS = (k, v) => { try { localStorage.setItem(k, v); } catch { /* 隐私模式忽略 */ } };

/** 全部主题元数据 */
export function list() {
  return THEMES.slice();
}

/** 当前主题 key */
export function get() {
  return current || readLS(KEY_THEME) || 'deepseek';
}

/** 当前明暗模式（解析后的 light/dark） */
export function getMode() {
  return document.documentElement.getAttribute('data-mode') || 'light';
}

/** 应用主题（不刷新页面） */
export function apply(key, { silent = false } = {}) {
  const k = ORDER.includes(key) ? key : 'deepseek';
  const html = document.documentElement;

  // 200ms 颜色过渡（reduced-motion 时由 base.css 全局关断）
  html.style.transition = 'background-color 200ms cubic-bezier(.16,1,.3,1)';
  html.setAttribute('data-theme', k);
  const meta = themeMeta(k);
  html.setAttribute('data-theme-group', (meta && meta.group) || 'misc');   // 装饰变体分组
  current = k;
  writeLS(KEY_THEME, k);

  if (!silent) {
    document.dispatchEvent(new CustomEvent('theme:change', { detail: { key: k, meta: themeMeta(k) } }));
  }
  setTimeout(() => { html.style.transition = ''; }, 220);
  return k;
}

/** 明暗切换 */
export function toggleDark(force) {
  const next = typeof force === 'boolean'
    ? (force ? 'dark' : 'light')
    : (getMode() === 'dark' ? 'light' : 'dark');
  document.documentElement.setAttribute('data-mode', next);
  const darkSheet = document.getElementById('hljsDark');
  if (darkSheet) darkSheet.media = next === 'dark' ? 'all' : 'not all';
  writeLS(KEY_MODE, next);
  document.dispatchEvent(new CustomEvent('theme:change', { detail: { key: get(), mode: next } }));
  return next;
}

/** 循环切换（dir=1 正向 / -1 反向） */
export function cycle(dir = 1) {
  const cur = get();
  const i = ORDER.indexOf(cur);
  const next = ORDER[(i + (dir > 0 ? 1 : ORDER.length - 1)) % ORDER.length];
  return apply(next);
}

/** 初始化解：URL 参数优先，其次 localStorage，最后系统 */
export function init() {
  const urlTheme = new URLSearchParams(location.search).get('theme');
  const urlHashTheme = new URLSearchParams(location.hash.split('?')[1] || '').get('theme');
  const fromUrl = urlTheme || urlHashTheme;
  const key = fromUrl && ORDER.includes(fromUrl) ? fromUrl : (readLS(KEY_THEME) || 'deepseek');
  apply(key, { silent: true });

  const modePref = readLS(KEY_MODE) || 'system';
  const mode = modePref === 'system'
    ? (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
    : modePref;
  document.documentElement.setAttribute('data-mode', mode);

  window.themes = { list, get, apply, toggleDark, cycle };
  return { key, mode };
}

/** 生成「当前主题的 CSS 变量」文本，供粘贴到公众号/其他工具 */
export function exportCSS() {
  const key = get();
  const mode = getMode();
  const cs = getComputedStyle(document.documentElement);
  const vars = [
    '--c-primary', '--c-primary-text', '--c-primary-soft', '--c-primary-bg', '--c-text', '--c-text-secondary',
    '--c-text-muted', '--c-bg', '--c-surface', '--c-surface-2', '--c-border', '--c-divider',
    '--c-code-bg', '--c-code-bar', '--c-quote-bar', '--c-link', '--c-link-hover',
    '--c-selection-bg', '--c-focus-ring', '--c-success', '--c-warning', '--c-danger'
  ];
  const body = vars.map((v) => '  ' + v + ': ' + cs.getPropertyValue(v).trim() + ';').join('\n');
  return '/* MkDownPost · ' + themeMeta(key).name + ' · ' + mode + ' */\n:root {\n' + body + '\n}\n';
}
