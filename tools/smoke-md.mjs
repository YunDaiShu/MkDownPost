/* tools/smoke-md.mjs — 内置解析器冒烟测试（node tools/smoke-md.mjs） */
import { parse } from '../src/markdown/builtin-md.js';

const md = [
  '# 一级标题',
  '',
  '正文含 **粗体**、*斜体*、~~删除线~~、`行内代码` 与 [链接](https://example.com)。',
  '',
  '## 二级标题',
  '',
  '- 列表项 A',
  '- [x] 已完成任务',
  '- [ ] 未完成任务',
  '',
  '| 名称 | 价格 | 备注 |',
  '| --- | --- | --- |',
  '| 游戏 A | ¥12 | 史低 |',
  '',
  '> 引用块示例',
  '',
  '```js',
  'const a = 1;',
  'console.log(a);',
  '```',
  '',
  '---'
].join('\n');

const out = parse(md);
const checks = {
  h1: out.includes('<h1>一级标题</h1>'),
  h2: out.includes('<h2>二级标题</h2>'),
  strong: out.includes('<strong>粗体</strong>'),
  em: out.includes('<em>斜体</em>'),
  del: out.includes('<del>删除线</del>'),
  inlineCode: out.includes('<code>行内代码</code>'),
  link: out.includes('rel="noopener noreferrer"'),
  ul: out.includes('<ul'),
  task: out.includes('type="checkbox"'),
  table: out.includes('<table>') && out.includes('<th>名称</th>'),
  quote: out.includes('<blockquote>'),
  code: out.includes('language-js') && out.includes('console.log'),
  hr: out.includes('<hr />'),
  escaped: !out.includes('<script')
};
const pass = Object.values(checks).every(Boolean);
console.log(JSON.stringify(checks, null, 1));
console.log(pass ? 'SMOKE PASS' : 'SMOKE FAIL');
process.exit(pass ? 0 : 1);
