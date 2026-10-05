/* Naruto War v3 — engine: arena parallax, mode perang, combat kombo/dash/block */
(function(){
'use strict';
const W=960, H=540, WORLD_W=2400, LANE_TOP=190, LANE_BOT=500;
const MAX_PART=200, MAX_TXT=40;
const SPAWN_X=175; // jarak spawn hero dari tepi — jauh dari emblem base (QA #4)

/* ---------- ARENA ---------- */
const ARENAS={
  konoha:{name:'Gerbang Konoha',sub:'Desa Daun Tersembunyi',
    sky:['#5f9fdf','#a8cdf0','#d9e8f7'], sun:'#fff3b0', far:'#7d8fa8', ground:['#8fce6e','#5da24c'],
    ambient:'petal'},
  lembah:{name:'Lembah Akhir',sub:'Patung Madara & Hashirama',
    sky:['#ff9a5a','#ffc46b','#ffe3a8'], sun:'#fff0d0', far:'#a8768a', ground:['#c9a25e','#8f6f3c'],
    ambient:'leaf'},
  akatsuki:{name:'Malam Akatsuki',sub:'Bulan Merah',
    sky:['#1a1030','#3a1c50','#5e2a5e'], sun:'#ff3b3b', far:'#241a3a', ground:['#3f4a5e','#232a3a'],
    ambient:'ember'}
};

const G={
  canvas:null,ctx:null,layers:null,arena:'konoha',
  mode:'versus',difficulty:'normal',
  running:false,over:false,winner:false,
  time:0,last:0,acc:0,cam:0,shake:0,dpr:1,hitstop:0,koCd:0,
  fighters:[],player:null,minions:[],towers:[],bases:[],
  projs:[],parts:[],zones:[],texts:[],delayed:[],flashes:[],
  partPool:[],projPool:[],
  waveT:0,survT:0,survWave:0,input:{x:0,y:0},
  kills:[0,0],coins:0,banner:null,bannerT:0,
  onEnd:null,imgs:{},ambientT:0
};

/* ---------- scaling: canvas = viewport x dpr (max 2), dunia logis 960x540 ----------
 * fitView(cw,ch,dpr) murni (ada di NWSprite.fitScale bila sprite.js dimuat,
 * fallback lokal di sini agar game.js tetap jalan sendiri). */
function fitView(cw,ch,dpr){
  if(window.NWSprite&&NWSprite.fitScale)return NWSprite.fitScale(cw,ch,dpr);
  var lw=cw/dpr,lh=ch/dpr;
  var s=Math.min(lw/960,lh/540);
  return{s:s,ox:(lw-960*s)/2,oy:(lh-540*s)/2};
}
function resize(){
  var dpr=Math.min(window.devicePixelRatio||1,2);
  var cw=Math.max(2,Math.round(window.innerWidth*dpr));
  var ch=Math.max(2,Math.round(window.innerHeight*dpr));
  if(G.canvas.width!==cw||G.canvas.height!==ch){G.canvas.width=cw;G.canvas.height=ch;}
  G.dpr=dpr;
}
function rnd(a,b){return a+Math.random()*(b-a);}
function dist(a,b){const dx=a.x-b.x,dy=a.y-b.y;return Math.hypot(dx,dy);}
function clamp(v,a,b){return v<a?a:(v>b?b:v);}
function diffMul(){return G.difficulty==='hard'?1.3:1;}

/* ---------- pooling ---------- */
function pnew(){const p=G.partPool.pop();return p||{};}
function pfree(p){if(G.partPool.length<260)G.partPool.push(p);}
function jnew(){const p=G.projPool.pop();return p||{};}
function jfree(p){if(G.projPool.length<90)G.projPool.push(p);}

/* ---------- background berlapis (parallax) ---------- */
function mkCanvas(w,h){const c=document.createElement('canvas');c.width=w;c.height=h;return c;}
function buildLayers(){
  const A=ARENAS[G.arena];
  const sky=mkCanvas(W,H),far=mkCanvas(WORLD_W,H),mid=mkCanvas(WORLD_W,H),gnd=mkCanvas(WORLD_W,H);
  let g;
  // LANGIT (tetap)
  g=sky.getContext('2d');
  const sk=g.createLinearGradient(0,0,0,H);
  sk.addColorStop(0,A.sky[0]);sk.addColorStop(.6,A.sky[1]);sk.addColorStop(1,A.sky[2]);
  g.fillStyle=sk;g.fillRect(0,0,W,H);
  const night=G.arena==='akatsuki';
  g.fillStyle=A.sun;g.beginPath();g.arc(night?700:800,night?110:90,night?64:44,0,7);g.fill();
  if(night){g.fillStyle='rgba(255,59,59,.25)';g.beginPath();g.arc(700,110,95,0,7);g.fill();
    g.fillStyle='#fff';for(let i=0;i<60;i++)g.fillRect(rnd(0,W),rnd(0,250),2,2);}
  else{g.fillStyle='rgba(255,255,255,.85)';
    for(let i=0;i<8;i++){const x=rnd(0,W),y=rnd(30,150),s=rnd(24,52);
      g.beginPath();g.arc(x,y,s,0,7);g.arc(x+s*.8,y+6,s*.7,0,7);g.arc(x-s*.8,y+6,s*.7,0,7);g.fill();}}
  // JAUH (0.25x): gunung + landmark khas
  g=far.getContext('2d');
  g.fillStyle=A.far;
  for(let i=0;i<10;i++){const x=i*260+rnd(-40,40),w=rnd(180,300),h=rnd(120,220);
    g.beginPath();g.moveTo(x-w/2,300);g.lineTo(x,300-h);g.lineTo(x+w/2,300);g.closePath();g.fill();
    if(!night){g.fillStyle='rgba(255,255,255,.7)';
      g.beginPath();g.moveTo(x-22,300-h+44);g.lineTo(x,300-h);g.lineTo(x+22,300-h+44);g.closePath();g.fill();
      g.fillStyle=A.far;}}
  if(G.arena==='konoha'){
    // tebing Hokage
    g.fillStyle='#8a7a68';g.fillRect(1900,60,320,240);
    g.fillStyle='#6e6154';
    for(let i=0;i<4;i++){const fx=1940+i*72;g.beginPath();g.arc(fx,150,26,0,7);g.fill();
      g.fillStyle='#57503f';g.fillRect(fx-12,142,24,5);g.fillStyle='#6e6154';}
  }
  if(G.arena==='lembah'){
    // dua patung raksasa berhadapan
    statue(g,1050,300,'#6b5a7a',1);statue(g,1350,300,'#6b5a7a',-1);
    // air terjun di tengah
    g.fillStyle='rgba(180,220,255,.8)';g.fillRect(1188,180,24,140);
    g.fillStyle='rgba(255,255,255,.6)';for(let i=0;i<8;i++)g.fillRect(1188,rnd(180,300),24,3);
  }
  if(G.arena==='akatsuki'){
    // awan merah
    g.fillStyle='rgba(180,40,40,.5)';
    for(let i=0;i<8;i++){const x=rnd(0,WORLD_W),y=rnd(40,160),s=rnd(30,60);
      g.beginPath();g.arc(x,y,s,0,7);g.arc(x+s,y+8,s*.7,0,7);g.fill();}
  }
  // TENGAH (0.55x): pepohonan / elemen khas
  g=mid.getContext('2d');
  if(G.arena==='konoha'){
    for(let i=0;i<20;i++){const x=rnd(0,WORLD_W),y=rnd(300,340);
      g.fillStyle='#6b4a2c';g.fillRect(x-5,y-46,10,48);
      g.fillStyle='#f2a8c8';g.beginPath();g.arc(x,y-58,24,0,7);g.fill();
      g.fillStyle='#f7c3d8';g.beginPath();g.arc(x-9,y-64,13,0,7);g.fill();}
    // gerbang konoha dekat base pemain
    g.fillStyle='#a03a2a';g.fillRect(180,180,26,130);g.fillRect(330,180,26,130);
    g.fillStyle='#7e2c20';g.fillRect(160,150,216,34);
    g.fillStyle='#ffd23e';g.font='bold 20px sans-serif';g.textAlign='center';g.fillText('木ノ葉',268,176);
  }
  if(G.arena==='lembah'){
    for(let i=0;i<14;i++){const x=rnd(0,WORLD_W);if(Math.abs(x-1200)<260)continue;
      const y=rnd(300,340);
      g.fillStyle='#5e4630';g.fillRect(x-5,y-50,10,52);
      g.fillStyle='#c98f2e';g.beginPath();g.arc(x,y-62,24,0,7);g.fill();}
  }
  if(G.arena==='akatsuki'){
    for(let i=0;i<16;i++){const x=rnd(0,WORLD_W),y=rnd(300,340);
      g.strokeStyle='#14101e';g.lineWidth=7;
      g.beginPath();g.moveTo(x,y);g.lineTo(x+8,y-60);g.stroke();
      g.lineWidth=4;g.beginPath();g.moveTo(x+8,y-60);g.lineTo(x-16,y-88);g.moveTo(x+8,y-60);g.lineTo(x+30,y-86);g.stroke();}
  }
  // DEPAN (1x): tanah + jalur + desa + dekorasi LAB
  g=gnd.getContext('2d');
  const gr=g.createLinearGradient(0,300,0,H);
  gr.addColorStop(0,A.ground[0]);gr.addColorStop(1,A.ground[1]);
  g.fillStyle=gr;g.fillRect(0,300,WORLD_W,H-300);
  g.fillStyle=night?'rgba(90,60,90,.5)':'rgba(160,120,70,.55)';
  g.fillRect(0,LANE_TOP,WORLD_W,LANE_BOT-LANE_TOP);
  g.fillStyle='rgba(0,0,0,.12)';
  for(let i=0;i<40;i++)g.fillRect(rnd(0,WORLD_W),rnd(LANE_TOP+10,LANE_BOT-20),rnd(20,60),6);
  g.strokeStyle=night?'rgba(255,80,80,.5)':'rgba(255,255,255,.6)';
  g.setLineDash([14,12]);g.lineWidth=4;
  g.beginPath();g.moveTo(WORLD_W/2,LANE_TOP);g.lineTo(WORLD_W/2,LANE_BOT);g.stroke();g.setLineDash([]);
  // lampion (konoha) / obor (akatsuki)
  for(let x=300;x<WORLD_W;x+=420){
    g.fillStyle='#3a2c1c';g.fillRect(x-3,LANE_TOP-70,6,70);
    g.fillStyle=night?'#ff5a3c':'#ffd23e';
    g.beginPath();g.arc(x,LANE_TOP-78,12,0,7);g.fill();
    g.fillStyle=night?'#ffb03c':'#ff9a3e';
    g.beginPath();g.arc(x,LANE_TOP-78,6,0,7);g.fill();
  }
  G.layers={sky,far,mid,gnd};
  decorateGround();
}
function statue(g,x,ybase,color,dir){
  g.save();g.translate(x,ybase);g.scale(dir,1);g.fillStyle=color;
  g.fillRect(-34,-190,68,190);            // tubuh
  g.beginPath();g.arc(0,-210,30,0,7);g.fill(); // kepala
  g.fillRect(-52,-170,20,70);             // lengan menunjuk
  g.fillRect(30,-160,24,60);
  g.fillRect(-30,-60,26,60);g.fillRect(4,-60,26,60); // kaki
  g.restore();
}
function loadImg(src){const im=new Image();im.src=src;return im;}
function decorateGround(){
  const g=G.layers.gnd.getContext('2d');
  const put=(im,x,y,w,h,frame)=>{
    if(!im||!im.naturalWidth||im._drawn)return;im._drawn=true;
    if(frame){g.fillStyle='#5e4630';g.fillRect(x-8,y-8,w+16,h+16);
      g.fillStyle='#2c1f14';g.fillRect(x-4,y-4,w+8,h+8);}
    g.drawImage(im,x,y,w,h);};
  const I=G.imgs;
  put(I.pain,700,170,96,128,true);
  put(I.zetsu,1604,170,96,128,true);
  const banners=[[I.nahwuos,350],[I.aksara,2050],[I.spec,950],[I.mynahwu,1450]];
  for(const [im,x] of banners){
    if(!im||!im.naturalWidth||im._drawn)continue;im._drawn=true;
    g.fillStyle='#4a3520';g.fillRect(x-3,240,6,80);
    g.drawImage(im,x-45,190,90,52);
    g.strokeStyle='#22c55e';g.lineWidth=3;g.strokeRect(x-45,190,90,52);}
}

/* ---------- entitas ---------- */
function makeHero(ch,team,isPlayer){
  const baseX=team===0?SPAWN_X:WORLD_W-SPAWN_X;
  const h={kind:'hero',ch,team,isPlayer:!!isPlayer,charId:ch.id,
    x:baseX,y:(LANE_TOP+LANE_BOT)/2,dir:team===0?1:-1,
    hp:ch.hp,maxhp:ch.hp,chakra:50,maxchakra:100,
    cds:[0,0,0,0],atkCd:0,animT:rnd(0,6),pt:0,pose:'idle',
    stun:0,shield:0,buff:0,alive:true,respawnT:5,
    atkCombo:0,kbx:0,kby:0,dashT:0,dashCd:0,dashDx:0,dashDy:0,
    target:null,kills:0,comboN:0,comboT:0};
  if(G.difficulty==='hard'&&!isPlayer){h.hp=h.maxhp=Math.round(ch.hp*1.2);}
  return h;
}
function makeMinion(team,strong){
  const baseX=team===0?90:WORLD_W-90;
  return{kind:'minion',team,
    x:baseX+rnd(-20,20),y:rnd(LANE_TOP+40,LANE_BOT-40),dir:team===0?1:-1,
    ch:{body:team===0?'#3a6bd8':'#d83a3a',head:'#e8b98d',accent:'#222'},charId:'genin',
    hp:strong?70:34,maxhp:strong?70:34,atk:strong?10:5,
    speed:rnd(1.4,1.9),atkCd:0,animT:rnd(0,6),pose:'run',pt:0,
    alive:true,life:strong?10:9999,kbx:0,kby:0,
    color:team===0?'#3a6bd8':'#d83a3a'};
}
function makeDummy(){
  return{kind:'dummy',team:1,x:WORLD_W/2+260,y:(LANE_TOP+LANE_BOT)/2,dir:-1,
    hp:400,maxhp:400,alive:true,animT:0,pose:'idle',pt:0,kbx:0,kby:0,
    guard:100,guardMax:100,guardBreakT:0};
}
function makeTower(team,x,inner){
  return{kind:'tower',team,x,y:(LANE_TOP+LANE_BOT)/2,inner:!!inner,
    hp:170,maxhp:170,range:230,atkCd:0,alive:true,dir:team===0?1:-1};
}
function makeBase(team){
  const x=team===0?60:WORLD_W-60;
  return{kind:'base',team,x,y:(LANE_TOP+LANE_BOT)/2,hp:320,maxhp:320,alive:true,dir:team===0?1:-1};
}

/* ---------- partikel & teks ---------- */
function puff(x,y,color,n,spd,life,size){
  for(let i=0;i<(n||8);i++){
    const q=pnew();if(!q)continue;
    const a=rnd(0,Math.PI*2),s=rnd(spd||1,(spd||1)*2.2);
    q.x=x;q.y=y;q.vx=Math.cos(a)*s;q.vy=Math.sin(a)*s;
    q.life=rnd(life||.4,(life||.4)*1.6);q.maxlife=life||.5;q.color=color;
    q.size=rnd(size||2,(size||2)*2);q.grav=2.5;
    G.parts.push(q);
    if(G.parts.length>=MAX_PART)pfree(G.parts.shift());
  }
}
function ftext(x,y,str,color,size){
  if(G.texts.length>=MAX_TXT)G.texts.shift();
  G.texts.push({x,y,str,color:color||'#fff',size:size||15,life:1});
}
function after(t,fn){G.delayed.push({t:G.time+t,fn});}
function banner(txt,sub,big){G.banner={txt,sub,big:!!big};G.bannerT=2.6;}
/* easeOutBack murni — untuk pop animasi banner besar */
function easeOutBack(x){const c1=1.70158,c3=c1+1;return 1+c3*Math.pow(x-1,3)+c1*Math.pow(x-1,2);}

/* ---------- damage ---------- */
function damage(t,dmg,src){
  if(!t.alive||G.over)return;
  if(t.dashT>0&&t.kind==='hero')return;               // iframe saat dash
  if(t.shield>0)dmg*=0.35;
  if(t.guardBreakT>0)dmg*=1.5;                        // guard break: damage +50%
  t.hp-=dmg;
  const heroHit=t.kind==='hero';
  ftext(t.x+rnd(-8,8),t.y-(heroHit?56:t.kind==='minion'?32:84),Math.round(dmg),'#ffd23e',heroHit?17:15);
  puff(t.x,t.y-20,'#ffffff',4,2,.3,3);
  /* ---- JUICE: kombo penyerang + hitstop 60-90ms + hit-spark ---- */
  if(src&&src.kind==='hero'){
    src.comboN=(src.comboT>0?src.comboN:0)+1;src.comboT=1.4;
    if(t.kind==='hero'||t.kind==='minion'||t.kind==='dummy')
      G.hitstop=Math.min(0.09,Math.max(G.hitstop||0,0.07));
    /* hit-spark: frame fx.png bila tersedia, fallback partikel canvas */
    if(window.NWSprite&&NWSprite.fxReady&&NWSprite.fxReady('slash'))
      addFlash(t.x,t.y-30,'slash',64,0.22);
    else puff(t.x,t.y-30,'#ffffff',7,3,.25,3);
  }
  /* ---- guard meter boneka latihan (mode training) ---- */
  if(t.kind==='dummy'){
    t.guard=Math.max(0,t.guard-dmg*0.35);
    if(t.guard<=0&&t.guardBreakT<=0){
      t.guardBreakT=2;
      banner('GUARD BREAK!','Boneka lengah — damage +50%');
      NWAudio.hit();
    }
  }
  // knockback ringan
  if(src&&t.kbx!==undefined){
    const k=t.kind==='hero'?60:110,d=Math.max(1,dist(t,src));
    t.kbx+=(t.x-src.x)/d*k;t.kby+=(t.y-src.y)/d*k*0.4;
  }
  if(t.kind==='hero'&&t.alive){t.pose='hit';t.pt=0;}
  if(t.hp<=0){
    t.hp=0;t.alive=false;t.pose='dead';
    puff(t.x,t.y-20,'#ff5e5e',16,3,.7,5);
    NWAudio.noise(.25,.2);
    /* pengumuman K.O. layar besar (cooldown 3 dtk agar tak spam di war) */
    if(t.kind==='hero'&&G.koCd<=0){G.koCd=3;banner('K.O.!',t.ch.name,true);}
    if(src&&src.kind==='hero'&&src.team!==t.team){
      src.kills++;G.kills[src.team]++;
      const gain=t.kind==='hero'?25:t.kind==='tower'?40:t.kind==='base'?0:5;
      if(src.isPlayer&&gain){G.coins+=gain;ftext(t.x,t.y-100,'+'+gain+' koin','#ffd23e');}
    }
    if(t.kind==='tower'){NWAudio.tower();G.shake=10;banner('TOWER HANCUR!',t.team===1?'Bagus! Terus dorong!':'Tower kita hancur!');}
    if(t.kind==='base'){NWAudio.tower();G.shake=16;endGame(t.team===1);}
    if(t.kind==='dummy'){endGame(true);}
  }
}
function heal(t,amt){
  if(!t.alive)return;
  t.hp=Math.min(t.maxhp,t.hp+amt);
  ftext(t.x,t.y-56,'+'+Math.round(amt),'#5eff8a');
  puff(t.x,t.y-24,'#5eff8a',10,1.5,.6,3);
}

/* ---------- skill ---------- */
function foesOf(team){return team===0?1:0;}
function enemiesNear(x,y,r,team,incStruct){
  const out=[];
  for(const h of G.fighters)if(h.alive&&h.team!==team&&dist({x,y},h)<r)out.push(h);
  for(const m of G.minions)if(m.alive&&m.team!==team&&dist({x,y},m)<r)out.push(m);
  if(G.dummy&&G.dummy.alive&&team===0&&dist({x,y},G.dummy)<r)out.push(G.dummy);
  if(incStruct){
    for(const t of G.towers)if(t.alive&&t.team!==team&&dist({x,y},t)<r+30)out.push(t);
    for(const b of G.bases)if(b.alive&&b.team!==team&&dist({x,y},b)<r+40)out.push(b);
  }
  return out;
}
function fireProj(o){
  const n=jnew();
  n.x=o.x;n.y=o.y;n.ang=o.ang;n.speed=o.speed;n.dmg=o.dmg;n.color=o.color;
  n.radius=o.radius;n.team=o.team;n.boom=o.boom||0;n.src=o.src;n.stun=o.stun||0;
  n.fx=o.fx||null;
  n.life=3;n.hitR=14;
  n.vx=Math.cos(o.ang)*o.speed;n.vy=Math.sin(o.ang)*o.speed;
  G.projs.push(n);return n;
}
/* kilatan FX jutsu (ledakan dsb.) — digambar via sprite FX bila ada */
function addFlash(x,y,fx,size,dur){
  if(G.flashes.length>24)G.flashes.shift();
  G.flashes.push({x,y,fx:fx||'explosion',size:size||120,t:0,dur:dur||0.6});
}
function setPose(h,pose){h.pose=pose;h.pt=0;}
function castSkill(h,idx){
  if(!h.alive||h.stun>0||G.over)return false;
  const sk=idx<3?h.ch.skills[idx]:h.ch.ult;
  if(h.cds[idx]>0||h.chakra<sk.cost)return false;
  h.chakra-=sk.cost;h.cds[idx]=sk.cd;
  setPose(h,'cast');
  const dirX=h.dir,ang=dirX>0?0:Math.PI,team=h.team;
  NWAudio.skill();
  const dmgM=h.isPlayer?1:diffMul();
  const D=v=>v*dmgM;
  switch(sk.kind){
    case 'blast':case 'ultblast':
      fireProj({x:h.x+dirX*26,y:h.y-30,ang:ang+rnd(-.06,.06),speed:sk.speed,dmg:D(sk.dmg),
        color:sk.color,radius:sk.radius,team,boom:sk.boom||0,src:h,fx:sk.fx});
      puff(h.x+dirX*26,h.y-30,sk.color,10,3,.4,4);
      if(sk.kind==='ultblast'){NWAudio.ult();G.shake=8;banner(h.ch.name.toUpperCase()+'!','')}
      break;
    case 'wave':
      for(let k=-1;k<=1;k++)
        fireProj({x:h.x+dirX*24,y:h.y-30,ang:ang+k*.22,speed:sk.speed,dmg:D(sk.dmg),
          color:sk.color,radius:sk.radius,team,src:h,fx:sk.fx});
      break;
    case 'dash':
      h.dashT=0.22;h.dashDx=dirX*14;h.dashDy=0;h.dashDmg=D(sk.dmg);h.dashHit=[];
      puff(h.x,h.y-24,sk.color,14,3,.4,4);NWAudio.noise(.15,.1);
      break;
    case 'nova':case 'healnova':
      enemiesNear(h.x,h.y,sk.radius,team,true).forEach(e=>damage(e,D(sk.dmg),h));
      addFlash(h.x,h.y-30,sk.fx,sk.radius*2,0.6);
      puff(h.x,h.y-30,sk.color,26,4.5,.6,5);
      G.shake=Math.max(G.shake,6);NWAudio.hit();
      if(sk.kind==='healnova'){heal(h,sk.heal);addFlash(h.x,h.y-30,'heal',100,0.7);}
      if(idx===3){NWAudio.ult();G.shake=10;banner(h.ch.ult.name.toUpperCase()+'!','');}
      break;
    case 'multinova':
      NWAudio.ult();G.shake=10;banner(h.ch.ult.name.toUpperCase()+'!','');
      for(let k=0;k<sk.hits;k++)after(k*0.22,()=>{
        enemiesNear(h.x,h.y,sk.radius,team,true).forEach(e=>damage(e,D(sk.dmg),h));
        addFlash(h.x+rnd(-40,40),h.y-30+rnd(-20,20),sk.fx,sk.radius*1.6,0.5);
        puff(h.x+rnd(-40,40),h.y-30+rnd(-20,20),sk.color,20,4,.5,5);NWAudio.hit();});
      break;
    case 'dot':
      G.zones.push({x:h.x+dirX*120,y:h.y-20,r:sk.radius,dmg:D(sk.dmg),dur:sk.dur,team,color:sk.color,src:h,tick:0});
      puff(h.x+dirX*120,h.y-20,sk.color,12,2,.5,4);
      break;
    case 'stun':
      fireProj({x:h.x+dirX*26,y:h.y-30,ang,speed:sk.speed,dmg:D(sk.dmg),color:sk.color,
        radius:sk.radius,team,stun:sk.stun,src:h,fx:sk.fx});
      break;
    case 'shield':h.shield=sk.dur;puff(h.x,h.y-28,'#7ee0ff',14,2,.6,4);break;
    case 'heal':heal(h,sk.amount);addFlash(h.x,h.y-30,sk.fx||'heal',90,0.7);break;
    case 'buff':h.buff=sk.dur;puff(h.x,h.y-28,'#ffe14d',14,2.5,.5,4);break;
    case 'clone':
      for(let k=0;k<2;k++){const c=makeMinion(team,true);
        c.x=h.x+rnd(-40,40);c.y=clamp(h.y+rnd(-50,50),LANE_TOP+20,LANE_BOT-20);
        G.minions.push(c);puff(c.x,c.y-16,'#fff',10,2,.5,4);}
      break;
    case 'kamui':{
      let best=null,bd=1e9;
      for(const e of enemiesNear(h.x,h.y,900,team,true)){const d=dist(h,e);if(d<bd){bd=d;best=e;}}
      if(best){h.x=clamp(best.x-h.dir*70,40,WORLD_W-40);h.y=clamp(best.y,LANE_TOP+20,LANE_BOT-20);}
      addFlash(h.x,h.y-28,sk.fx,sk.radius*2,0.7);
      puff(h.x,h.y-28,sk.color,30,5,.6,5);NWAudio.ult();G.shake=10;
      banner(h.ch.ult.name.toUpperCase()+'!','');
      enemiesNear(h.x,h.y,sk.radius,team,true).forEach(e=>damage(e,D(sk.dmg),h));
      break;}
  }
  return true;
}
/* dash manual pemain: dipicu double-tap arah (joystick/keyboard).
 * dx,dy opsional = arah dash paksa (koordinat dunia). */
function doDash(h,odx,ody){
  if(!h.alive||h.stun>0||h.dashCd>0||G.over)return false;
  if(h.chakra<10)return false;
  h.chakra-=10;h.dashCd=1.1;h.dashT=0.2;
  let mv;
  if(odx!==undefined&&ody!==undefined)mv={x:odx,y:ody};
  else mv=(Math.abs(G.input.x)+Math.abs(G.input.y))>0.1&&h.isPlayer?G.input:{x:h.dir,y:0};
  const d=Math.max(.1,Math.hypot(mv.x,mv.y));
  h.dashDx=mv.x/d*13;h.dashDy=mv.y/d*13;h.dashDmg=0;h.dashHit=[];
  puff(h.x,h.y-24,'#ffffff',8,2.5,.3,3);
  NWAudio.noise(.12,.08);
  return true;
}
/* serangan dasar MANUAL pemain — kombo 3 hit bila ditekan berurutan */
function playerAttack(){
  const p=G.player;
  if(!p||!p.alive||p.stun>0||G.over||p.atkCd>0)return false;
  p.atkCd=p.buff>0?0.3:0.42;
  setPose(p,'attack');
  const mult=[1,1.15,1.45][p.atkCombo];
  p.atkCombo=(p.atkCombo+1)%3;
  // cari target di depan (arc 100px)
  let best=null,bd=1e9;const foe=foesOf(0);
  const consider=e=>{const dx=e.x-p.x;
    if(Math.sign(dx)!==p.dir&&Math.abs(dx)>46)return;
    const d=dist(p,e);if(d<110&&d<bd){bd=d;best=e;}};
  for(const e of G.fighters)if(e.alive&&e.team===foe)consider(e);
  for(const m of G.minions)if(m.alive&&m.team===foe)consider(m);
  if(G.dummy&&G.dummy.alive)consider(G.dummy);
  for(const t of G.towers)if(t.alive&&t.team===foe)consider(t);
  for(const b of G.bases)if(b.alive&&b.team===foe)consider(b);
  if(best){
    p.dir=best.x>=p.x?1:-1;
    damage(best,p.ch.atk*mult*(p.buff>0?1.4:1),p);
    puff(best.x,best.y-24,'#fff',6,2.5,.3,3);
    NWAudio.hit();
  }else{
    puff(p.x+p.dir*52,p.y-30,'rgba(255,255,255,.7)',4,1.5,.2,2); // tebasan angin
  }
  return true;
}
function basicAttack(h,target){
  if(h.atkCd>0)return;
  h.atkCd=h.buff>0?0.32:0.55;
  setPose(h,'attack');
  h.dir=target.x>=h.x?1:-1;
  const mult=[1,1.15,1.45][h.atkCombo];
  h.atkCombo=(h.atkCombo+1)%3;
  const dmgM=h.isPlayer?1:diffMul();
  damage(target,h.ch.atk*mult*(h.buff>0?1.4:1)*dmgM,h);
  puff(target.x,target.y-24,'#fff',5,2,.3,3);
  NWAudio.hit();
}

/* ---------- AI ---------- */
function aiControl(h,dt){
  if(!h.alive||h.stun>0)return;
  const foe=foesOf(h.team);
  let best=null,bd=1e9;
  const consider=(e,w)=>{const d=dist(h,e)*w;if(d<bd){bd=d;best=e;}};
  for(const e of G.fighters)if(e!==h&&e.alive&&e.team===foe)consider(e,1);
  for(const m of G.minions)if(m.alive&&m.team===foe)consider(m,G.mode==='survival'?0.7:1.3);
  if(G.dummy&&G.dummy.alive&&h.team===0)consider(G.dummy,1);
  for(const t of G.towers)if(t.alive&&t.team===foe)consider(t,1.6);
  for(const b of G.bases)if(b.alive&&b.team===foe)consider(b,2.2);
  h.target=best;
  const lowHp=h.hp<h.maxhp*0.28;
  let mx=0,my=0;
  const aggro=G.difficulty==='hard'?0.05:0.03;
  if(best){
    const d=dist(h,best);
    const want=lowHp?-1:(d>95?1:(d<55?-0.6:0));
    if(want!==0){mx=Math.sign(best.x-h.x)*want;my=Math.sign(best.y-h.y)*Math.abs(want)*0.5;}
    if(d<80&&Math.random()<0.02)my=rnd(-1,1);
    if(d<220&&!lowHp&&Math.random()<aggro){
      for(let i=0;i<4;i++)if(Math.random()<0.5){castSkill(h,i);break;}
    }
    if(d<82)basicAttack(h,best);
  }else mx=h.team===0?1:-1;
  if(lowHp){mx=h.team===0?-1:1;my=rnd(-.5,.5);}
  // zona chakra tengah menarik AI
  const cz={x:WORLD_W/2,y:(LANE_TOP+LANE_BOT)/2};
  if(!best&&h.chakra<40&&dist(h,cz)<400){mx=Math.sign(cz.x-h.x)*0.8;my=Math.sign(cz.y-h.y)*0.5;}
  moveHero(h,mx,my,dt);
}
function moveHero(h,mx,my,dt){
  const sp=h.ch.speed*(h.buff>0?1.5:1);
  // dash
  if(h.dashT>0){
    h.dashT-=dt;
    h.x=clamp(h.x+h.dashDx,40,WORLD_W-40);
    h.y=clamp(h.y+h.dashDy,LANE_TOP+14,LANE_BOT-10);
    if(h.dashDmg>0){ // dash serang: lukai yg tersentuh
      for(const e of enemiesNear(h.x,h.y,44,h.team,true)){
        if(!h.dashHit.includes(e)){h.dashHit.push(e);damage(e,h.dashDmg,h);}
      }
      puff(h.x,h.y-24,'#ffe14d',2,1,.25,3);
    }
    setPose(h,'run');
  }else{
    h.x=clamp(h.x+mx*sp+(h.kbx||0)*dt*8,40,WORLD_W-40);
    h.y=clamp(h.y+my*sp+(h.kby||0)*dt*8,LANE_TOP+14,LANE_BOT-10);
  }
  h.kbx=(h.kbx||0)*Math.pow(0.02,dt);h.kby=(h.kby||0)*Math.pow(0.02,dt);
  if(Math.abs(h.kbx)<2)h.kbx=0;if(Math.abs(h.kby)<2)h.kby=0;
  if(mx!==0)h.dir=mx>0?1:-1;
  const moving=Math.abs(mx)+Math.abs(my)>0.1;
  h.animT+=dt*(moving?1.6:0.5);
  if(h.pose==='idle'||h.pose==='run')h.pose=moving?'run':'idle';
  if(h.dashCd>0)h.dashCd-=dt;
}
function minionAI(m,dt){
  if(!m.alive)return;
  if(m.life<9000){m.life-=dt;if(m.life<=0){m.alive=false;puff(m.x,m.y-16,'#fff',8,2,.4,3);return;}}
  const foe=foesOf(m.team);
  let best=null,bd=1e9;
  const consider=e=>{const d=dist(m,e);if(d<bd){bd=d;best=e;}};
  for(const e of G.fighters)if(e.alive&&e.team===foe)consider(e);
  for(const n of G.minions)if(n.alive&&n.team===foe)consider(n);
  if(G.dummy&&G.dummy.alive&&m.team===0)consider(G.dummy);
  for(const t of G.towers)if(t.alive&&t.team===foe)consider(t);
  for(const b of G.bases)if(b.alive&&b.team===foe)consider(b);
  if(best){
    const d=dist(m,best);
    if(d<46){
      if(m.atkCd<=0){m.atkCd=0.8;damage(best,m.atk,m);puff(best.x,best.y-20,'#fff',3,1.5,.25,2);}
      m.dir=best.x>=m.x?1:-1;
    }else{
      const dx=(best.x-m.x)/d,dy=(best.y-m.y)/d;
      m.x+=dx*m.speed+(m.kbx||0)*dt*8;m.y=clamp(m.y+dy*m.speed,LANE_TOP+10,LANE_BOT-8);
      m.dir=dx>=0?1:-1;m.animT+=dt*1.4;m.pose='run';
    }
  }else{m.x+=m.dir*m.speed;m.animT+=dt*1.4;m.x=clamp(m.x,40,WORLD_W-40);}
  m.kbx=(m.kbx||0)*0.9;
  if(m.atkCd>0)m.atkCd-=dt;
}
function towerAI(t,dt){
  if(!t.alive)return;
  if(t.atkCd>0){t.atkCd-=dt;return;}
  const foe=foesOf(t.team);
  let best=null,bd=1e9;
  for(const m of G.minions)if(m.alive&&m.team===foe){const d=dist(t,m);if(d<t.range&&d<bd){bd=d;best=m;}}
  if(!best)for(const h of G.fighters)if(h.alive&&h.team===foe){const d=dist(t,h);if(d<t.range&&d<bd){bd=d;best=h;}}
  if(best){
    t.atkCd=1.25;
    const ang=Math.atan2((best.y-40)-t.y,best.x-t.x);
    fireProj({x:t.x,y:t.y-80,ang,speed:8,dmg:13,color:'#ff9a3e',radius:10,team:t.team,src:t});
    puff(t.x,t.y-80,'#ff9a3e',5,2,.3,3);
  }
}

/* ---------- update ---------- */
function inChakraZone(h){
  const dx=h.x-WORLD_W/2,dy=h.y-(LANE_TOP+LANE_BOT)/2;
  return dx*dx+dy*dy<95*95;
}
/* partikel, teks melayang, kilatan, shake — tetap jalan saat hitstop */
function updateFx(dt){
  for(let i=G.parts.length-1;i>=0;i--){const q=G.parts[i];
    q.x+=q.vx;q.y+=q.vy;q.vy+=(q.grav||2.5)*dt;q.life-=dt;
    if(q.life<=0){G.parts.splice(i,1);pfree(q);}}
  for(let i=G.texts.length-1;i>=0;i--){const t=G.texts[i];
    t.y-=30*dt;t.life-=dt*0.9;if(t.life<=0)G.texts.splice(i,1);}
  for(let i=G.flashes.length-1;i>=0;i--){const f=G.flashes[i];
    f.t+=dt;if(f.t>=f.dur)G.flashes.splice(i,1);}
  if(G.shake>0)G.shake=Math.max(0,G.shake-30*dt);
}
function update(dt){
  G.time+=dt;
  for(let i=G.delayed.length-1;i>=0;i--)
    if(G.time>=G.delayed[i].t){const d=G.delayed.splice(i,1)[0];d.fn();}
  if(G.bannerT>0)G.bannerT-=dt;
  if(G.koCd>0)G.koCd-=dt;
  /* HITSTOP: bekukan dunia 60-90ms saat pukulan connect (juice ala fighting) */
  if(G.hitstop>0){G.hitstop-=dt;updateFx(dt);return;}
  // ambient arena
  G.ambientT-=dt;
  if(G.ambientT<=0){G.ambientT=0.35;
    const A=ARENAS[G.arena];
    const q=pnew();if(q){
      q.x=rnd(G.cam-50,G.cam+W+50);q.y=rnd(60,320);
      q.vx=rnd(-14,-4);q.vy=rnd(4,14);q.life=rnd(2,4);q.maxlife=4;q.grav=0;
      q.color=A.ambient==='petal'?'#f7b8d0':A.ambient==='leaf'?'#e8a13c':'#ff6a4d';
      q.size=rnd(2,4);G.parts.push(q);}
  }
  // wave minion
  if(G.mode!=='training'){
    G.waveT-=dt;
    if(G.waveT<=0){G.waveT=G.mode==='survival'?9:7;
      const n=G.mode==='war'?4:3;
      for(let k=0;k<n;k++){G.minions.push(makeMinion(0));G.minions.push(makeMinion(1));}
    }
  }
  // survival spawner
  if(G.mode==='survival'&&!G.over){
    G.survT-=dt;
    if(G.survT<=0){
      G.survWave++;G.survT=22;
      const chars=window.NWChars;
      const e=makeHero(chars[Math.floor(Math.random()*6)],1,false);
      e.hp=e.maxhp=Math.round(e.maxhp*(1+G.survWave*0.12));
      e.x=WORLD_W-200;G.fighters.push(e);
      banner('GELOMBANG '+G.survWave,'Musuh semakin kuat!');
      NWAudio.noise(.3,.15);
      if(G.survWave>=8){banner('GELOMBANG TERAKHIR!','Bertahanlah!');}
      if(G.survWave>8){endGame(true);}
    }
  }
  // pemain: gerak manual + 100% MANUAL attack (tanpa auto-attack)
  const p=G.player;
  if(p&&p.alive&&p.stun<=0){
    moveHero(p,G.input.x,G.input.y,dt);
  }
  // (serangan pemain via NWGame.playerAttack() dari tombol/keyboard)
  // AI semua fighter non-pemain
  for(const h of G.fighters)if(h!==p)aiControl(h,dt);
  for(const m of G.minions)minionAI(m,dt);
  for(const t of G.towers)towerAI(t,dt);
  // timer fighter
  for(const h of G.fighters){
    if(!h.alive){
      h.respawnT-=dt;
      if(h.respawnT<=0&&!G.over&&G.mode!=='survival'){
        h.alive=true;h.hp=h.maxhp;h.chakra=50;h.cds=[0,0,0,0];
        h.shield=0;h.buff=0;h.stun=0;h.atkCombo=0;
        h.x=h.team===0?SPAWN_X:WORLD_W-SPAWN_X;h.y=(LANE_TOP+LANE_BOT)/2;h.respawnT=5;
        setPose(h,'idle');
        puff(h.x,h.y-30,'#fff',16,3,.6,4);
        if(h.isPlayer)ftext(h.x,h.y-90,'RESPAWN!','#5eff8a');
      }
      continue;
    }
    for(let i=0;i<4;i++)if(h.cds[i]>0)h.cds[i]-=dt;
    if(h.atkCd>0)h.atkCd-=dt;
    if(h.stun>0)h.stun-=dt;
    if(h.shield>0)h.shield-=dt;
    if(h.buff>0)h.buff-=dt;
    if(h.comboT>0){h.comboT-=dt;if(h.comboT<=0)h.comboN=0;}
    if(h.pt!==undefined)h.pt+=dt;
    // pose kembali normal
    const pd={attack:.32,cast:.45,hit:.2}[h.pose];
    if(pd&&h.pt>pd)setPose(h,'idle');
    // regen chakra (x3 di zona tengah)
    h.chakra=Math.min(h.maxchakra,h.chakra+(inChakraZone(h)?21:7)*dt);
  }
  if(G.dummy&&G.dummy.alive){
    const d=G.dummy;d.animT+=dt*0.5;
    /* guard meter: terkikis saat dipukul, regen perlahan, pulih 50% usai break */
    if(d.guardBreakT>0){d.guardBreakT-=dt;if(d.guardBreakT<=0)d.guard=d.guardMax*0.5;}
    else d.guard=Math.min(d.guardMax,d.guard+10*dt);
  }
  // proyektil
  for(let i=G.projs.length-1;i>=0;i--){
    const pr=G.projs[i];
    pr.x+=pr.vx;pr.y+=pr.vy;pr.life-=dt;
    let dead=pr.life<=0||pr.x<-50||pr.x>WORLD_W+50;
    if(!dead){
      const hit=enemiesNear(pr.x,pr.y,pr.radius+pr.hitR,pr.team,true);
      // tower dalam berkurang damage bila tower luar masih hidup
      if(hit.length){
        for(const e of hit){
          let dm=pr.dmg;
          if(e.kind==='tower'&&e.inner){
            const outer=G.towers.find(t=>t.team===e.team&&!t.inner&&t.alive);
            if(outer)dm*=0.1;
          }
          damage(e,dm,pr.src);if(pr.stun>0&&e.stun!==undefined)e.stun=pr.stun;
        }
        NWAudio.hit();
        if(pr.boom>0){
          enemiesNear(pr.x,pr.y,pr.boom,pr.team,true).forEach(e=>damage(e,pr.dmg*0.7,pr.src));
          G.shake=Math.max(G.shake,9);
        }
        puff(pr.x,pr.y,pr.color,14,3.5,.5,4);
        dead=true;
      }
    }
    if(dead){G.projs.splice(i,1);jfree(pr);}
  }
  // zona dot + zona chakra visual
  for(let i=G.zones.length-1;i>=0;i--){
    const z=G.zones[i];z.dur-=dt;z.tick-=dt;
    if(z.tick<=0){z.tick=0.5;
      enemiesNear(z.x,z.y,z.r,z.team,false).forEach(e=>damage(e,z.dmg*0.5,z.src));}
    if(z.dur<=0)G.zones.splice(i,1);
  }
  updateFx(dt);
  if(p&&p.alive)G.cam=clamp(p.x-W/2,0,WORLD_W-W);
}

/* ---------- gambar ---------- */
function drawHPBar(g,x,y,w,ratio){
  g.fillStyle='rgba(0,0,0,.55)';g.fillRect(x-w/2,y,w,10);
  g.fillStyle=ratio>0.5?'#37e05b':(ratio>0.25?'#ffd23e':'#ff5e5e');
  g.fillRect(x-w/2+1,y+1,(w-2)*clamp(ratio,0,1),8);
}
// fallback bila modul fighter belum ada
function drawNinja(g,e,scale){
  const s=scale||1;
  g.save();g.translate(e.x,e.y);g.scale(e.dir*s,s);
  /* bayangan elips lembut (tanpa shadowBlur) */
  g.fillStyle='rgba(0,0,0,0.26)';
  g.beginPath();g.ellipse(0,-2,17,5,0,0,Math.PI*2);g.fill();
  const col=e.kind==='hero'?e.ch.body:(e.color||'#888');
  g.fillStyle=col;g.fillRect(-9*s,-52*s,18*s,28*s);
  g.fillStyle=e.kind==='hero'?e.ch.head:'#e8b98d';
  g.beginPath();g.arc(2*s,-62*s,10*s,0,7);g.fill();
  g.restore();
}
function drawFighter(g,e){
  /* sprite sheet bila tersedia, fallback prosedural bila belum */
  if(e.kind==='hero'&&window.NWSprite&&NWSprite.has(e.charId)){
    try{if(NWSprite.draw(g,e)){afterSpriteBars(g,e);return;}}catch(err){}
  }
  if(window.NWFighter){try{NWFighter.draw(g,e);afterSpriteBars(g,e);return;}catch(err){}}
  drawNinja(g,e,e.kind==='hero'?1:0.72);
  afterSpriteBars(g,e);
}
function afterSpriteBars(g,e){
  if(e.kind==='hero'){
    drawHPBar(g,e.x,e.y-92,64,e.hp/e.maxhp);
    g.fillStyle='rgba(0,0,0,.55)';g.fillRect(e.x-32,e.y-80,64,5);
    g.fillStyle='#2ea8ff';g.fillRect(e.x-31,e.y-79,62*(e.chakra/e.maxchakra),3);
  }else drawHPBar(g,e.x,e.y-58,34,e.hp/e.maxhp);
}
function drawDummy(g,d){
  g.save();g.translate(d.x,d.y);
  /* bayangan elips lembut */
  g.fillStyle='rgba(0,0,0,0.26)';
  g.beginPath();g.ellipse(0,-2,26,7,0,0,Math.PI*2);g.fill();
  g.fillStyle='#7a5a38';g.fillRect(-10,-90,20,90);
  g.fillStyle='#8f6c46';g.beginPath();g.arc(0,-100,14,0,7);g.fill();
  g.strokeStyle='#5e4630';g.lineWidth=4;
  g.beginPath();g.moveTo(-26,-70);g.lineTo(26,-70);g.moveTo(-24,-50);g.lineTo(24,-50);g.stroke();
  g.restore();
  drawHPBar(g,d.x,d.y-132,90,d.hp/d.maxhp);
  g.fillStyle='#fff';g.font='bold 12px sans-serif';g.textAlign='center';
  g.fillText('BONEKA LATIHAN',d.x,d.y-140);
  /* guard meter: biru = bertahan, merah berkedip = break */
  g.fillStyle='rgba(0,0,0,.55)';g.fillRect(d.x-45,d.y-118,90,8);
  g.fillStyle=d.guardBreakT>0?(Math.floor(G.time*8)%2?'#ff5e5e':'#ffb03c'):'#2ea8ff';
  g.fillRect(d.x-44,d.y-117,88*clamp(d.guard/d.guardMax,0,1),6);
  g.fillStyle='#cfe8ff';g.font='bold 9px sans-serif';
  g.fillText(d.guardBreakT>0?'GUARD BREAK!':'GUARD',d.x,d.y-110);
}
/* penghitung kombo di dekat karakter (x2, x3...) — pop membesar saat fresh */
function drawCombo(g,h){
  const n=h.comboN;if(n<2)return;
  const pop=1+0.3*Math.min(1,h.comboT||0);
  g.save();
  g.translate(h.x,h.y-108);
  g.scale(pop,pop);
  g.font='bold 20px sans-serif';g.textAlign='center';
  g.fillStyle='#000';g.fillText('x'+n,2,2);
  g.fillStyle=h.team===0?'#ffd23e':'#ff8a8a';
  g.fillText('x'+n,0,0);
  g.restore();
}
function drawTower(g,t){
  g.save();g.translate(t.x,t.y);
  const w=64,h=130;
  const prot=t.inner&&G.towers.find(x=>x.team===t.team&&!x.inner&&x.alive);
  g.fillStyle=t.alive?(t.team===0?'#4a6fa5':'#a54a4a'):'#555';
  g.fillRect(-w/2,-h,w,h);
  g.fillStyle=t.alive?(t.team===0?'#33507e':'#7e3333'):'#444';
  for(let i=0;i<4;i++)g.fillRect(-w/2+i*(w/4),-h-16,w/4-4,16);
  g.fillStyle='#2c2c34';g.fillRect(-8,-h-34,16,20);
  g.fillStyle='#ffd23e';g.beginPath();g.arc(0,-h-24,5,0,7);g.fill();
  if(prot){g.strokeStyle='rgba(126,224,255,.7)';g.lineWidth=3;
    g.beginPath();g.arc(0,-h/2,70+Math.sin(G.time*4)*4,0,7);g.stroke();}
  g.restore();
  drawHPBar(g,t.x,t.y-h-46,90,t.hp/t.maxhp);
}
function drawBase(g,b){
  g.save();g.translate(b.x,b.y);
  const alive=b.alive;
  /* emblem kecil di ATAS garis tanah — tidak menutupi fighter (QA #4) */
  const R=40,cy=-86;
  g.fillStyle=alive?(b.team===0?'#2e5f8a':'#8a2e2e'):'#444';
  g.beginPath();g.arc(0,cy,R,0,7);g.fill();
  g.lineWidth=4;g.strokeStyle=alive?'rgba(255,255,255,.35)':'#333';
  g.beginPath();g.arc(0,cy,R,0,7);g.stroke();
  g.fillStyle=alive?'#d9d9e2':'#555';
  g.font='bold 34px sans-serif';g.textAlign='center';g.textBaseline='middle';
  g.fillText(b.team===0?'木':'砂',0,cy+2);g.textBaseline='alphabetic';
  /* alas kecil di tanah */
  g.fillStyle=alive?(b.team===0?'rgba(46,95,138,.5)':'rgba(138,46,46,.5)'):'rgba(80,80,80,.4)';
  g.beginPath();g.ellipse(0,-4,52,10,0,0,7);g.fill();
  g.restore();
  drawHPBar(g,b.x,b.y-150,120,b.hp/b.maxhp);
}
function render(){
  const g=G.ctx,L=G.layers;
  const cw=G.canvas.width,ch=G.canvas.height;
  /* letterbox: canvas = viewport x dpr, dunia logis 960x540 di tengah */
  const v=fitView(cw,ch,G.dpr);
  g.setTransform(1,0,0,1,0,0);
  g.fillStyle='#000';g.fillRect(0,0,cw,ch);
  g.setTransform(G.dpr*v.s,0,0,G.dpr*v.s,G.dpr*v.ox,G.dpr*v.oy);
  g.save();
  let sx=0,sy=0;
  if(G.shake>0){sx=rnd(-G.shake,G.shake)*0.4;sy=rnd(-G.shake,G.shake)*0.4;}
  const cam=Math.round(G.cam+sx);
  // langit tetap
  g.drawImage(L.sky,0,0);
  // parallax
  g.drawImage(L.far,-Math.round(G.cam*0.25),0);
  g.drawImage(L.mid,-Math.round(G.cam*0.55),0);
  g.save();g.translate(-cam,Math.round(-sy));
  g.drawImage(L.gnd,0,0);
  // zona chakra tengah
  const czx=WORLD_W/2,czy=(LANE_TOP+LANE_BOT)/2;
  g.strokeStyle='rgba(46,168,255,'+(0.5+0.25*Math.sin(G.time*5))+')';
  g.lineWidth=4;g.beginPath();g.arc(czx,czy,95,0,7);g.stroke();
  g.fillStyle='rgba(46,168,255,.08)';g.beginPath();g.arc(czx,czy,95,0,7);g.fill();
  g.fillStyle='rgba(255,255,255,.85)';g.font='bold 13px sans-serif';g.textAlign='center';
  g.fillText('ZONA CHAKRA',czx,czy-100);
  for(const z of G.zones){
    g.fillStyle=z.color;g.globalAlpha=0.35+0.1*Math.sin(G.time*8);
    g.beginPath();g.arc(z.x,z.y,z.r,0,7);g.fill();g.globalAlpha=1;
  }
  for(const b of G.bases)if(b.alive)drawBase(g,b);
  for(const t of G.towers)if(t.alive)drawTower(g,t);
  if(G.dummy&&G.dummy.alive)drawDummy(g,G.dummy);
  const ents=[];
  for(const h of G.fighters)if(h.alive)ents.push(h);
  for(const m of G.minions)if(m.alive)ents.push(m);
  ents.sort((a,b)=>a.y-b.y);
  for(const e of ents)drawFighter(g,e);
  for(const h of G.fighters)if(h.alive&&h.comboN>=2)drawCombo(g,h);
  /* kilatan FX jutsu (sprite bila ada, fallback lingkaran) */
  for(const f of G.flashes){
    if(window.NWSprite)try{NWSprite.drawFx(g,f.fx,f.x,f.y,f.size,f.t,'#ffd23e');}catch(err){}
  }
  for(const pr of G.projs){
    const t=G.time;
    if(pr.fx&&window.NWSprite&&NWSprite.fxReady(pr.fx)){
      try{NWSprite.drawFx(g,pr.fx,pr.x,pr.y,pr.radius*4,t,pr.color);continue;}catch(err){}
    }
    g.fillStyle=pr.color;g.beginPath();g.arc(pr.x,pr.y,pr.radius,0,7);g.fill();
    g.fillStyle='rgba(255,255,255,.7)';g.beginPath();g.arc(pr.x,pr.y,pr.radius*0.45,0,7);g.fill();
  }
  for(const q of G.parts){
    g.globalAlpha=clamp(q.life/q.maxlife,0,1);
    g.fillStyle=q.color;g.fillRect(q.x-q.size/2,q.y-q.size/2,q.size,q.size);
  }
  g.globalAlpha=1;
  g.textAlign='center';
  for(const t of G.texts){
    g.globalAlpha=clamp(t.life,0,1);
    g.font='bold '+(t.size||15)+'px sans-serif';
    g.fillStyle='#000';g.fillText(t.str,t.x+1,t.y+1);
    g.fillStyle=t.color;g.fillText(t.str,t.x,t.y);
  }
  g.globalAlpha=1;
  g.restore(); // kembali ke koordinat layar
  // watermark LAB
  const logo=G.imgs.logo;
  if(logo&&logo.naturalWidth){g.globalAlpha=0.35;g.drawImage(logo,W-66,H-66,56,56);g.globalAlpha=1;}
  // status struktur kedua tim
  structBars(g);
  // minimap
  minimap(g);
  // banner tengah (big = pengumuman layar besar: FIGHT! / K.O.! / pemenang)
  if(G.bannerT>0&&G.banner){
    g.save();
    g.globalAlpha=clamp(G.bannerT,0,1);
    g.textAlign='center';
    if(G.banner.big){
      /* pop-in easeOutBack lalu menetap */
      const ein=Math.min(1,(2.6-G.bannerT)*4);
      const pop=easeOutBack(ein);
      g.translate(W/2,178);g.scale(pop,pop);
      g.font='bold 64px sans-serif';
      g.fillStyle='#000';g.fillText(G.banner.txt,3,3);
      g.fillStyle='#ffd23e';g.fillText(G.banner.txt,0,0);
      if(G.banner.sub){g.font='bold 20px sans-serif';
        g.fillStyle='#000';g.fillText(G.banner.sub,1,35);
        g.fillStyle='#fff';g.fillText(G.banner.sub,0,34);}
    }else{
      g.font='bold 44px sans-serif';
      g.fillStyle='#000';g.fillText(G.banner.txt,W/2+2,182);
      g.fillStyle='#ffd23e';g.fillText(G.banner.txt,W/2,180);
      if(G.banner.sub){g.font='bold 18px sans-serif';g.fillStyle='#000';g.fillText(G.banner.sub,W/2+1,211);
        g.fillStyle='#fff';g.fillText(G.banner.sub,W/2,210);}
    }
    g.restore();
  }
  const vg=g.createLinearGradient(0,0,W,0);
  vg.addColorStop(0,'rgba(0,0,0,.25)');vg.addColorStop(.06,'rgba(0,0,0,0)');
  vg.addColorStop(.94,'rgba(0,0,0,0)');vg.addColorStop(1,'rgba(0,0,0,.25)');
  g.fillStyle=vg;g.fillRect(0,0,W,H);
  g.restore();
}
function structBars(g){
  // kiri: tim pemain, kanan: musuh — tower1, tower2, base
  const draw=(x,team,align)=>{
    const items=[];
    for(const t of G.towers)if(t.team===team)items.push(['T',t.hp/t.maxhp]);
    for(const b of G.bases)if(b.team===team)items.push(['B',b.hp/b.maxhp]);
    g.font='bold 11px sans-serif';g.textAlign=align;
    items.forEach((it,i)=>{
      const bx=align==='left'?x:x-i*64;
      const bx0=align==='left'?bx+i*64:bx;
      g.fillStyle='rgba(0,0,0,.5)';g.fillRect(align==='left'?x+i*64:x-(i+1)*64,80,58,12);
      g.fillStyle=it[1]>0.5?'#37e05b':(it[1]>0.25?'#ffd23e':'#ff5e5e');
      const fx=align==='left'?x+i*64+1:x-(i+1)*64+1;
      g.fillRect(fx,81,56*clamp(it[1],0,1),10);
      g.fillStyle='#fff';g.fillText(it[0],(align==='left'?x+i*64:x-(i+1)*64)+8,90);
    });
  };
  draw(10,0,'left');draw(W-10,1,'right');
}
function minimap(g){
  const mw=220,mh=26,mx=W/2-mw/2,my=40;
  g.fillStyle='rgba(0,0,0,.55)';g.fillRect(mx,my,mw,mh);
  g.strokeStyle='rgba(255,255,255,.5)';g.strokeRect(mx,my,mw,mh);
  const px=x=>mx+(x/WORLD_W)*mw;
  g.strokeStyle='rgba(255,255,255,.35)';g.beginPath();
  g.moveTo(mx,my+mh/2);g.lineTo(mx+mw,my+mh/2);g.stroke();
  for(const t of G.towers)if(t.alive){
    g.fillStyle=t.team===0?'#6aa8ff':'#ff6a6a';
    g.fillRect(px(t.x)-2,my+mh/2-2,4,4);
  }
  for(const h of G.fighters)if(h.alive){
    g.fillStyle=h.team===0?(h.isPlayer?'#ffd23e':'#6aa8ff'):'#ff6a6a';
    g.beginPath();g.arc(px(h.x),my+mh/2+(h.y-345)/160*mh/2,h.isPlayer?3.5:2.5,0,7);g.fill();
  }
  // viewport
  g.strokeStyle='#ffd23e';g.lineWidth=1;
  g.strokeRect(px(G.cam),my,(W/WORLD_W)*mw,mh);
}

/* ---------- loop ---------- */
function loop(ts){
  if(!G.running)return;
  requestAnimationFrame(loop);
  const dt=Math.min(0.05,(ts-G.last)/1000||0.016);
  G.last=ts;
  if(!G.over){
    G.acc+=dt;let n=0;
    while(G.acc>=1/60&&n<3){update(1/60);G.acc-=1/60;n++;}
    if(n===3)G.acc=0;
  }else{
    G.time+=dt;
    for(let i=G.delayed.length-1;i>=0;i--)
      if(G.time>=G.delayed[i].t){const d=G.delayed.splice(i,1)[0];d.fn();}
    for(let i=G.parts.length-1;i>=0;i--){const q=G.parts[i];
      q.x+=q.vx;q.y+=q.vy;q.vy+=(q.grav||2.5)*dt;q.life-=dt;
      if(q.life<=0){G.parts.splice(i,1);pfree(q);}}
    for(let i=G.flashes.length-1;i>=0;i--){const f=G.flashes[i];
      f.t+=dt;if(f.t>=f.dur)G.flashes.splice(i,1);}
    if(G.shake>0)G.shake=Math.max(0,G.shake-30*dt);
    if(G.bannerT>0)G.bannerT-=dt;
  }
  render();
  if(window.NWUI)window.NWUI.tickHUD();
}

/* ---------- mulai / selesai ---------- */
function start(cfg){
  G.arena=cfg.arena||'konoha';G.mode=cfg.mode||'versus';G.difficulty=cfg.difficulty||'normal';
  buildLayers();
  G.fighters=[];G.minions=[];G.projs=[];G.parts=[];G.zones=[];G.texts=[];G.delayed=[];
  G.flashes=[];
  G.dummy=null;
  G.towers=[makeTower(0,520,false),makeTower(0,1020,true),makeTower(1,1880,true),makeTower(1,1380,false)];
  // urut: luar dulu — tandai inner untuk proteksi
  G.bases=[makeBase(0),makeBase(1)];
  const P=makeHero(cfg.player,0,true);
  G.fighters.push(P);G.player=P;
  if(G.mode==='training'){
    G.dummy=makeDummy();G.towers=[];G.bases=[];
  }else if(G.mode==='war'){
    const chars=window.NWChars;
    const pool=chars.filter(c=>c.id!==cfg.player.id);
    const pick=()=>pool[Math.floor(Math.random()*pool.length)];
    for(let i=0;i<2;i++)G.fighters.push(makeHero(pick(),0,false));
    for(let i=0;i<3;i++)G.fighters.push(makeHero(pick(),1,false));
  }else{
    G.fighters.push(makeHero(cfg.enemy,1,false));
  }
  if(G.mode==='survival'){G.bases=[makeBase(0)];G.towers=[makeTower(0,520,false),makeTower(0,1020,true)];G.survWave=0;G.survT=3;}
  G.time=0;G.waveT=2;G.over=false;G.winner=false;G.acc=0;G.shake=0;
  G.hitstop=0;G.koCd=0;
  G.cam=0;G.kills=[0,0];G.coins=0;G.banner=null;G.bannerT=0;
  G.running=true;G.last=performance.now();
  // genta perang
  NWAudio.drum();
  after(0.8,()=>{banner(G.mode==='training'?'LATIHAN DIMULAI!':'FIGHT!',
    ARENAS[G.arena].name+' — '+ARENAS[G.arena].sub,true);NWAudio.drum();});
  requestAnimationFrame(loop);
}
function endGame(win){
  if(G.over)return;
  G.over=true;G.winner=win;
  /* banner nama pemenang layar besar */
  const foe=G.fighters.find(h=>h.team===1&&h.kind==='hero');
  banner(win?'MENANG!':'KALAH',(win&&G.player)?G.player.ch.name:(foe?foe.ch.name:'TIM MUSUH'),true);
  if(win){G.coins+=60;NWAudio.win();}else NWAudio.lose();
  after(1.4,()=>{if(G.onEnd)G.onEnd(win,{coins:G.coins,kills:G.kills[0],time:G.time});});
}

/* ---------- API ---------- */
window.NWGame={
  start,playerCast(i){return castSkill(G.player,i);},
  playerDash(dx,dy){return doDash(G.player,dx,dy);},
  playerAttack(){return playerAttack();},
  setInput(x,y){G.input.x=x;G.input.y=y;},
  resize(){resize();},
  _fitView:fitView,
  _tick(dt){update(dt);}, // hook uji headless (Node)
  onEnd(fn){G.onEnd=fn;},
  getState(){return G;},
  stop(){G.running=false;},
  init(cv){
    G.canvas=cv;G.ctx=cv.getContext('2d');
    resize();
    if(!G._rz){G._rz=true;
      window.addEventListener('resize',resize);
      window.addEventListener('orientationchange',()=>setTimeout(resize,300));
    }
    const I=G.imgs,V='?v=4';
    I.logo=loadImg('assets/icon-lab-v2.jpg'+V);
    I.pain=loadImg('assets/poster-pain.webp'+V);
    I.zetsu=loadImg('assets/poster-zetsu.webp'+V);
    I.nahwuos=loadImg('assets/logos/nahwuos.webp'+V);
    I.aksara=loadImg('assets/logos/aksara.webp'+V);
    I.spec=loadImg('assets/logos/spec.webp'+V);
    I.mynahwu=loadImg('assets/logos/my-nahwu.webp'+V);
    for(const k in I){I[k].onload=()=>{if(G.layers)decorateGround();};}
  },
  ARENAS
};
})();
