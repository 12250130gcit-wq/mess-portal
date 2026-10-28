// Local test server (no Netlify needed): node dev.mjs  -> http://localhost:3000
process.env.LOCAL_DEV='1';
import http from 'http'; import fs from 'fs'; import path from 'path';
const {default:api}=await import('./netlify/functions/api.mjs');
const PUB=path.resolve('public'),T={'.html':'text/html','.js':'text/javascript','.css':'text/css'};
http.createServer(async(q,s)=>{const u=new URL(q.url,'http://x');
 if(u.pathname.startsWith('/api/')){let b=[];for await(const c of q)b.push(c);
  const r=await api(new Request(u,{method:q.method,headers:q.headers,body:['GET','HEAD'].includes(q.method)?undefined:Buffer.concat(b)}));
  s.writeHead(r.status,{'content-type':'application/json'});return s.end(await r.text())}
 let f=path.join(PUB,u.pathname==='/'?'index.html':path.normalize(u.pathname));
 if(!f.startsWith(PUB)||!fs.existsSync(f)){s.writeHead(404);return s.end('Not found')}
 s.writeHead(200,{'content-type':T[path.extname(f)]||'text/plain'});fs.createReadStream(f).pipe(s)}).listen(3000,()=>console.log('http://localhost:3000  manager: MANAGER / manager123'));
