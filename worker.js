// Hide & Seek 3D: one Cloudflare Worker, one Durable Object class "Room", binding name "ROOMS".
const HTML = `<!doctype html><html><head><meta charset="utf-8"><title>Hide and Seek</title>
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
<style>
html,body{margin:0;height:100%;background:#0b1210;color:#efe6c4;font-family:Georgia,serif;overflow:hidden;touch-action:none;-webkit-user-select:none;user-select:none}
canvas{display:block}
.ov{position:fixed;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;text-align:center;background:rgba(6,10,9,.9);z-index:5}
h1{margin:0;font-size:44px;color:#ffd98a;letter-spacing:1px}
input,button{font:inherit;font-size:18px;padding:10px 14px;border-radius:8px;border:1px solid #5b6b52;background:#16231d;color:#efe6c4}
button{background:#ffd98a;color:#1a1408;border:0;cursor:pointer;font-weight:bold}
button:disabled{opacity:.4;cursor:default}
#plist{min-width:220px}
#plist div{padding:3px 0}
#top{position:fixed;top:10px;left:0;right:0;text-align:center;font-size:20px;z-index:3;text-shadow:0 0 6px #000;pointer-events:none}
#cross{position:fixed;left:50%;top:50%;width:6px;height:6px;margin:-3px;border-radius:50%;background:#ffd98a;opacity:.8;z-index:3;pointer-events:none}
#toast{position:fixed;bottom:60px;left:0;right:0;text-align:center;font-size:22px;color:#ff8a65;z-index:3;pointer-events:none}
#hint{position:fixed;bottom:12px;left:0;right:0;text-align:center;opacity:.6;z-index:3;pointer-events:none}
#roul{position:fixed;inset:0;display:none;align-items:center;justify-content:center;font-size:52px;font-weight:bold;z-index:6;background:rgba(0,0,0,.75);text-align:center}
#act{position:fixed;top:58%;left:0;right:0;text-align:center;font-size:22px;color:#ffd98a;z-index:3;pointer-events:none;text-shadow:0 0 6px #000}
#tc{position:fixed;inset:0;z-index:4;pointer-events:none}
#joy{position:absolute;left:24px;bottom:28px;width:140px;height:140px;border-radius:50%;background:rgba(255,255,255,.12);border:2px solid rgba(255,255,255,.3);pointer-events:auto;touch-action:none}
#knob{position:absolute;left:45px;top:45px;width:50px;height:50px;border-radius:50%;background:rgba(255,217,138,.75)}
#bA,#bE{position:absolute;pointer-events:auto;border-radius:50%;border:0;font-weight:bold;touch-action:none}
#bA{right:22px;bottom:40px;width:96px;height:96px;background:#e0452f;color:#fff;font-size:15px}
#bE{right:134px;bottom:56px;width:78px;height:78px;background:#ffd98a;color:#1a1408;font-size:14px}
#blind{position:fixed;inset:0;background:#000;color:#ffd98a;font-size:30px;display:none;align-items:center;justify-content:center;z-index:4;pointer-events:none}
</style></head><body>
<div id="top"></div><div id="cross"></div><div id="toast"></div>
<div id="hint">WASD move, Shift sprint, E hide in tanks/barrels/bushes, click to tag or search (seeker). Click the game to lock the mouse.</div>
<div id="blind"></div><div id="tc" style="display:none"><div id="joy"><div id="knob"></div></div><button id="bA">CATCH</button><button id="bE">HIDE</button></div><div id="roul"></div><div id="act"></div>
<div id="menu" class="ov"><h1>Hide and Seek</h1>
<div>3 to 14 players. One seeker. Everyone else runs.</div>
<input id="name" maxlength="12" placeholder="Your name">
<input id="room" maxlength="12" placeholder="Room code (blank = random, TEST1 = solo test)">
<button id="join">Join</button></div>
<div id="ui" class="ov" style="display:none"><h1>Lobby</h1>
<div>Room code: <b id="rc"></b></div><div id="msg" style="color:#ff8a65;font-size:22px"></div>
<div id="plist"></div><button id="start">Start</button></div>
<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>
<script>
var $=function(i){return document.getElementById(i)};
var TOUCH=('ontouchstart' in window)||navigator.maxTouchPoints>0||matchMedia('(pointer:coarse)').matches,jf=0,js=0,jm=0;
if(TOUCH)$('hint').style.display='none';
function LK(){return TOUCH||document.pointerLockElement}
var ws,myId=0,S=null,seedBuilt=-1,obs=[],meshes={},toastT=0,roomCode='';
var me={x:0,z:0,ry:0,pt:0},keys={},lastPhase='',lastSend=0;
var scene=new THREE.Scene();var FOG=0x0d1420;scene.background=new THREE.Color(FOG);scene.fog=new THREE.FogExp2(FOG,0.028);
var cam=new THREE.PerspectiveCamera(75,innerWidth/innerHeight,0.1,200);cam.rotation.order='YXZ';scene.add(cam);
var ren=new THREE.WebGLRenderer({antialias:true});ren.setPixelRatio(TOUCH?1:Math.min(devicePixelRatio,2));ren.setSize(innerWidth,innerHeight);
ren.shadowMap.enabled=true;ren.shadowMap.type=THREE.PCFSoftShadowMap;ren.outputEncoding=THREE.sRGBEncoding;ren.toneMapping=THREE.ACESFilmicToneMapping;ren.toneMappingExposure=1.15;
document.body.appendChild(ren.domElement);
scene.add(new THREE.HemisphereLight(0x6f86b8,0x2a2418,0.55));
var moon=new THREE.DirectionalLight(0xa9c1ff,0.9);moon.position.set(-25,40,-15);moon.castShadow=true;moon.shadow.mapSize.set(TOUCH?1024:2048,TOUCH?1024:2048);
var sc=moon.shadow.camera;sc.left=-36;sc.right=36;sc.top=36;sc.bottom=-36;sc.near=1;sc.far=120;moon.shadow.bias=-0.0006;scene.add(moon);
var torch=new THREE.SpotLight(0xffe2a8,1.6,26,0.55,0.6,1.5);cam.add(torch);
var tt=new THREE.Object3D();tt.position.set(0,0,-5);cam.add(tt);torch.target=tt;
function M(c,r,m){return new THREE.MeshStandardMaterial({color:c,roughness:r==null?.8:r,metalness:m||0})}
(function(){
  var c=document.createElement('canvas');c.width=4;c.height=256;var x=c.getContext('2d'),g=x.createLinearGradient(0,0,0,256);
  g.addColorStop(0,'#05070f');g.addColorStop(.6,'#142036');g.addColorStop(1,'#2b3a52');x.fillStyle=g;x.fillRect(0,0,4,256);
  scene.add(new THREE.Mesh(new THREE.SphereGeometry(90,16,12),new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(c),side:THREE.BackSide,fog:false})));
  var p=[];for(var i=0;i<400;i++){var a=Math.random()*6.283,e=Math.random()*1.3+.1;p.push(Math.cos(a)*Math.cos(e)*85,Math.sin(e)*85,Math.sin(a)*Math.cos(e)*85)}
  var gg=new THREE.BufferGeometry();gg.setAttribute('position',new THREE.Float32BufferAttribute(p,3));
  scene.add(new THREE.Points(gg,new THREE.PointsMaterial({color:0xffffff,size:.6,fog:false})));
  var mo=new THREE.Mesh(new THREE.SphereGeometry(5,16,12),new THREE.MeshBasicMaterial({color:0xf3f0e0,fog:false}));mo.position.set(-45,70,-28);scene.add(mo);
})();
var gt=(function(){var c=document.createElement('canvas');c.width=c.height=256;var x=c.getContext('2d');x.fillStyle='#23331f';x.fillRect(0,0,256,256);
  for(var i=0;i<5000;i++){x.fillStyle='hsla('+(80+Math.random()*40)+',35%,'+(12+Math.random()*14)+'%,.55)';x.fillRect(Math.random()*256,Math.random()*256,2+Math.random()*3,2+Math.random()*3)}
  var t=new THREE.CanvasTexture(c);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(14,14);t.encoding=THREE.sRGBEncoding;return t})();
var floor=new THREE.Mesh(new THREE.PlaneGeometry(140,140),new THREE.MeshStandardMaterial({map:gt,roughness:1}));floor.rotation.x=-Math.PI/2;floor.receiveShadow=true;scene.add(floor);
var ff=(function(){var n=160,p=new Float32Array(n*3);for(var i=0;i<n;i++){p[i*3]=(Math.random()-.5)*58;p[i*3+1]=.3+Math.random()*3;p[i*3+2]=(Math.random()-.5)*58}
  var g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(p,3));
  var o=new THREE.Points(g,new THREE.PointsMaterial({color:0xffe08a,size:.14,transparent:true,opacity:.9,blending:THREE.AdditiveBlending,depthWrite:false}));scene.add(o);return o})();
var world=new THREE.Group();scene.add(world);
addEventListener('resize',function(){cam.aspect=innerWidth/innerHeight;cam.updateProjectionMatrix();ren.setSize(innerWidth,innerHeight)});
function rng(a){return function(){a|=0;a=a+0x6D2B79F5|0;var t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
var spots=[];
function P(geo,mat,x,y,z,par){var m=new THREE.Mesh(geo,mat);m.position.set(x,y,z);m.castShadow=m.receiveShadow=true;(par||world).add(m);return m}
function put(g,x,z,q,hw,hd,spot){g.position.set(x,0,z);if(q)g.rotation.y=Math.PI/2;world.add(g);
  var a=q?hd:hw,b=q?hw:hd;obs.push({x:x,z:z,hw:a,hd:b});if(spot)spots.push({x:x,z:z,hw:a,hd:b})}
function tank(x,z,r){var g=new THREE.Group(),o=M(0x4b5a34,.7,.2),d=M(0x1d1f1a,.9);
  P(new THREE.BoxGeometry(4.2,1.1,2.2),o,0,1.0,0,g);
  P(new THREE.BoxGeometry(4.4,.9,.6),d,0,.5,1.25,g);P(new THREE.BoxGeometry(4.4,.9,.6),d,0,.5,-1.25,g);
  P(new THREE.CylinderGeometry(.85,1,.65,16),o,-.2,1.85,0,g);
  var b=P(new THREE.CylinderGeometry(.12,.14,2.8,10),d,1.5,1.9,0,g);b.rotation.z=Math.PI/2;
  P(new THREE.CylinderGeometry(.25,.25,.15,10),d,-.4,2.25,0,g);put(g,x,z,r()>.5,2.3,1.7,true)}
function barrel(x,z,r){var g=new THREE.Group(),m=M(new THREE.Color().setHSL(r()<.5?.02:.58,.6,.3).getHex(),.45,.5);
  P(new THREE.CylinderGeometry(.6,.6,1.4,16),m,0,.7,0,g);
  [.25,1.15].forEach(function(y){P(new THREE.CylinderGeometry(.63,.63,.08,16),M(0x333333,.4,.8),0,y,0,g)});
  put(g,x,z,0,.65,.65,true)}
function bush(x,z,r){var g=new THREE.Group(),m=M(new THREE.Color().setHSL(.3,.5,.18+r()*.06).getHex(),1);
  for(var i=0;i<5;i++)P(new THREE.IcosahedronGeometry(.7+r()*.35,1),m,(r()-.5)*1.3,.7+r()*.4,(r()-.5)*1.3,g);
  put(g,x,z,0,1,1,true)}
function container(x,z,r){var g=new THREE.Group(),c=M(new THREE.Color().setHSL(r(),.45,.32).getHex(),.6,.3),d=M(0x1c1c1c,.6,.4);
  P(new THREE.BoxGeometry(6,2.6,2.4),c,0,1.3,0,g);
  for(var i=-2;i<=2;i++)P(new THREE.BoxGeometry(.14,2.5,2.5),d,i*1.2,1.3,0,g);
  put(g,x,z,r()>.5,3,1.2,false)}
function crates(x,z,r){var g=new THREE.Group(),w=M(0x8a6a3c,.85);
  P(new THREE.BoxGeometry(1.4,1.4,1.4),w,-.72,.7,0,g);P(new THREE.BoxGeometry(1.4,1.4,1.4),w,.72,.7,0,g);P(new THREE.BoxGeometry(1.4,1.4,1.4),M(0x9b7a48,.85),0,2.1,0,g);
  put(g,x,z,r()>.5,1.45,.75,false)}
function tree(x,z,r){var g=new THREE.Group(),h=3+r()*2,lm=M(new THREE.Color().setHSL(.33,.45,.14+r()*.08).getHex(),.9);
  P(new THREE.CylinderGeometry(.2,.3,h*.5,8),M(0x4a3524),0,h*.25,0,g);
  for(var i=0;i<3;i++)P(new THREE.ConeGeometry(1.5-i*.35,h*.5,9),lm,0,h*.45+i*h*.22,0,g);
  put(g,x,z,0,.5,.5,false)}
function build(seed){
  while(world.children.length)world.remove(world.children[0]);obs=[];spots=[];
  var wm=M(0x3a4650,.9),r=rng(seed);
  [[0,-30,60,1],[0,30,60,1],[-30,0,1,60],[30,0,1,60]].forEach(function(w){P(new THREE.BoxGeometry(w[2],5,w[3]),wm,w[0],2.5,w[1])});
  [[-24,-24],[24,-24],[-24,24],[24,24],[0,-26],[0,26]].forEach(function(l,i){
    P(new THREE.CylinderGeometry(.1,.14,4.5,8),M(0x222222,.5,.6),l[0],2.25,l[1]);
    P(new THREE.SphereGeometry(.28,12,8),new THREE.MeshBasicMaterial({color:0xffe9a8}),l[0],4.6,l[1]);
    if(i<4){var pl=new THREE.PointLight(0xffd58a,.9,16,2);pl.position.set(l[0],4.4,l[1]);world.add(pl)}
    obs.push({x:l[0],z:l[1],hw:.3,hd:.3});
  });
  var tries=0,placed=0;
  while(placed<52&&tries<400){tries++;
    var x=(r()-.5)*54,z=(r()-.5)*54,t=r(),ok=Math.hypot(x,z)>9;
    for(var j=0;ok&&j<obs.length;j++)if(Math.hypot(x-obs[j].x,z-obs[j].z)<obs[j].hw+obs[j].hd+2.2)ok=false;
    if(!ok)continue;placed++;
    if(t<.18)tank(x,z,r);else if(t<.38)barrel(x,z,r);else if(t<.55)container(x,z,r);else if(t<.72)crates(x,z,r);else if(t<.88)tree(x,z,r);else bush(x,z,r);
  }
}
function nearSpot(){for(var i=0;i<spots.length;i++){var o=spots[i];if(Math.abs(me.x-o.x)<o.hw+1.4&&Math.abs(me.z-o.z)<o.hd+1.4)return o}return null}
function toggleHide(){
  var m=mine();if(!S||!m||m[2]!=='hider'||(S.ph!=='hide'&&S.ph!=='seek')||!LK())return;
  if(me.h){me.h=0;me.x=me.ox;me.z=me.oz;return}
  var o=nearSpot();if(!o)return;me.ox=me.x;me.oz=me.z;me.h=1;me.x=o.x;me.z=o.z;
}
function hit(x,z){
  if(Math.abs(x)>29.3||Math.abs(z)>29.3)return true;
  for(var i=0;i<obs.length;i++){var o=obs[i];if(Math.abs(x-o.x)<o.hw+.45&&Math.abs(z-o.z)<o.hd+.45)return true}
  return false;
}
function mine(){if(!S)return null;for(var i=0;i<S.p.length;i++)if(S.p[i][0]===myId)return S.p[i];return null}
function spawn(){var a=myId*0.9;me.x=Math.cos(a)*5;me.z=Math.sin(a)*5;me.ry=0;me.pt=0}
function mk(p){
  var g=new THREE.Group(),c=M(0x5fa8d3,.5,.1);
  P(new THREE.CylinderGeometry(.42,.42,.9,16),c,0,.75,0,g);P(new THREE.SphereGeometry(.42,16,10),c,0,1.2,0,g);P(new THREE.SphereGeometry(.42,16,10),c,0,.3,0,g);
  var v=P(new THREE.SphereGeometry(.22,12,8),new THREE.MeshStandardMaterial({color:0xbfe9ff,emissive:0x5fb5e0,emissiveIntensity:.6,roughness:.2}),0,1.28,-.3,g);v.scale.set(1.3,.8,.7);
  var cv=document.createElement('canvas');cv.width=256;cv.height=64;var x=cv.getContext('2d');
  x.font='bold 32px sans-serif';x.textAlign='center';x.fillStyle='#fff';x.fillText(p[1],128,42);
  var sp=new THREE.Sprite(new THREE.SpriteMaterial({map:new THREE.CanvasTexture(cv)}));sp.scale.set(2,.5,1);sp.position.y=2.1;g.add(sp);
  g.userData={mat:c,label:sp,tx:p[3],tz:p[4],ry:p[5]};g.position.set(p[3],0,p[4]);scene.add(g);return g;
}
function sync(){
  var m=mine(),seen={},amSeeker=m&&m[2]==='seeker';
  S.p.forEach(function(p){
    if(p[0]===myId)return;seen[p[0]]=1;
    var g=meshes[p[0]]||(meshes[p[0]]=mk(p)),u=g.userData,sk=p[2]==='seeker';
    u.tx=p[3];u.tz=p[4];u.ry=p[5];
    u.mat.color.set(sk?0xd9482b:new THREE.Color().setHSL((p[0]*.37)%1,.6,.55).getHex());
    u.mat.emissive.set(sk?0x992200:0x000000);
    g.visible=p[2]!=='spec'&&!p[6];
    u.label.visible=!(amSeeker&&p[2]==='hider');
  });
  for(var id in meshes)if(!seen[id]){scene.remove(meshes[id]);delete meshes[id]}
}
function renderLobby(){
  $('rc').textContent=roomCode;
  $('msg').textContent=S.ph==='over'?S.msg:'';
  var l=$('plist');l.textContent='';
  S.p.forEach(function(p){var d=document.createElement('div');d.textContent=p[1]+(p[0]===S.host?' (host)':'')+(p[0]===myId?' (you)':'');l.appendChild(d)});
  var b=$('start');b.style.display=(S.host===myId&&S.ph==='lobby')?'':'none';
  var mn=S.test?1:3;b.disabled=S.p.length<mn;b.textContent=S.p.length<mn?'Need '+mn+' players ('+S.p.length+'/'+mn+')':'Start game';
}
function roulette(){
  var names=S.p.map(function(p){return p[1]}),sk=S.p.filter(function(p){return p[2]==='seeker'})[0],n=0,el=$('roul');
  el.style.display='flex';
  var iv=setInterval(function(){n++;var end=n>=22;
    el.textContent=end?sk[1]+' is the SEEKER':names[Math.floor(Math.random()*names.length)];
    el.style.color=end?'#ff6a45':'#efe6c4';
    if(end){clearInterval(iv);setTimeout(function(){el.style.display='none'},1300)}},140);
}
function onState(s){
  s.at=performance.now();S=s;
  if(s.ph!=='lobby'&&s.seed!==seedBuilt){build(s.seed);seedBuilt=s.seed}
  if(s.ph==='pick'&&lastPhase!=='pick'){spawn();me.h=0;roulette()}
  lastPhase=s.ph;sync();
  var mm=mine();if(mm&&mm[2]!=='hider'&&me.h){me.h=0;me.x=me.ox;me.z=me.oz}
  var lob=s.ph==='lobby'||s.ph==='over';
  $('ui').style.display=lob?'flex':'none';
  if(lob){renderLobby();if(document.exitPointerLock)document.exitPointerLock()}
}
function toast(t){$('toast').textContent=t;toastT=performance.now()+3500}
function join(){
  var n=$('name').value.trim()||'Player',rc=$('room').value.trim().toUpperCase();
  if(!rc)rc=Math.random().toString(36).slice(2,6).toUpperCase();
  roomCode=rc;if(TOUCH&&document.documentElement.requestFullscreen)document.documentElement.requestFullscreen().catch(function(){});
  ws=new WebSocket((location.protocol==='https:'?'wss://':'ws://')+location.host+'/ws?room='+encodeURIComponent(rc));
  ws.onopen=function(){ws.send(JSON.stringify({t:'join',name:n}));$('menu').style.display='none';$('ui').style.display='flex'};
  ws.onmessage=function(e){var m=JSON.parse(e.data);
    if(m.t==='welcome')myId=m.id;else if(m.t==='s')onState(m);else if(m.t==='ev')toast(m.text);
    else if(m.t==='full'){alert('Room is full (14 max).')}};
  ws.onclose=function(){$('menu').style.display='flex';$('ui').style.display='none';S=null;for(var id in meshes){scene.remove(meshes[id])}meshes={}};
}
$('join').onclick=join;
$('start').onclick=function(){ws.send(JSON.stringify({t:'start'}))};
addEventListener('keydown',function(e){keys[e.code]=1;if(e.code==='KeyE')toggleHide()});addEventListener('keyup',function(e){keys[e.code]=0});
ren.domElement.addEventListener('click',function(){if(S&&(S.ph==='pick'||S.ph==='hide'||S.ph==='seek'))TOUCH||ren.domElement.requestPointerLock()});
addEventListener('mousemove',function(e){if(document.pointerLockElement){me.ry-=e.movementX*.0025;me.pt=Math.max(-1.4,Math.min(1.4,me.pt-e.movementY*.0025))}});
function tagTry(){
  var m=mine();if(!LK()||!m||m[2]!=='seeker'||S.ph!=='seek')return;
  var fx=-Math.sin(me.ry),fz=-Math.cos(me.ry),best=null,bd=3.6;
  S.p.forEach(function(p){if(p[2]!=='hider')return;var g=meshes[p[0]];if(!g)return;
    var dx=g.position.x-me.x,dz=g.position.z-me.z,d=Math.hypot(dx,dz);
    if(d<bd&&(dx*fx+dz*fz)/(d||1)>.7){bd=d;best=p[0]}});
  if(best)ws.send(JSON.stringify({t:'tag',id:best}));
}
addEventListener('mousedown',tagTry);
function fmt(t){return Math.floor(t/60)+':'+('0'+(t%60)).slice(-2)}
function hud(){
  var m=mine();if(!S||!m)return;
  var t=Math.max(0,Math.ceil(S.left-(performance.now()-S.at)/1000)),r=m[2];
  var hl=S.p.filter(function(p){return p[2]==='hider'}).length,txt='';
  if(S.ph==='pick')txt='Rolling for the seeker...';
  else if(S.ph==='hide')txt=r==='seeker'?'You are the seeker. Eyes shut: '+t+'s':'HIDE! Seeker wakes in '+t+'s';
  else if(S.ph==='seek')txt=(r==='seeker'?'SEEK. Click to tag or search.':r==='hider'?'Survive.':'Spectating.')+'  '+fmt(t)+'  hiders left: '+hl;
  $('top').textContent=txt;
  var bl=$('blind');bl.style.display=(S.ph==='hide'&&r==='seeker')?'flex':'none';bl.textContent='Counting... '+t+'s';
  var ns=r==='hider'&&(S.ph==='hide'||S.ph==='seek')&&LK();
  $('act').textContent=ns?(me.h?(TOUCH?'Tap OUT to climb out':'Press E to climb out'):(nearSpot()?(TOUCH?'Tap HIDE to hide here':'Press E to hide here'):'')):'';
  if(performance.now()>toastT)$('toast').textContent='';
  if(TOUCH){var pg=S.ph==='pick'||S.ph==='hide'||S.ph==='seek';$('tc').style.display=pg?'block':'none';$('bA').style.display=r==='seeker'?'block':'none';$('bE').style.display=r==='hider'?'block':'none';$('bE').textContent=me.h?'OUT':'HIDE';$('bE').style.opacity=(me.h||nearSpot())?1:.45}
}
var jid=null,jc=null,lid=null,lx=0,ly=0,jy=$('joy'),cvs=ren.domElement;
function jset(x,y){var dx=x-jc.x,dy=y-jc.y,d=Math.hypot(dx,dy),R=55;if(d>R){dx*=R/d;dy*=R/d;d=R}
  $('knob').style.transform='translate('+dx+'px,'+dy+'px)';
  jm=d/R;if(jm<.15){jm=0;jf=0;js=0}else{jf=-dy/R;js=dx/R}}
function jend(){jid=null;jf=0;js=0;jm=0;$('knob').style.transform='none'}
jy.addEventListener('touchstart',function(e){e.preventDefault();var t=e.changedTouches[0],b=jy.getBoundingClientRect();jid=t.identifier;jc={x:b.left+b.width/2,y:b.top+b.height/2};jset(t.clientX,t.clientY)},{passive:false});
jy.addEventListener('touchmove',function(e){e.preventDefault();for(var i=0;i<e.changedTouches.length;i++)if(e.changedTouches[i].identifier===jid)jset(e.changedTouches[i].clientX,e.changedTouches[i].clientY)},{passive:false});
jy.addEventListener('touchend',function(e){e.preventDefault();jend()},{passive:false});jy.addEventListener('touchcancel',jend);
cvs.addEventListener('touchstart',function(e){e.preventDefault();if(lid===null){var t=e.changedTouches[0];lid=t.identifier;lx=t.clientX;ly=t.clientY}},{passive:false});
cvs.addEventListener('touchmove',function(e){e.preventDefault();for(var i=0;i<e.changedTouches.length;i++){var t=e.changedTouches[i];if(t.identifier===lid){me.ry-=(t.clientX-lx)*.006;me.pt=Math.max(-1.4,Math.min(1.4,me.pt-(t.clientY-ly)*.006));lx=t.clientX;ly=t.clientY}}},{passive:false});
function lend(e){for(var i=0;i<e.changedTouches.length;i++)if(e.changedTouches[i].identifier===lid)lid=null}
cvs.addEventListener('touchend',lend);cvs.addEventListener('touchcancel',lend);
$('bE').addEventListener('touchstart',function(e){e.preventDefault();toggleHide()},{passive:false});
$('bA').addEventListener('touchstart',function(e){e.preventDefault();tagTry()},{passive:false});
var last=performance.now(),mv=0;
function loop(now){
  requestAnimationFrame(loop);var dt=Math.min(.05,(now-last)/1000);last=now;
  var m=mine();mv=0;
  var can=S&&m&&!me.h&&LK()&&((S.ph==='hide'&&m[2]!=='seeker')||S.ph==='seek');
  if(can){
    var f=(keys.KeyW?1:0)-(keys.KeyS?1:0)+jf,s=(keys.KeyD?1:0)-(keys.KeyA?1:0)+js;
    if(f||s){
      mv=1;var sp=((keys.ShiftLeft||jm>.85)?8:5)*dt,l=Math.max(1,Math.hypot(f,s));f/=l;s/=l;
      var dx=(-Math.sin(me.ry)*f+Math.cos(me.ry)*s)*sp,dz=(-Math.cos(me.ry)*f-Math.sin(me.ry)*s)*sp;
      if(!hit(me.x+dx,me.z))me.x+=dx;if(!hit(me.x,me.z+dz))me.z+=dz;
    }
  }
  if(ws&&ws.readyState===1&&myId&&now-lastSend>66){lastSend=now;ws.send(JSON.stringify({t:'pos',x:me.x,z:me.z,ry:me.ry,h:me.h?1:0}))}
  cam.position.set(me.x,me.h?1.1:1.6+(mv?Math.sin(now*.012)*.05:0),me.z);cam.rotation.y=me.ry;cam.rotation.x=me.pt;
  for(var id in meshes){var g=meshes[id],u=g.userData;g.position.x+=(u.tx-g.position.x)*.3;g.position.z+=(u.tz-g.position.z)*.3;g.rotation.y=u.ry}
  ff.rotation.y+=dt*.03;ff.position.y=Math.sin(now*.0006)*.3;
  hud();ren.render(scene,cam);
}
requestAnimationFrame(loop);
</script></body></html>`;

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    if (url.pathname === '/ws') {
      if (req.headers.get('Upgrade') !== 'websocket') return new Response('Expected websocket', { status: 426 });
      const room = (url.searchParams.get('room') || 'MAIN').toUpperCase().slice(0, 12);
      return env.ROOMS.get(env.ROOMS.idFromName(room)).fetch(req);
    }
    return new Response(HTML, { headers: { 'content-type': 'text/html;charset=utf-8' } });
  }
};

