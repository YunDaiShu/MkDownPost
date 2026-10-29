/* src/router.js — Hash 路由：注册表、懒加载、标题、导航高亮、淡入转场
   路由表：/ 、/editor 、/article/:slug 、/themes 、/about 、404 */

const routes = [];
let notFoundHandler = null;
let currentPath = '';

/** 注册路由：path 支持 :param 占位 */
export function defineRoute(path, loader, titleFn) {
  const keys = [];
  const pattern = new RegExp('^' + path.replace(/:[^/]+/g, (m) => {
    keys.push(m.slice(1));
    return '([^/]+)';
  }) + '$');
  routes.push({ path, pattern, keys, loader, titleFn });
}

export function setNotFound(loader, title) {
  notFoundHandler = { loader, title };
}

/** 预取路由模块（hover 时调用，切换页面更快） */
export function prefetchRoute(hash) {
  const raw = String(hash || '').replace(/^#/, '') || '/';
  const path = raw.split('?')[0] || '/';
  for (const r of routes) {
    const m = path.match(r.pattern);
    if (m) { try { r.loader(); } catch (e) { /* 忽略预取失败 */ } return true; }
  }
  return false;
}

/** 解析 hash → { path, params } */
function parseHash() {
  const raw = location.hash.replace(/^#/, '') || '/';
  const [pathPart, queryPart] = raw.split('?');
  const params = new URLSearchParams(queryPart || '');
  return { path: pathPart || '/', query: params };
}

function match(path) {
  for (const r of routes) {
    const m = path.match(r.pattern);
    if (m) {
      const params = {};
      r.keys.forEach((k, i) => { params[k] = decodeURIComponent(m[i + 1]); });
      return { route: r, params };
    }
  }
  return null;
}

/** 更新导航高亮 */
function syncNav(path) {
  document.querySelectorAll('.nav a[data-route]').forEach((a) => {
    const target = a.getAttribute('data-route');
    const active = target === path || (target !== '/' && path.startsWith(target));
    if (active) a.setAttribute('aria-current', 'page');
    else a.removeAttribute('aria-current');
  });
}

/** 渲染当前路由 */
export async function render() {
  const { path, query } = parseHash();
  const app = document.getElementById('app');
  if (!app) return;

  const hit = match(path);
  const isSame = path === currentPath;
  currentPath = path;

  const target = hit ? hit.route : notFoundHandler;
  if (!target) return;

  try {
    const mod = await target.loader();
    const view = mod.default || mod.render;

    app.innerHTML = '';
    const wrap = document.createElement('div');
    wrap.className = 'page';
    if (!isSame) wrap.style.animationPlayState = 'running';
    app.appendChild(wrap);
    await view(wrap, { ...(hit ? hit.params : {}), query });

    const rawTitle = typeof target.titleFn === 'function'
      ? target.titleFn(hit ? hit.params : {})
      : (target.titleFn || target.title);
    document.title = rawTitle || 'MkDownPost · 码稿';
  } catch (err) {
    app.innerHTML = '<div class="page"><h1>页面加载失败</h1><p class="muted">' +
      String(err && err.message ? err.message : err) + '</p></div>';
    console.error('[router] render failed:', err);
  }

  syncNav(path);
  app.focus({ preventScroll: true });
  window.scrollTo({ top: 0, behavior: 'auto' });
}

/** 启动：绑定 hashchange */
export function startRouter() {
  window.addEventListener('hashchange', render);
  if (!location.hash) location.replace('#/');
  render();
}

/** 便捷跳转 */
export function go(path) {
  if (location.hash === '#' + path) render();
  else location.hash = '#' + path;
}
