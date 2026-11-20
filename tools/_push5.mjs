import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
const REPO='YunDaiShu/MkDownPost', ROOT='E:/AAA DeepWork/MkDownPost';
const T=fs.readFileSync('E:/AAA DeepWork/.gh-token','utf8').trim();
const H={Authorization:'Bearer '+T,'User-Agent':'dsh',Accept:'application/vnd.github+json','Content-Type':'application/json'};
const api=async(p,o={})=>{const r=await fetch('https://api.github.com'+p,{headers:H,...o});const t=await r.text();let j=null;try{j=JSON.parse(t);}catch(e){}if(!r.ok)throw new Error(p+' '+r.status+' '+t.slice(0,140));return j;};
const sha=b=>crypto.createHash('sha1').update(Buffer.concat([Buffer.from('blob '+b.length+'\u0000'),b])).digest('hex');
const files=[];
const walk=(abs,out)=>{for(const e of fs.readdirSync(abs,{withFileTypes:true})){if(/(^\.profile|node_modules|\.git)/.test(e.name))continue;const p=path.join(abs,e.name);if(e.isDirectory()){walk(p,out);continue;}if(/\.(js|mjs|css|html|md|yml|yaml|json|svg|xml|txt)$/.test(e.name))out.push(path.relative(ROOT,p).split(path.sep).join('/'));}return out;};
for(const g of ['src','tools','tests','assets/styles','.github/workflows','data']){const a=path.join(ROOT,g);if(fs.existsSync(a))walk(a,files);}
for(const f of ['index.html','sw.js','404.html','sitemap.xml','robots.txt','package.json','README.md'])if(fs.existsSync(path.join(ROOT,f)))files.push(f);
const ref=await api('/repos/'+REPO+'/git/ref/heads/main');
const headSha=ref.object.sha;
const headCommit=await api('/repos/'+REPO+'/git/commits/'+headSha);
const tree=[];
for(const f of [...new Set(files)]){const buf=fs.readFileSync(path.join(ROOT,f));let remote=null;try{const c=await api('/repos/'+REPO+'/contents/'+encodeURI(f));remote=c.sha;}catch(e){}if(remote===sha(buf))continue;const blob=await api('/repos/'+REPO+'/git/blobs',{method:'POST',body:JSON.stringify({content:buf.toString('base64'),encoding:'base64'})});tree.push({path:f,mode:'100644',type:'blob',sha:blob.sha});}
console.log('CHANGED '+tree.length);
if(tree.length){
  const t2=await api('/repos/'+REPO+'/git/trees',{method:'POST',body:JSON.stringify({base_tree:headCommit.tree.sha,tree})});
  const msg=['design(hallmark): 按 Hallmark Floor 与 sloplint 整改','',
  '- 新增 --font-ui / --font-mono 令牌，body 字体不再写死字面量（Floor 1）',
  '- .tsw 三处 width:min(Npx,calc(100vw-…)) 改为 100% + max-width，消除横向滚动风险（Floor 4）',
  '- 显示级标题加 text-wrap: balance（WARN F3）',
  '- kbd 内距 1px 6px → 2px 8px、点叠放 -9px → -8px（REFLEX 24b 落档）',
  '- 404 文案里的破折号改为冒号（FAIL 19）',
  '- .nav 收纳行为按 Floor 62 记录豁免（移动端抽屉，无脚本时内容仍完整可读）',
  '- sloplint: FAIL 165 → 160（余下多为 147 套主题的变量定义，属规模而非缺陷）'].join('\n');
  const c=await api('/repos/'+REPO+'/git/commits',{method:'POST',body:JSON.stringify({message:msg,tree:t2.sha,parents:[headSha]})});
  await api('/repos/'+REPO+'/git/refs/heads/main',{method:'PATCH',body:JSON.stringify({sha:c.sha})});
  console.log('PUSHED '+c.sha);
}
