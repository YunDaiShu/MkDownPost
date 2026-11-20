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
  const msg=['design(hallmark/A): 卡片墙彻底拆掉，文章页与关于页并入同一张纸','',
  '- 精选内容卡：去圆角去边框去阴影，改细线分隔 + 衬线标题，hover 只变标题色',
  '- 文章页：纸面 + 衬线正文 + 细线栏头 + 三线表风格的侧栏 TOC 分隔',
  '- 关于页：表格改三线表（表头上下各 1px 墨线），正文衬线',
  '- 实测：首页阴影 111→0（仅剩主题色点描边），关于页阴影 3，三页均无横向溢出'].join('\n');
  const c=await api('/repos/'+REPO+'/git/commits',{method:'POST',body:JSON.stringify({message:msg,tree:t2.sha,parents:[headSha]})});
  await api('/repos/'+REPO+'/git/refs/heads/main',{method:'PATCH',body:JSON.stringify({sha:c.sha})});
  console.log('PUSHED '+c.sha);
}
