/* src/pages/notfound.js — 404 */
export default function render(root) {
  root.innerHTML = `
    <div class="empty-state">
      <svg viewBox="0 0 80 80" width="80" height="80" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="34" cy="34" r="18"/><path d="M48 48l14 14" stroke-linecap="round"/>
      </svg>
      <h1>没有这个页面</h1>
      <p class="muted">地址可能输错了，或者页面已被移动。</p>
      <div class="empty-state__actions">
        <a class="btn btn--primary" href="#/">回首页</a>
        <a class="btn" href="#/editor">去编辑器</a>
      </div>
    </div>`;
}
