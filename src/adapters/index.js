let _renderMarkdown = null;
const loadRenderer = async () => {
  if (!_renderMarkdown) {
    const [{ ensureRenderers }, mod] = await Promise.all([
      import('../markdown/vendor-loader.js?v=vmvutv6bi'),
      import('../markdown/renderer.js?v=vmvutv6bi')
    ]);
    await ensureRenderers();
    _renderMarkdown = mod.renderMarkdown;
  }
  return _renderMarkdown;
};
/* src/adapters/index.js — 平台适配器注册表
   统一接口：transform(md, { renderMarkdown }) → { html, notes[] }
   新增平台只加一个文件并在此注册。 */

import wechat from './wechat.js?v=vmvutv6bi';
import xiaoheihe from './xiaoheihe.js?v=vmvutv6bi';
import taptap from './taptap.js?v=vmvutv6bi';
import zhihu from './zhihu.js?v=vmvutv6bi';
import juejin from './juejin.js?v=vmvutv6bi';
import csdn from './csdn.js?v=vmvutv6bi';
import bilibili from './bilibili.js?v=vmvutv6bi';
import jianshu from './jianshu.js?v=vmvutv6bi';
import github from './github.js?v=vmvutv6bi';

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
