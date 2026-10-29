/* src/adapters/index.js — 平台适配器注册表
   统一接口：transform(md, { renderMarkdown }) → { html, notes[] }
   新增平台只加一个文件并在此注册。 */
import { renderMarkdown } from '../markdown/renderer.js';
import wechat from './wechat.js';
import xiaoheihe from './xiaoheihe.js';
import taptap from './taptap.js';

const REGISTRY = new Map();

export function register(adapter) {
  REGISTRY.set(adapter.key, adapter);
}

export function list() {
  return Array.from(REGISTRY.values());
}

export function get(key) {
  return REGISTRY.get(key) || null;
}

export function run(key, md) {
  const ad = get(key);
  if (!ad) return null;
  return ad.transform(md, { renderMarkdown });
}

register(wechat);
register(xiaoheihe);
register(taptap);

export default { register, list, get, run };
