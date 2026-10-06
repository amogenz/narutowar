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
  running:false,paused:false,over:false,winner:false,
  time:0,last:0,acc:0,cam:0,shake:0,dpr:1,hitstop:0,koCd:0,
  fighters:[],player:null,minions:[],towers:[],bases:[],
  projs:[],parts:[],zones:[],texts:[],delayed:[],flashes:[],
  partPool:[],projPool:[],txtPool:[],flashPool:[],
  waveT:0,survT:0,survWave:0,input:{x:0,y:0},
  kills:[0,0],coins:0,banner:null,bannerT:0,
  /* F. scoreboard per petarung per match (dibaca UI lead via NWGame.scoreboard()) */
  score:[],
  onEnd:null,imgs:{},ambientT:0,
  /* kualitas adaptif: 0=penuh, 1=hemat, 2=minimal (diatur perfSample di loop) */
  perf:{ema:16.7,level:0,bad:0,good:0},
  /* art dunia: preload sekali, prerender ke offscreen, fallback prosedural */
  world:{pre:null,ready:false,arena:{},decor:{},amb:{},struct:{},dummy:null,dummyHit:null,minion:{}},
  amb:[],clouds:[] // pool partikel ambient (maks 40, tanpa alokasi di loop) + awan langit
};

/* ---------- scaling: canvas = viewport x dpr (max 2) ----------
 * Orientasi BEBAS (aturan Bos 2026-10-05): tanpa paksa landscape.
 * Portrait: kamera 620px mengikuti pemain (aksi tetap terbaca),
 * pita langit/tanah mengisi sisa vertikal. Landscape: letterbox 960x540. */
function isPortrait(){return window.innerHeight>window.innerWidth;}
function pViewW(){return isPortrait()?620:960;}
/* objek view dipakai ulang tiap frame (tanpa alokasi di hot path) */
const _view={s:1,ox:0,oy:0,portrait:false,vw:960};
function fitView(cw,ch,dpr){
  var portrait=isPortrait(),r=_view;
  if(!portrait&&window.NWSprite&&window.NWSprite.fitScale){
    var f=window.NWSprite.fitScale(cw,ch,dpr);
    r.s=f.s;r.ox=f.ox;r.oy=f.oy;
  }else{
    var lw=cw/dpr,lh=ch/dpr;
    if(portrait){var s=lw/620;r.s=s;r.ox=0;r.oy=Math.max(0,(lh-540*s)/2);}
    else{var s2=Math.min(lw/960,lh/540);r.s=s2;r.ox=(lw-960*s2)/2;r.oy=(lh-540*s2)/2;}
  }
  r.portrait=portrait;r.vw=portrait?620:960;
  return r;
}
/* buffer entitas render dipakai ulang (tanpa new Array + tanpa closure sort per frame) */
const _ents=[];
function byY(a,b){return a.y-b.y;}
/* gradien vignette di-cache per lebar viewport (bukan dibuat per frame) */
let _vigGrad=null,_vigVw=0;
/* DPR adaptif (v17): HP (pointer kasar) dibatasi 1.5, desktop tetap 2.
 * Fill-rate adalah bottleneck utama HP mid-range: 1.5 vs 2 = ~44% piksel
 * lebih sedikit per frame. Laptop touchscreen (pointer fine) tetap desktop. */
function detectMobileGPU(){
  try{
    if(typeof window==='undefined')return false;
    if(window.matchMedia){
      if(window.matchMedia('(pointer: coarse)').matches)return true;
      return false;
    }
    return ('ontouchstart' in window)||(navigator.maxTouchPoints>0);
  }catch(e){return false;}
}
let DPR_CAP=detectMobileGPU()?1.5:2;
const IS_MOBILE_GPU=DPR_CAP<2;
function resize(){
  var dpr=Math.min(window.devicePixelRatio||1,DPR_CAP);
  var cw=Math.max(2,Math.round(window.innerWidth*dpr));
  var ch=Math.max(2,Math.round(window.innerHeight*dpr));
  if(G.canvas.width!==cw||G.canvas.height!==ch){G.canvas.width=cw;G.canvas.height=ch;}
  G.dpr=dpr;
}
function rnd(a,b){return a+Math.random()*(b-a);}
function dist(a,b){const dx=a.x-b.x,dy=a.y-b.y;return Math.sqrt(dx*dx+dy*dy);}
/* versi tanpa alokasi untuk cek radius (Math.hypot ~2x lebih lambat dari sqrt manual) */
function inR(x,y,e,r){const dx=e.x-x,dy=e.y-y;return dx*dx+dy*dy<r*r;}
function clamp(v,a,b){return v<a?a:(v>b?b:v);}
function diffMul(){return G.difficulty==='hard'?1.3:1;}

/* ---------- pooling ---------- */
function pnew(){const p=G.partPool.pop();return p||{};}
function pfree(p){if(G.partPool.length<260)G.partPool.push(p);}
function jnew(){const p=G.projPool.pop();return p||{};}
function jfree(p){if(G.projPool.length<90)G.projPool.push(p);}
/* v17: pool teks damage & kilatan FX (sebelumnya objek baru tiap hit -> GC) */
function tnew(){const p=G.txtPool.pop();return p||{};}
function tfree(p){if(G.txtPool.length<64)G.txtPool.push(p);}
function fnew(){const p=G.flashPool.pop();return p||{};}
function ffree(p){if(G.flashPool.length<32)G.flashPool.push(p);}

/* ---------- background berlapis (parallax) ---------- */
function mkCanvas(w,h){const c=document.createElement('canvas');c.width=w;c.height=h;return c;}
/* Fallback prosedural (dipakai bila art dunia gagal dimuat agar game tak rusak).
 * Seluruh isi digambar ke offscreen SEKALI — bukan per frame. */
function buildProcLayers(A,sky,far,mid){
  let g=sky.getContext('2d');
  // LANGIT (tetap)
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
} // buildProcLayers
/* Lapis arena: art dunia di-prerender ke offscreen SEKALI saat arena dimuat
 * (sky statis; far=_a+_b & mid=_a+_b digabung berdampingan). Per frame HANYA
 * drawImage dengan offset parallax: sky 0x, far 0.25x, mid 0.55x, ground 1x. */
