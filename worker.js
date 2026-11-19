// Hide & Seek 3D - rebuilt from scratch.
// One Cloudflare Worker: serves the game page and runs the Durable Object class "Room" (binding name ROOMS).
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
#pw{position:fixed;top:40px;left:12px;font-size:15px;z-index:3;text-shadow:0 0 6px #000;pointer-events:none;opacity:.9}
#vig{position:fixed;inset:0;z-index:2;pointer-events:none;background:radial-gradient(ellipse at center,transparent 58%,rgba(0,0,10,.5) 100%)}
#cross{position:fixed;left:50%;top:50%;width:6px;height:6px;margin:-3px;border-radius:50%;background:#ffd98a;opacity:.85;z-index:3;pointer-events:none;transition:transform .15s}
#toast{position:fixed;bottom:60px;left:0;right:0;text-align:center;font-size:22px;color:#ff8a65;z-index:3;pointer-events:none}
#hint{position:fixed;bottom:12px;left:0;right:0;text-align:center;opacity:.6;z-index:3;pointer-events:none}
#act{position:fixed;top:58%;left:0;right:0;text-align:center;font-size:22px;color:#ffd98a;z-index:3;pointer-events:none;text-shadow:0 0 6px #000}
#roul{position:fixed;inset:0;display:none;align-items:center;justify-content:center;font-size:52px;font-weight:bold;z-index:6;background:rgba(0,0,0,.75);text-align:center}
#blind{position:fixed;inset:0;background:#000;color:#ffd98a;font-size:30px;display:none;align-items:center;justify-content:center;z-index:4;pointer-events:none}
#pick{z-index:7}
.pbtn{display:block;width:min(520px,90vw);margin:6px auto;text-align:left}
#tc{position:fixed;inset:0;z-index:4;pointer-events:none}
#joy{position:absolute;left:24px;bottom:28px;width:140px;height:140px;border-radius:50%;background:rgba(255,255,255,.12);border:2px solid rgba(255,255,255,.3);pointer-events:auto;touch-action:none}
#knob{position:absolute;left:45px;top:45px;width:50px;height:50px;border-radius:50%;background:rgba(255,217,138,.75)}
#bA,#bE,#bQ,#bF,#bJ{position:absolute;pointer-events:auto;border-radius:50%;border:0;font-weight:bold;touch-action:none}
#bA{right:22px;bottom:40px;width:96px;height:96px;background:#e0452f;color:#fff;font-size:15px}
#bE{right:134px;bottom:56px;width:78px;height:78px;background:#ffd98a;color:#1a1408;font-size:14px}
#bJ{right:30px;bottom:152px;width:70px;height:70px;background:#7fd1ff;color:#06202e;font-size:13px}
#bQ{right:122px;bottom:150px;width:66px;height:66px;background:#c58cff;color:#1f0b33;font-size:12px}
#bF{right:222px;bottom:96px;width:66px;height:66px;background:#6ee7a4;color:#06261a;font-size:12px}
@keyframes pulse{0%,100%{transform:scale(1);box-shadow:0 0 0 0 rgba(224,69,47,.55)}50%{transform:scale(1.07);box-shadow:0 0 0 14px rgba(224,69,47,0)}}
@keyframes press{0%{transform:scale(1)}35%{transform:scale(.78) rotate(-6deg)}70%{transform:scale(1.15) rotate(4deg)}100%{transform:scale(1)}}
#bA{animation:pulse 2.4s infinite}
#bA.ready{animation:pulse .6s infinite;background:#ff3b2f;box-shadow:0 0 22px #ff3b2f}
#bA.press{animation:press .3s}
</style></head><body>
<div id="top"></div><div id="pw"></div><div id="vig"></div><div id="cross"></div><div id="toast"></div>
<div id="hint">WASD move, Space jump, Shift sprint, E hide, Q/F powers (seeker), C descend while flying, click to catch. Click the game to lock the mouse.</div>
<div id="blind"></div>
<div id="tc" style="display:none"><div id="joy"><div id="knob"></div></div><button id="bA">CATCH</button><button id="bE">HIDE</button><button id="bQ">Q</button><button id="bF">F</button><button id="bJ">JUMP</button></div>
<div id="roul"></div>
<div id="pick" class="ov" style="display:none"><h1>Seeker powers</h1><div id="psel"></div><div id="pbtns"></div></div>
<div id="act"></div>
<div id="menu" class="ov"><h1>Hide and Seek</h1>
<div>2 to 14 players. One seeker. Everyone else runs.</div>
<input id="name" maxlength="12" placeholder="Your name">
<input id="room" maxlength="12" placeholder="Room code (blank = random, TEST1 = solo test)">
<button id="join">Join</button><button id="gfx"></button></div>
<div id="ui" class="ov" style="display:none"><h1>Lobby</h1>
<div>Room code: <b id="rc"></b></div><div id="msg" style="color:#ff8a65;font-size:22px"></div>
<div id="plist"></div><button id="start">Start</button></div>
<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/shaders/CopyShader.js"></script>
<script src="https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/shaders/LuminosityHighPassShader.js"></script>
<script src="https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/shaders/GammaCorrectionShader.js"></script>
<script src="https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/postprocessing/EffectComposer.js"></script>
<script src="https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/postprocessing/MaskPass.js"></script>
<script src="https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/postprocessing/RenderPass.js"></script>
<script src="https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/postprocessing/ShaderPass.js"></script>
<script src="https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/postprocessing/UnrealBloomPass.js"></script>
<script>
/* ---------- basics ---------- */
var $=function(i){return document.getElementById(i)};
var TOUCH=('ontouchstart' in window)||navigator.maxTouchPoints>0||matchMedia('(pointer:coarse)').matches,jf=0,js=0,jm=0;
var HQ=false;try{HQ=(localStorage.getItem('gfx')||(TOUCH?'low':'high'))==='high'}catch(e){}
if(TOUCH)$('hint').style.display='none';
function LK(){return TOUCH||document.pointerLockElement}
var ws,myId=0,S=null,seedBuilt=-1,obs=[],spots=[],zones=[],meshes={},toastT=0,roomCode='',lastPhase='',lastSend=0;
var me={x:0,y:0,z:0,ry:0,pt:0,h:0},keys={};
var VY=0,cd={q:0,f:0},boostT=0,scanT=0,flyT=0,invT=0,jumpReq=0,mypow=[],pickOpen=false;

