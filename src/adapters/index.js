/* src/adapters/index.js — 平台适配器注册表
   统一接口：transform(md, { renderMarkdown }) → { html, notes[] }
   新增平台只加一个文件并在此注册。 */
import { renderMarkdown } from '../markdown/renderer.js?v=vmvten6lc';
import wechat from './wechat.js?v=vmvten6lc';
import xiaoheihe from './xiaoheihe.js?v=vmvten6lc';
import taptap from './taptap.js?v=vmvten6lc';
import zhihu from './zhihu.js?v=vmvten6lc';
import juejin from './juejin.js?v=vmvten6lc';
import csdn from './csdn.js?v=vmvten6lc';
import bilibili from './bilibili.js?v=vmvten6lc';
import jianshu from './jianshu.js?v=vmvten6lc';
import github from './github.js?v=vmvten6lc';

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
