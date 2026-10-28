import * as THREE from './lib/three.module.min.js';
const cv=document.getElementById('bg'),r=new THREE.WebGLRenderer({canvas:cv,antialias:true,alpha:true});r.setPixelRatio(Math.min(devicePixelRatio,1.5));
const scene=new THREE.Scene(),cam=new THREE.PerspectiveCamera(60,1,.1,100);cam.position.z=12;
scene.add(new THREE.AmbientLight(0xffe0c0,.8));const pl=new THREE.PointLight(0xffb347,70,60);pl.position.set(5,8,8);scene.add(pl);
const M=(c,o={})=>new THREE.MeshStandardMaterial({color:c,roughness:.5,...o}),mesh=(g,m,p=[0,0,0],s=[1,1,1])=>{const x=new THREE.Mesh(g,m);x.position.set(...p);x.scale.set(...s);return x};
const G=(...a)=>{const g=new THREE.Group();g.add(...a);return g};
const F={ // procedural 3D food models
 riceBowl:()=>G(mesh(new THREE.LatheGeometry([[0,0],[.35,0],[.7,.3],[.85,.75],[.9,.8],[.8,.78],[0,.15]].map(p=>new THREE.Vector2(...p)),24),M(0xc2552b,{side:2})),mesh(new THREE.SphereGeometry(.78,16,10,0,6.3,0,1.57),M(0xfffaf0),[0,.5,0],[1,.7,1])),
 egg:()=>G(mesh(new THREE.CylinderGeometry(.8,.8,.08,20),M(0xfffdf5),[0,0,0],[1,1,.8]),mesh(new THREE.SphereGeometry(.3,14,10),M(0xffb300),[.1,.12,0],[1,.7,1])),
 momo:()=>G(mesh(new THREE.SphereGeometry(.6,16,12),M(0xf6e3c4),[0,0,0],[1,.7,1]),mesh(new THREE.TorusGeometry(.22,.07,8,12),M(0xeed5a8),[0,.38,0]).rotateX(1.57)),
 tomato:()=>G(mesh(new THREE.SphereGeometry(.55,16,12),M(0xe03a22),[0,0,0],[1,.85,1]),mesh(new THREE.ConeGeometry(.2,.2,5),M(0x3f9b3f),[0,.48,0])),
 chilli:()=>G(mesh(new THREE.ConeGeometry(.17,1.1,8),M(0xd9261c),[0,0,0]).rotateZ(2.3),mesh(new THREE.CylinderGeometry(.06,.08,.2,6),M(0x3f9b3f),[.45,.4,0]).rotateZ(-.7)),
 cup:()=>G(mesh(new THREE.CylinderGeometry(.5,.38,.6,18),M(0xf4efe6)),mesh(new THREE.TorusGeometry(.24,.06,8,12),M(0xf4efe6),[.55,0,0]),mesh(new THREE.CylinderGeometry(.44,.44,.02,18),M(0x8a4b1f),[0,.28,0])),
 plate:()=>G(mesh(new THREE.CylinderGeometry(.9,.6,.1,24),M(0xffffff)),mesh(new THREE.SphereGeometry(.35,10,8),M(0x9bd36a),[.1,.15,0],[1,.6,1]),mesh(new THREE.SphereGeometry(.25,10,8),M(0xffb347),[-.3,.12,.2],[1,.6,1]))};
const names=Object.keys(F),items=[],N=innerWidth<700?14:26;
for(let i=0;i<N;i++){const m=F[names[i%names.length]]();m.scale.setScalar(.9+Math.random()*.8);m.position.set((Math.random()-.5)*22,8-Math.random()*40,(Math.random()-.5)*10-2);
 m.rotation.set(Math.random()*3,Math.random()*3,0);m.userData={sp:Math.random()*.01+.004,ph:Math.random()*6,b:0};scene.add(m);items.push(m)}
const cols=[0xffb347,0xff6b4a,0xfff4e6,0x9bd36a],bursts=[],pg=new THREE.SphereGeometry(.07,6,6);
const burst=p=>{for(let i=0;i<16;i++){const m=new THREE.Mesh(pg,new THREE.MeshBasicMaterial({color:cols[i%4],transparent:true}));m.position.copy(p);m.userData={v:new THREE.Vector3(Math.random()-.5,Math.random()-.3,Math.random()-.5).multiplyScalar(.25),l:1};scene.add(m);bursts.push(m)}};
const ray=new THREE.Raycaster(),mo=new THREE.Vector2();let mx=0;
addEventListener('pointermove',e=>mx=e.clientX/innerWidth-.5);
addEventListener('pointerdown',e=>{if(e.target.closest('a,button,input,select,textarea,.card'))return;mo.set(e.clientX/innerWidth*2-1,-(e.clientY/innerHeight)*2+1);ray.setFromCamera(mo,cam);
 const h=ray.intersectObjects(items,true)[0];if(h){let o=h.object;while(o.parent!==scene)o=o.parent;o.userData.b=1;burst(h.point)}});
const rs=()=>{r.setSize(innerWidth,innerHeight,false);cam.aspect=innerWidth/innerHeight;cam.updateProjectionMatrix()};addEventListener('resize',rs);rs();
const still=matchMedia('(prefers-reduced-motion:reduce)').matches;let t=0,cy=0;
(function loop(){requestAnimationFrame(loop);if(document.hidden)return;t+=.016;const pr=scrollY/Math.max(1,document.body.scrollHeight-innerHeight);
 cy+=(-pr*30-cy)*.06;cam.position.y=cy;cam.position.x+=(mx*3-cam.position.x)*.05;pl.position.y=cy+8;
 if(!still)items.forEach(m=>{const d=m.userData;m.rotation.x+=d.sp*(1+d.b*20);m.rotation.y+=d.sp*1.5*(1+d.b*20);m.position.x+=Math.sin(t+d.ph)*.003;d.b*=.95;m.scale.setScalar(m.scale.x*(1+d.b*.01))});
 for(let i=bursts.length-1;i>=0;i--){const b=bursts[i];b.position.add(b.userData.v);b.userData.l-=.02;b.material.opacity=b.userData.l;if(b.userData.l<=0){scene.remove(b);b.material.dispose();bursts.splice(i,1)}}
 r.render(scene,cam)})();
