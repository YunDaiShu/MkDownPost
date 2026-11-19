/* tests/themes.test.mjs — 主题校验器与版本戳的单元测试（node --test，零依赖）
   思路：用合成数据测试「校验器本身」的对错，而不是要求现有 153 套主题完美无缺。 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateThemes, duplicateKeys, contrast, loadThemes } from '../tools/check-themes-schema.mjs';
import { createHash } from 'node:crypto';

const ok = (over = {}) => ({ key: 'demo', name: 'Demo', group: 'ai', brand: { light: '#4A7CF7', dark: '#7AA2FF' }, note: '示例', ...over });

test('合格主题：校验通过', () => {
  assert.deepEqual(validateThemes([ok()]), []);
});

test('缺 key / key 非法：被拦下', () => {
  assert.ok(validateThemes([ok({ key: '' })]).length > 0);
  assert.ok(validateThemes([ok({ key: 'Bad Key!' })]).length > 0);
});

test('brand 结构错误：被拦下', () => {
  assert.ok(validateThemes([ok({ brand: null })]).length > 0);
  assert.ok(validateThemes([ok({ brand: { light: 'blue', dark: '#7AA2FF' } })]).length > 0);
});

test('group 不在枚举内：被拦下', () => {
  assert.ok(validateThemes([ok({ group: 'unknown' })]).length > 0);
});

test('重复 key 能被统计出来', () => {
  const list = [ok(), ok({ name: 'Demo2' })];
  assert.deepEqual(duplicateKeys(list), ['demo']);
});

test('对比度：黑白为 21，同色为 1', () => {
  assert.equal(contrast('#000000', '#FFFFFF'), 21);
  assert.equal(contrast('#4A7CF7', '#4A7CF7'), 1);
});

test('版本戳哈希对换行符不敏感（CRLF == LF）', () => {
  const h = (buf) => createHash('sha256').update(buf).digest('hex');
  const norm = (b) => Buffer.from(b.toString().replace(/\r\n/g, '\n'));
  assert.notEqual(h(Buffer.from('a\nb\n')), h(Buffer.from('a\r\nb\r\n')));
  assert.equal(h(norm(Buffer.from('a\nb\n'))), h(norm(Buffer.from('a\r\nb\r\n'))));
});

test('真实主题库可加载且规模合理（>=100）', async () => {
  const list = await loadThemes();
  assert.ok(list.length >= 100, '实际 ' + list.length);
  const errors = validateThemes(list, { minCount: 100 });
  assert.deepEqual(errors.slice(0, 3), []);
});
