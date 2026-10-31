let _renderMarkdown = null;
const loadRenderer = async () => {
  if (!_renderMarkdown) {
    const [{ ensureRenderers }, mod] = await Promise.all([
      import('../markdown/vendor-loader.js?v=vmvwln5eq'),
      import('../markdown/renderer.js?v=vmvwln5eq')
    ]);
    await ensureRenderers();
    _renderMarkdown = mod.renderMarkdown;
  }
  return _renderMarkdown;
};
/* src/adapters/index.js — 平台适配器注册表
   统一接口：transform(md, { renderMarkdown }) → { html, notes[] }
   新增平台只加一个文件并在此注册。 */

import wechat from './wechat.js?v=vmvwln5eq';
import xiaoheihe from './xiaoheihe.js?v=vmvwln5eq';
import taptap from './taptap.js?v=vmvwln5eq';
import zhihu from './zhihu.js?v=vmvwln5eq';
import juejin from './juejin.js?v=vmvwln5eq';
import csdn from './csdn.js?v=vmvwln5eq';
import bilibili from './bilibili.js?v=vmvwln5eq';
import jianshu from './jianshu.js?v=vmvwln5eq';
import github from './github.js?v=vmvwln5eq';

const REGISTRY = new Map();

export function register(adapter) { REGISTRY.set(adapter.key, adapter); }
export function list() { return Array.from(REGISTRY.values()); }
export function get(key) { return REGISTRY.get(key) || null; }

export async function run(key, md) {
  const renderMarkdown = await loadRenderer();
  const ad = get(key);
  if (!ad) return null;
  try { return ad.transform(md, { renderMarkdown }); }
  catch (e) { return { html: '', notes: ['适配失败：' + (e && e.message)] }; }
}

[wechat, xiaoheihe, taptap, zhihu, juejin, csdn, bilibili, jianshu, github].forEach(register);

export default { register, list, get, run };
