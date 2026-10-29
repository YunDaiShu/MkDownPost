/* tools/baidu-push.mjs — 百度搜索资源平台「普通收录」主动推送
   用法：
     1) 在 ziyuan.baidu.com 验证站点后，拿到 token
     2) 把 token 存到仓库根目录的 .baidu-token（只一行）
     3) node tools/baidu-push.mjs            # 推送 sitemap 里全部 URL
        node tools/baidu-push.mjs --dry      # 只看不发
   注意：百度配额通常每天 10~100 条，脚本会按 --max 分批（默认 10）
*/
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const SITE = 'https://yundaishu.github.io/MkDownPost';
const dry = process.argv.includes('--dry');
const maxArg = process.argv.find((a) => a.startsWith('--max='));
const MAX = maxArg ? Number(maxArg.split('=')[1]) : 10;

const tokenPath = path.join(ROOT, '.baidu-token');
if (!fs.existsSync(tokenPath)) {
  console.error('缺少 .baidu-token：请在 ziyuan.baidu.com 验证站点后，把 token 写到该文件（只一行）');
  process.exit(1);
}
const token = fs.readFileSync(tokenPath, 'utf8').trim();
if (!token) { console.error('.baidu-token 为空'); process.exit(1); }

const xml = fs.readFileSync(path.join(ROOT, 'sitemap.xml'), 'utf8');
const urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
const batch = urls.slice(0, MAX);

console.log('站点：' + SITE);
console.log('待推送：' + batch.length + ' / ' + urls.length + ' 条' + (dry ? '（dry run，不发送）' : ''));
batch.forEach((u) => console.log('  ' + u));
if (dry) process.exit(0);

const endpoint = 'http://data.zz.baidu.com/urls?site=' + SITE + '&token=' + token;
const res = await fetch(endpoint, {
  method: 'POST',
  headers: { 'Content-Type': 'text/plain' },
  body: batch.join('\n')
});
const text = await res.text();
console.log('HTTP ' + res.status);
console.log(text);
