/* src/components/lightbox.js — 图片灯箱（Esc 关闭、焦点陷阱、点击遮罩关闭） */
let host = null, lastFocus = null;

export function openLightbox(src, alt) {
  if (!host) {
    host = document.createElement('div');
    host.className = 'lightbox';
    host.setAttribute('role', 'dialog');
    host.setAttribute('aria-modal', 'true');
    host.setAttribute('aria-label', '查看大图');
    host.innerHTML = '<button class="lightbox__close" type="button" aria-label="关闭大图">×</button><img class="lightbox__img" alt="" />';
    document.body.appendChild(host);
    host.addEventListener('click', (e) => { if (e.target === host || e.target.closest('.lightbox__close')) closeLightbox(); });
    document.addEventListener('keydown', (e) => {
      if (!host || !host.classList.contains('is-open')) return;
      if (e.key === 'Escape') { e.preventDefault(); closeLightbox(); }
      if (e.key === 'Tab') { e.preventDefault(); host.querySelector('.lightbox__close').focus(); }
    });
  }
  lastFocus = document.activeElement;
  const img = host.querySelector('.lightbox__img');
  img.src = src; img.alt = alt || '';
  host.classList.add('is-open');
  document.body.style.overflow = 'hidden';
  host.querySelector('.lightbox__close').focus();
}

export function closeLightbox() {
  if (!host) return;
  host.classList.remove('is-open');
  document.body.style.overflow = '';
  if (lastFocus && lastFocus.focus) lastFocus.focus();
}
