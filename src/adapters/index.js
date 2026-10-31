let _renderMarkdown = null;
const loadRenderer = async () => {
  if (!_renderMarkdown) {
    const [{ ensureRenderers }, mod] = await Promise.all([
      import('../markdown/vendor-loader.js?v=vmvwmfg8w'),
      import('../markdown/renderer.js?v=vmvwmfg8w')
    ]);
    await ensureRenderers();
    _renderMarkdown = mod.renderMarkdown;
  }
  return _renderMarkdown;
};
/* src/adapters/index.js — 平台适配器注册表
   统一接口：transform(md, { renderMarkdown }) → { html, notes[] }
   新增平台只加一个文件并在此注册。 */

import wechat from './wechat.js?v=vmvwmfg8w';
import xiaoheihe from './xiaoheihe.js?v=vmvwmfg8w';
import taptap from './taptap.js?v=vmvwmfg8w';
import zhihu from './zhihu.js?v=vmvwmfg8w';
import juejin from './juejin.js?v=vmvwmfg8w';
import csdn from './csdn.js?v=vmvwmfg8w';
import bilibili from './bilibili.js?v=vmvwmfg8w';
import jianshu from './jianshu.js?v=vmvwmfg8w';
import github from './github.js?v=vmvwmfg8w';

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
