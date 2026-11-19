/* tools/check-themes-schema.mjs — 主题数据结构校验
   真实结构（data/themes.js）：{ key, name, group, brand:{light,dark}, note }
   退出码：结构错误 → 1；重复 key → 仅警告（历史数据遗留，打印清单） */
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const ROOT = process.cwd();
const HEX = /^#[0-9a-fA-F]{6}$/;
const GROUPS = ['all', 'dev', 'tool', 'social', 'media', 'system', 'design', 'ai', 'browser', 'misc'];
const KEY_RE = /^[a-z0-9-]+$/;

const lum = (hex) => {
  const c = hex.replace('#', '');
  const rgb = [0, 2, 4].map((i) => parseInt(c.slice(i, i + 2), 16) / 255)
    .map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2];
};
export const contrast = (a, b) => {
  const [l1, l2] = [lum(a), lum(b)].sort((x, y) => y - x);
  return Math.round(((l1 + 0.05) / (l2 + 0.05)) * 100) / 100;
};

export function validateThemes(list, { minCount = 0 } = {}) {
  const errors = [];
  if (!Array.isArray(list)) return ['主题数据不是数组'];
  if (minCount && list.length < minCount) errors.push('主题数量异常：' + list.length);
  list.forEach((t, i) => {
    const at = '[' + i + '] ' + (t && t.key ? t.key : '(无 key)');
    if (!t || typeof t !== 'object') { errors.push(at + ' 不是对象'); return; }
    if (!t.key || !KEY_RE.test(t.key)) errors.push(at + ' key 非法');
    if (!t.name || String(t.name).length > 24) errors.push(at + ' name 缺失或过长');
    if (!t.brand || typeof t.brand !== 'object') errors.push(at + ' brand 缺失');
    else {
      if (!HEX.test(t.brand.light || '')) errors.push(at + ' brand.light 不是 #rrggbb');
      if (!HEX.test(t.brand.dark || '')) errors.push(at + ' brand.dark 不是 #rrggbb');
    }
    if (t.group !== undefined && !GROUPS.includes(t.group)) errors.push(at + ' group 不在枚举内：' + t.group);
    if (t.note !== undefined && typeof t.note !== 'string') errors.push(at + ' note 不是字符串');
  });
  return errors;
}

export function duplicateKeys(list) {
  const seen = new Set(), dup = new Set();
  list.forEach((t) => { if (!t || !t.key) return; if (seen.has(t.key)) dup.add(t.key); else seen.add(t.key); });
  return [...dup];
}

export async function loadThemes() {
  // data/themes.js 是合并后的权威数据；themes.generated.js 是它的生成源，不能叠加统计
  for (const f of ['data/themes.js', 'data/themes.generated.js']) {
    const p = path.join(ROOT, f);
    if (!fs.existsSync(p)) continue;
    const mod = await import(pathToFileURL(p).href);
    for (const v of Object.values(mod)) if (Array.isArray(v) && v.length) return v;
  }
  return [];
}

const isMain = process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url;
if (isMain) {
  const list = await loadThemes();
  const errors = validateThemes(list, { minCount: 100 });
  const dup = duplicateKeys(list);
  if (dup.length) console.log('⚠ 重复 key ' + dup.length + ' 个：' + dup.slice(0, 8).join(', ') + '（历史遗留，建议清理）');
  if (errors.length) {
    errors.slice(0, 12).forEach((e) => console.log('✗ ' + e));
    console.log('主题数据校验失败：' + errors.length + ' 项');
    process.exit(1);
  }
  console.log('PASS：主题数据 ' + list.length + ' 套，字段/枚举/色值格式全部合规' + (dup.length ? '（重复 key 见上）' : ''));
}
