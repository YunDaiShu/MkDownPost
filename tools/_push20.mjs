import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
const REPO='YunDaiShu/MkDownPost', ROOT='E:/AAA DeepWork/MkDownPost';
const T=fs.readFileSync('E:/AAA DeepWork/.gh-token','utf8').trim();
const H={Authorization:'Bearer '+T,'User-Agent':'dsh',Accept:'application/vnd.github+json','Content-Type':'application/json'};
const api=async(p,o={})=>{const r=await fetch('https://api.github.com'+p,{headers:H,...o});const t=await r.text();let j=null;try{j=JSON.parse(t);}catch(e){}if(!r.ok)throw new Error(p+' '+r.status+' '+t.slice(0,140));return j;};
const sha=b=>crypto.createHash('sha1').update(Buffer.concat([Buffer.from('blob '+b.length+'\u0000'),b])).digest('hex');
const files=[];
const walk=(abs,out)=>{for(const e of fs.readdirSync(abs,{withFileTypes:true})){if(/^(\.profile|node_modules|\.git)/.test(e.name))continue;const p=path.join(abs,e.name);if(e.isDirectory()){walk(p,out);continue;}if(/\.(js|mjs|css|html|md|yml|yaml|json|svg|xml|txt|png|jpg)$/.test(e.name))out.push(path.relative(ROOT,p).split(path.sep).join('/'));}return out;};
for(const g of ['src','tools','tests','assets','docs','content','.github/workflows','data']){const a=path.join(ROOT,g);if(fs.existsSync(a))walk(a,files);}
for(const f of ['index.html','sw.js','404.html','sitemap.xml','robots.txt','package.json','README.md','LICENSE'])if(fs.existsSync(path.join(ROOT,f)))files.push(f);
const ref=await api('/repos/'+REPO+'/git/ref/heads/main');
const headSha=ref.object.sha;
const headCommit=await api('/repos/'+REPO+'/git/commits/'+headSha);
const tree=[];
for(const f of [...new Set(files)]){const buf=fs.readFileSync(path.join(ROOT,f));let remote=null;try{const c=await api('/repos/'+REPO+'/contents/'+encodeURI(f));remote=c.sha;}catch(e){}if(remote===sha(buf))continue;const blob=await api('/repos/'+REPO+'/git/blobs',{method:'POST',body:JSON.stringify({content:buf.toString('base64'),encoding:'base64'})});tree.push({path:f,mode:'100644',type:'blob',sha:blob.sha});}
console.log('CHANGED '+tree.length);
if(tree.length){
  const t2=await api('/repos/'+REPO+'/git/trees',{method:'POST',body:JSON.stringify({base_tree:headCommit.tree.sha,tree})});
  const msg=['docs: README 重做（真实截图 / 图标 / 项目结构 / 工具表）','',
  '- 新增 docs/images 四张真实截图：首页 / 编辑器 / 主题页 / 文章页（无头 Edge 1600x1000 采集）',
  '- 新增 assets/favicon.svg 字标图标，并在 index.html 挂 rel=icon 与 apple-touch-icon',
  '- README：徽章（CI / 在线 / 主题数 / 零构建 / 许可）+ 截图表格 + 快速开始 + 功能表',
  '- README：新增「技术选择」「项目结构」「工具脚本」「数据存储」「常见问题」五节，把 41 个脚本逐条说明'].join('\n');
  const c=await api('/repos/'+REPO+'/git/commits',{method:'POST',body:JSON.stringify({message:msg,tree:t2.sha,parents:[headSha]})});
  await api('/repos/'+REPO+'/git/refs/heads/main',{method:'PATCH',body:JSON.stringify({sha:c.sha})});
  console.log('PUSHED '+c.sha);
}
