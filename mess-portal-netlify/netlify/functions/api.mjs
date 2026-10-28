// Mess Portal API - Netlify Function (v2). Storage: Netlify Blobs (local file fallback for dev).
import crypto from 'node:crypto'; import fs from 'node:fs'; import path from 'node:path';
const MEALS=['breakfast','lunch','snacks','dinner'],DAYS=['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
// ---- storage: get/set/list (JSON) ----
let _s; async function store(){ if(_s)return _s;
  if(process.env.LOCAL_DEV){const d=path.resolve('.data');fs.mkdirSync(d,{recursive:true});const f=k=>path.join(d,encodeURIComponent(k));
    return _s={get:async k=>fs.existsSync(f(k))?JSON.parse(fs.readFileSync(f(k))):null,set:async(k,v)=>fs.writeFileSync(f(k),JSON.stringify(v)),
      list:async p=>fs.readdirSync(d).map(decodeURIComponent).filter(k=>k.startsWith(p))};}
  const {getStore}=await import('@netlify/blobs');const b=getStore({name:'mess',consistency:'strong'});
  return _s={get:k=>b.get(k,{type:'json'}),set:(k,v)=>b.setJSON(k,v),list:async p=>(await b.list({prefix:p})).blobs.map(x=>x.key)};}
const get=async(k,d)=>(await(await store()).get(k))??d, set=async(k,v)=>(await store()).set(k,v);
const getAll=async p=>{const s=await store(),ks=await s.list(p);return Promise.all(ks.map(async k=>[k,await s.get(k)]))};
// ---- helpers (Bhutan time, UTC+6) ----
const today=()=>new Date(Date.now()+6*36e5).toISOString().slice(0,10), dayName=()=>DAYS[new Date(today()).getUTCDay()];
const hash=(p,s=crypto.randomBytes(16).toString('hex'))=>s+':'+crypto.scryptSync(p,s,32).toString('hex');
const check=(p,h)=>{const[s]=h.split(':'),a=Buffer.from(hash(p,s)),b=Buffer.from(h);return a.length===b.length&&crypto.timingSafeEqual(a,b)};
const id=()=>Date.now().toString(36)+crypto.randomBytes(3).toString('hex');
async function secret(){let s=process.env.SESSION_SECRET;if(s)return s;let o=await get('secret');if(!o){o={s:crypto.randomBytes(32).toString('hex')};await set('secret',o)}return o.s}
async function sign(roll){const p=Buffer.from(JSON.stringify({r:roll,e:Date.now()+7*864e5})).toString('base64url');return p+'.'+crypto.createHmac('sha256',await secret()).update(p).digest('base64url')}
async function auth(req){const t=(req.headers.get('authorization')||'').replace('Bearer ','');const[p,g]=t.split('.');if(!p||!g)return null;
  if(g!==crypto.createHmac('sha256',await secret()).update(p).digest('base64url'))return null;const o=JSON.parse(Buffer.from(p,'base64url'));if(o.e<Date.now())return null;
  return (await get('users',{}))[o.r]||null}
async function seed(){const u=await get('users',null);if(u)return;const menu={};DAYS.forEach(d=>menu[d]={breakfast:'Puri, Aloo Dum, Tea',lunch:'Rice, Dal, Seasonal Veg',snacks:'Suja & Biscuit',dinner:'Rice, Ema Datshi, Egg Curry'});
  await set('users',{MANAGER:{name:'Mess Manager',roll:'MANAGER',room:'-',phone:'-',role:'manager',pass:hash(process.env.MANAGER_PASSWORD||'manager123')}});await set('menu',menu);
  await set('notices',[{id:id(),text:'Welcome to the new Mess Portal! No more register and notice board.',date:today()}])}
const mgr=u=>{if(u.role!=='manager')throw[403,'Manager only']};
const pub=u=>({name:u.name,roll:u.roll,role:u.role});
const onLeave=(ls,roll,d)=>ls.some(l=>l.roll===roll&&l.status==='approved'&&l.from<=d&&d<=l.to);
async function bill(month){const total=(await get('exp:'+month,[])).reduce((s,e)=>s+e.amount,0),users=await get('users',{}),gr=(await get('settings',{})).guestRate??60;
  const att=Object.fromEntries((await getAll('att:'+month+':')).map(([k,v])=>[k.split(':')[2],Object.keys(v).length])),gs={};(await get('guest:'+month,[])).forEach(g=>gs[g.roll]=(gs[g.roll]||0)+g.n);
  const all=Object.values(att).reduce((a,b)=>a+b,0),rate=all?total/all:0;
  return{month,total,totalDays:all,rate:+rate.toFixed(2),guestRate:gr,students:Object.values(users).filter(u=>u.role==='student').map(u=>{const d=att[u.roll]||0,g=gs[u.roll]||0,amt=+(d*rate+g*gr).toFixed(2);return{roll:u.roll,name:u.name,days:d,guest:g,amount:amt}})}}
const R={
 'POST register':async b=>{const roll=String(b.roll||'').trim().toUpperCase();if(!b.name||!roll||!b.password||b.password.length<6)throw[400,'Fill all fields (password 6+ chars)'];
  const us=await get('users',{});if(us[roll])throw[409,'Roll no already registered'];us[roll]={name:String(b.name).slice(0,60),roll,room:String(b.room||'').slice(0,20),phone:String(b.phone||'').slice(0,20),role:'student',pass:hash(b.password)};await set('users',us);return{ok:1}},
 'POST login':async b=>{const u=(await get('users',{}))[String(b.roll||'').trim().toUpperCase()];if(!u||!check(b.password||'',u.pass))throw[401,'Wrong roll no or password'];return{token:await sign(u.roll),user:pub(u)}},
 'POST password':async(b,u)=>{if(!b.password||b.password.length<6)throw[400,'Password 6+ chars'];const us=await get('users',{});if(!check(b.old||'',us[u.roll].pass))throw[401,'Old password wrong'];us[u.roll].pass=hash(b.password);await set('users',us);return{ok:1}},
 'GET menu':async()=>({menu:await get('menu',{}),today:dayName()}),
 'GET notices':async()=>(await get('notices',[])).slice(-10).reverse(),
 'PUT menu':async(b,u)=>{mgr(u);const m=await get('menu',{});if(!m[b.day])throw[400,'Bad day'];MEALS.forEach(k=>{if(typeof b[k]==='string')m[b.day][k]=b[k].slice(0,120)});await set('menu',m);return{ok:1}},
 'POST notices':async(b,u)=>{mgr(u);if(!b.text)throw[400,'Empty'];const n=await get('notices',[]);n.push({id:id(),text:String(b.text).slice(0,300),date:today()});await set('notices',n.slice(-50));return{ok:1}},
 'POST attend':async(b,u)=>{if(!MEALS.includes(b.meal))throw[400,'Bad meal'];const d=today();if(onLeave(await get('leaves',[]),u.roll,d))throw[400,'You are on approved mess-off today'];
  const k='att:'+d.slice(0,7)+':'+u.roll,a=await get(k,{});a[d]=a[d]||[];if(a[d].includes(b.meal))throw[409,'Already marked'];a[d].push(b.meal);await set(k,a);return{ok:1}},
 'GET attend/mine':async(b,u)=>(await get('att:'+today().slice(0,7)+':'+u.roll,{}))[today()]||[],
 'GET headcount':async(b,u)=>{mgr(u);const d=today(),c=Object.fromEntries(MEALS.map(m=>[m,0]));(await getAll('att:'+d.slice(0,7)+':')).forEach(([,v])=>(v[d]||[]).forEach(m=>c[m]++));
  const us=Object.values(await get('users',{})).filter(x=>x.role==='student'),ls=await get('leaves',[]);return{date:d,counts:c,students:us.length,onLeave:us.filter(x=>onLeave(ls,x.roll,d)).length}},
 'POST leave':async(b,u)=>{if(!b.from||!b.to||b.to<b.from)throw[400,'Check dates'];const l=await get('leaves',[]);l.push({id:id(),roll:u.roll,name:u.name,from:b.from,to:b.to,reason:String(b.reason||'').slice(0,200),status:'pending'});await set('leaves',l);return{ok:1}},
 'GET leaves':async(b,u)=>(await get('leaves',[])).filter(l=>u.role==='manager'||l.roll===u.roll).reverse(),
 'POST leave/decide':async(b,u)=>{mgr(u);const ls=await get('leaves',[]),l=ls.find(x=>x.id===b.id);if(!l||!['approved','rejected'].includes(b.status))throw[400,'Bad request'];l.status=b.status;await set('leaves',ls);return{ok:1}},
 'POST feedback':async(b,u)=>{if(!b.text)throw[400,'Empty'];const f=await get('feedback',[]);f.push({id:id(),name:u.name,text:String(b.text).slice(0,500),date:today()});await set('feedback',f.slice(-200));return{ok:1}},
 'GET feedback':async(b,u)=>{mgr(u);return(await get('feedback',[])).reverse()},
 'POST expense':async(b,u)=>{mgr(u);const a=+b.amount,d=b.date||today();if(!b.item||!(a>0))throw[400,'Item and amount needed'];const k='exp:'+d.slice(0,7),e=await get(k,[]);e.push({id:id(),item:String(b.item).slice(0,80),amount:a,date:d});await set(k,e);return{ok:1}},
 'GET expenses':async(b,u,q)=>{mgr(u);return(await get('exp:'+(q.get('month')||today().slice(0,7)),[])).reverse()},
 'GET bill':async(b,u,q)=>{const r=await bill(q.get('month')||today().slice(0,7));if(u.role!=='manager')r.students=r.students.filter(s=>s.roll===u.roll);return r},
 'POST rate':async(b,u)=>{const k=+b.stars;if(!MEALS.includes(b.meal)||!(k>=1&&k<=5))throw[400,'Bad rating'];const d=today(),r=await get('rate:'+d,{});r[u.roll+':'+b.meal]=k;await set('rate:'+d,r);return{ok:1}},
 'GET ratings':async(b,u)=>{mgr(u);const r=await get('rate:'+today(),{}),o={};MEALS.forEach(m=>{const v=Object.entries(r).filter(([k])=>k.endsWith(':'+m)).map(x=>x[1]);o[m]={avg:v.length?+(v.reduce((a,c)=>a+c,0)/v.length).toFixed(1):null,count:v.length}});return o},
 'POST guest':async(b,u)=>{const n=Math.floor(+b.n);if(!(n>=1&&n<=20))throw[400,'1-20 guest meals'];const k='guest:'+today().slice(0,7),g=await get(k,[]);g.push({roll:u.roll,n,date:today()});await set(k,g);return{ok:1}},
 'POST settings':async(b,u)=>{mgr(u);const a=+b.guestRate;if(!(a>=0))throw[400,'Bad rate'];await set('settings',{guestRate:a});return{ok:1}},
 'GET stock':async(b,u)=>{mgr(u);return get('stock',[])},
 'POST stock':async(b,u)=>{mgr(u);const q=+b.qty;if(!b.item||!(q>=0))throw[400,'Item and qty needed'];const s=await get('stock',[]),n=String(b.item).slice(0,40),x=s.find(i=>i.item.toLowerCase()===n.toLowerCase());x?(x.qty=q,x.unit=b.unit||x.unit):s.push({item:n,qty:q,unit:String(b.unit||'').slice(0,10)});await set('stock',s);return{ok:1}},
 'POST stock/delete':async(b,u)=>{mgr(u);await set('stock',(await get('stock',[])).filter(i=>i.item!==b.item));return{ok:1}},
 'GET backup':async(b,u)=>{mgr(u);const s=await store(),o={};for(const k of await s.list(''))if(k!=='secret')o[k]=await s.get(k);return o},
};
const OPEN=new Set(['POST register','POST login','GET menu','GET notices']);
const J=(c,o)=>new Response(JSON.stringify(o),{status:c,headers:{'content-type':'application/json','cache-control':'no-store'}});
export default async req=>{const url=new URL(req.url),key=req.method+' '+url.pathname.replace(/^\/(\.netlify\/functions\/)?api\//,''),h=R[key];if(!h)return J(404,{error:'Not found'});
  try{const b=req.method==='GET'?{}:await req.json().catch(()=>({}));await seed();let u=null;if(!OPEN.has(key)){u=await auth(req);if(!u)throw[401,'Please login']}return J(200,await h(b,u,url.searchParams))}
  catch(e){if(Array.isArray(e))return J(e[0],{error:e[1]});console.error(e);return J(500,{error:'Server error'})}};
export const config={path:'/api/*'};