/* ---------- renderer, lights, sky, ground ---------- */
var scene=new THREE.Scene(),FOG=0x0d1420;scene.background=new THREE.Color(FOG);scene.fog=new THREE.FogExp2(FOG,0.017);
var cam=new THREE.PerspectiveCamera(75,innerWidth/innerHeight,0.1,200);cam.rotation.order='YXZ';scene.add(cam);
var ren=new THREE.WebGLRenderer({antialias:true});
ren.setPixelRatio(HQ?Math.min(devicePixelRatio,TOUCH?1.5:2):1);ren.setSize(innerWidth,innerHeight);
ren.shadowMap.enabled=true;ren.shadowMap.type=THREE.PCFSoftShadowMap;ren.outputEncoding=THREE.sRGBEncoding;
ren.toneMapping=THREE.ACESFilmicToneMapping;ren.toneMappingExposure=1.25;
document.body.appendChild(ren.domElement);
var comp=null;
if(HQ&&THREE.EffectComposer&&THREE.RenderPass&&THREE.UnrealBloomPass&&THREE.ShaderPass&&THREE.GammaCorrectionShader){
  try{comp=new THREE.EffectComposer(ren);comp.addPass(new THREE.RenderPass(scene,cam));
    comp.addPass(new THREE.UnrealBloomPass(new THREE.Vector2(innerWidth,innerHeight),.5,.55,.85));
    comp.addPass(new THREE.ShaderPass(THREE.GammaCorrectionShader))}catch(e){comp=null}
}
var gb=$('gfx');gb.textContent='Graphics: '+(HQ?'High':'Low');
gb.onclick=function(){try{localStorage.setItem('gfx',HQ?'low':'high')}catch(e){}location.reload()};
scene.add(new THREE.HemisphereLight(0x8aa0d0,0x3a3020,0.85));
var moon=new THREE.DirectionalLight(0xbfd0ff,1.1);moon.position.set(-25,40,-15);moon.castShadow=true;
moon.shadow.mapSize.set(HQ?2048:1024,HQ?2048:1024);
var sc=moon.shadow.camera;sc.left=-36;sc.right=36;sc.top=36;sc.bottom=-36;sc.near=1;sc.far=120;moon.shadow.bias=-0.0006;scene.add(moon);
var torch=new THREE.SpotLight(0xffe2a8,1.6,26,0.55,0.6,1.5);cam.add(torch);
var tt=new THREE.Object3D();tt.position.set(0,0,-5);cam.add(tt);torch.target=tt;
addEventListener('resize',function(){cam.aspect=innerWidth/innerHeight;cam.updateProjectionMatrix();ren.setSize(innerWidth,innerHeight);if(comp)comp.setSize(innerWidth,innerHeight)});

(function(){ /* night sky: gradient, stars, moon */
  var c=document.createElement('canvas');c.width=4;c.height=256;var x=c.getContext('2d'),g=x.createLinearGradient(0,0,0,256);
  g.addColorStop(0,'#05070f');g.addColorStop(.6,'#142036');g.addColorStop(1,'#2b3a52');x.fillStyle=g;x.fillRect(0,0,4,256);
  scene.add(new THREE.Mesh(new THREE.SphereGeometry(90,16,12),new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(c),side:THREE.BackSide,fog:false})));
  var p=[];for(var i=0;i<400;i++){var a=Math.random()*6.283,e=Math.random()*1.3+.1;p.push(Math.cos(a)*Math.cos(e)*85,Math.sin(e)*85,Math.sin(a)*Math.cos(e)*85)}
  var gg=new THREE.BufferGeometry();gg.setAttribute('position',new THREE.Float32BufferAttribute(p,3));
  scene.add(new THREE.Points(gg,new THREE.PointsMaterial({color:0xffffff,size:.6,fog:false})));
  var mo=new THREE.Mesh(new THREE.SphereGeometry(5,16,12),new THREE.MeshBasicMaterial({color:0xf3f0e0,fog:false}));mo.position.set(-45,70,-28);scene.add(mo);
})();
var gt=(function(){var c=document.createElement('canvas');c.width=c.height=512;var x=c.getContext('2d'),i;x.fillStyle='#2f4a29';x.fillRect(0,0,512,512);
  for(i=0;i<260;i++){x.fillStyle='hsla('+(70+Math.random()*50)+',45%,'+(14+Math.random()*16)+'%,.35)';x.beginPath();x.arc(Math.random()*512,Math.random()*512,10+Math.random()*34,0,6.283);x.fill()}
  for(i=0;i<9000;i++){x.fillStyle='hsla('+(70+Math.random()*60)+',50%,'+(16+Math.random()*22)+'%,.6)';x.fillRect(Math.random()*512,Math.random()*512,1.5,3+Math.random()*4)}
  var t=new THREE.CanvasTexture(c);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(10,10);t.encoding=THREE.sRGBEncoding;t.anisotropy=4;return t})();
var floor=new THREE.Mesh(new THREE.PlaneGeometry(140,140),new THREE.MeshStandardMaterial({map:gt,bumpMap:gt,bumpScale:1.2,roughness:1}));
floor.rotation.x=-Math.PI/2;floor.receiveShadow=true;scene.add(floor);
var ff=(function(){var n=160,p=new Float32Array(n*3);for(var i=0;i<n;i++){p[i*3]=(Math.random()-.5)*58;p[i*3+1]=.3+Math.random()*3;p[i*3+2]=(Math.random()-.5)*58}
  var g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(p,3));
  var o=new THREE.Points(g,new THREE.PointsMaterial({color:0xffe08a,size:.14,transparent:true,opacity:.9,blending:THREE.AdditiveBlending,depthWrite:false}));scene.add(o);return o})();
var world=new THREE.Group();scene.add(world);

/* ---------- materials and textures ---------- */
function M(c,r,m){return new THREE.MeshStandardMaterial({color:c,roughness:r==null?.8:r,metalness:m||0})}
var TEX={};
function tex(kind){if(TEX[kind])return TEX[kind];var c=document.createElement('canvas');c.width=c.height=128;var x=c.getContext('2d'),i,j;
  x.fillStyle='#fff';x.fillRect(0,0,128,128);
  if(kind==='plaster'){for(i=0;i<900;i++){x.fillStyle='rgba(0,0,0,'+Math.random()*.07+')';x.fillRect(Math.random()*128,Math.random()*128,2,2)}x.fillStyle='rgba(0,0,0,.12)';x.fillRect(0,126,128,2)}
  else if(kind==='wood'){for(i=0;i<8;i++){x.fillStyle='rgba(0,0,0,.2)';x.fillRect(0,i*16,128,2);for(j=0;j<18;j++){x.fillStyle='rgba(0,0,0,'+Math.random()*.09+')';x.fillRect(Math.random()*128,i*16+2+Math.random()*12,10+Math.random()*30,1)}}}
  else if(kind==='tiles'){x.fillStyle='rgba(0,0,0,.28)';for(i=0;i<8;i++){x.fillRect(0,i*16,128,2);for(j=0;j<4;j++)x.fillRect(j*32+(i%2)*16,i*16,2,16)}}
  else if(kind==='corr'){for(i=0;i<16;i++){x.fillStyle='rgba(0,0,0,.22)';x.fillRect(i*8,0,3,128)}}
  var t=new THREE.CanvasTexture(c);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.encoding=THREE.sRGBEncoding;t.anisotropy=4;return TEX[kind]=t}
