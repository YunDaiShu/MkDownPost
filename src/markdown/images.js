/* src/markdown/images.js — 图片：骨架占位、懒加载、失败兜底、尺寸防抖、灯箱绑定 */
import { openLightbox } from '../components/lightbox.js?v=vmvtjvxny';

const FALLBACK = 'data:image/svg+xml;utf8,' + encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360"><rect width="100%" height="100%" fill="#e9edf2"/>' +
  '<text x="50%" y="50%" font-family="sans-serif" font-size="16" fill="#8a939c" text-anchor="middle">图片加载失败</text></svg>');

export function decorateImages(root) {
  root.querySelectorAll('img').forEach((img) => {
    if (img.dataset.ready) return;
    img.dataset.ready = '1';
    img.classList.add('md-img');
    img.loading = 'lazy';
    img.decoding = 'async';

    // 骨架：包一层占位容器，加载完成移除
    const wrap = document.createElement('span');
    wrap.className = 'md-imgwrap is-loading';
    img.parentNode.insertBefore(wrap, img);
    wrap.appendChild(img);

    const done = () => wrap.classList.remove('is-loading');
    if (img.complete && img.naturalWidth) done();
    else { img.addEventListener('load', done, { once: true }); img.addEventListener('error', done, { once: true }); }

    img.addEventListener('error', () => {
      if (img.dataset.failed) return;
      img.dataset.failed = '1';
      img.src = FALLBACK;
      wrap.classList.add('is-failed');
    }, { once: true });

    img.style.cursor = 'zoom-in';
    img.addEventListener('click', () => openLightbox(img.src, img.alt));
  });
}
