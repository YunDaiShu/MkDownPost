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
  const msg=['fix(layout): 全站禁止横向滚动 + 文章页窄屏单栏 + 卡片不再发光','',
  '- html/body 加 overflow-x: clip，页面级横向滚动归零（1440/1024/390 三档实测 overflow=0）',
  '- 文章页 ≤900px 改单栏、隐藏侧栏 TOC、正文 min-width:0，不再被裁切',
  '- 铅字车间：首页卡片去掉 hover 光斑与底色（截图里那块蓝），hover 只变标题色',
  '- 编辑器：≤900px 控件行允许换行/横向滚动，工具栏与预览区 min-width:0',
  '- 已知未完成：≤390px 时 .editor__controls 仍以内容宽度撑开（display:contents 被覆盖后仍未收缩），下一轮专项处理'].join('\n');
  const c=await api('/repos/'+REPO+'/git/commits',{method:'POST',body:JSON.stringify({message:msg,tree:t2.sha,parents:[headSha]})});
  await api('/repos/'+REPO+'/git/refs/heads/main',{method:'PATCH',body:JSON.stringify({sha:c.sha})});
  console.log('PUSHED '+c.sha);
}
