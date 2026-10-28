export const $=s=>document.querySelector(s),MEALS=['breakfast','lunch','snacks','dinner'];
export const esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
let token=localStorage.token||'',user=JSON.parse(localStorage.user||'null');export{user};
export const toast=m=>{const t=$('#toast');t.textContent=m;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),2400)};
export async function api(p,m='GET',b){const r=await fetch('/api/'+p,{method:m,headers:{'Content-Type':'application/json',Authorization:'Bearer '+token},body:b?JSON.stringify(b):void 0});
 const j=await r.json().catch(()=>({error:'Network error'}));if(!r.ok){if(r.status===401&&token)logout();toast(j.error);throw new Error(j.error)}return j}
export const setAuth=r=>{localStorage.token=r.token;localStorage.user=JSON.stringify(r.user)};
export const logout=()=>{localStorage.clear();location.href='login.html'};
export const val=id=>$('#'+id).value.trim();
export const need=role=>{if(!user){location.href='login.html';throw 0}if(role&&user.role!==role){location.href='me.html';throw 0}};
export function shell(){const L=[['index.html','Home'],['menu.html','Menu']];
 if(user?.role==='manager')L.push(['manager.html','Manager'],['expenses.html','Expenses & Bills'],['stock.html','Stock']);else if(user)L.push(['me.html','My Mess'],['leave.html','Mess Off'],['feedback.html','Feedback']);
 L.push(user?['#','Logout ('+esc(user.name.split(' ')[0])+')']:['login.html','Login']);const cur=location.pathname.split('/').pop()||'index.html';
 document.body.insertAdjacentHTML('afterbegin',`<canvas id="bg"></canvas><nav><b>🍚 Mess Portal</b><button id="bur" class="ghost" aria-label="menu">☰</button><span id="navr">${L.map(([h,t])=>`<a href="${h}" class="${h===cur?'on':''}" ${h==='#'?'id="lo"':''}>${t}</a>`).join('')}</span></nav><div id="toast"></div>`);
 document.body.insertAdjacentHTML('beforeend','<footer>Made by Rigsel Wangchuk · Tshering Wangchuk · Purna Gurung</footer>');
 $('#bur').onclick=()=>$('#navr').classList.toggle('open');if($('#lo'))$('#lo').onclick=e=>{e.preventDefault();logout()};
 const io=new IntersectionObserver(es=>es.forEach(e=>e.isIntersecting&&e.target.classList.add('in')),{threshold:.1});window.reveal=()=>document.querySelectorAll('.reveal:not(.in)').forEach(el=>io.observe(el));
 import('./food.js').catch(()=>{});}
export const menuHTML=m=>Object.entries(m.menu).map(([d,v])=>`<div class="day reveal ${d===m.today?'today':''}"><h3>${d}${d===m.today?' · today':''}</h3>${MEALS.map(k=>`<small>${k}</small><b>${esc(v[k])}</b>`).join('')}</div>`).join('');
export const noticesHTML=n=>n.map(x=>`<div class="note">${esc(x.text)}<br><small>${x.date}</small></div>`).join('')||'No notices';