function MT(kind,col,rough,met){var m=new THREE.MeshStandardMaterial({color:col,map:tex(kind),roughness:rough==null?.85:rough,metalness:met||0});m.bumpMap=tex(kind);m.bumpScale=.6;return m}
function UVS(g,w,h,d){var uv=g.attributes.uv,k=.33;for(var i=0;i<24;i++){var f=(i/4)|0,su=f<2?d:w,sv=f<2?h:(f<4?d:h);uv.setXY(i,uv.getX(i)*su*k,uv.getY(i)*sv*k)}}

/* ---------- world: props, houses, sheds ---------- */
function rng(a){return function(){a|=0;a=a+0x6D2B79F5|0;var t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
function P(geo,mat,x,y,z,par){var m=new THREE.Mesh(geo,mat);m.position.set(x,y,z);m.castShadow=m.receiveShadow=true;(par||world).add(m);return m}
function ob(x,z,hw,hd,t,b){obs.push({x:x,z:z,hw:hw,hd:hd,t:t,b:b||0})}
function put(g,x,z,q,hw,hd,spot,ht,under){g.position.set(x,0,z);if(q)g.rotation.y=Math.PI/2;world.add(g);
  var a=q?hd:hw,b=q?hw:hd;ob(x,z,a,b,ht||2.5,0);if(spot)spots.push({x:x,z:z,hw:a,hd:b,y0:0,u:under?1:0})}
function tank(x,z,r){var g=new THREE.Group(),o=M(0x4b5a34,.7,.2),d=M(0x1d1f1a,.9);
  P(new THREE.BoxGeometry(4.2,1.1,2.2),o,0,1.0,0,g);
  P(new THREE.BoxGeometry(4.4,.9,.6),d,0,.5,1.25,g);P(new THREE.BoxGeometry(4.4,.9,.6),d,0,.5,-1.25,g);
  P(new THREE.CylinderGeometry(.85,1,.65,16),o,-.2,1.85,0,g);
  var b=P(new THREE.CylinderGeometry(.12,.14,2.8,10),d,1.5,1.9,0,g);b.rotation.z=Math.PI/2;
  P(new THREE.CylinderGeometry(.25,.25,.15,10),d,-.4,2.25,0,g);
  put(g,x,z,r()>.5,2.3,1.7,true,2.3,true);spots[spots.length-1].ex=1}
function barrel(x,z,r){var g=new THREE.Group(),m=M(new THREE.Color().setHSL(r()<.5?.02:.58,.6,.3).getHex(),.45,.5);
  P(new THREE.CylinderGeometry(.6,.6,1.4,16),m,0,.7,0,g);
  [.25,1.15].forEach(function(y){P(new THREE.CylinderGeometry(.63,.63,.08,16),M(0x333333,.4,.8),0,y,0,g)});
  put(g,x,z,0,.65,.65,true,1.4)}
function bush(x,z,r){var g=new THREE.Group(),m=M(new THREE.Color().setHSL(.3,.5,.18+r()*.06).getHex(),1);
  for(var i=0;i<5;i++)P(new THREE.IcosahedronGeometry(.7+r()*.35,1),m,(r()-.5)*1.3,.7+r()*.4,(r()-.5)*1.3,g);
  put(g,x,z,0,1,1,true,1.4)}
function container(x,z,r){var g=new THREE.Group(),c=MT('corr',new THREE.Color().setHSL(r(),.5,.4).getHex(),.5,.4),d=M(0x1c1c1c,.6,.4),w=M(0x8a6a3c,.85),q=r()>.5;
  P(new THREE.BoxGeometry(6,2.6,2.4),c,0,1.3,0,g);
  for(var i=-2;i<=2;i++)P(new THREE.BoxGeometry(.14,2.5,2.5),d,i*1.2,1.3,0,g);
  P(new THREE.BoxGeometry(1.2,1.8,1.6),w,3.6,.9,0,g);P(new THREE.BoxGeometry(1.2,.9,1.6),w,4.8,.45,0,g);
  [[3.6,1.8],[4.8,.9]].forEach(function(s){ob(q?x:x+s[0],q?z-s[0]:z,q?.8:.6,q?.6:.8,s[1],0)});
  put(g,x,z,q,3,1.2,false,2.6)}
function crates(x,z,r){var g=new THREE.Group(),w=MT('wood',0xc99a58);
  P(new THREE.BoxGeometry(1.4,1.4,1.4),w,-.72,.7,0,g);P(new THREE.BoxGeometry(1.4,1.4,1.4),w,.72,.7,0,g);P(new THREE.BoxGeometry(1.4,1.4,1.4),M(0x9b7a48,.85),0,2.1,0,g);
  put(g,x,z,r()>.5,1.45,.75,false,2.8)}
function tree(x,z,r){var g=new THREE.Group(),h=3+r()*2,lm=M(new THREE.Color().setHSL(.33,.45,.14+r()*.08).getHex(),.9);
  P(new THREE.CylinderGeometry(.2,.3,h*.5,8),M(0x4a3524),0,h*.25,0,g);
  for(var i=0;i<3;i++)P(new THREE.ConeGeometry(1.5-i*.35,h*.5,9),lm,0,h*.45+i*h*.22,0,g);
  put(g,x,z,0,.5,.5,false,9)}
function car(x,z,r){var g=new THREE.Group(),c=M(new THREE.Color().setHSL(r(),.55,.4).getHex(),.35,.6),d=M(0x15181c,.8);
  P(new THREE.BoxGeometry(4.2,.8,1.8),c,0,.75,0,g);P(new THREE.BoxGeometry(2.2,.7,1.6),M(0x9fd6ff,.1,.8),-.2,1.5,0,g);
  [[-1.4,-.9],[-1.4,.9],[1.4,-.9],[1.4,.9]].forEach(function(w){var k=P(new THREE.CylinderGeometry(.38,.38,.3,12),d,w[0],.38,w[1],g);k.rotation.x=Math.PI/2});
  put(g,x,z,r()>.5,2.1,.95,true,1.85,true)}
function ptable(x,z,r){var g=new THREE.Group(),w=MT('wood',0xa97a48);
  P(new THREE.BoxGeometry(2.2,.1,1),w,0,.8,0,g);P(new THREE.BoxGeometry(2.2,.08,.4),w,0,.45,-.9,g);P(new THREE.BoxGeometry(2.2,.08,.4),w,0,.45,.9,g);
  [[-.9,-.4],[.9,-.4],[-.9,.4],[.9,.4]].forEach(function(l){P(new THREE.BoxGeometry(.1,.8,.1),w,l[0],.4,l[1],g)});
  put(g,x,z,r()>.5,1.2,1.15,true,.9,true)}

/* box in a building's local coordinates; rk = rotation (0..3). Collider spans y0..y0+h. */
function mkB(cx,cz,rk){return function(lx,lz,w,d,y0,h,m,hide,under,noObs){
  var x,z,W=w,D=d;
  if(rk===0){x=cx+lx;z=cz+lz}else if(rk===1){x=cx-lz;z=cz+lx;W=d;D=w}else if(rk===2){x=cx-lx;z=cz-lz}else{x=cx+lz;z=cz-lx;W=d;D=w}
  var bg=new THREE.BoxGeometry(W,h,D);UVS(bg,W,h,D);P(bg,m,x,y0+h/2,z);
  if(!noObs)ob(x,z,W/2,D/2,y0+h,y0);
  if(hide)spots.push({x:x,z:z,hw:W/2,hd:D/2,y0:y0,u:under?1:0})}}
function house(cx,cz,rk){
  var B=mkB(cx,cz,rk),wc=MT('plaster',0xe8d9bd),wd=MT('wood',0x8c5e38),rf=MT('tiles',0xb23a2e),sofa=M(0x3b5b8c,.9),bed=M(0xc9d6e8,.9),cn=M(0xdfe5ea,.5),fr=M(0xe9eef2,.4),rug=M(0x8a3b3b,1);
  var wn=new THREE.MeshBasicMaterial({color:0xffe2a0});
  [1.1,4.3].forEach(function(yy){
    [-2.5,2.5].forEach(function(zz){B(-7.23,zz,.06,1.6,yy,1.2,wn,0,0,1);B(7.23,zz,.06,1.6,yy,1.2,wn,0,0,1)});
    [-3.5,3.5].forEach(function(xx){B(xx,-5.23,1.6,.06,yy,1.2,wn,0,0,1)});
    [-4.5,4.5].forEach(function(xx){B(xx,5.23,1.6,.06,yy,1.2,wn,0,0,1)})});
  B(0,0,13.6,9.6,0,.05,rug,0,0,1);
  /* ground floor walls, door in front, kitchen partition */
  B(0,-5,14.4,.4,0,3.2,wc);B(-7,0,.4,10,0,3.2,wc);B(7,0,.4,10,0,3.2,wc);
  B(-4.1,5,5.8,.4,0,3.2,wc);B(4.1,5,5.8,.4,0,3.2,wc);B(0,5,2.4,.4,2.4,.8,wc);
  B(3.2,-2.6,.3,4.4,0,3.2,wc);
  /* upper walls with a window you can jump out of */
  B(0,-5,14.4,.4,3.2,3,wc);B(-7,0,.4,10,3.2,3,wc);B(7,0,.4,10,3.2,3,wc);
  B(-4.5,5,5,.4,3.2,3,wc);B(4.5,5,5,.4,3.2,3,wc);B(0,5,4,.4,3.2,.9,wc);B(0,5,4,.4,5.9,.3,wc);
  /* upper floor (with stairwell hole) and roof slab */
  B(0,1.5,13.6,6.6,3,.2,wc);B(4.2,-3.3,5.2,3,3,.2,wc);B(0,0,14.4,10.4,6.2,.2,rf,0,0,1);
  /* stairs */
  for(var i=0;i<7;i++)B(-6.7+i+.5,-3.6,1,2,0,.4*(i+1),wd);
  B(.95,-3.6,1.3,2,0,3.2,wd);
  /* ground floor furniture */
  B(-6.1,1.5,.9,3,0,.5,sofa);B(-6.55,1.5,.3,3,0,1,sofa);B(-4.4,3.9,2.8,.9,0,.5,sofa);B(-4.4,4.45,2.8,.3,0,1,sofa);
  B(-3.8,1.2,1.4,.9,0,.5,wd);
  B(4.9,2.6,2.4,1.2,0,.85,wd,1,1);B(3.4,2.6,.5,.5,0,.5,wd);B(6.2,2.6,.5,.5,0,.5,wd);
  B(6.3,-2.2,.9,3,0,.95,cn);B(6.3,-4.3,.9,.9,0,2,fr,1,0);B(4.5,-4.4,1.6,.7,0,2.2,wd,1,0);
  /* upper floor furniture */
  B(-5.2,2,2.4,3.4,3.2,.6,bed,1,1);B(-5.2,3.85,2.4,.2,3.2,1.2,wd);
  B(5.8,3.9,1.4,.8,3.2,2.4,wd,1,0);B(4.5,-3.8,2,.9,3.2,.8,wd,1,1);B(1.5,3.9,1.2,.8,3.2,.6,wd);
  var rc=new THREE.Mesh(new THREE.ConeGeometry(10.6,3.4,4),rf);rc.rotation.y=Math.PI/4;rc.position.set(cx,8.1,cz);
  rc.scale.set(rk%2?.73:1,1,rk%2?1:.73);rc.castShadow=true;world.add(rc);
  var pl=new THREE.PointLight(0xffd9a0,.9,14,2);pl.position.set(cx,2.8,cz);world.add(pl);
  zones.push({x:cx,z:cz,hw:rk%2?5.5:7.5,hd:rk%2?7.5:5.5});
}
function shed(cx,cz,rk){
  var B=mkB(cx,cz,rk),wc=MT('wood',0x9a7650),wd=MT('wood',0x6a4a2e),rf=MT('tiles',0x4a5260);
  B(0,-2.5,6.4,.3,0,2.6,wc);B(-3,0,.3,5,0,2.6,wc);B(3,0,.3,5,0,2.6,wc);
  B(-2,2.5,2,.3,0,2.6,wc);B(2,2.5,2,.3,0,2.6,wc);B(0,2.5,2,.3,2,.6,wc);B(0,0,6.6,5.6,2.6,.2,rf,0,0,1);
  B(0,-2.1,3,.5,0,1.8,wd);B(-1.8,0,1.4,.8,0,.85,wd,1,1);B(2,-1.4,1,1,0,1,wd);
  var rc=new THREE.Mesh(new THREE.ConeGeometry(4.67,1.6,4),rf);rc.rotation.y=Math.PI/4;rc.position.set(cx,3.6,cz);
  rc.scale.set(rk%2?.85:1,1,rk%2?1:.85);rc.castShadow=true;world.add(rc);
  zones.push({x:cx,z:cz,hw:rk%2?3.3:3.8,hd:rk%2?3.8:3.3});
}
var PM=new THREE.MeshStandardMaterial({color:0x8a7a5c,roughness:1,polygonOffset:true,polygonOffsetFactor:-1});
function path(x1,z1,x2,z2){var dx=x2-x1,dz=z2-z1,d=Math.hypot(dx,dz),g=new THREE.PlaneGeometry(2.6,d);g.rotateX(-Math.PI/2);
  var m=new THREE.Mesh(g,PM);m.position.set((x1+x2)/2,.03,(z1+z2)/2);m.rotation.y=Math.atan2(dx,dz);m.receiveShadow=true;world.add(m)}
function decor(r){ /* grass, rocks, flowers (no collision) */
  var n=HQ?700:220,gm=new THREE.InstancedMesh(new THREE.ConeGeometry(.07,.5,4),new THREE.MeshStandardMaterial({color:0x5a9a40,roughness:1}),n),
  rk=new THREE.InstancedMesh(new THREE.DodecahedronGeometry(.5,0),M(0x6c7077,.95),40),
  fl=new THREE.InstancedMesh(new THREE.SphereGeometry(.1,6,4),new THREE.MeshStandardMaterial({color:0xffffff,roughness:.6}),120),
  d=new THREE.Object3D(),cols=[0xffd84a,0xff7ab8,0xffffff,0xb48cff],i,p;
  function spot(){for(var t=0;t<30;t++){var x=(r()-.5)*58,z=(r()-.5)*58,ok=Math.hypot(x,z)>3.5;
    for(var k=0;ok&&k<zones.length;k++)if(Math.abs(x-zones[k].x)<zones[k].hw+1&&Math.abs(z-zones[k].z)<zones[k].hd+1)ok=false;
    if(ok)return [x,z]}return [0,29]}
  for(i=0;i<n;i++){p=spot();d.position.set(p[0],.22,p[1]);d.rotation.set((r()-.5)*.3,r()*6,(r()-.5)*.3);d.scale.setScalar(.6+r()*1.1);d.updateMatrix();gm.setMatrixAt(i,d.matrix)}
  for(i=0;i<40;i++){p=spot();d.position.set(p[0],.15,p[1]);d.rotation.set(r()*3,r()*3,r()*3);d.scale.set(.5+r(),.4+r()*.6,.5+r());d.updateMatrix();rk.setMatrixAt(i,d.matrix)}
  for(i=0;i<120;i++){p=spot();d.position.set(p[0],.5,p[1]);d.rotation.set(0,0,0);d.scale.setScalar(.8+r()*.6);d.updateMatrix();fl.setMatrixAt(i,d.matrix);fl.setColorAt(i,new THREE.Color(cols[Math.floor(r()*4)]))}
  rk.castShadow=rk.receiveShadow=true;world.add(gm);world.add(rk);world.add(fl);
}
function build(seed){
  while(world.children.length)world.remove(world.children[0]);obs=[];spots=[];zones=[];
  var wm=M(0x3a4650,.9),r=rng(seed);
  [[0,-30,60,1],[0,30,60,1],[-30,0,1,60],[30,0,1,60]].forEach(function(w){P(new THREE.BoxGeometry(w[2],5,w[3]),wm,w[0],2.5,w[1])});
  [[-10,-9],[10,-9],[-10,9],[10,9]].forEach(function(l,i){
    P(new THREE.CylinderGeometry(.1,.14,4.5,8),M(0x222222,.5,.6),l[0],2.25,l[1]);
    P(new THREE.SphereGeometry(.28,12,8),new THREE.MeshBasicMaterial({color:0xffe9a8}),l[0],4.6,l[1]);
    if(i<2){var pl=new THREE.PointLight(0xffd58a,.9,16,2);pl.position.set(l[0],4.4,l[1]);world.add(pl)}
    ob(l[0],l[1],.3,.3,4.6,0);
  });
  house(-19,-19,0);house(19,-19,0);house(0,22,2);shed(-24,2,3);shed(24,-2,1);
  path(-19,-13,-3,-3);path(19,-13,3,-3);path(0,16,0,6);path(-21,2,-8,1);path(21,-2,8,-1);decor(r);
  var tries=0,placed=0;
  while(placed<44&&tries<600){tries++;
    var x=(r()-.5)*54,z=(r()-.5)*54,t=r(),ok=Math.hypot(x,z)>9;
    for(var k=0;ok&&k<zones.length;k++)if(Math.abs(x-zones[k].x)<zones[k].hw+2.5&&Math.abs(z-zones[k].z)<zones[k].hd+2.5)ok=false;
    for(var j=0;ok&&j<obs.length;j++)if(obs[j].t<20&&Math.abs(x-obs[j].x)<obs[j].hw+2.2&&Math.abs(z-obs[j].z)<obs[j].hd+2.2)ok=false;
    if(!ok)continue;placed++;
    if(t<.1)tank(x,z,r);else if(t<.24)barrel(x,z,r);else if(t<.36)container(x,z,r);else if(t<.48)crates(x,z,r);
    else if(t<.6)tree(x,z,r);else if(t<.72)bush(x,z,r);else if(t<.86)car(x,z,r);else ptable(x,z,r);
  }
}

/* ---------- physics: walking, stairs, standing on things, hiding ---------- */
function nearSpot(){for(var i=0;i<spots.length;i++){var o=spots[i];if(Math.abs(me.y-o.y0)<1.3&&Math.abs(me.x-o.x)<o.hw+1.4&&Math.abs(me.z-o.z)<o.hd+1.4)return o}return null}
function toggleHide(){
  var m=mine();if(!S||!m||m[2]!=='hider'||(S.ph!=='hide'&&S.ph!=='seek')||!LK())return;
  if(me.h){ws.send(JSON.stringify({t:'noise',x:me.x,z:me.z}));me.h=0;me.x=me.ox;me.z=me.oz;me.y=me.oy;VY=0;return}
  var o=nearSpot();if(!o)return;
  me.ox=me.x;me.oz=me.z;me.oy=me.y;me.h=o.ex?2:1;me.under=o.u;me.x=o.x;me.z=o.z;me.y=o.y0;VY=0;
}
function blocked(x,z,y){
  if(Math.abs(x)>29.3||Math.abs(z)>29.3)return true;
  for(var i=0;i<obs.length;i++){var o=obs[i];
    if(Math.abs(x-o.x)<o.hw+.3&&Math.abs(z-o.z)<o.hd+.3&&y+.45<o.t&&y+1.7>o.b)return true}
  return false;
}
function ground(x,z,y){
  var g=0;for(var i=0;i<obs.length;i++){var o=obs[i];
    if(o.t<=y+.46&&o.t>g&&Math.abs(x-o.x)<o.hw+.3&&Math.abs(z-o.z)<o.hd+.3)g=o.t}
  return g;
}
function mine(){if(!S)return null;for(var i=0;i<S.p.length;i++)if(S.p[i][0]===myId)return S.p[i];return null}
function spawn(){var a=myId*0.9;me.x=Math.cos(a)*5;me.z=Math.sin(a)*5;me.y=0;VY=0;me.ry=0;me.pt=0}

/* ---------- players ---------- */
function mk(p){
  var g=new THREE.Group(),c=new THREE.MeshStandardMaterial({color:0x5fa8d3,roughness:.5,metalness:.1}),d=M(0x1d2430,.6,.3);
  P(new THREE.CylinderGeometry(.42,.42,.8,18),c,0,.85,0,g);P(new THREE.SphereGeometry(.42,18,12),c,0,1.25,0,g);P(new THREE.SphereGeometry(.42,18,12),c,0,.45,0,g);
  P(new THREE.CylinderGeometry(.43,.43,.12,18),d,0,.7,0,g);P(new THREE.BoxGeometry(.55,.75,.28),c,0,.95,.47,g);
  var a1=P(new THREE.CylinderGeometry(.1,.1,.5,8),c,-.5,.85,-.05,g),a2=P(new THREE.CylinderGeometry(.1,.1,.5,8),c,.5,.85,-.05,g);a1.rotation.z=.25;a2.rotation.z=-.25;
  P(new THREE.BoxGeometry(.28,.2,.4),d,-.2,.1,-.05,g);P(new THREE.BoxGeometry(.28,.2,.4),d,.2,.1,-.05,g);
  var v=P(new THREE.SphereGeometry(.22,14,10),new THREE.MeshStandardMaterial({color:0xcfefff,emissive:0x5fb5e0,emissiveIntensity:.9,roughness:.1,metalness:.4}),0,1.32,-.3,g);v.scale.set(1.5,.85,.7);
  var cv=document.createElement('canvas');cv.width=256;cv.height=64;var x=cv.getContext('2d');
  x.font='bold 32px sans-serif';x.textAlign='center';x.fillStyle='#fff';x.fillText(p[1],128,42);
  var sp=new THREE.Sprite(new THREE.SpriteMaterial({map:new THREE.CanvasTexture(cv)}));sp.scale.set(2,.5,1);sp.position.y=2.1;g.add(sp);
  var gl=new THREE.Mesh(new THREE.SphereGeometry(.7,10,8),new THREE.MeshBasicMaterial({color:0xff3b2f,transparent:true,opacity:.45,depthTest:false}));
  gl.position.y=1;gl.renderOrder=10;gl.visible=false;g.add(gl);
  g.userData={mat:c,label:sp,glow:gl,tx:p[3],tz:p[4],ty:p[7]||0,ry:p[5],role:p[2],hid:p[6]};
  g.position.set(p[3],p[7]||0,p[4]);scene.add(g);return g;
}
function sync(){
  var m=mine(),seen={},amSeeker=m&&m[2]==='seeker';
  S.p.forEach(function(p){
    if(p[0]===myId)return;seen[p[0]]=1;
    var g=meshes[p[0]]||(meshes[p[0]]=mk(p)),u=g.userData,sk=p[2]==='seeker';
    u.tx=p[3];u.tz=p[4];u.ry=p[5];u.ty=p[7]||0;u.role=p[2];u.hid=p[6];
    u.mat.color.set(sk?0xd9482b:new THREE.Color().setHSL((p[0]*.37)%1,.85,.58).getHex());
    if(sk)u.mat.emissive.set(0x992200);else u.mat.emissive.copy(u.mat.color).multiplyScalar(.18);
    g.visible=p[2]!=='spec'&&p[6]!==1&&!(p[8]&&!amSeeker);
    u.label.visible=!(p[8]&&!amSeeker);
  });
  for(var id in meshes)if(!seen[id]){scene.remove(meshes[id]);delete meshes[id]}
}

/* ---------- lobby, rounds, networking ---------- */
function renderLobby(){
  $('rc').textContent=roomCode;
  $('msg').textContent=S.ph==='over'?S.msg:'';
  var l=$('plist');l.textContent='';
  S.p.forEach(function(p){var d=document.createElement('div');d.textContent=p[1]+(p[0]===S.host?' (host)':'')+(p[0]===myId?' (you)':'');l.appendChild(d)});
  var b=$('start');b.style.display=(S.host===myId&&S.ph==='lobby')?'':'none';
  var mn=S.test?1:2;b.disabled=S.p.length<mn;b.textContent=S.p.length<mn?'Need '+mn+' players ('+S.p.length+'/'+mn+')':'Start game';
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
  if(s.ph==='pick'&&lastPhase!=='pick'){spawn();me.h=0;roulette();mypow=[];pickOpen=false;$('pick').style.display='none';cd.q=0;cd.f=0;flyT=0;invT=0}
  lastPhase=s.ph;sync();
  var mm=mine();
  if(mm&&mm[2]==='seeker'){if(s.ph==='hide'&&mypow.length<2&&!pickOpen)openPick();if(s.ph==='seek'&&mypow.length<2)fillPow()}
  if(mm&&mm[2]!=='hider'&&me.h){me.h=0;me.x=me.ox;me.z=me.oz;me.y=me.oy}
  var lob=s.ph==='lobby'||s.ph==='over';
  $('ui').style.display=lob?'flex':'none';
  if(lob){$('pick').style.display='none';renderLobby();if(document.exitPointerLock)document.exitPointerLock()}
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
    else if(m.t==='noise')noiseAt(m.x,m.z);else if(m.t==='full'){alert('Room is full (14 max).')}};
  ws.onclose=function(){$('menu').style.display='flex';$('ui').style.display='none';S=null;for(var id in meshes){scene.remove(meshes[id])}meshes={}};
}
$('join').onclick=join;
$('start').onclick=function(){ws.send(JSON.stringify({t:'start'}))};

/* ---------- input: keyboard, mouse, touch ---------- */
addEventListener('keydown',function(e){keys[e.code]=1;if(e.code==='KeyE')toggleHide();if(e.code==='KeyQ')ability('q');if(e.code==='KeyF')ability('f')});
addEventListener('keyup',function(e){keys[e.code]=0});
ren.domElement.addEventListener('click',function(){if(S&&(S.ph==='pick'||S.ph==='hide'||S.ph==='seek'))TOUCH||ren.domElement.requestPointerLock()});
addEventListener('mousemove',function(e){if(document.pointerLockElement){me.ry-=e.movementX*.0025;me.pt=Math.max(-1.4,Math.min(1.4,me.pt-e.movementY*.0025))}});
function findTarget(){
  var fx=-Math.sin(me.ry),fz=-Math.cos(me.ry),best=null,bd=4.2;
  S.p.forEach(function(p){if(p[2]!=='hider')return;var g=meshes[p[0]];if(!g)return;
    var dx=g.position.x-me.x,dz=g.position.z-me.z,d=Math.hypot(dx,dz);
    if(Math.abs(g.position.y-me.y)<3.2&&d<bd&&(dx*fx+dz*fz)/(d||1)>.6){bd=d;best=p[0]}});
  return best;
}
function tagTry(){var m=mine();if(!LK()||!m||m[2]!=='seeker'||S.ph!=='seek')return;var b=findTarget();if(b)ws.send(JSON.stringify({t:'tag',id:b}))}
addEventListener('mousedown',tagTry);
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
$('bA').addEventListener('touchstart',function(e){e.preventDefault();tagTry();var b=$('bA');b.classList.remove('press');void b.offsetWidth;b.classList.add('press')},{passive:false});
$('bQ').addEventListener('touchstart',function(e){e.preventDefault();ability('q')},{passive:false});
$('bF').addEventListener('touchstart',function(e){e.preventDefault();ability('f')},{passive:false});
$('bJ').addEventListener('touchstart',function(e){e.preventDefault();jumpReq=1},{passive:false});

/* ---------- seeker powers (the seeker picks 2 of 5 during the hide countdown) ---------- */
var POW={scan:{n:'Scan',d:'See hiders through walls for 3.5s',cd:25},tele:{n:'Teleport',d:'Jump to a spot near a random hider',cd:30},
  inv:{n:'Invisible',d:'Hiders cannot see you for 6s',cd:30},fly:{n:'Fly',d:'Fly for 8s: look up and move forward to climb',cd:40},spd:{n:'Speed',d:'Super speed for 3s',cd:12}};
var POWL=['scan','tele','inv','fly','spd'];
function openPick(){pickOpen=true;var b=$('pbtns');b.textContent='';
  POWL.forEach(function(id){var e=document.createElement('button');e.className='pbtn';e.id='pw_'+id;e.textContent=POW[id].n+': '+POW[id].d;e.onclick=function(){togglePow(id)};b.appendChild(e)});
  $('psel').textContent='Pick 2 powers (Q and F)';$('pick').style.display='flex'}
function togglePow(id){var i=mypow.indexOf(id);if(i>=0)mypow.splice(i,1);else if(mypow.length<2)mypow.push(id);
  POWL.forEach(function(p){$('pw_'+p).style.outline=mypow.indexOf(p)>=0?'3px solid #46e07a':'none'});
  $('psel').textContent=mypow.length?'Chosen: '+mypow.map(function(p){return POW[p].n}).join(' + '):'Pick 2 powers (Q and F)';
  if(mypow.length===2){pickOpen=false;setTimeout(function(){$('pick').style.display='none'},500)}}
function fillPow(){['scan','spd','tele'].forEach(function(p){if(mypow.length<2&&mypow.indexOf(p)<0)mypow.push(p)});$('pick').style.display='none';pickOpen=false}
function pwTxt(k,r){if(r!=='seeker')return '';var id=mypow[k==='q'?0:1];if(!id)return '-';var rem=Math.ceil((cd[k]-performance.now())/1000);return POW[id].n+(rem>0?' '+rem+'s':'')}
function teleport(k){
  var hs=S.p.filter(function(p){return p[2]==='hider'});if(!hs.length){cd[k]=0;toast('No hiders to teleport to');return}
  var p=hs[Math.floor(Math.random()*hs.length)];
  for(var i=0;i<40;i++){var a=Math.random()*6.283,d=4+Math.random()*3,x=p[3]+Math.cos(a)*d,z=p[4]+Math.sin(a)*d,y=ground(x,z,(p[7]||0)+.05);
    if(!blocked(x,z,y)){me.x=x;me.z=z;me.y=y;VY=0;me.ry=Math.atan2(-(p[3]-x),-(p[4]-z));toast('Teleported near a hider!');return}}
  cd[k]=0;toast('Teleport failed, try again');
}
function ability(k){
  var m=mine();if(!S||!m||m[2]!=='seeker'||S.ph!=='seek'||!LK())return;
  var now=performance.now(),pid=mypow[k==='q'?0:1];if(!pid||now<cd[k])return;
  cd[k]=now+POW[pid].cd*1000;
  if(pid==='scan'){scanT=now+3500;var near=S.p.filter(function(p){return p[2]==='hider'&&p[6]===1&&Math.hypot(p[3]-me.x,p[4]-me.z)<10}).length;toast(near?'SCAN: someone is hiding nearby...':'SCAN pulse!')}
  else if(pid==='spd'){boostT=now+3000;toast('SPEED!')}
  else if(pid==='inv'){ws.send(JSON.stringify({t:'inv'}));invT=now+6000;toast('You are INVISIBLE to hiders!')}
  else if(pid==='fly'){flyT=now+8000;VY=0;toast('FLYING! Look up and move forward to climb.')}
  else if(pid==='tele')teleport(k);
}
function noiseAt(x,z){ /* a hider climbed out of hiding: ping their position for seekers */
  var m=mine();if(!m||m[2]!=='seeker')return;
  var o=new THREE.Mesh(new THREE.CylinderGeometry(.7,.7,7,12,1,true),new THREE.MeshBasicMaterial({color:0xffe066,transparent:true,opacity:.4,depthTest:false,side:THREE.DoubleSide}));
  o.position.set(x,3.5,z);o.renderOrder=10;scene.add(o);toast('A hider just moved out!');setTimeout(function(){scene.remove(o)},4000);
}

/* ---------- HUD ---------- */
function fmt(t){return Math.floor(t/60)+':'+('0'+(t%60)).slice(-2)}
function hud(){
  var m=mine();if(!S||!m)return;
  var t=Math.max(0,Math.ceil(S.left-(performance.now()-S.at)/1000)),r=m[2];
  var hl=S.p.filter(function(p){return p[2]==='hider'}).length,txt='';
  if(S.ph==='pick')txt='Rolling for the seeker...';
  else if(S.ph==='hide')txt=r==='seeker'?'You are the seeker. Eyes shut: '+t+'s':'HIDE! Seeker wakes in '+t+'s';
  else if(S.ph==='seek')txt=(r==='seeker'?'SEEK. Click to catch.':r==='hider'?'Survive.':'Spectating.')+'  '+fmt(t)+'  hiders left: '+hl;
  $('top').textContent=txt;
  var bl=$('blind');bl.style.display=(S.ph==='hide'&&r==='seeker')?'flex':'none';bl.textContent='Counting... '+t+'s';
  var ns=r==='hider'&&(S.ph==='hide'||S.ph==='seek')&&LK();
  $('act').textContent=ns?(me.h?(TOUCH?'Tap OUT to climb out':'Press E to climb out'):(nearSpot()?(TOUCH?'Tap HIDE to hide here':'Press E to hide here'):'')):'';
  var hs='';
  if(r==='seeker'&&S.ph==='seek'){var bd=999;S.p.forEach(function(p){if(p[2]==='hider'){var dd=Math.hypot(p[3]-me.x,p[4]-me.z)+Math.abs((p[7]||0)-me.y);if(dd<bd)bd=dd}});
    hs=bd<7?'   HEAT: HOT':bd<15?'   HEAT: WARM':bd<999?'   HEAT: COLD':''}
  $('pw').textContent=r==='seeker'&&(S.ph==='hide'||S.ph==='seek')?'Q '+pwTxt('q',r)+'   F '+pwTxt('f',r)+hs:(r==='hider'?'Space jump   E hide':'');
  if(performance.now()>toastT)$('toast').textContent='';
  var rdy=r==='seeker'&&S.ph==='seek'&&findTarget()!==null;
  $('cross').style.background=rdy?'#ff3b2f':'#ffd98a';$('cross').style.transform=rdy?'scale(2.2)':'none';$('bA').classList.toggle('ready',rdy);
  if(TOUCH){var pg=S.ph==='pick'||S.ph==='hide'||S.ph==='seek';$('tc').style.display=pg?'block':'none';
    $('bA').style.display=r==='seeker'?'block':'none';$('bE').style.display=r==='hider'?'block':'none';
    $('bQ').style.display=r==='seeker'?'block':'none';$('bF').style.display=r==='seeker'?'block':'none';
    $('bJ').style.display=(r==='seeker'||r==='hider')?'block':'none';
    $('bE').textContent=me.h?'OUT':'HIDE';$('bE').style.opacity=(me.h||nearSpot())?1:.45;
    $('bQ').textContent=pwTxt('q',r);$('bF').textContent=pwTxt('f',r)}
}

/* ---------- main loop ---------- */
var last=performance.now(),mv=0;
function loop(now){
  requestAnimationFrame(loop);var dt=Math.min(.05,(now-last)/1000);last=now;
  var m=mine();mv=0;
  var live=S&&m&&!me.h&&LK()&&((S.ph==='hide'&&m[2]!=='seeker')||S.ph==='seek');
  if(live){
    var fl=now<flyT,f=(keys.KeyW?1:0)-(keys.KeyS?1:0)+jf,s=(keys.KeyD?1:0)-(keys.KeyA?1:0)+js;
    if(f||s){
      mv=1;var sp=((keys.ShiftLeft||jm>.85)?8:5)*(now<boostT?1.9:1)*(fl?1.3:1)*dt,l=Math.max(1,Math.hypot(f,s));f/=l;s/=l;
      var dx=(-Math.sin(me.ry)*f+Math.cos(me.ry)*s)*sp,dz=(-Math.cos(me.ry)*f-Math.sin(me.ry)*s)*sp;
      if(!blocked(me.x+dx,me.z,me.y))me.x+=dx;if(!blocked(me.x,me.z+dz,me.y))me.z+=dz;
      if(fl)me.y=Math.max(0,Math.min(9,me.y+Math.sin(me.pt)*f*sp*1.4));
    }
    if(fl){if(keys.Space||jumpReq)me.y=Math.min(9,me.y+6*dt);if(keys.KeyC)me.y=Math.max(0,me.y-6*dt);VY=0}
    else{
      var g0=ground(me.x,me.z,me.y);
      if((keys.Space||jumpReq)&&me.y<=g0+.05&&VY<=0)VY=7;
      if(me.y<g0)me.y=g0;
      if(me.y>g0+.02||VY>0){VY-=20*dt;me.y+=VY*dt;if(me.y<=g0){me.y=g0;VY=0}}else{me.y=g0;VY=0}
    }
  }
  jumpReq=0;
  if(ws&&ws.readyState===1&&myId&&now-lastSend>66){lastSend=now;ws.send(JSON.stringify({t:'pos',x:me.x,y:me.y,z:me.z,ry:me.ry,h:me.h||0}))}
  cam.position.set(me.x,me.y+(me.h?(me.under?.45:1.1):1.6+(mv?Math.sin(now*.012)*.05:0)),me.z);cam.rotation.y=me.ry;cam.rotation.x=me.pt;
  var amS=m&&m[2]==='seeker',scanOn=now<scanT&&amS;
  for(var id in meshes){var g=meshes[id],u=g.userData;
    g.position.x+=(u.tx-g.position.x)*.3;g.position.z+=(u.tz-g.position.z)*.3;g.position.y+=((u.ty||0)-g.position.y)*.3;
    g.rotation.y=u.ry;g.scale.y+=((u.hid===2?.55:1)-g.scale.y)*.25;
    u.glow.visible=scanOn&&u.role==='hider'&&u.hid!==1;
    if(amS&&u.role==='hider')u.label.visible=Math.hypot(g.position.x-me.x,g.position.z-me.z)<14}
  ff.rotation.y+=dt*.03;ff.position.y=Math.sin(now*.0006)*.3;
  hud();
  if(comp){try{comp.render()}catch(e){comp=null;ren.render(scene,cam)}}else ren.render(scene,cam);
}
requestAnimationFrame(loop);
</script></body></html>`;

/* ================= Worker entry ================= */
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

/* ================= Durable Object: one game room ================= */
const PICK_MS = 4500, HIDE_MS = 30000, SEEK_MS = 180000, OVER_MS = 6000, MIN = 2, MAX = 14;

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
        me = { id, ws, name: String(m.name || 'Player').slice(0, 12), x: 0, y: 0, z: 0, ry: 0, h: 0, lastTag: 0,
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
          me.y = Number.isFinite(m.y) ? Math.max(-1, Math.min(12, m.y)) : 0;
          me.h = me.role === 'hider' ? (m.h === 2 ? 2 : m.h ? 1 : 0) : 0;
        }
      } else if (m.t === 'start') {
        if (me.id !== this.host || this.phase !== 'lobby' || this.players.size < (this.test ? 1 : MIN)) return;
        const list = [...this.players.values()];
        let pool = list.filter((p) => !this.been.has(p.id));
        if (!pool.length) { this.been.clear(); pool = list; }
        const seeker = pool[Math.floor(Math.random() * pool.length)];
        this.been.add(seeker.id);
        list.forEach((p) => { p.h = 0; p.inv = 0; p.role = p === seeker ? 'seeker' : 'hider'; });
        if (this.test && list.length === 1) list[0].role = 'hider';
        this.seed = 1 + Math.floor(Math.random() * 1e9);
        this.phase = 'pick'; this.end = Date.now() + PICK_MS; this.msg = '';
        this.broadcast();
      } else if (m.t === 'inv') {
        const now = Date.now();
        if (this.phase !== 'seek' || me.role !== 'seeker' || now - (me.lastInv || 0) < 28000) return;
        me.lastInv = now; me.inv = now + 6000;
      } else if (m.t === 'noise') {
        const now = Date.now();
        if (this.phase !== 'seek' || me.role !== 'hider' || now - (me.lastNoise || 0) < 2000) return;
        me.lastNoise = now;
        this.send({ t: 'noise', x: Math.max(-30, Math.min(30, +m.x || 0)), z: Math.max(-30, Math.min(30, +m.z || 0)) });
      } else if (m.t === 'tag') {
        const now = Date.now();
        const t = this.players.get(m.id);
        if (this.phase !== 'seek' || me.role !== 'seeker' || !t || t.role !== 'hider') return;
        if (now - me.lastTag < 400 || Math.hypot(t.x - me.x, t.z - me.z) > 4.8 || Math.abs(t.y - me.y) > 3.2) return;
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
        this.phase = 'lobby'; this.players.forEach((p) => { p.role = 'lobby'; p.h = 0; });
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
    const r = (n) => Math.round(n * 100) / 100, now = Date.now();
    this.send({
      t: 's', ph: this.phase, left: Math.max(0, Math.ceil((this.end - now) / 1000)),
      host: this.host, test: this.test ? 1 : 0, seed: this.seed, msg: this.msg,
      p: [...this.players.values()].map((p) => [p.id, p.name, p.role, r(p.x), r(p.z), r(p.ry), p.h || 0, r(p.y), p.inv > now ? 1 : 0])
    });
  }
}