function buildLayers(){
  const A=ARENAS[G.arena];
  const sky=mkCanvas(W,H),far=mkCanvas(WORLD_W,H),mid=mkCanvas(WORLD_W,H),gnd=mkCanvas(WORLD_W,H);
  const WA=arenaArtReady(G.arena)?G.world.arena[G.arena]:null;
  if(WA){
    drawCover(sky.getContext('2d'),WA.sky,W);
    if(!WA.farCv)WA.farCv=combine2(WA.far_a,WA.far_b);
    drawCover(far.getContext('2d'),WA.farCv,WORLD_W+360);  // 0.25x: geser maks 360px
    if(!WA.midCv)WA.midCv=combine2(WA.mid_a,WA.mid_b);
    drawCover(mid.getContext('2d'),WA.midCv,WORLD_W+792); // 0.55x: geser maks 792px
  }else buildProcLayers(A,sky,far,mid);
  // DEPAN (1x): tanah gambar (v15) / gradient fallback + jalur + dekorasi
  const night=G.arena==='akatsuki';
  let g=gnd.getContext('2d');
  const gg=WA&&WA.ground,ggw=gg?((gg.naturalWidth||gg.width)||0):0;
  if(ggw>0){
    /* C. ground PNG 960x150 tileable horizontal di y=300; area bawah diisi
     * tone YANG DISAMPEL dari tile (bukan flat color generik) */
    const gh=gg.naturalHeight||gg.height||150;
    for(let x=0;x<WORLD_W;x+=ggw)g.drawImage(gg,x,300);
    g.fillStyle=groundTone(gg)||A.ground[1];g.fillRect(0,300+gh,WORLD_W,H-300-gh);
  }else{
    const gr=g.createLinearGradient(0,300,0,H);
    gr.addColorStop(0,A.ground[0]);gr.addColorStop(1,A.ground[1]);
    g.fillStyle=gr;g.fillRect(0,300,WORLD_W,H-300);
  }
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
  G.layers={sky,far,mid,gnd,_proc:!WA};
  /* pita portrait: gradien langit & tanah (rentang tetap, dibuat sekali per arena) */
  const bx=mkCanvas(4,4).getContext('2d');
  const gt=bx.createLinearGradient(0,-800,0,0);
  gt.addColorStop(0,A.sky[0]);gt.addColorStop(1,A.sky[1]);
  G.bandTop=gt;
  const gb=bx.createLinearGradient(0,540,0,1400);
  gb.addColorStop(0,A.ground[1]);gb.addColorStop(1,'#141a28');
  G.bandBot=gb;
  /* awan bergerak (strip cloud.png 4 frame @160px) — 3 sprite melayang di langit */
  G.clouds=[];
  const cc=G.world.amb.cloud;
  if(cc&&cc.width)for(let i=0;i<3;i++)
    G.clouds.push({x:rnd(-100,W),y:rnd(30,150),spd:rnd(4,10),ft:rnd(0,4)});
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
/* ================= ART DUNIA (assets/world/) =================
 * 34 file: sky/far_a/far_b/mid_a/mid_b per arena (JPG), dekorasi +
 * strip ambient 4-frame + tower/base/dummy/minion (PNG, bg #FF00FF).
 * Strategi 60fps: muat via Image() SEKALI di init(), chroma-key SEKALI,
 * gabung _a+_b SEKALI, gambar ke offscreen SEKALI saat arena dimuat;
 * hot path per frame HANYA drawImage. Bila ada gambar gagal (onerror/
 * timeout) -> null -> renderer prosedural lama dipakai (game tak rusak). */
const WORLD_V=1; // ?v= art dunia — WAJIB naik bila isi file berubah
const WORLD_PARTS=['sky','far_a','far_b','mid_a','mid_b'];
const AMBIENT_STRIP={konoha:'petal',lembah:'sparkle',akatsuki:'firefly'};
function imgP(src){return new Promise((res,rej)=>{
  try{const im=new Image();im.onload=()=>res(im);im.onerror=()=>rej(new Error('img:'+src));im.src=src;}
  catch(e){rej(e);}});}
function imgTimeout(p,ms){return Promise.race([p,new Promise((_,rej)=>setTimeout(()=>rej(new Error('timeout')),ms))]);}
function chromaKeyCanvas(img){
  // magenta #FF00FF -> transparan (toleransi sama dgn js/sprite.js)
  const w=img.naturalWidth||img.width,h=img.naturalHeight||img.height;
  const c=mkCanvas(w,h),g=c.getContext('2d');
  if(!g)return null;
  g.drawImage(img,0,0);
  let id;try{id=g.getImageData(0,0,w,h);}catch(e){return c;}
  const d=id.data;
  for(let i=0;i<d.length;i+=4)if(d[i]>=200&&d[i+2]>=200&&d[i+1]<=110)d[i+3]=0;
  g.putImageData(id,0,0);return c;
}
function arenaArtReady(a){
  const r=G.world.arena[a];
  return !!(r&&r.sky&&r.far_a&&r.far_b&&r.mid_a&&r.mid_b);
}
function combine2(a,b){
  // dua Image berdampingan -> satu canvas (dipanggil SEKALI per arena)
  const aw=a.naturalWidth||a.width,ah=a.naturalHeight||a.height;
  const bw=b.naturalWidth||b.width,bh=b.naturalHeight||b.height;
  const c=mkCanvas(aw+bw,Math.max(ah,bh)),g=c.getContext('2d');
  g.drawImage(a,0,0);g.drawImage(b,aw,0);return c;
}
function drawCover(g,img,dw){
  // gambar selebar dw px, aspek dijaga, rata atas (kanvas memotong sisanya)
  const sw=img.naturalWidth||img.width,sh=img.naturalHeight||img.height;
  if(!sw||!sh)return;
  g.drawImage(img,0,0,sw,sh,0,0,dw,sh*dw/sw);
}
/* C. sampel tone dari 40px terbawah tile ground (SEKALI per file, di-cache) —
 * dipakai sebagai isi area bawah tile agar menyatu dgn tekstur.
 * Build-time saja (di buildLayers), bukan hot loop. */
const _toneCache={};
function groundTone(img){
  try{
    const key=img.src||('w'+(img.naturalWidth||img.width));
    if(_toneCache[key])return _toneCache[key];
    const sw=img.naturalWidth||img.width,sh=img.naturalHeight||img.height;
    if(!sw||!sh||sh<50)return null;
    const c=mkCanvas(1,1),g2=c.getContext('2d');
    if(!g2)return null;
    g2.drawImage(img,0,sh-40,sw,40,0,0,1,1);
    const d=g2.getImageData(0,0,1,1).data;
    const col='rgb('+(d[0]|0)+','+(d[1]|0)+','+(d[2]|0)+')';
    _toneCache[key]=col;
    return col;
  }catch(e){return null;}
}
function preloadWorld(){
  if(G.world.pre)return G.world.pre;
  const Wd=G.world;
  const one=(file,keyed)=>imgTimeout(imgP('assets/world/'+file+'?v='+WORLD_V),7000)
    .then(im=>keyed?chromaKeyCanvas(im):im).catch(()=>null);
  const jobs=[];
  for(const a of Object.keys(AMBIENT_STRIP)){
    Wd.arena[a]=Wd.arena[a]||{};
    for(const part of WORLD_PARTS)
      jobs.push(one(a+'_'+part+'.jpg',false).then(im=>{Wd.arena[a][part]=im;}).catch(()=>{}));
  }
  for(const n of ['lantern','banner_lab','sakura_tree',
               'konoha_torii','konoha_sakura_bush',
               'lembah_boulder','lembah_grass',
               'akatsuki_stalagmite','akatsuki_rockpile'])
    jobs.push(one(n+'.png',true).then(c=>{Wd.decor[n]=c;}).catch(()=>{}));
  for(const a of Object.keys(AMBIENT_STRIP)){
    /* v15: ground JPG baru (tileable, bertekstur) prioritas; fallback PNG lama */
    jobs.push(one(a+'_ground.jpg',false).then(im=>im||one(a+'_ground.png',false))
      .then(im=>{Wd.arena[a].ground=im;}).catch(()=>{}));
  }
  Wd.npc=Wd.npc||{};
  /* v15: NPC strip baru (assets/npc/, 4 frame idle anime) prioritas; fallback lama */
  const _npcJobs=[['npc_villager','../npc/villager.png','npc/npc_villager.png'],
                  ['npc_guard','../npc/guard.png','npc/npc_guard.png'],
                  ['npc_kid',null,'npc/npc_kid.png']];
  for(const _nj of _npcJobs){
    const _key=_nj[0],_neu=_nj[1],_lama=_nj[2];
    jobs.push((_neu?one(_neu,true).then(im=>im||one(_lama,true)):one(_lama,true))
      .then(c=>{Wd.npc[_key]=c;}).catch(()=>{}));
  }
  for(const n of ['petal','firefly','sparkle','cloud'])
    jobs.push(one(n+'.png',true).then(c=>{Wd.amb[n]=c;}).catch(()=>{}));
  for(const n of ['tower_ally','tower_ally_broken','tower_foe','tower_foe_broken',
                  'base_ally','base_ally_broken','base_foe','base_foe_broken'])
    jobs.push(one(n+'.png',true).then(c=>{Wd.struct[n]=c;}).catch(()=>{}));
  /* A. monumen batu ala referensi (bila tim ART menyediakannya); bila gagal ->
     fallback prosedural prerender (ensureMonument, tanpa alokasi per frame) */
  jobs.push(one('monument.png',true).then(c=>{Wd.struct.monument=c;}).catch(()=>{}));
  jobs.push(one('monument_broken.png',true).then(c=>{Wd.struct.monument_broken=c;}).catch(()=>{}));
  jobs.push(one('dummy.png',true).then(c=>{Wd.dummy=c;}).catch(()=>{}));
  jobs.push(one('dummy_hit.png',true).then(c=>{Wd.dummyHit=c;}).catch(()=>{}));
  /* v15: minion prajurit baru (soldier_*.png, 4 frame jalan) prioritas;
     fallback strip lama */
  jobs.push(one('soldier_ally.png',true).then(im=>im||one('minion_ally.png',true))
    .then(c=>{Wd.minion[0]=c;}).catch(()=>{}));
  jobs.push(one('soldier_foe.png',true).then(im=>im||one('minion_foe.png',true))
    .then(c=>{Wd.minion[1]=c;}).catch(()=>{}));
  G.world.pre=Promise.all(jobs).then(()=>{
    Wd.ready=true;
    // art tiba di tengah battle -> bangun ulang lapis arena yg prosedural
    try{if(G.layers&&G.layers._proc&&arenaArtReady(G.arena))buildLayers();}catch(e){}
  }).catch(()=>{Wd.ready=true;});
  return G.world.pre;
}
/* ---- partikel ambient: pool tetap 40, tanpa alokasi di loop, tanpa shadowBlur ---- */
function spawnAmbient(){
  const strip=AMBIENT_STRIP[G.arena]||'petal';
  const cv=G.world.amb[strip];
  if(!(cv&&cv.width)){
    /* fallback prosedural lama (kotak warna) */
    const A=ARENAS[G.arena],q=pnew();if(!q)return;
    q.x=rnd(G.cam-50,G.cam+W+50);q.y=rnd(60,320);
    q.vx=rnd(-14,-4);q.vy=rnd(4,14);q.life=rnd(2,4);q.maxlife=4;q.grav=0;
    q.color=A.ambient==='petal'?'#f7b8d0':A.ambient==='leaf'?'#e8a13c':'#ff6a4d';
    q.size=rnd(2,4);G.parts.push(q);return;
  }
  let a=null;
  for(let i=0;i<G.amb.length;i++)if(!G.amb[i].on){a=G.amb[i];break;}
  if(!a)return; // pool penuh
  a.on=true;a.strip=strip;
  a.x=rnd(G.cam-40,G.cam+W+40);a.y=rnd(50,330);
  a.ft=rnd(0,4);a.ph=rnd(0,6.28);
  if(strip==='petal'){a.vx=rnd(-16,-6);a.vy=rnd(10,22);a.size=rnd(15,24);a.life=a.max=rnd(3,5);}
  else if(strip==='firefly'){a.vx=rnd(-9,9);a.vy=rnd(-7,7);a.size=rnd(11,17);a.life=a.max=rnd(3,5);}
  else{a.vx=rnd(-11,-3);a.vy=rnd(3,9);a.size=rnd(11,19);a.life=a.max=rnd(2.5,4);}
}
function updateAmbient(dt){
  for(let i=0;i<G.amb.length;i++){const a=G.amb[i];if(!a.on)continue;
    a.life-=dt;if(a.life<=0){a.on=false;continue;}
    a.ft+=dt*6;a.x+=a.vx*dt;a.y+=a.vy*dt;
    if(a.strip==='petal')a.x+=Math.sin(G.time*2.5+a.ph)*14*dt;
    else if(a.strip==='firefly'){a.x+=Math.sin(G.time*1.8+a.ph)*10*dt;a.y+=Math.cos(G.time*2.2+a.ph)*8*dt;}
  }
}
function decorateGround(){
  const g=G.layers.gnd.getContext('2d');
  const I=G.imgs,D=G.world.decor;
  /* gnd digambar ulang tiap arena -> bendera _drawn harus di-reset
   * (perbaikan bug: dekorasi hilang saat ganti arena kedua dst.) */
  for(const k in I)if(I[k])I[k]._drawn=false;
  for(const k in D)if(D[k])D[k]._drawn=false;
  const put=(im,x,y,w,h,frame)=>{
    if(!im||!im.naturalWidth||im._drawn)return;im._drawn=true;
    if(frame){g.fillStyle='#5e4630';g.fillRect(x-8,y-8,w+16,h+16);
      g.fillStyle='#2c1f14';g.fillRect(x-4,y-4,w+8,h+8);}
    g.drawImage(im,x,y,w,h);};
  const putK=(cv,x,y,w,h,frame)=>{ // canvas hasil chroma-key (tanpa naturalWidth)
    if(!cv||!cv.width)return;
    if(frame){g.fillStyle='#5e4630';g.fillRect(x-8,y-8,w+16,h+16);
      g.fillStyle='#2c1f14';g.fillRect(x-4,y-4,w+8,h+8);}
    g.drawImage(cv,x,y,w,h);};
  /* RAPIDAN QA 2026-10-05: SEMUA dekorasi dipindah ke ATAS lane (y 80-184,
   * di atas LANE_TOP=190) atau dekat base — tak ada lagi di area aksi tengah
   * (x 800-1600, y 190-500). Bingkai kayu seragam ala baliho; border hijau
   * mentah + tiang di tengah lane DIHAPUS. Tak overlap spawn (175,345) & tower. */
  /* baliho Pain & Zetsu: dekat base masing-masing, di atas lane */
  put(I.pain,150,84,72,96,true);
  put(I.zetsu,2166,84,72,96,true);
  /* 4 spanduk logo: bingkai kayu (dulu border hijau mentah + tiang y 240-320
   * di tengah lane); kini plakat kayu digantung di atas lane, tanpa tiang */
  const banners=[[I.nahwuos,420],[I.spec,950],[I.mynahwu,1450],[I.aksara,1980]];
  for(const [im,x] of banners){
    if(!im||!im.naturalWidth||im._drawn)continue;im._drawn=true;
    put(im,x-36,100,72,42,true);
  }
  /* spanduk monogram A LAB: tengah atas (dulu di 1052,196 = area aksi) */
  putK(D.banner_lab,1148,100,104,70,true);
  for(const lx of [560,1840]){                  // lampion gantung di tiang kayu
    g.fillStyle='#3a2c1c';g.fillRect(lx-3,LANE_TOP-84,6,84);
    g.fillStyle='#241a10';g.fillRect(lx-16,LANE_TOP-90,32,6);
    putK(D.lantern,lx-17,LANE_TOP-84,34,56);
  }
  if(G.arena!=='akatsuki'){                     // pohon sakura (bukan di malam Akatsuki)
    putK(D.sakura_tree,236,LANE_TOP-104,100,98);
    /* kanan digeser 2164->2040 agar tak tumpuk baliho Zetsu */
    putK(D.sakura_tree,2040,LANE_TOP-104,100,98);
  }
  /* v15: dekorasi khas per arena — di atas lane (y bawah ~184), luar area aksi */
  if(G.arena==='konoha'){
    putK(D.konoha_torii,700,184-106,120,106);
    putK(D.konoha_sakura_bush,1700,184-92,110,92);
  }else if(G.arena==='lembah'){
    putK(D.lembah_boulder,500,184-83,110,83);
    putK(D.lembah_grass,1900,184-80,80,80);
  }else if(G.arena==='akatsuki'){
    putK(D.akatsuki_stalagmite,600,184-102,80,102);
    putK(D.akatsuki_rockpile,1800,184-80,90,80);
  }
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
    target:null,kills:0,deaths:0,comboN:0,comboT:0};
  if(G.difficulty==='hard'&&!isPlayer){h.hp=h.maxhp=Math.round(ch.hp*1.2);}
  return h;
}
function makeMinion(team,strong,sx,sy){
  /* B. minion ala referensi: spawn formasi kolom berbaris (sx,sy eksplisit);
   * bila tak diberi, acak seperti dulu (dipakai Kage Bunshin). */
  const baseX=team===0?90:WORLD_W-90;
  return{kind:'minion',team,
    x:sx!==undefined?sx:baseX+rnd(-20,20),
    y:sy!==undefined?clamp(sy,LANE_TOP+10,LANE_BOT-8):rnd(LANE_TOP+40,LANE_BOT-40),
    dir:team===0?1:-1,
    ch:{body:team===0?'#3a6bd8':'#d83a3a',head:'#e8b98d',accent:'#222'},charId:'genin',
    hp:strong?70:34,maxhp:strong?70:34,atk:strong?8:4,
    speed:rnd(1.4,1.9),atkCd:0,animT:rnd(0,6),pose:'run',pt:0,
    alive:true,life:strong?10:9999,kbx:0,kby:0,
    color:team===0?'#3a6bd8':'#d83a3a'};
}
function makeDummy(){
  /* PERBAIKAN QA: dulu di x=WORLD_W/2+260 (di luar viewport awal) sehingga
   * "tidak muncul" bagi pemain; kini dekat spawn agar langsung terlihat. */
  return{kind:'dummy',team:1,x:SPAWN_X+465,y:(LANE_TOP+LANE_BOT)/2,dir:-1,
    hp:400,maxhp:400,alive:true,animT:0,pose:'idle',pt:0,kbx:0,kby:0,
    guard:100,guardMax:100,guardBreakT:0,hitT:-9};
}
function makeTower(team,x,inner){
  /* G. BALANCE (pacing ala Naruto Senki): tower jauh lebih alot — solo hero
     butuh ~40 dtk untuk menjatuhkan tower luar; armor struktur 0.3x di
     damage() membuat dive 3 hero tak instan. Match target 3-6 menit. */
  return{kind:'tower',team,x,y:(LANE_TOP+LANE_BOT)/2,inner:!!inner,
    hp:380,maxhp:380,range:230,atkCd:0,alive:true,dir:team===0?1:-1};
}
function makeBase(team){
  const x=team===0?60:WORLD_W-60;
  return{kind:'base',team,x,y:(LANE_TOP+LANE_BOT)/2,hp:650,maxhp:650,alive:true,dir:team===0?1:-1};
}

