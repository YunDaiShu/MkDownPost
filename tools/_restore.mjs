import fs from 'node:fs';
const t=fs.readFileSync('E:/AAA DeepWork/.gh-token','utf8').trim();
const r=await fetch('https://api.github.com/repos/YunDaiShu/MkDownPost/contents/assets/styles/pages.css?ref=0432049b',{headers:{Authorization:'Bearer '+t,'User-Agent':'dsh',Accept:'application/vnd.github.raw'}});
if(!r.ok){console.log('HTTP '+r.status);process.exit(1);}
const buf=Buffer.from(await r.arrayBuffer());
fs.writeFileSync('E:/AAA DeepWork/MkDownPost/assets/styles/pages.css',buf);
const s=buf.toString('utf8');
console.log('RESTORED '+buf.length+' letterpress=' + /铅字车间/.test(s) + ' narrowFix=' + /max-width: 900px/.test(s));
