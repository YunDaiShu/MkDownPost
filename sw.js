/* sw.js — 离线缓存：HTML 走网络优先，静态资源（带版本戳）缓存优先 */
const VERSION = 'v92f8b73f';
const STATIC_CACHE = 'mdp-static-' + VERSION;
const HTML_CACHE = 'mdp-html-' + VERSION;

/* 首次安装时预热应用外壳（index + 关键 CSS + 入口模块），
   其余带版本戳的资源在首次被 SW 接管后的访问中进入缓存 */
const PRECACHE = ['./', './index.html?v=92f8b73f', './assets/styles/critical.css?v=92f8b73f', './assets/styles/rest.css?v=92f8b73f', './src/main.js?v=92f8b73f', './src/router.js?v=92f8b73f'];

self.addEventListener('install', (e) => {
  e.waitUntil((async () => {
    const cache = await caches.open(HTML_CACHE);
    const staticCache = await caches.open(STATIC_CACHE);
    await Promise.allSettled(PRECACHE.map(async (url) => {
      try {
        const res = await fetch(url, { cache: 'reload' });
        if (res && res.ok) await (url.includes('main.js') || url.includes('router.js') || url.includes('.css') ? staticCache : cache).put(url, res.clone());
      } catch { /* 单个失败不影响安装 */ }
    }));
    self.skipWaiting();
  })());
});

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => !k.endsWith(VERSION)).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;          // 只处理同源

  // 导航请求：网络优先，失败回退缓存（离线也能打开）
  if (req.mode === 'navigate') {
    e.respondWith((async () => {
      try {
        // no-store：绕过 Pages CDN 对 HTML 的 10 分钟缓存，保证刷新即拿新版
        const fresh = await fetch(new Request(req, { cache: 'no-store' }));
        const cache = await caches.open(HTML_CACHE);
        cache.put(req, fresh.clone());
        return fresh;
      } catch {
        const cache = await caches.open(HTML_CACHE);
        return (await cache.match(req)) || (await cache.match('./index.html?v=92f8b73f')) || Response.error();
      }
    })());
    return;
  }

  // 静态资源（带 ?v= / ?c= 版本戳）：缓存优先，命中即返回
  e.respondWith((async () => {
    const cache = await caches.open(STATIC_CACHE);
    const hit = await cache.match(req);
    if (hit) {
      // 后台静默刷新，下一次访问即拿到新内容
      fetch(req).then(function (res) { if (res && res.ok) cache.put(req, res.clone()); }).catch(function () {});
      return hit;
    }
    try {
      const res = await fetch(req);
      if (res && (res.ok || res.type === 'opaque')) cache.put(req, res.clone());
      return res;
    } catch {
      return hit || Response.error();
    }
  })());
});