const PICK_MS = 4500, HIDE_MS = 30000, SEEK_MS = 180000, OVER_MS = 6000, MIN = 3, MAX = 14;

export class Room {
  constructor(state, env) {
    this.players = new Map(); this.phase = 'lobby'; this.end = 0; this.host = null;
    this.test = false; this.seed = 1; this.been = new Set(); this.msg = ''; this.nextId = 1; this.timer = null;
  }
  async fetch(req) {
    this.test = (new URL(req.url).searchParams.get('room') || '').toUpperCase().startsWith('TEST');
    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);
    server.accept();
    this.attach(server);
    return new Response(null, { status: 101, webSocket: client });
  }
  attach(ws) {
    let me = null;
    ws.addEventListener('message', (ev) => {
      let m; try { m = JSON.parse(ev.data); } catch (e) { return; }
      if (m.t === 'join' && !me) {
        if (this.players.size >= MAX) { ws.send(JSON.stringify({ t: 'full' })); ws.close(); return; }
        const id = this.nextId++;
        me = { id, ws, name: String(m.name || 'Player').slice(0, 12), x: 0, z: 0, ry: 0, lastTag: 0,
               role: this.phase === 'lobby' ? 'lobby' : 'spec' };
        this.players.set(id, me);
        if (!this.host) this.host = id;
        ws.send(JSON.stringify({ t: 'welcome', id }));
        this.ensureTimer(); this.broadcast();
      } else if (!me) {
        return;
      } else if (m.t === 'pos') {
        if (this.phase === 'pick' || (this.phase === 'hide' && me.role === 'seeker')) return;
        if (Number.isFinite(m.x) && Number.isFinite(m.z) && Number.isFinite(m.ry)) {
          me.x = Math.max(-30, Math.min(30, m.x)); me.z = Math.max(-30, Math.min(30, m.z)); me.ry = m.ry;
          me.h = me.role === 'hider' && m.h ? 1 : 0;
        }
      } else if (m.t === 'start') {
        if (me.id !== this.host || this.phase !== 'lobby' || this.players.size < (this.test ? 1 : MIN)) return;
        const list = [...this.players.values()];
        let pool = list.filter((p) => !this.been.has(p.id));
        if (!pool.length) { this.been.clear(); pool = list; }
        const seeker = pool[Math.floor(Math.random() * pool.length)];
        this.been.add(seeker.id);
        list.forEach((p) => { p.h = 0; p.role = p === seeker ? 'seeker' : 'hider'; });
        if (this.test && list.length === 1) list[0].role = 'hider';
        this.seed = 1 + Math.floor(Math.random() * 1e9);
        this.phase = 'pick'; this.end = Date.now() + PICK_MS; this.msg = '';
        this.broadcast();
      } else if (m.t === 'tag') {
        const now = Date.now();
        const t = this.players.get(m.id);
        if (this.phase !== 'seek' || me.role !== 'seeker' || !t || t.role !== 'hider') return;
        if (now - me.lastTag < 400 || Math.hypot(t.x - me.x, t.z - me.z) > 4.8) return;
        me.lastTag = now; t.role = 'seeker'; t.h = 0;
        this.send({ t: 'ev', text: t.name + ' got found!' });
        this.checkEnd(); this.broadcast();
      }
    });
    const leave = () => {
      if (!me) return;
      const id = me.id; me = null;
      this.players.delete(id);
      if (this.host === id) this.host = this.players.size ? this.players.keys().next().value : null;
      if (!this.players.size) { clearInterval(this.timer); this.timer = null; this.phase = 'lobby'; return; }
      this.checkEnd(); this.broadcast();
    };
    ws.addEventListener('close', leave);
    ws.addEventListener('error', leave);
  }
  ensureTimer() {
    if (this.timer) return;
    this.timer = setInterval(() => {
      const now = Date.now();
      if (this.phase === 'pick' && now >= this.end) { this.phase = 'hide'; this.end = now + HIDE_MS; }
      else if (this.phase === 'hide' && now >= this.end) { this.phase = 'seek'; this.end = now + SEEK_MS; }
      else if (this.phase === 'seek' && now >= this.end) this.finish('Time is up. Hiders win!');
      else if (this.phase === 'over' && now >= this.end) {
        this.phase = 'lobby'; this.players.forEach((p) => { p.role = 'lobby'; });
      }
      this.broadcast();
    }, 100);
  }
  checkEnd() {
    if (this.test && this.players.size < 2) return;
    if (this.phase !== 'pick' && this.phase !== 'hide' && this.phase !== 'seek') return;
    const roles = [...this.players.values()].map((p) => p.role);
    const hiders = roles.filter((r) => r === 'hider').length;
    const seekers = roles.filter((r) => r === 'seeker').length;
    if (this.players.size < 2) { this.phase = 'lobby'; this.players.forEach((p) => { p.role = 'lobby'; }); }
    else if (hiders === 0) this.finish('Everyone got found. Seekers win!');
    else if (seekers === 0) this.finish('The seeker bailed. Hiders win!');
  }
  finish(msg) { this.phase = 'over'; this.msg = msg; this.end = Date.now() + OVER_MS; }
  send(obj) { const s = JSON.stringify(obj); this.players.forEach((p) => { try { p.ws.send(s); } catch (e) {} }); }
  broadcast() {
    const r = (n) => Math.round(n * 100) / 100;
    this.send({
      t: 's', ph: this.phase, left: Math.max(0, Math.ceil((this.end - Date.now()) / 1000)),
      host: this.host, test: this.test ? 1 : 0, seed: this.seed, msg: this.msg,
      p: [...this.players.values()].map((p) => [p.id, p.name, p.role, r(p.x), r(p.z), r(p.ry), p.h ? 1 : 0])
    });
  }
}
