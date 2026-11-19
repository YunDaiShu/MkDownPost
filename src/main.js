// 设计风格：启动即应用（整站生效，跨页面保持）
(() => {
  try {
    const v = localStorage.getItem('mdp:v1:style') || '';
    const ct = localStorage.getItem('mdp:v1:code-theme') || '';
    if (ct) document.documentElement.dataset.codeTheme = ct;
    if (v) document.documentElement.dataset.style = v;
    else delete document.documentElement.dataset.style;
  } catch (e) { /* 隐私模式下忽略 */ }
})();
/* src/main.js — 启动：注册路由、初始化明暗模式、绑定页头交互 */

import { defineRoute, setNotFound, startRouter , prefetchRoute } from './router.js';
import * as Themes from './theme-manager.js?v=92f8b73f';
import { toggle as toggleThemePanel, bindShortcuts as bindThemeShortcuts } from './components/theme-switcher.js?v=92f8b73f';
import { bindShortcutSheet } from './components/shortcut-sheet.js?v=92f8b73f';
import { cycle as cycleTheme } from './theme-manager.js?v=92f8b73f';

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
defineRoute('/', () => import('./pages/home.js?v=92f8b73f'), () => 'MkDownPost · 码稿');
defineRoute('/editor', () => import('./pages/editor.js?v=92f8b73f'), () => '编辑器 · MkDownPost');
defineRoute('/article/:slug', () => import('./pages/article.js?v=92f8b73f'), (p) => (p.slug ? p.slug + ' · MkDownPost' : '文章 · MkDownPost'));
// /wechat 已并入编辑器右栏（预览 / 微信排版），路由保留兼容直达
  defineRoute('/wechat', () => import('./pages/editor.js?v=92f8b73f'), () => '编辑器 · MkDownPost');
defineRoute('/themes', () => import('./pages/themes.js?v=92f8b73f'), () => '主题库 · MkDownPost');
defineRoute('/articles', () => import('./pages/articles.js?v=92f8b73f'), () => '全部内容 · MkDownPost');
defineRoute('/about', () => import('./pages/about.js?v=92f8b73f'), () => '关于 · MkDownPost');
setNotFound(() => import('./pages/notfound.js?v=92f8b73f'), '页面不存在 · MkDownPost');

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

/* ---------- 预取与空闲预热：让切换页面"点下去就有" ---------- */
const prefetched = new Set();
document.addEventListener('pointerenter', (e) => {
  const a = e.target && e.target.closest ? e.target.closest('a[href^="#/"]') : null;
  if (!a) return;
  const href = a.getAttribute('href');
  if (!href || prefetched.has(href)) return;
  prefetched.add(href);
  prefetchRoute(href);
  // 文章与编辑器：顺手把渲染器与 Markdown 引擎预热（首次阅读省 1~2 秒）
  if (/^#\/(article\/|editor)/.test(href)) {
    import('./markdown/vendor-loader.js').then((m) => m.ensureRenderers()).catch(() => {});
  }
}, true);

const idle = window.requestIdleCallback || ((fn) => setTimeout(fn, 1200));
idle(() => {
  // 用户已接受代价：空闲时把各路由模块全部预热（点击即出）
  Promise.all([
    import('./pages/editor.js').catch(() => null),
    import('./pages/themes.js').catch(() => null),
    import('./pages/articles.js').catch(() => null),
    import('./editor/editor-page.js').catch(() => null),
    import('./markdown/renderer.js').catch(() => null),
    import('./markdown/vendor-loader.js').then((m) => m.ensureRenderers()).catch(() => null)
  ]);
});

/* ---------- Service Worker：离线与秒开（第二次访问起静态资源走本地缓存） ---------- */
import { initSpotlight } from './fx/spotlight.js?v=92f8b73f';

const isDev = location.hostname === 'localhost' || location.hostname === '127.0.0.1';
if (!isDev && 'serviceWorker' in navigator && location.protocol === 'https:') {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').then((reg) => {
      reg.update().catch(() => {});
    }).catch(() => {});
  });
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    // 只自动刷新一次，避免循环
    if (sessionStorage.getItem('mdp:sw-reloaded') === '1') return;
    sessionStorage.setItem('mdp:sw-reloaded', '1');
    setTimeout(() => location.reload(), 250);
  });
}

// 卡片光斑：空闲时挂载，首屏不参与
if (typeof requestIdleCallback === 'function') requestIdleCallback(() => initSpotlight(), { timeout: 3000 });
else setTimeout(() => initSpotlight(), 1500);

/* 版本更新提示：检测到 sw 有新版本时提示刷新（避免"刷新了还是旧的"困惑） */
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.addEventListener('controllerchange', function () {
    if (document.getElementById('mdp-version-hint')) return;
    const box = document.createElement('div');
    box.id = 'mdp-version-hint';
    box.textContent = '网站已更新，点这里刷新';
    box.style.cssText = 'position:fixed;left:50%;bottom:24px;transform:translateX(-50%);z-index:9999;padding:10px 18px;border-radius:10px;border:1px solid var(--c-border);background:var(--c-surface);color:var(--c-text);box-shadow:var(--shadow-2);font-size:13px;cursor:pointer';
    box.addEventListener('click', function () { location.reload(); });
    document.body.appendChild(box);
  });
}