/* ---------- partikel & teks ---------- */
/* degradasi adaptif (diatur G.perf.level oleh perfSample):
 * level 0=penuh, 1=hemat (partikel x0.5), 2=minimal (partikel x0.25, tanpa awan/vignette) */
const QPART=[1,0.5,0.25],QMAXP=[MAX_PART,140,90],QAMB=[0.3,0.7,1.4];
function puff(x,y,color,n,spd,life,size){
  n=Math.max(1,Math.round((n||8)*QPART[G.perf.level]));
  const cap=QMAXP[G.perf.level];
  for(let i=0;i<n;i++){
    const q=pnew();if(!q)continue;
    const a=rnd(0,Math.PI*2),s=rnd(spd||1,(spd||1)*2.2);
    q.x=x;q.y=y;q.vx=Math.cos(a)*s;q.vy=Math.sin(a)*s;
    q.life=rnd(life||.4,(life||.4)*1.6);q.maxlife=life||.5;q.color=color;
    q.size=rnd(size||2,(size||2)*2);q.grav=2.5;
    G.parts.push(q);
    if(G.parts.length>=cap)pfree(G.parts.shift());
  }
}
function ftext(x,y,str,color,size){
  if(G.texts.length>=MAX_TXT)tfree(G.texts.shift());
  const t=tnew();
  t.x=x;t.y=y;t.str=str;t.color=color||'#fff';t.size=size||15;t.life=1;
  G.texts.push(t);
}
function after(t,fn){G.delayed.push({t:G.time+t,fn});}
/* Banner pengumuman: timing WALL-CLOCK (performance.now), bukan fixed-step.
 * Dijamin: opacity PENUH 1.5 dtk + fade 1.1 dtk (total 2.6 dtk) walau HP lag
 * (catch-up fixed-step 3x/frame dulu bisa memangkas durasi hingga 1/3). */
function banner(txt,sub,big,dur){
  G.banner={txt,sub,big:!!big,born:performance.now(),dur:dur||2.6};
  G.bannerT=G.banner.dur; /* kompatibilitas baca luar */
}
/* easeOutBack murni — untuk pop animasi banner besar */
function easeOutBack(x){const c1=1.70158,c3=c1+1;return 1+c3*Math.pow(x-1,3)+c1*Math.pow(x-1,2);}

/* F. entri scoreboard per petarung (dibuat malas: mencakup spawn susulan
 * mode survival). kills/deaths dibaca LANGSUNG dari objek fighter (live). */
