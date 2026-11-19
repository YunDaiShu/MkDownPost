/* data/themes.js — 主题元数据（供 UI、复制 CSS、快捷键循环使用）
   注意：brand 色值为「近似取色」，非官方规范，可在此一处替换。
   去重策略：手调优先，生成数据里同 key 的重复项被丢弃（历史上确实出现过 6 个重复 key）。 */
import { GENERATED } from './themes.generated.js';

/** 手调 8 套（品牌色人工校对） */
const HAND = [
  { key: 'deepseek',    name: 'DeepSeek', group: 'ai',      brand: { light: '#4A7CF7', dark: '#7AA2FF' }, note: '科技、亲和、克制' },
  { key: 'wechat',      name: '微信',          group: 'social',  brand: { light: '#07C160', dark: '#3DDC84' }, note: '清爽、工具感' },
  { key: 'taptap',      name: 'TapTap',        group: 'media',    brand: { light: '#15C5CE', dark: '#3FD8DF' }, note: '活泼、游戏向' },
  { key: 'heybox',      name: '小黑盒',        group: 'media',    brand: { light: '#22262B', dark: '#E7E9EC' }, note: '暗黑、硬核（官方近黑）' },
  { key: 'bilibili',    name: '哔哩哔哩',      group: 'social',  brand: { light: '#FB7299', dark: '#FF8FB0' }, note: '二次元、年轻' },
  { key: 'zhihu',       name: '知乎',          group: 'social',  brand: { light: '#0084FF', dark: '#4FA8FF' }, note: '理性、专业' },
  { key: 'xiaohongshu', name: '小红书',        group: 'social',  brand: { light: '#FF2442', dark: '#FF5B72' }, note: '热烈、种草' },
  { key: 'github',      name: 'GitHub',        group: 'dev',     brand: { light: '#0969DA', dark: '#79C0FF' }, note: '开发者向' }
];

/** 合并 + 按 key 去重（保留首次出现，即手调优先） */
const seen = new Set();
export const THEMES = [...HAND, ...GENERATED].filter((t) => {
  if (!t || !t.key) return false;
  if (seen.has(t.key)) return false;
  seen.add(t.key);
  return true;
});

/** 按 key 取主题元数据 */
export function themeMeta(key) {
  return THEMES.find((t) => t.key === key) || THEMES[0];
}
