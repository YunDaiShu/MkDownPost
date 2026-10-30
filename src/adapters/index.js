let _renderMarkdown = null;
const loadRenderer = async () => {
  if (!_renderMarkdown) {
    const [{ ensureRenderers }, mod] = await Promise.all([
      import('../markdown/vendor-loader.js?v=vmvub4npf'),
      import('../markdown/renderer.js?v=vmvub4npf')
    ]);
    await ensureRenderers();
    _renderMarkdown = mod.renderMarkdown;
  }
  return _renderMarkdown;
};
/* src/adapters/index.js — 平台适配器注册表
   统一接口：transform(md, { renderMarkdown }) → { html, notes[] }
   新增平台只加一个文件并在此注册。 */

import wechat from './wechat.js?v=vmvub4npf';
import xiaoheihe from './xiaoheihe.js?v=vmvub4npf';
import taptap from './taptap.js?v=vmvub4npf';
import zhihu from './zhihu.js?v=vmvub4npf';
import juejin from './juejin.js?v=vmvub4npf';
import csdn from './csdn.js?v=vmvub4npf';
import bilibili from './bilibili.js?v=vmvub4npf';
import jianshu from './jianshu.js?v=vmvub4npf';
import github from './github.js?v=vmvub4npf';

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
