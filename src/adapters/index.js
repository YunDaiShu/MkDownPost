/* src/adapters/index.js — 平台适配器注册表
   统一接口：transform(md, { renderMarkdown }) → { html, notes[] }
   新增平台只加一个文件并在此注册。 */
import { renderMarkdown } from '../markdown/renderer.js?v=vmvthjprj';
import wechat from './wechat.js?v=vmvthjprj';
import xiaoheihe from './xiaoheihe.js?v=vmvthjprj';
import taptap from './taptap.js?v=vmvthjprj';
import zhihu from './zhihu.js?v=vmvthjprj';
import juejin from './juejin.js?v=vmvthjprj';
import csdn from './csdn.js?v=vmvthjprj';
import bilibili from './bilibili.js?v=vmvthjprj';
import jianshu from './jianshu.js?v=vmvthjprj';
import github from './github.js?v=vmvthjprj';

const REGISTRY = new Map();

export function register(adapter) { REGISTRY.set(adapter.key, adapter); }
export function list() { return Array.from(REGISTRY.values()); }
export function get(key) { return REGISTRY.get(key) || null; }

export function run(key, md) {
  const ad = get(key);
  if (!ad) return null;
  try { return ad.transform(md, { renderMarkdown }); }
  catch (e) { return { html: '', notes: ['适配失败：' + (e && e.message)] }; }
}

[wechat, xiaoheihe, taptap, zhihu, juejin, csdn, bilibili, jianshu, github].forEach(register);

export default { register, list, get, run };
