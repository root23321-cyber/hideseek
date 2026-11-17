// Hide & Seek 3D: one Cloudflare Worker, one Durable Object class "Room", binding name "ROOMS".
const HTML = `<!doctype html><html><head><meta charset="utf-8"><title>Hide and Seek</title>
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>
html,body{margin:0;height:100%;background:#0b1210;color:#efe6c4;font-family:Georgia,serif;overflow:hidden}
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
#blind{position:fixed;inset:0;background:#000;color:#ffd98a;font-size:30px;display:none;align-items:center;justify-content:center;z-index:4;pointer-events:none}
</style></head><body>
<div id="top"></div><div id="cross"></div><div id="toast"></div>
<div id="hint">WASD move, Shift sprint, mouse look, click to tag (seeker). Click the game to lock the mouse.</div>
<div id="blind"></div>
<div id="menu" class="ov"><h1>Hide and Seek</h1>
<div>5 to 14 players. One seeker. Everyone else runs.</div>
<input id="name" maxlength="12" placeholder="Your name">
<input id="room" maxlength="12" placeholder="Room code (blank = random)">
<button id="join">Join</button></div>
<div id="ui" class="ov" style="display:none"><h1>Lobby</h1>
<div>Room code: <b id="rc"></b></div><div id="msg" style="color:#ff8a65;font-size:22px"></div>
<div id="plist"></div><button id="start">Start</button></div>
<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>
<script>
var $=function(i){return document.getElementById(i)};
var ws,myId=0,S=null,seedBuilt=-1,obs=[],meshes={},toastT=0,roomCode='';
var me={x:0,z:0,ry:0,pt:0},keys={},lastPhase='',lastSend=0;
var scene=new THREE.Scene();scene.background=new THREE.Color(0x0b1210);scene.fog=new THREE.Fog(0x0b1210,5,34);
var cam=new THREE.PerspectiveCamera(75,innerWidth/innerHeight,0.1,100);cam.rotation.order='YXZ';scene.add(cam);
var ren=new THREE.WebGLRenderer({antialias:true});ren.setSize(innerWidth,innerHeight);document.body.appendChild(ren.domElement);
scene.add(new THREE.HemisphereLight(0x8899aa,0x221a10,0.55));
var lamp=new THREE.PointLight(0xffd98a,1.2,20);cam.add(lamp);
var floor=new THREE.Mesh(new THREE.PlaneGeometry(60,60),new THREE.MeshLambertMaterial({color:0x1b2a22}));floor.rotation.x=-Math.PI/2;scene.add(floor);
var world=new THREE.Group();scene.add(world);
addEventListener('resize',function(){cam.aspect=innerWidth/innerHeight;cam.updateProjectionMatrix();ren.setSize(innerWidth,innerHeight)});
function rng(a){return function(){a|=0;a=a+0x6D2B79F5|0;var t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
function box(x,z,w,d,h,col){var m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),new THREE.MeshLambertMaterial({color:col}));m.position.set(x,h/2,z);world.add(m)}
function build(seed){
  while(world.children.length)world.remove(world.children[0]);obs=[];
  box(0,-30,60,1,4,0x2a3b30);box(0,30,60,1,4,0x2a3b30);box(-30,0,1,60,4,0x2a3b30);box(30,0,1,60,4,0x2a3b30);
  var r=rng(seed);
  for(var i=0;i<46;i++){
    var w=2+r()*5,d=2+r()*5,h=1.5+r()*4,x=(r()-.5)*54,z=(r()-.5)*54;
    if(Math.hypot(x,z)-Math.max(w,d)/2<9)continue;
    box(x,z,w,d,h,new THREE.Color().setHSL(.25+r()*.15,.3,.2+r()*.15).getHex());
    obs.push({x:x,z:z,hw:w/2,hd:d/2});
  }
}
function hit(x,z){
  if(Math.abs(x)>29.3||Math.abs(z)>29.3)return true;
  for(var i=0;i<obs.length;i++){var o=obs[i];if(Math.abs(x-o.x)<o.hw+.45&&Math.abs(z-o.z)<o.hd+.45)return true}
  return false;
}
function mine(){if(!S)return null;for(var i=0;i<S.p.length;i++)if(S.p[i][0]===myId)return S.p[i];return null}
function spawn(){var a=myId*0.9;me.x=Math.cos(a)*5;me.z=Math.sin(a)*5;me.ry=0;me.pt=0}
function mk(p){
  var g=new THREE.Group(),c=new THREE.MeshLambertMaterial({color:0x5fa8d3});
  var b=new THREE.Mesh(new THREE.CylinderGeometry(.4,.4,1.2,12),c);b.position.y=.6;g.add(b);
  var h=new THREE.Mesh(new THREE.SphereGeometry(.25,12,8),c);h.position.y=1.45;g.add(h);
  var cv=document.createElement('canvas');cv.width=256;cv.height=64;var x=cv.getContext('2d');
  x.font='bold 32px sans-serif';x.textAlign='center';x.fillStyle='#fff';x.fillText(p[1],128,42);
  var sp=new THREE.Sprite(new THREE.SpriteMaterial({map:new THREE.CanvasTexture(cv)}));sp.scale.set(2,.5,1);sp.position.y=2.1;g.add(sp);
  g.userData={mat:c,label:sp,tx:p[3],tz:p[4],ry:p[5]};g.position.set(p[3],0,p[4]);scene.add(g);return g;
}
function sync(){
  var m=mine(),seen={},amSeeker=m&&m[2]==='seeker';
  S.p.forEach(function(p){
    if(p[0]===myId)return;seen[p[0]]=1;
    var g=meshes[p[0]]||(meshes[p[0]]=mk(p)),u=g.userData;
    u.tx=p[3];u.tz=p[4];u.ry=p[5];
    u.mat.color.set(p[2]==='seeker'?0xd9482b:new THREE.Color().setHSL((p[0]*.37)%1,.6,.55).getHex());
    g.visible=p[2]!=='spec';
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
  b.disabled=S.p.length<5;b.textContent=S.p.length<5?'Need 5 players ('+S.p.length+'/5)':'Start game';
}
function onState(s){
  s.at=performance.now();S=s;
  if(s.ph!=='lobby'&&s.seed!==seedBuilt){build(s.seed);seedBuilt=s.seed}
  if(s.ph==='hide'&&lastPhase!=='hide')spawn();
  lastPhase=s.ph;sync();
  var lob=s.ph==='lobby'||s.ph==='over';
  $('ui').style.display=lob?'flex':'none';
  if(lob){renderLobby();if(document.exitPointerLock)document.exitPointerLock()}
}
function toast(t){$('toast').textContent=t;toastT=performance.now()+3500}
function join(){
  var n=$('name').value.trim()||'Player',rc=$('room').value.trim().toUpperCase();
  if(!rc)rc=Math.random().toString(36).slice(2,6).toUpperCase();
  roomCode=rc;
  ws=new WebSocket((location.protocol==='https:'?'wss://':'ws://')+location.host+'/ws?room='+encodeURIComponent(rc));
  ws.onopen=function(){ws.send(JSON.stringify({t:'join',name:n}));$('menu').style.display='none';$('ui').style.display='flex'};
  ws.onmessage=function(e){var m=JSON.parse(e.data);
    if(m.t==='welcome')myId=m.id;else if(m.t==='s')onState(m);else if(m.t==='ev')toast(m.text);
    else if(m.t==='full'){alert('Room is full (14 max).')}};
  ws.onclose=function(){$('menu').style.display='flex';$('ui').style.display='none';S=null;for(var id in meshes){scene.remove(meshes[id])}meshes={}};
}
$('join').onclick=join;
$('start').onclick=function(){ws.send(JSON.stringify({t:'start'}))};
addEventListener('keydown',function(e){keys[e.code]=1});addEventListener('keyup',function(e){keys[e.code]=0});
ren.domElement.addEventListener('click',function(){if(S&&(S.ph==='hide'||S.ph==='seek'))ren.domElement.requestPointerLock()});
addEventListener('mousemove',function(e){if(document.pointerLockElement){me.ry-=e.movementX*.0025;me.pt=Math.max(-1.4,Math.min(1.4,me.pt-e.movementY*.0025))}});
addEventListener('mousedown',function(){
  var m=mine();if(!document.pointerLockElement||!m||m[2]!=='seeker'||S.ph!=='seek')return;
  var fx=-Math.sin(me.ry),fz=-Math.cos(me.ry),best=null,bd=3.6;
  S.p.forEach(function(p){if(p[2]!=='hider')return;var g=meshes[p[0]];if(!g)return;
    var dx=g.position.x-me.x,dz=g.position.z-me.z,d=Math.hypot(dx,dz);
    if(d<bd&&(dx*fx+dz*fz)/(d||1)>.7){bd=d;best=p[0]}});
  if(best)ws.send(JSON.stringify({t:'tag',id:best}));
});
function fmt(t){return Math.floor(t/60)+':'+('0'+(t%60)).slice(-2)}
function hud(){
  var m=mine();if(!S||!m)return;
  var t=Math.max(0,Math.ceil(S.left-(performance.now()-S.at)/1000)),r=m[2];
  var hl=S.p.filter(function(p){return p[2]==='hider'}).length,txt='';
  if(S.ph==='hide')txt=r==='seeker'?'You are the seeker. Eyes shut: '+t+'s':'HIDE! Seeker wakes in '+t+'s';
  else if(S.ph==='seek')txt=(r==='seeker'?'SEEK. Click to tag.':r==='hider'?'Survive.':'Spectating.')+'  '+fmt(t)+'  hiders left: '+hl;
  $('top').textContent=txt;
  var bl=$('blind');bl.style.display=(S.ph==='hide'&&r==='seeker')?'flex':'none';bl.textContent='Counting... '+t+'s';
  if(performance.now()>toastT)$('toast').textContent='';
}
var last=performance.now();
function loop(now){
  requestAnimationFrame(loop);var dt=Math.min(.05,(now-last)/1000);last=now;
  var m=mine();
  if(S&&m&&(S.ph==='hide'||S.ph==='seek')&&document.pointerLockElement&&!(S.ph==='hide'&&m[2]==='seeker')){
    var f=(keys.KeyW?1:0)-(keys.KeyS?1:0),s=(keys.KeyD?1:0)-(keys.KeyA?1:0);
    if(f||s){
      var sp=(keys.ShiftLeft?8:5)*dt,l=Math.hypot(f,s);f/=l;s/=l;
      var dx=(-Math.sin(me.ry)*f+Math.cos(me.ry)*s)*sp,dz=(-Math.cos(me.ry)*f-Math.sin(me.ry)*s)*sp;
      if(!hit(me.x+dx,me.z))me.x+=dx;if(!hit(me.x,me.z+dz))me.z+=dz;
    }
  }
  if(ws&&ws.readyState===1&&myId&&now-lastSend>66){lastSend=now;ws.send(JSON.stringify({t:'pos',x:me.x,z:me.z,ry:me.ry}))}
  cam.position.set(me.x,1.6,me.z);cam.rotation.y=me.ry;cam.rotation.x=me.pt;
  for(var id in meshes){var g=meshes[id],u=g.userData;g.position.x+=(u.tx-g.position.x)*.3;g.position.z+=(u.tz-g.position.z)*.3;g.rotation.y=u.ry}
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

const HIDE_MS = 30000, SEEK_MS = 180000, OVER_MS = 6000, MIN = 5, MAX = 14;

export class Room {
  constructor(state, env) {
    this.players = new Map(); this.phase = 'lobby'; this.end = 0; this.host = null;
    this.seed = 1; this.msg = ''; this.nextId = 1; this.timer = null;
  }
  async fetch(req) {
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
        if (this.phase === 'hide' && me.role === 'seeker') return;
        if (Number.isFinite(m.x) && Number.isFinite(m.z) && Number.isFinite(m.ry)) {
          me.x = Math.max(-30, Math.min(30, m.x)); me.z = Math.max(-30, Math.min(30, m.z)); me.ry = m.ry;
        }
      } else if (m.t === 'start') {
        if (me.id !== this.host || this.phase !== 'lobby' || this.players.size < MIN) return;
        const list = [...this.players.values()];
        const seeker = list[Math.floor(Math.random() * list.length)];
        list.forEach((p) => { p.role = p === seeker ? 'seeker' : 'hider'; });
        this.seed = 1 + Math.floor(Math.random() * 1e9);
        this.phase = 'hide'; this.end = Date.now() + HIDE_MS; this.msg = '';
        this.broadcast();
      } else if (m.t === 'tag') {
        const now = Date.now();
        const t = this.players.get(m.id);
        if (this.phase !== 'seek' || me.role !== 'seeker' || !t || t.role !== 'hider') return;
        if (now - me.lastTag < 400 || Math.hypot(t.x - me.x, t.z - me.z) > 4.8) return;
        me.lastTag = now; t.role = 'seeker';
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
      if (this.phase === 'hide' && now >= this.end) { this.phase = 'seek'; this.end = now + SEEK_MS; }
      else if (this.phase === 'seek' && now >= this.end) this.finish('Time is up. Hiders win!');
      else if (this.phase === 'over' && now >= this.end) {
        this.phase = 'lobby'; this.players.forEach((p) => { p.role = 'lobby'; });
      }
      this.broadcast();
    }, 100);
  }
  checkEnd() {
    if (this.phase !== 'hide' && this.phase !== 'seek') return;
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
      host: this.host, seed: this.seed, msg: this.msg,
      p: [...this.players.values()].map((p) => [p.id, p.name, p.role, r(p.x), r(p.z), r(p.ry)])
    });
  }
}
