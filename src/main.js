/* src/main.js — 启动：注册路由、初始化明暗模式、绑定页头交互 */

import { defineRoute, setNotFound, startRouter } from './router.js?v=vmvted2h2';
import * as Themes from './theme-manager.js?v=vmvted2h2';
import { toggle as toggleThemePanel, bindShortcuts as bindThemeShortcuts } from './components/theme-switcher.js?v=vmvted2h2';
import { bindShortcutSheet } from './components/shortcut-sheet.js?v=vmvted2h2';
import { cycle as cycleTheme } from './theme-manager.js?v=vmvted2h2';

const STORE_MODE = 'mdp:v1:mode';

/* ---------- 明暗模式 ---------- */
function readMode() {
  try { return localStorage.getItem(STORE_MODE) || 'system'; } catch { return 'system'; }
}
function resolveMode(pref) {
  if (pref === 'light' || pref === 'dark') return pref;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}
function applyMode(pref) {
  const mode = resolveMode(pref);
  document.documentElement.setAttribute('data-mode', mode);
  try { localStorage.setItem(STORE_MODE, pref); } catch { /* 忽略隐私模式写入失败 */ }
  const btn = document.getElementById('modeBtn');
  if (btn) btn.setAttribute('aria-label', mode === 'dark' ? '切换到明亮模式' : '切换到暗夜模式');
}

/* ---------- 路由表（页面模块在 M6 补全，当前为占位） ---------- */
defineRoute('/', () => import('./pages/home.js?v=vmvted2h2'), () => 'MkDownPost · 码稿');
defineRoute('/editor', () => import('./pages/editor.js?v=vmvted2h2'), () => '编辑器 · MkDownPost');
defineRoute('/article/:slug', () => import('./pages/article.js?v=vmvted2h2'), (p) => (p.slug ? p.slug + ' · MkDownPost' : '文章 · MkDownPost'));
defineRoute('/themes', () => import('./pages/themes.js?v=vmvted2h2'), () => '主题库 · MkDownPost');
defineRoute('/about', () => import('./pages/about.js?v=vmvted2h2'), () => '关于 · MkDownPost');
setNotFound(() => import('./pages/notfound.js?v=vmvted2h2'), '页面不存在 · MkDownPost');

/* ---------- 启动 ---------- */
function boot() {
  Themes.init();
  applyMode(readMode());
  document.getElementById('themeBtn')?.addEventListener('click', toggleThemePanel);
  bindThemeShortcuts();
  bindShortcutSheet({
    onThemeNext: () => cycleTheme(1),
    onThemePrev: () => cycleTheme(-1),
    onMode: () => applyMode(document.documentElement.getAttribute('data-mode') === 'dark' ? 'light' : 'dark')
  });
  document.getElementById('modeBtn')?.addEventListener('click', () => {
    const cur = document.documentElement.getAttribute('data-mode');
    applyMode(cur === 'dark' ? 'light' : 'dark');
  });

  const nav = document.getElementById('primaryNav');
  const toggle = document.getElementById('navToggle');
  const scrim = document.getElementById('navScrim');
  const closeNav = () => {
    nav?.classList.remove('is-open');
    toggle?.setAttribute('aria-expanded', 'false');
    if (scrim) scrim.hidden = true;
  };
  toggle?.addEventListener('click', () => {
    const open = nav?.classList.toggle('is-open');
    toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    if (scrim) scrim.hidden = !open;
  });
  scrim?.addEventListener('click', closeNav);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeNav();
    if (e.key.toLowerCase() === 'd' && e.shiftKey) {
      const cur = document.documentElement.getAttribute('data-mode');
      applyMode(cur === 'dark' ? 'light' : 'dark');
    }
  });
  nav?.addEventListener('click', (e) => {
    if (e.target instanceof HTMLAnchorElement) closeNav();
  });

  startRouter();
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
else boot();