function scoreFor(h){
  if(!G.score)G.score=[];
  for(let i=0;i<G.score.length;i++)if(G.score[i].f===h)return G.score[i];
  const e={f:h,charId:h.ch?h.ch.id:'?',name:h.ch?h.ch.name:'?',team:h.team,isPlayer:!!h.isPlayer};
  G.score.push(e);
  return e;
}
/* ---------- damage ---------- */
function damage(t,dmg,src){
  if(!t.alive||G.over)return;
  if(t.dashT>0&&t.kind==='hero')return;               // iframe saat dash
  if(t.shield>0)dmg*=0.35;
  /* G. ARMOR STRUKTUR: damage hero ke tower/base x0.3 (minion tetap penuh) —
     tower tak rontok dalam belasan detik saat di-dive. */
  if((t.kind==='tower'||t.kind==='base')&&src&&src.kind==='hero')dmg*=0.3;
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
    t.hitT=G.time; // picu sprite dummy_hit sesaat
    t.guard=Math.max(0,t.guard-dmg*0.35);
    if(t.guard<=0&&t.guardBreakT<=0){
      t.guardBreakT=2;
      banner('GUARD BREAK!','Boneka lengah — damage +50%',true);
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
    /* F. catat death per petarung (pasangan dari kills) */
    if(t.kind==='hero'){t.deaths=(t.deaths||0)+1;scoreFor(t);}
    /* pengumuman K.O. layar besar (cooldown 3 dtk agar tak spam di war) */
    if(t.kind==='hero'&&G.koCd<=0){G.koCd=3;banner('K.O.!',t.ch.name,true);}
    if(src&&src.kind==='hero'&&src.team!==t.team){
      src.kills++;G.kills[src.team]++;
      scoreFor(src); // F. pastikan petarung tercatat di scoreboard
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
/* pool array hasil enemiesNear (2 slot + depth guard): semua pemanggil memakai
 * hasil secara sinkron & tak bersarang ( diverifikasi: damage()/puff()/banner()
 * tak memanggil enemiesNear), jadi tanpa alokasi array per panggilan. */
const _nearPool=[[],[]];
let _nearDepth=0;
function enemiesNear(x,y,r,team,incStruct){
  const out=_nearDepth<_nearPool.length?_nearPool[_nearDepth++]:[];
  out.length=0;
  for(const h of G.fighters)if(h.alive&&h.team!==team&&inR(x,y,h,r))out.push(h);
  for(const m of G.minions)if(m.alive&&m.team!==team&&inR(x,y,m,r))out.push(m);
  if(G.dummy&&G.dummy.alive&&team===0&&inR(x,y,G.dummy,r))out.push(G.dummy);
  if(incStruct){
    for(const t of G.towers)if(t.alive&&t.team!==team&&inR(x,y,t,r+30))out.push(t);
    for(const b of G.bases)if(b.alive&&b.team!==team&&inR(x,y,b,r+40))out.push(b);
  }
  _nearDepth--;
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
  if(G.flashes.length>24)ffree(G.flashes.shift());
  const f=fnew();
  f.x=x;f.y=y;f.fx=fx||'explosion';f.size=size||120;f.t=0;f.dur=dur||0.6;
  G.flashes.push(f);
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
  /* cari target terdekat (loop inline, tanpa closure — hot path AI) */
  for(const e of G.fighters)if(e!==h&&e.alive&&e.team===foe){const d=dist(h,e);if(d<bd){bd=d;best=e;}}
  const mw=G.mode==='survival'?0.7:1.3;
  for(const m of G.minions)if(m.alive&&m.team===foe){const d=dist(h,m)*mw;if(d<bd){bd=d;best=m;}}
  if(G.dummy&&G.dummy.alive&&h.team===0){const d=dist(h,G.dummy);if(d<bd){bd=d;best=G.dummy;}}
  for(const t of G.towers)if(t.alive&&t.team===foe){const d=dist(h,t)*1.6;if(d<bd){bd=d;best=t;}}
  for(const b of G.bases)if(b.alive&&b.team===foe){const d=dist(h,b)*2.2;if(d<bd){bd=d;best=b;}}
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
  /* k=dt*60: gerak per-step diskala waktu. Pada fixed-step 1/60 k=1 (identik
   * seperti dulu); pada variable-step (catch-up anti slow-motion) gerak tetap
   * benar — tidak melambat maupun melompat. */
  const k=dt*60;
  // dash
  if(h.dashT>0){
    h.dashT-=dt;
    h.x=clamp(h.x+h.dashDx*k,40,WORLD_W-40);
    h.y=clamp(h.y+h.dashDy*k,LANE_TOP+14,LANE_BOT-10);
    if(h.dashDmg>0){ // dash serang: lukai yg tersentuh
      for(const e of enemiesNear(h.x,h.y,44,h.team,true)){
        if(!h.dashHit.includes(e)){h.dashHit.push(e);damage(e,h.dashDmg,h);}
      }
      puff(h.x,h.y-24,'#ffe14d',2,1,.25,3);
    }
    setPose(h,'run');
  }else{
    h.x=clamp(h.x+mx*sp*k+(h.kbx||0)*dt*8,40,WORLD_W-40);
    h.y=clamp(h.y+my*sp*k+(h.kby||0)*dt*8,LANE_TOP+14,LANE_BOT-10);
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
  for(const e of G.fighters)if(e.alive&&e.team===foe){const d=dist(m,e);if(d<bd){bd=d;best=e;}}
  for(const n of G.minions)if(n.alive&&n.team===foe){const d=dist(m,n);if(d<bd){bd=d;best=n;}}
  if(G.dummy&&G.dummy.alive&&m.team===0){const d=dist(m,G.dummy);if(d<bd){bd=d;best=G.dummy;}}
  for(const t of G.towers)if(t.alive&&t.team===foe){const d=dist(m,t);if(d<bd){bd=d;best=t;}}
  for(const b of G.bases)if(b.alive&&b.team===foe){const d=dist(m,b);if(d<bd){bd=d;best=b;}}
  if(best){
    const d=dist(m,best);
    if(d<46){
      if(m.atkCd<=0){m.atkCd=0.8;damage(best,m.atk,m);puff(best.x,best.y-20,'#fff',3,1.5,.25,2);}
      m.dir=best.x>=m.x?1:-1;
    }else{
      const k=dt*60; // skala gerak waktu (lihat moveHero)
      const dx=(best.x-m.x)/d,dy=(best.y-m.y)/d;
      m.x+=dx*m.speed*k+(m.kbx||0)*dt*8;m.y=clamp(m.y+dy*m.speed*k,LANE_TOP+10,LANE_BOT-8);
      m.dir=dx>=0?1:-1;m.animT+=dt*1.4;m.pose='run';
    }
  }else{m.x+=m.dir*m.speed*dt*60;m.animT+=dt*1.4;m.x=clamp(m.x,40,WORLD_W-40);}
  m.kbx=(m.kbx||0)*0.9;
  if(m.atkCd>0)m.atkCd-=dt;
}
/* B. spawn wave: prajurit BERBARIS satu kolom (ala referensi) — x sama,
 * y berjarak 44px, berangkat dari base masing-masing. */
function spawnWaveMinion(team,k,n){
  const bx=team===0?90:WORLD_W-90;
  const cy=(LANE_TOP+LANE_BOT)/2;
  return makeMinion(team,false,bx+rnd(-8,8),cy+(k-(n-1)/2)*44+rnd(-6,6));
}
function towerAI(t,dt){
  if(!t.alive)return;
  if(t.atkCd>0){t.atkCd-=dt;return;}
  const foe=foesOf(t.team);
  let best=null,bd=1e9;
  for(const m of G.minions)if(m.alive&&m.team===foe){const d=dist(t,m);if(d<t.range&&d<bd){bd=d;best=m;}}
  if(!best)for(const h of G.fighters)if(h.alive&&h.team===foe){const d=dist(t,h);if(d<t.range&&d<bd){bd=d;best=h;}}
  if(best){
    t.atkCd=1.1;
    const ang=Math.atan2((best.y-40)-t.y,best.x-t.x);
    fireProj({x:t.x,y:t.y-80,ang,speed:8,dmg:15,color:'#ff9a3e',radius:10,team:t.team,src:t});
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
  const k=dt*60; // gerak partikel diskala waktu (konsisten di fixed & variable step)
  for(let i=G.parts.length-1;i>=0;i--){const q=G.parts[i];
    q.x+=q.vx*k;q.y+=q.vy*k;q.vy+=(q.grav||2.5)*dt;q.life-=dt;
    if(q.life<=0){G.parts.splice(i,1);pfree(q);}}
  for(let i=G.texts.length-1;i>=0;i--){const t=G.texts[i];
    t.y-=30*dt;t.life-=dt*0.9;if(t.life<=0)tfree(G.texts.splice(i,1)[0]);}
  for(let i=G.flashes.length-1;i>=0;i--){const f=G.flashes[i];
    f.t+=dt;if(f.t>=f.dur)ffree(G.flashes.splice(i,1)[0]);}
  if(G.shake>0)G.shake=Math.max(0,G.shake-30*dt);
}
function update(dt){
  G.time+=dt;
  for(let i=G.delayed.length-1;i>=0;i--)
    if(G.time>=G.delayed[i].t){const d=G.delayed.splice(i,1)[0];d.fn();}
  /* bannerT kini wall-clock di render(); tak lagi dikuras fixed-step */
  if(G.koCd>0)G.koCd-=dt;
  /* HITSTOP: bekukan dunia 60-90ms saat pukulan connect (juice ala fighting) */
  if(G.hitstop>0){G.hitstop-=dt;updateFx(dt);return;}
  // ambient arena: strip 4-frame via pool (tanpa alokasi, tanpa shadowBlur); awan melayang
  G.ambientT-=dt;
  if(G.ambientT<=0){G.ambientT=QAMB[G.perf.level];spawnAmbient();}
  updateAmbient(dt);
  if(G.clouds)for(const c of G.clouds){c.ft+=dt*3;c.x-=c.spd*dt;
    if(c.x<-230){c.x=W+rnd(0,240);c.y=rnd(30,150);}}
  // wave minion
  if(G.mode!=='training'){
    G.waveT-=dt;
    if(G.waveT<=0){G.waveT=G.mode==='survival'?9:7;
      const n=G.mode==='war'?4:3;
      for(let k=0;k<n;k++){G.minions.push(spawnWaveMinion(0,k,n));G.minions.push(spawnWaveMinion(1,k,n));}
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
  // IN = snapshot input per frame render (diisi loop()/_tick), bukan G.input langsung
  const p=G.player;
  if(p&&p.alive&&p.stun<=0){
    moveHero(p,IN.x,IN.y,dt);
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
    pr.x+=pr.vx*dt*60;pr.y+=pr.vy*dt*60;pr.life-=dt;
    let dead=pr.life<=0||pr.x<-50||pr.x>WORLD_W+50;
    if(!dead){
      const hit=enemiesNear(pr.x,pr.y,pr.radius+pr.hitR,pr.team,true);
      // tower dalam berkurang damage bila tower luar masih hidup
      if(hit.length){
        for(const e of hit){
          let dm=pr.dmg;
          /* tower dalam berkurang damage bila tower luar masih hidup
           * (loop polos — tanpa closure, tanpa alokasi di hot path) */
          if(e.kind==='tower'&&e.inner){
            let outerAlive=false;
            for(const t2 of G.towers)if(t2.team===e.team&&!t2.inner&&t2.alive){outerAlive=true;break;}
            if(outerAlive)dm*=0.1;
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
  if(p&&p.alive)G.cam=clamp(p.x-pViewW()/2,0,WORLD_W-pViewW());
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
  /* minion: strip 4 frame (soldier baru 120x160 / genin lama 128x128);
   * fallback prosedural bila gagal. Ukuran frame adaptif, tanpa alokasi. */
  if(e.kind==='minion'){
    const cv=G.world.minion[e.team];
    if(cv&&cv.width){
      const fi=Math.floor((e.animT||0)*8)%4,s=76;
      const fw=cv.width/4,fh=cv.height,dh=s*fh/fw;
      g.save();g.translate(e.x,e.y);
      g.fillStyle='rgba(0,0,0,0.26)';
      g.beginPath();g.ellipse(0,-2,16,5,0,0,Math.PI*2);g.fill();
      g.scale(e.dir>=0?1:-1,1);
      g.drawImage(cv,Math.floor(fi*fw),0,Math.floor(fw),Math.floor(fh),-s/2,-dh,s,dh);
      g.restore();
      drawHPBar(g,e.x,e.y-dh-24,34,e.hp/e.maxhp);
      return;
    }
  }
  /* sprite sheet bila tersedia, fallback prosedural bila belum */
  if(e.kind==='hero'&&window.NWSprite&&NWSprite.has(e.charId)){
    try{if(NWSprite.draw(g,e)){afterSpriteBars(g,e);return;}}catch(err){}
  }
  if(window.NWFighter){try{NWFighter.draw(g,e);afterSpriteBars(g,e);return;}catch(err){}}
  drawNinja(g,e,e.kind==='hero'?1:0.72);
  afterSpriteBars(g,e);
}
/* Bar HP/chakra SELALU digambar DI ATAS kepala (tak pernah menutupi wajah).
 * Puncak sprite: hero = e.y-120 (NWSprite CHAR_H=120), minion NWFighter = e.y-98.
 * Offset 15-22px di atas puncak -> aman dari rambut/ikat kepala. */
function afterSpriteBars(g,e){
  if(e.kind==='hero'){
    drawHPBar(g,e.x,e.y-172,64,e.hp/e.maxhp);          // -172..-162 (20px di atas puncak kepala)
    g.fillStyle='rgba(0,0,0,.55)';g.fillRect(e.x-32,e.y-140,64,5);
    g.fillStyle='#2ea8ff';g.fillRect(e.x-31,e.y-139,62*(e.chakra/e.maxchakra),3);
  }else drawHPBar(g,e.x,e.y-124,34,e.hp/e.maxhp);      // -124..-114 (16px di atas kepala minion)
}
function drawDummy(g,d){
  /* sprite boneka kayu art dunia (dummy_hit 0.28 dtk usai dipukul); fallback prosedural */
  const hit=G.time-(d.hitT||-9)<0.28;
  const cv=hit?G.world.dummyHit:G.world.dummy;
  g.save();g.translate(d.x,d.y);
  /* bayangan elips lembut (tanpa shadowBlur) */
  g.fillStyle='rgba(0,0,0,0.26)';
  g.beginPath();g.ellipse(0,-2,26,7,0,0,Math.PI*2);g.fill();
  if(cv&&cv.width){
    const s=0.55,w=cv.width*s,h=cv.height*s;
    g.drawImage(cv,-w/2,-h,w,h);
  }else{
    g.fillStyle='#7a5a38';g.fillRect(-10,-90,20,90);
    g.fillStyle='#8f6c46';g.beginPath();g.arc(0,-100,14,0,7);g.fill();
    g.strokeStyle='#5e4630';g.lineWidth=4;
    g.beginPath();g.moveTo(-26,-70);g.lineTo(26,-70);g.moveTo(-24,-50);g.lineTo(24,-50);g.stroke();
  }
  g.restore();
  /* seluruh indikator di ATAS kepala boneka (puncak kepala = d.y-114):
     label -> bar HP -> bar guard, tak ada yang menutupi wajah */
  drawHPBar(g,d.x,d.y-152,90,d.hp/d.maxhp);
  g.fillStyle='#fff';g.font='bold 12px sans-serif';g.textAlign='center';
  g.fillText('BONEKA LATIHAN',d.x,d.y-160);
  /* guard meter: biru = bertahan, merah berkedip = break */
  g.fillStyle='rgba(0,0,0,.55)';g.fillRect(d.x-45,d.y-140,90,8);
  g.fillStyle=d.guardBreakT>0?(Math.floor(G.time*8)%2?'#ff5e5e':'#ffb03c'):'#2ea8ff';
  g.fillRect(d.x-44,d.y-139,88*clamp(d.guard/d.guardMax,0,1),6);
  g.fillStyle='#cfe8ff';g.font='bold 9px sans-serif';
  g.fillText(d.guardBreakT>0?'GUARD BREAK!':'GUARD',d.x,d.y-124);
}
/* penghitung kombo di dekat karakter (x2, x3...) — pop membesar saat fresh */
function drawCombo(g,h){
  const n=h.comboN;if(n<2)return;
  const pop=1+0.3*Math.min(1,h.comboT||0);
  g.save();
  g.translate(h.x,h.y-172); /* di atas bar HP (bar di y-152), tak menutupi wajah */
  g.scale(pop,pop);
  g.font='bold 20px sans-serif';g.textAlign='center';
  g.fillStyle='#000';g.fillText('x'+n,2,2);
  g.fillStyle=h.team===0?'#ffd23e':'#ff8a8a';
  g.fillText('x'+n,0,0);
  g.restore();
}
/* ============================================================================
 * A. MONUMEN BATU + SEMAK ala referensi Naruto Senki (bukan menara).
 * Prioritas: assets/world/monument.png & monument_broken.png bila ADA
 * (dimuat preloadWorld); bila BELUM ADA -> fallback prosedural di bawah,
 * di-PRERENDER SEKALI ke offscreen (ensureMonument), hot path hanya drawImage.
 * Utuh: slab batu abu + alas bertingkat + kain tim + semak hijau di kiri-kanan.
 * Hancur: slab miring retak + puing + semak layu — beda JELAS dari yg utuh.
 * ========================================================================== */
/* LCG deterministik: tekstur batu stabil antar load (tanpa Math.random) */
function _lcg(seed){let s=seed>>>0;return()=>{s=(s*1664525+1013904223)>>>0;return s/4294967296;};}
/* rumpun semak: lingkaran hijau berlapis (wilted = layu, lebih gelap) */
function _bush(g,cx,cy,s,wilted){
  const R=_lcg((cx|0)*7919+(cy|0)*104729+(wilted?7:0));
  const cols=wilted?['#24401f','#33582b','#3f6b34']:['#2e7a3a','#3f9e4d','#57c267'];
  for(let i=0;i<11;i++){
    const a=R()*Math.PI*2,rr2=(6+R()*13)*s;
    const x=cx+Math.cos(a)*rr2,y=cy+Math.sin(a)*rr2*0.75;
    g.fillStyle=cols[i%3];
    g.beginPath();g.arc(x,y,(8+R()*8)*s,0,7);g.fill();
  }
  g.fillStyle=wilted?'rgba(120,90,40,.35)':'rgba(255,255,255,.16)';
  g.beginPath();g.arc(cx-6*s,cy-8*s,9*s,0,7);g.fill(); // kilau daun
}
/* lempeng batu bertingkat (alas monumen) */
function _slab(g,x,y,w,h){
  g.fillStyle='#3f4450';g.fillRect(x-3,y-3,w+6,h+6);
  g.fillStyle='#6b7280';g.fillRect(x,y,w,h);
  g.fillStyle='#8b93a1';g.fillRect(x,y,w,4);          // highlight atas
  g.fillStyle='#4a505c';g.fillRect(x,y+h-4,w,4);       // bayangan bawah
}
function _speckle(g,R,x0,y0,w,h,n,color){
  g.fillStyle=color;
  for(let i=0;i<n;i++){g.fillRect(x0+R()*w,y0+R()*h,2.5,2.5);}
}
function _buildMonument(bannerColor){
  const W=200,H=215,c=mkCanvas(W,H),g=c.getContext('2d');
  _bush(g,32,166,1.05,false); _bush(g,168,166,1.05,false); // semak kiri-kanan
  _slab(g,52,170,96,24);                                   // alas bawah
  _slab(g,62,148,76,24);                                   // alas atas
  /* badan monumen: slab abu membulat di atas */
  g.fillStyle='#33373f';rr(g,73,44,54,108,17);g.fill();
  g.fillStyle='#59606c';rr(g,76,47,48,102,15);g.fill();
  g.fillStyle='#7d8494';g.fillRect(80,54,10,88);           // bevel kiri
  g.fillStyle='#454a55';g.fillRect(110,54,10,88);          // teduh kanan
  const R=_lcg(1234);
  _speckle(g,R,80,56,40,88,16,'rgba(0,0,0,.20)');
  _speckle(g,R,80,56,40,88,8,'rgba(255,255,255,.12)');
  /* ukiran: lingkaran + titik (ciri monumen) — di bawah kain tim agar tak tertutup */
  g.strokeStyle='#3f4450';g.lineWidth=4;
  g.beginPath();g.arc(100,116,13,0,7);g.stroke();
  g.fillStyle='#3f4450';g.beginPath();g.arc(100,116,5,0,7);g.fill();
  /* lumut di kaki monumen */
  g.fillStyle='rgba(70,140,80,.5)';
  g.beginPath();g.ellipse(86,142,12,5,0,0,7);g.fill();
  /* kain tim: penanda sisi (biru = ally, merah = foe) */
  g.fillStyle='rgba(0,0,0,.4)';g.fillRect(93,58,16,34);
  g.fillStyle=bannerColor;g.fillRect(94,59,14,30);
  g.fillStyle='rgba(255,255,255,.35)';g.fillRect(94,59,14,5);
  g.fillStyle=bannerColor;                                // ujung runcing
  g.beginPath();g.moveTo(94,89);g.lineTo(101,97);g.lineTo(108,89);g.closePath();g.fill();
  return c;
}
function _buildMonumentBroken(){
  const W=200,H=215,c=mkCanvas(W,H),g=c.getContext('2d');
  const R=_lcg(777);
  _bush(g,34,168,0.95,true); _bush(g,166,168,0.95,true);  // semak layu
  /* alas retak & bergeser */
  _slab(g,50,172,60,22);_slab(g,112,174,56,22);
  g.strokeStyle='#2c3038';g.lineWidth=2.5;
  g.beginPath();g.moveTo(96,174);g.lineTo(104,194);g.lineTo(98,196);g.stroke();
  /* sisa slab MIRING dengan puncak bergerigi (jelas hancur) */
  g.save();g.translate(100,168);g.rotate(-0.28);
  g.fillStyle='#33373f';
  g.beginPath();
  g.moveTo(-24,0);g.lineTo(-24,-52);g.lineTo(-14,-66);g.lineTo(-6,-50);
  g.lineTo(2,-70);g.lineTo(10,-52);g.lineTo(18,-62);g.lineTo(24,-48);g.lineTo(24,0);
  g.closePath();g.fill();
  g.fillStyle='#59606c';
  g.beginPath();
  g.moveTo(-20,-2);g.lineTo(-20,-50);g.lineTo(-14,-60);g.lineTo(-6,-46);
  g.lineTo(2,-64);g.lineTo(10,-48);g.lineTo(18,-56);g.lineTo(20,-2);
  g.closePath();g.fill();
  g.restore();
  /* lempengan jatuh di tanah */
  g.save();g.translate(150,186);g.rotate(0.5);
  g.fillStyle='#4a505c';g.fillRect(-22,-8,44,16);
  g.fillStyle='#6b7280';g.fillRect(-22,-8,44,6);
  g.restore();
  /* puing berserakan */
  for(let i=0;i<9;i++){
    g.fillStyle=i%2?'#59606c':'#454a55';
    const px=56+R()*88,py=176+R()*22,s=5+R()*8;
    g.save();g.translate(px,py);g.rotate(R()*3);g.fillRect(-s/2,-s/3,s,s*0.66);g.restore();
  }
  _speckle(g,R,60,180,80,16,10,'rgba(0,0,0,.25)');
  return c;
}
/* bangun SEKALI (lazy, dijaga flag) — drawTower/drawBase hanya drawImage */
function ensureMonument(){
  const S=G.world.struct;
  if(S._monOk)return;
  S._monOk=true;
  S._monAlly=_buildMonument('#3a6bd8');
  S._monFoe=_buildMonument('#d83a3a');
  S._monBroken=_buildMonumentBroken();
}
/* pilih sprite monumen: file ART dulu, fallback prosedural. Tanpa alokasi. */
function monumentImg(alive,team){
  const S=G.world.struct;
  if(alive){
    const f=S.monument;
    if(f&&f.width)return f;
    ensureMonument();
    return team===0?S._monAlly:S._monFoe;
  }
  const b=S.monument_broken;
  if(b&&b.width)return b;
  ensureMonument();
  return S._monBroken;
}
/* lingkaran proteksi tower-dalam (tanpa closure -> tanpa alokasi per frame) */
function innerProt(t){
  if(!(t.alive&&t.inner))return false;
  for(const x of G.towers)if(x.team===t.team&&!x.inner&&x.alive)return true;
  return false;
}
function drawTower(g,t){
  /* A. tower = MONUMEN BATU + semak (referensi Naruto Senki, bukan menara).
   * Status utuh/hancur JELAS dari sprite-nya sendiri. */
  const cv=monumentImg(t.alive,t.team);
  const h=t.alive?175:120,w=h*(cv.width/cv.height);
  g.save();g.translate(t.x,t.y);
  g.fillStyle='rgba(0,0,0,0.26)';
  g.beginPath();g.ellipse(0,-2,w*0.36,7,0,0,Math.PI*2);g.fill();
  g.drawImage(cv,-w/2,-h,w,h);
  if(innerProt(t)){g.strokeStyle='rgba(126,224,255,.7)';g.lineWidth=3;
    g.beginPath();g.arc(0,-h/2,80+Math.sin(G.time*4)*4,0,7);g.stroke();}
  g.restore();
  if(t.alive)drawHPBar(g,t.x,t.y-h-34,96,t.hp/t.maxhp);
}
function drawBase(g,b){
  /* A. base = monumen LEBIH BESAR + semak (satu bahasa visual dgn tower) */
  const cv=monumentImg(b.alive,b.team);
  const h=b.alive?215:130,w=h*(cv.width/cv.height);
  g.save();g.translate(b.x,b.y);
  g.fillStyle='rgba(0,0,0,0.26)';
  g.beginPath();g.ellipse(0,-2,w*0.36,8,0,0,Math.PI*2);g.fill();
  g.drawImage(cv,-w/2,-h,w,h);
  g.restore();
  if(b.alive)drawHPBar(g,b.x,b.y-h-30,130,b.hp/b.maxhp);
}
function render(){
  const g=G.ctx,L=G.layers;
  const cw=G.canvas.width,ch=G.canvas.height;
  /* letterbox landscape 960x540; portrait: kamera 620px + pita langit/tanah */
  const v=fitView(cw,ch,G.dpr);
  G.vw=v.vw;G.portrait=v.portrait;
  g.setTransform(1,0,0,1,0,0);
  /* v15c: pengisi letterbox gradien gelap rapi (bukan hitam pekat), di-cache per tinggi kanvas */
  var _lbk='lb'+ch;
  if(G._lbKey!==_lbk){G._lbKey=_lbk;var _lg=g.createLinearGradient(0,0,0,ch);
    _lg.addColorStop(0,'#101725');_lg.addColorStop(.55,'#080b12');_lg.addColorStop(1,'#030405');
    G._lbGrad=_lg;}
  g.fillStyle=G._lbGrad;g.fillRect(0,0,cw,ch);
  g.setTransform(G.dpr*v.s,0,0,G.dpr*v.s,G.dpr*v.ox,G.dpr*v.oy);
  if(v.portrait){
    /* pita di atas & bawah area dunia 540px (gradien per arena, dibuat di buildLayers) */
    const topH=v.oy/v.s,botH=(ch/G.dpr-v.oy)/v.s-540;
    if(topH>1){g.fillStyle=G.bandTop||'#000';g.fillRect(-2,-topH-2,v.vw+4,topH+2);}
    if(botH>1){g.fillStyle=G.bandBot||'#000';g.fillRect(-2,540,v.vw+4,botH+2);}
  }
  g.save();
  /* v15c: jepit gambar dunia ke area pandang — cegah bocor ke bilah letterbox (strip hijau di desktop lebar) */
  g.beginPath();g.rect(0,0,v.vw,540);g.clip();
  let sx=0,sy=0;
  if(G.shake>0){sx=rnd(-G.shake,G.shake)*0.4;sy=rnd(-G.shake,G.shake)*0.4;}
  const cam=Math.round(G.cam+sx);
  // langit tetap
  g.drawImage(L.sky,0,0);
  // awan bergerak (strip cloud.png, 4 frame @160px) — hanya bila art siap;
  // dimatikan pada level kualitas hemat (level>=1) demi fill-rate HP
  const cl=G.world.amb.cloud;
  if(G.perf.level<1&&cl&&cl.width&&G.clouds)for(const c of G.clouds){
    g.globalAlpha=0.85;
    g.drawImage(cl,Math.floor(c.ft)%4*160,0,160,160,c.x,c.y,200,200);
  }
  g.globalAlpha=1;
  // parallax
  g.drawImage(L.far,-Math.round(G.cam*0.25),0);
  g.drawImage(L.mid,-Math.round(G.cam*0.55),0);
  g.save();g.translate(-cam,Math.round(-sy));
  g.drawImage(L.gnd,0,0);
  /* v17: NPC anime di celah antar-tower TENGAH peta (jauh dari base/tower/label,
   * kaki tetap y=180 di atas lane) — sprite + animasi idle 4 frame, tanpa alokasi.
   * Warga di celah tower ally (520/1020); anak & penjaga di celah tower musuh
   * (1380/1880). Strip baru (assets/world/npc/): villager 480x160 (4x120),
   * guard 384x192 (4x96). Fallback strip lama bila art baru gagal dimuat. */
  const _npc=G.world.npc;
  if(_npc){
    const tf=Math.floor(G.time*2.2)%4;
    const nv=_npc.npc_villager;
    if(nv&&nv.width){
      if(nv.width>=400){ /* strip baru: 4 frame 120x160 */
        g.drawImage(nv,tf*120,0,120,160,790-60,180-160,120,160);   // warga 1
        g.drawImage(nv,((tf+2)%4)*120,0,120,160,880-60,180-160,120,160); // warga 2
      }else{ /* strip lama 192x208: pria 64x96 (y 0..96), wanita 64x104 (y 104..208, headroom 8px) */
        const f3=tf%3;
        g.drawImage(nv,f3*64,0,64,96,790-32,180-96,64,96);        // warga pria
        g.drawImage(nv,f3*64,104,64,104,880-32,180-104,64,104);   // warga wanita
      }
    }
    const ng=_npc.npc_guard;
    if(ng&&ng.width){
      if(ng.width>=300) /* strip baru: 4 frame 96x192 */
        g.drawImage(ng,tf*96,0,96,192,1730-48,180-192,96,192);    // penjaga
      else{ /* strip lama 256x96: 4 frame 64x96 */
        const gt=Math.floor(G.time*1.5)%6, gf=gt<4?(gt&1):gt-2;
        g.drawImage(ng,gf*64,0,64,96,1730-32,180-96,64,96);
      }
    }
    const nk=_npc.npc_kid;
    if(nk&&nk.width)g.drawImage(nk,(tf%3)*64,0,64,96,1620-32,180-96,64,96); // anak
  }
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
  /* struktur hancur tetap digambar sebagai reruntuhan (state rusak) */
  for(const b of G.bases)drawBase(g,b);
  for(const t of G.towers)drawTower(g,t);
  if(G.dummy&&G.dummy.alive)drawDummy(g,G.dummy);
  /* urut depth y: buffer dipakai ulang, tanpa alokasi array per frame */
  _ents.length=0;
  for(const h of G.fighters)if(h.alive)_ents.push(h);
  for(const m of G.minions)if(m.alive)_ents.push(m);
  _ents.sort(byY);
  for(const e of _ents)drawFighter(g,e);
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
  /* partikel ambient art dunia (pool 40, frame strip) */
  for(const a of G.amb){
    if(!a.on)continue;
    const acv=G.world.amb[a.strip];if(!(acv&&acv.width))continue;
    g.globalAlpha=clamp(a.life/a.max,0,1)*0.95;
    const s=a.size;
    g.drawImage(acv,Math.floor(a.ft)%4*128,0,128,128,a.x-s/2,a.y-s/2,s,s);
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
  // banner tengah (big = pengumuman layar besar: FIGHT! / K.O.! / GUARD BREAK! / pemenang)
  // opacity penuh 1.5 dtk lalu fade — durasi dijamin wall-clock (anti-lag HP)
  if(G.banner){
    const bAge=(performance.now()-G.banner.born)/1000;
    if(bAge>=G.banner.dur){G.banner=null;G.bannerT=0;}
    else{
    g.save();
    const FULL=1.5; /* detik opacity penuh */
    g.globalAlpha=bAge<FULL?1:clamp(1-(bAge-FULL)/Math.max(.3,G.banner.dur-FULL),0,1);
    g.textAlign='center';g.textBaseline='middle';g.lineJoin='round';
    /* teks ber-outline tebal agar terbaca di atas arena ramai */
    const outlined=(txt,x,y,font,lw,fill)=>{
      g.font=font;g.lineWidth=lw;g.strokeStyle='rgba(0,0,0,.92)';
      g.strokeText(txt,x,y);
      g.fillStyle=fill;g.fillText(txt,x,y);
    };
    if(G.banner.big){
      /* pop-in easeOutBack 0.25 dtk lalu menetap */
      const ein=Math.min(1,bAge*4);
      const pop=easeOutBack(ein);
      const bcx=(G.vw||960)/2;
      g.translate(bcx,H*0.36);g.scale(pop,pop);
      outlined(G.banner.txt,0,0,'bold 72px Bungee,"Arial Black",sans-serif',13,'#ffd23e');
      if(G.banner.sub)outlined(G.banner.sub,0,54,'bold 22px Rajdhani,sans-serif',6,'#ffffff');
    }else{
      const bcx2=(G.vw||960)/2;
      outlined(G.banner.txt,bcx2,H*0.36,'bold 46px Bungee,"Arial Black",sans-serif',9,'#ffd23e');
      if(G.banner.sub)outlined(G.banner.sub,bcx2,H*0.36+36,'bold 20px Rajdhani,sans-serif',5,'#ffffff');
    }
    g.restore();
    }
  }
  const _vw=G.vw||960;
  /* vignette tepi: gradien di-cache (bukan createLinearGradient per frame),
   * hanya setinggi area dunia 540px (dulu fillRect 1740px = overdraw ~3x layar).
   * Level kualitas 2 (minimal): vignette dimatikan total. */
  if(G.perf.level<2){
    if(_vigGrad===null||_vigVw!==_vw){
      _vigVw=_vw;
      _vigGrad=g.createLinearGradient(0,0,_vw,0);
      _vigGrad.addColorStop(0,'rgba(0,0,0,.25)');_vigGrad.addColorStop(.06,'rgba(0,0,0,0)');
      _vigGrad.addColorStop(.94,'rgba(0,0,0,0)');_vigGrad.addColorStop(1,'rgba(0,0,0,.25)');
    }
    g.fillStyle=_vigGrad;g.fillRect(0,0,_vw,540);
  }
  g.restore();
}
/* Status struktur kedua tim: IKON visual (bukan teks mentah).
 * Menara digambar sebagai menara kecil, base sebagai kristal; warna = warna tim
 * bila utuh, abu-abu + silang merah bila hancur; bar HP tipis + label kecil. */
/* ---- status struktur: helper di-hoist ke level modul (tanpa closure per frame) ---- */
const TEAM_COL=['#3a6bd8','#d83a3a'],DEAD_COL='#565660';
function drawTowerIcon(g,x,y,s,color){
  const w=s*0.72,cx=x+w/2;
  g.fillStyle='rgba(0,0,0,.55)';g.fillRect(x-3,y-3,w+6,s+8);
  g.fillStyle=color;
  g.fillRect(x,y+s*0.34,w,s*0.66);       /* badan menara */
  g.fillRect(x-2,y+s*0.16,w+4,s*0.2);    /* mahkota */
  g.fillRect(cx-2,y-1,4,s*0.2);          /* puncak */
  g.fillStyle='rgba(0,0,0,.42)';
  g.fillRect(cx-3,y+s*0.56,6,s*0.22);    /* pintu */
}
function drawBaseIcon(g,x,y,s,color){
  const w=s*0.8,cx=x+w/2;
  g.fillStyle='rgba(0,0,0,.55)';g.fillRect(x-3,y-3,w+6,s+8);
  g.fillStyle=color;
  g.beginPath();                        /* kristal */
  g.moveTo(cx,y);g.lineTo(x+w,y+s*0.42);g.lineTo(cx,y+s);g.lineTo(x,y+s*0.42);
  g.closePath();g.fill();
  g.fillStyle='rgba(255,255,255,.45)';   /* kilau */
  g.beginPath();
  g.moveTo(cx,y);g.lineTo(x+w,y+s*0.42);g.lineTo(cx,y+s*0.42);
  g.closePath();g.fill();
  g.strokeStyle='rgba(0,0,0,.5)';g.lineWidth=1.5;
  g.beginPath();g.moveTo(x,y+s*0.42);g.lineTo(x+w,y+s*0.42);g.stroke();
}
/* satu item: ikon + bar HP + label kecil. return lebar terpakai.
 * v15c: y0 digeser ke bawah (160) agar label tak tertutup sprite NPC (kaki NPC di y=180). */
function structItem(g,x,team,align,label,ratio,alive,iconFn,y0){
  const s=16,bw=42;
  const bx=align==='left'?x:x-bw;
  const iy=(y0==null?84:y0);
  iconFn(g,bx,iy,s,alive?TEAM_COL[team]:DEAD_COL);
  if(!alive){ /* silang merah = hancur */
    g.strokeStyle='#ff5e5e';g.lineWidth=2.5;g.lineCap='round';
    g.beginPath();
    g.moveTo(bx-2,iy-2);g.lineTo(bx+s*0.8+2,iy+s+2);
    g.moveTo(bx+s*0.8+2,iy-2);g.lineTo(bx-2,iy+s+2);
    g.stroke();
  }
  g.fillStyle='rgba(0,0,0,.6)';g.fillRect(bx,iy+s+5,bw,5);
  g.fillStyle=ratio>0.5?'#37e05b':(ratio>0.25?'#ffd23e':'#ff5e5e');
  g.fillRect(bx+1,iy+s+6,(bw-2)*clamp(ratio,0,1),3);
  g.font='bold 8px sans-serif';g.textBaseline='alphabetic';
  g.textAlign=align==='left'?'left':'right';
  const lx=align==='left'?bx:bx+bw,ly=iy+s+20;
  g.fillStyle='#000';g.fillText(label,lx+(align==='left'?1:-1),ly+1);
  g.fillStyle=alive?'#fff':'#8a8a95';g.fillText(label,lx,ly);
  return bw+10;
}
function structBars(g){
  /* kiri: tim pemain — kanan: tim musuh (urutan: tower luar, tower dalam, base).
   * v15c: blok digeser ke y=160 agar label BASE/TOWER tak bertumpuk sprite NPC. */
  const Y0=160;
  let lx=10;
  for(const t of G.towers)if(t.team===0)lx+=structItem(g,lx,0,'left','TOWER',t.hp/t.maxhp,t.alive,drawTowerIcon,Y0);
  for(const b of G.bases)if(b.team===0)lx+=structItem(g,lx,0,'left','BASE',b.hp/b.maxhp,b.alive,drawBaseIcon,Y0);
  let rx=(G.vw||960)-10;
  for(const t of G.towers)if(t.team===1)rx-=structItem(g,rx,1,'right','TOWER',t.hp/t.maxhp,t.alive,drawTowerIcon,Y0);
  for(const b of G.bases)if(b.team===1)rx-=structItem(g,rx,1,'right','BASE',b.hp/b.maxhp,b.alive,drawBaseIcon,Y0);
}
/* Minimap: peta garis lane + posisi tower/fighter + bingkai viewport.
 * Dibuat terlihat "jadi" (bukan UI mentah): bingkai emas + sudut membulat. */
function rr(g,x,y,w,h,r){
  g.beginPath();
  g.moveTo(x+r,y);g.arcTo(x+w,y,x+w,y+h,r);g.arcTo(x+w,y+h,x,y+h,r);
  g.arcTo(x,y+h,x,y,r);g.arcTo(x,y,x+w,y,r);g.closePath();
}
function mmX(mx,mw,x){return mx+(x/WORLD_W)*mw;} // tanpa closure per frame
function minimap(g){
  const vw=G.vw||960;
  const mw=220,mh=26,mx=vw/2-mw/2,my=40;
  g.fillStyle='rgba(6,10,24,.72)';rr(g,mx,my,mw,mh,8);g.fill();
  g.strokeStyle='rgba(255,210,62,.85)';g.lineWidth=1.5;rr(g,mx,my,mw,mh,8);g.stroke();
  g.strokeStyle='rgba(255,255,255,.35)';g.lineWidth=1;g.beginPath();
  g.moveTo(mx+6,my+mh/2);g.lineTo(mx+mw-6,my+mh/2);g.stroke();
  for(const t of G.towers)if(t.alive){
    g.fillStyle=t.team===0?'#6aa8ff':'#ff6a6a';
    g.fillRect(mmX(mx,mw,t.x)-2,my+mh/2-2,4,4);
  }
  for(const h of G.fighters)if(h.alive){
    g.fillStyle=h.team===0?(h.isPlayer?'#ffd23e':'#6aa8ff'):'#ff6a6a';
    g.beginPath();g.arc(mmX(mx,mw,h.x),my+mh/2+(h.y-345)/160*mh/2,h.isPlayer?3.5:2.5,0,7);g.fill();
  }
  // viewport
  g.strokeStyle='#ffd23e';g.lineWidth=2;
  g.strokeRect(mmX(mx,mw,G.cam)+1,my+4,(pViewW()/WORLD_W)*mw-2,mh-8);
}

/* ---------- loop ----------
 * Fixed timestep 1/60 + akumulator, MAKS 3 step per frame.
 *
 * PILIHAN DESAIN (temuan QA: timer game berjalan LEBIH LAMBAT dari waktu nyata):
 * - DULU: dt di-clamp 0.05 DAN sisa akumulator DIBUANG saat 3 step habis
 *   (if(n===3)G.acc=0). Akibat: tiap frame yang lebih lambat dari 50ms membuat
 *   game-time kehilangan waktu nyata secara PERMANEN = efek slow-motion pada
 *   timer, cooldown, dan seluruh gameplay. Inilah akar "timer lebih lambat".
 * - SEKARANG: tetap maks 3 fixed step per frame (anti spiral-of-death), TAPI
 *   sisa waktu TIDAK dibuang — dijalankan sebagai SATU variable-step
 *   (maks 1/20 dtk). Semua gerak per-step sudah diskala dt*60 (moveHero,
 *   minionAI, partikel, proyektil, dash) sehingga variable-step tetap benar
 *   secara fisik. Hasil: game-time SELALU mengejar waktu nyata — tidak pernah
 *   tertinggal permanen. Saat FPS rendah, game terasa responsif (bukan
 *   slow-motion); simulasinya hanya sedikit lebih kasar di frame itu.
 * - INPUT: joystick/keyboard ditulis ke G.input oleh event handler (ui.js).
 *   Di sini input disnapshot SEKALI per frame render ke IN; semua fixed step
 *   dalam frame yang sama memakai nilai identik — tidak ada input yang
 *   "terjepit" berubah di tengah frame, dan tidak ada delay baca input
 *   (input selalu segar per frame render, bukan per fixed step).
 * - DEGRADASI ADAPTIF: perfSample melacak EMA frame time. Bila >20ms selama
 *   ~45 frame berturut-turut, level kualitas naik: partikel x0.5 lalu x0.25
 *   (lihat puff/QPART), spawn ambient direnggangkan (QAMB), awan langit
 *   dimatikan (level>=1), vignette dimatikan (level 2). Pulih otomatis bila
 *   EMA <14.5ms selama ~300 frame. */
const STEP=1/60, MAX_STEPS=3;
const IN={x:0,y:0}; // snapshot input per frame render
function perfSample(dt){
  const P=G.perf,ms=dt*1000;
  P.ema+=(ms-P.ema)*0.06;
  if(P.ema>20){
    P.good=0;
    if(++P.bad>45&&P.level<2){P.level++;P.bad=0;
      /* v17: level minimal di HP -> turunkan DPR ke 1 (kanvas dialokasi ulang
       * SEKALI per battle; dipulihkan ke 1.5 saat battle baru via start()). */
      if(P.level>=2&&IS_MOBILE_GPU&&DPR_CAP>1){DPR_CAP=1;resize();}
    }
  }else{
    P.bad=0;
    if(P.ema<14.5){if(++P.good>300&&P.level>0){P.level--;P.good=0;}}
    else P.good=0;
  }
}
function loop(ts){
  if(!G.running)return;
  requestAnimationFrame(loop);
  /* PAUSE (v15): game-time BENAR-BENAR berhenti — update(), render(), dan
     tickHUD() dilewati total: timer tak maju, musuh tak bergerak, cooldown
     tak jalan. G.last disegarkan tiap frame agar resume tanpa lompatan dt.
     rAF tetap dijadwalkan supaya rantai loop tidak putus. */
  if(G.paused){G.last=ts;return;}
  let dt=(ts-G.last)/1000;
  G.last=ts;
  if(!(dt>0))dt=STEP;else if(dt>0.25)dt=0.25; // guard tab-switch / hitch ekstrem
  IN.x=G.input.x;IN.y=G.input.y; // baca input tiap frame render
  perfSample(dt);
  if(!G.over){
    G.acc+=dt;let n=0;
    while(G.acc>=STEP&&n<MAX_STEPS){update(STEP);G.acc-=STEP;n++;}
    /* sisa < 1 step ATAU kelebihan dari batas 3 step: SATU variable-step,
     * bukan dibuang (dulu: acc=0 -> slow-motion permanen). */
    if(G.acc>=0.0008){update(Math.min(G.acc,1/20));G.acc=0;}
  }else{
    G.time+=dt;
    for(let i=G.delayed.length-1;i>=0;i--)
      if(G.time>=G.delayed[i].t){const d=G.delayed.splice(i,1)[0];d.fn();}
    const k=dt*60;
    for(let i=G.parts.length-1;i>=0;i--){const q=G.parts[i];
      q.x+=q.vx*k;q.y+=q.vy*k;q.vy+=(q.grav||2.5)*dt;q.life-=dt;
      if(q.life<=0){G.parts.splice(i,1);pfree(q);}}
    for(let i=G.flashes.length-1;i>=0;i--){const f=G.flashes[i];
      f.t+=dt;if(f.t>=f.dur)ffree(G.flashes.splice(i,1)[0]);}
    if(G.shake>0)G.shake=Math.max(0,G.shake-30*dt);
    /* bannerT wall-clock: tak dikuras di sini */
  }
  render();
  if(window.NWUI)window.NWUI.tickHUD();
}

/* ---------- mulai / selesai ---------- */
/* v17: roster war di-pick di sini (bukan inline di start) agar UI bisa
 * preload strip sprite tepat sebelum battle — hemat RAM & request di HP. */
function pickWarRoster(playerId){
  const chars=window.NWChars||[];
  const pool=chars.filter(c=>c.id!==playerId);
  const pick=()=>pool[Math.floor(Math.random()*pool.length)];
  const r=[];
  for(let i=0;i<2;i++)r.push(pick());
  for(let i=0;i<3;i++)r.push(pick());
  return r;
}
function start(cfg){
  G.arena=cfg.arena||'konoha';G.mode=cfg.mode||'versus';G.difficulty=cfg.difficulty||'normal';
  buildLayers();
  G.fighters=[];G.minions=[];G.projs=[];G.parts=[];G.zones=[];G.texts=[];G.delayed=[];
  G.flashes=[];
  G.dummy=null;
  G.amb=[];for(let i=0;i<40;i++)G.amb.push({on:false}); // pool ambient tetap (tanpa alokasi di loop)
  G.towers=[makeTower(0,520,false),makeTower(0,1020,true),makeTower(1,1880,true),makeTower(1,1380,false)];
  // urut: luar dulu — tandai inner untuk proteksi
  G.bases=[makeBase(0),makeBase(1)];
  const P=makeHero(cfg.player,0,true);
  G.fighters.push(P);G.player=P;
  if(G.mode==='training'){
    G.dummy=makeDummy();G.towers=[];G.bases=[];
  }else if(G.mode==='war'){
    /* v17: roster dari cfg (di-pick UI untuk preload sprite) atau pick sendiri */
    const roster=(cfg.roster&&cfg.roster.length>=5)?cfg.roster:pickWarRoster(cfg.player.id);
    for(let i=0;i<2;i++)G.fighters.push(makeHero(roster[i],0,false));
    for(let i=0;i<3;i++)G.fighters.push(makeHero(roster[2+i],1,false));
  }else{
    G.fighters.push(makeHero(cfg.enemy,1,false));
  }
  if(G.mode==='survival'){G.bases=[makeBase(0)];G.towers=[makeTower(0,520,false),makeTower(0,1020,true)];G.survWave=0;G.survT=3;}
  G.time=0;G.waveT=2;G.over=false;G.winner=false;G.acc=0;G.shake=0;
  G.hitstop=0;G.koCd=0;
  G.perf={ema:16.7,level:0,bad:0,good:0}; // reset degradasi adaptif tiap battle
  DPR_CAP=IS_MOBILE_GPU?1.5:2;resize(); // v17: pulihkan DPR adaptif tiap battle
  G.cam=0;G.kills=[0,0];G.coins=0;G.banner=null;G.bannerT=0;
  G.score=[]; // F. scoreboard match baru: diisi scoreFor() saat kill/death terjadi
  G.paused=false;G.running=true;G.last=performance.now();
  // genta perang
  NWAudio.drum();
  /* banner FIGHT! via wall-clock (bukan game-time) agar selalu muncul
     walau FPS rendah / game-time berjalan lambat (temuan QA) */
  setTimeout(()=>{if(G.running&&!G.over){
    banner(G.mode==='training'?'LATIHAN DIMULAI!':'FIGHT!',
      ARENAS[G.arena].name+' — '+ARENAS[G.arena].sub,true);NWAudio.drum();
  }},900);
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
  start,pickWarRoster,playerCast(i){return castSkill(G.player,i);},
  playerDash(dx,dy){return doDash(G.player,dx,dy);},
  playerAttack(){return playerAttack();},
  setInput(x,y){G.input.x=x;G.input.y=y;},
  resize(){resize();},
  _fitView:fitView,
  _tick(dt){if(G.paused)return;IN.x=G.input.x;IN.y=G.input.y;update(dt);}, // hook uji headless (Node)
  _render(){render();}, // hook uji headless: render satu frame (untuk perf-audit)
  onEnd(fn){G.onEnd=fn;},
  getState(){return G;},
  stop(){G.running=false;},
  /* F. SCOREBOARD: [{charId,name,team,isPlayer,kills,deaths}] per petarung
   * per match — untuk dibaca UI lead (window.NWUI). Live dari objek fighter. */
  scoreboard(){
    const out=[];
    for(const h of G.fighters){
      const e=scoreFor(h);
      out.push({charId:e.charId,name:e.name,team:e.team,isPlayer:e.isPlayer,
                kills:h.kills|0,deaths:h.deaths|0});
    }
    return out;
  },
  /* v15: pause — loop() melewati update/render total saat true */
  setPaused(v){G.paused=!!v;},
  isPaused(){return !!G.paused;},
  /* bersihkan layar saat keluar ke menu (temuan QA: battlefield lama
     masih terlihat di belakang judul) */
  clearView(){
    G.running=false;G.banner=null;G.bannerT=0;
    if(G.canvas){const c=G.canvas.getContext('2d');
      c.setTransform(1,0,0,1,0,0);c.clearRect(0,0,G.canvas.width,G.canvas.height);}
  },
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
    /* art dunia: muat + chroma-key SEKALI di menu; arena tinggal pakai */
    try{preloadWorld();}catch(e){}
  },
  ARENAS
};
})();
