/* tools/ping-indexnow.mjs — 把 sitemap.xml 里的 URL 批量提交给 IndexNow（Bing / Yandex / Seznam）
   用法：node tools/ping-indexnow.mjs            正式提交
        node tools/ping-indexnow.mjs --dry      只打印，不发请求
        node tools/ping-indexnow.mjs --urls=a,b 只提交指定 URL */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const ENDPOINT = 'https://api.indexnow.org/indexnow';
const MAX_PER_REQUEST = 10000;

const args = process.argv.slice(2);
const dry = args.includes('--dry');
const urlsArg = args.find((a) => a.startsWith('--urls='));

const keyFile = fs.readdirSync(ROOT).find((f) => /^[0-9a-f]{32}\.txt$/.test(f));
if (!keyFile) {
  console.error('找不到 IndexNow 密钥文件（32 位十六进制 .txt）');
  process.exit(1);
}
const key = fs.readFileSync(path.join(ROOT, keyFile), 'utf8').trim();

let urls;
if (urlsArg) urls = urlsArg.slice('--urls='.length).split(',').map((s) => s.trim()).filter(Boolean);
else {
  const sitemap = fs.readFileSync(path.join(ROOT, 'sitemap.xml'), 'utf8');
  urls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].trim());
}
if (!urls.length) {
  console.error('没有可提交的 URL');
  process.exit(1);
}

const host = new URL(urls[0]).host;
const keyLocation = 'https://' + host + '/MkDownPost/' + keyFile;

console.log('host       ' + host);
console.log('keyLocation ' + keyLocation);
console.log('URL 数量    ' + urls.length);

if (dry) {
  console.log('dry run，前 5 条：');
  urls.slice(0, 5).forEach((u) => console.log('  ' + u));
  process.exit(0);
}

async function submit(batch, attempt = 1) {
  const body = JSON.stringify({ host, key, keyLocation, urlList: batch });
  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body,
  }).catch((e) => ({ status: 0, text: async () => String(e.message) }));
  const text = await res.text().catch(() => '');
  if ((res.status === 200 || res.status === 202 || res.status === 429) || attempt >= 3) {
    return { status: res.status, text };
  }
  await new Promise((r) => setTimeout(r, 1500 * attempt));
  return submit(batch, attempt + 1);
}

let ok = 0;
let failed = 0;
for (let i = 0; i < urls.length; i += MAX_PER_REQUEST) {
  const batch = urls.slice(i, i + MAX_PER_REQUEST);
  const r = await submit(batch);
  const good = r.status === 200 || r.status === 202;
  if (good) ok += batch.length;
  else failed += batch.length;
  console.log('批次 ' + (Math.floor(i / MAX_PER_REQUEST) + 1) + '：' + batch.length + ' 条 → HTTP ' + r.status + (r.text ? ' ' + r.text.slice(0, 120) : ''));
}

console.log('完成：成功 ' + ok + ' 条，失败 ' + failed + ' 条');
if (failed) process.exit(1);