/* Naruto War — UI: layar, mode, arena, koin/unlock, input, HUD */
(function(){
'use strict';
const $=id=>document.getElementById(id);
let pChar=null,eChar=null,mode=null,difficulty='normal',arena='konoha';
const keys={};
/* pip ronde: menang sesi ini (best-of-5) — direset saat kembali ke menu */
let rwP=0,rwE=0;
/* lapis HP delay ala fighting game (putih menyusut perlahan) */
let ghostP=1,ghostE=1,holdP=0,holdE=0;
/* lawan yang sudah diungkap siluetnya di layar PILIH LAWAN */
const revealedEnemy=new Set();

/* ---------- SET IKON SVG (ANTI EMOJI — aturan Bos 2026-10-05, permanen) ----------
 * Seluruh ikon UI wajib SVG satu gaya: viewBox 24, fill none,
 * stroke currentColor 2.4, round caps/joins — mengikuti design system. */
const _svgW='viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"';
const ICON={
volOn:'<svg '+_svgW+'><path d="M11 5 6 9H3v6h3l5 4V5z"/><path d="M15.5 8.5a5 5 0 0 1 0 7"/><path d="M18.6 5.4a9.2 9.2 0 0 1 0 13.2"/></svg>',
volOff:'<svg '+_svgW+'><path d="M11 5 6 9H3v6h3l5 4V5z"/><path d="m16 9 5 5M21 9l-5 5"/></svg>',
close:'<svg '+_svgW+'><path d="M6 6l12 12M18 6 6 18"/></svg>',
rotate:'<svg '+_svgW+'><path d="M20 12a8 8 0 1 1-2.3-5.6"/><path d="M20 3v4.5h-4.5"/></svg>',
lock:'<svg '+_svgW+'><rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>',
check:'<svg '+_svgW+'><path d="m5 12 5 5 9-11"/></svg>',
coin:'<svg '+_svgW+'><circle cx="12" cy="12" r="8"/><ellipse cx="12" cy="12" rx="3.6" ry="5.2"/></svg>',
back:'<svg '+_svgW+'><path d="m14 6-6 6 6 6"/></svg>',
pause:'<svg '+_svgW+'><path d="M9 5v14M15 5v14" stroke-width="3.6"/></svg>',
fs:'<svg '+_svgW+'><path d="M9 4H4v5M15 4h5v5M9 20H4v-5M15 20h5v-5"/></svg>',
tower:'<svg '+_svgW+'><path d="M9 21v-8l-2.5-7H9l1 2.5h4L15 6h2.5L15 13v8"/><path d="M6 21h12"/><path d="M10.5 16h3"/></svg>',
sword:'<svg '+_svgW+'><path d="M14.5 17.5 3 6V3h3l11.5 11.5"/><path d="m13 6 4 4"/><path d="m16 3 3 3"/><path d="M5 16l-2 5 5-2"/></svg>',
skull:'<svg '+_svgW+'><circle cx="12" cy="10" r="6"/><path d="M9.5 14.5 8 21M14.5 14.5 16 21"/><circle cx="10" cy="9.5" r=".8" fill="currentColor" stroke="none"/><circle cx="14" cy="9.5" r=".8" fill="currentColor" stroke="none"/></svg>',
};

/* ---------- koin & unlock (localStorage) ---------- */
const store={
  get coins(){return parseInt(localStorage.getItem('nw_coins')||'0',10);},
  set coins(v){localStorage.setItem('nw_coins',String(v));},
  get unlocked(){try{return JSON.parse(localStorage.getItem('nw_unlocked')||'["naruto"]');}catch(e){return['naruto'];}},
  set unlocked(v){localStorage.setItem('nw_unlocked',JSON.stringify(v));},
  /* Naruto = karakter awal: SELALU terbuka (anti gembok nyasar dari save versi lama) */
  isOpen(id){return id==='naruto'||this.unlocked.includes(id);},
  unlock(id){
    const u=this.unlocked;if(!u.includes(id)){u.push(id);this.unlocked=u;}
  }
};

/* layar menu yang memutar BGM menu (mulai setelah gestur pertama user) */
const MENU_SCREENS=['screen-title','screen-mode','screen-select','screen-enemy','screen-arena'];
function show(id){
  document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active'));
  if(id)$(id).classList.add('active');
  if(id&&MENU_SCREENS.indexOf(id)>=0){try{NWAudio.playBGM('menu');}catch(e){}}
}

/* ---------- toast kecil (pengganti alert) ---------- */
let toastT=null;
function toast(msg){
  let t=$('toast');
  if(!t){t=document.createElement('div');t.id='toast';document.getElementById('wrap').appendChild(t);}
  t.textContent=msg;t.classList.add('show');
  clearTimeout(toastT);toastT=setTimeout(()=>t.classList.remove('show'),2200);
}

/* ---------- onTap: klik andal di HP (perbaikan bug "klik pertama tak merespons").
 * Di dalam .screen yang bisa scroll (overflow-y:auto), tap pertama kadang
 * ditelan sebagai awal gesture scroll. Kita dengarkan touchend langsung
 * + click sebagai cadangan, dengan guard agar tidak double-fire. */
function onTap(el,fn){
  let fired=false,sx=0,sy=0;
  const fire=e=>{
    if(fired)return;fired=true;
    setTimeout(()=>{fired=false;},600);
    fn(e);
  };
  el.addEventListener('touchstart',e=>{
    const t=e.changedTouches[0];sx=t.clientX;sy=t.clientY;
  },{passive:true});
  el.addEventListener('touchend',e=>{
    const t=e.changedTouches[0];
    /* geser >14px = niat scroll, bukan tap */
    if(Math.hypot(t.clientX-sx,t.clientY-sy)<14){e.preventDefault();fire(e);}
  },{passive:false});
  el.addEventListener('click',e=>{fire(e);});
}

/* ---------- kartu karakter ---------- */
/* opts.mystery: tampil sebagai siluet "???" sampai diungkap (layar PILIH LAWAN).
 * Kartu RAHASIA (secret) yang masih TERKUNCI juga disamarkan: nama "???",
 * jurus "???", portrait siluet — anti-spoiler sampai terbuka. */
function charCard(ch,onPick,opts){
  opts=opts||{};
  const mystery=!!opts.mystery&&!revealedEnemy.has(ch.id);
  const d=document.createElement('div');
  const open=store.isOpen(ch.id);
  const secretLocked=!!ch.secret&&!open;
  const hidden=mystery||secretLocked;
  d.className='char-card'+(ch.secret?' secret':'')+(open?'':' locked')+(mystery?' mystery':'');
  d.dataset.id=ch.id;
  d.title=secretLocked?'Karakter RAHASIA — butuh '+ch.cost+' koin untuk membuka'
    :(open?ch.name+' — '+ch.title:'Terkunci — butuh '+ch.cost+' koin');
  const sk=ch.skills.map(s=>s.name).join(' • ');
  const face=ch.img
    ?`<img class="char-img${hidden?' sil':''}" src="${ch.img}" alt="${hidden?'???':ch.name}">`
    :`<div class="char-dot" style="background:${ch.body};border-color:${ch.accent}"></div>`;
  const tag=ch.secret?'<span class="secrettag">RAHASIA</span> ':'';
  const lockVeil=open?'':`<div class="lockveil"><span class="lockicon">${ICON.lock}</span></div>`;
  const lockTag=open?'':`<br><span class="locktag">${ICON.lock}BUTUH ${ch.cost} KOIN</span>`;
  const dName=mystery?'???':(secretLocked?'???':ch.name);
  const dTitle=mystery?'Lawan misterius':(secretLocked?'Karakter rahasia':ch.title);
  const dSk=hidden?'??? • ??? • ???':sk;
  const dUlt=hidden?'ULT: ???':'ULT: '+ch.ult.name;
  /* .card-detail = blok judul/skill/ult (disembunyikan di mode kompak HP);
     .locktag (harga) di luar <p> agar tetap tampil sebagai "nama + harga" */
  d.innerHTML=`${face}${lockVeil}<h3>${tag}${dName}</h3><p class="card-detail"><b>${dTitle}</b><br>${dSk}<br><span class="ult">${dUlt}</span></p>${lockTag}`;
  onTap(d,()=>{
    NWAudio.init();NWAudio.click();
    if(mystery){
      /* 1 ketuk = ungkap + langsung pilih (temuan QA: 2 klik tanpa petunjuk) */
      revealedEnemy.add(ch.id);
      buildEnemyGrid();
      const nc=document.querySelector('#enemy-grid .char-card[data-id="'+ch.id+'"]');
      toast('Lawan terungkap: '+ch.name);
      onPick(ch,nc||d);
      return;
    }
    if(!open){
      if(store.coins>=ch.cost){
        store.coins=store.coins-ch.cost;store.unlock(ch.id);
        NWAudio.win();buildCharGrid();buildEnemyGrid();updateCoinBar();
        toast(ch.name+' terbuka! Selamat bertarung.');
      }else{
        d.classList.remove('shake');void d.offsetWidth;d.classList.add('shake');
        toast(ch.name+' terkunci — butuh '+ch.cost+' koin (kamu: '+store.coins+').');
      }
      return;
    }
    onPick(ch,d);
  });
  return d;
}
function updateCoinBar(){
  document.querySelectorAll('.coinbar').forEach(el=>{el.innerHTML=ICON.coin+'KOIN: '+store.coins;});
}
/* ---------- PILIH KARAKTER ala referensi: grid portrait + splash art besar ----------
 * Splash: assets/splash/<id>.jpg (tim art); fallback ke portrait bila belum ada. */
let pIdx=0,eIdx=0;
function splashURL(ch){return 'assets/splash/'+ch.id+'.jpg?v=1';}
function setSplash(prefix,ch,hidden){
  const img=$(prefix+'-splash-img');if(!img)return;
  if(hidden){
    img.removeAttribute('src');img.alt='???';
    img.style.filter='brightness(0)';
    $(prefix+'-splash-name').textContent='???';
    $(prefix+'-splash-title').textContent='Lawan misterius';
    return;
  }
  img.style.filter='';
  img.onerror=function(){img.onerror=null;img.src=ch.img||'';};
  img.src=splashURL(ch);img.alt=ch.name;
  $(prefix+'-splash-name').textContent=ch.name;
  $(prefix+'-splash-title').textContent=ch.title||'';
}
function markSel(gridId,ch){
  document.querySelectorAll('#'+gridId+' .char-card').forEach(x=>
    x.classList.toggle('sel',x.dataset.id===ch.id));
}
function selectPlayer(ch){
  pChar=ch;pIdx=NWChars.indexOf(ch);
  markSel('char-grid',ch);
  setSplash('char',ch);
  $('btn-to-next').disabled=false;
}
function selectEnemy(ch){
  eChar=ch;eIdx=NWChars.indexOf(ch);
  markSel('enemy-grid',ch);
  setSplash('enemy',ch);
  $('btn-to-arena2').disabled=false;
}
/* panah kiri/kanan: ganti karakter (hanya yang sudah terbuka) */
function cycleSel(isEnemy,dir){
  let i=isEnemy?eIdx:pIdx;
  for(let n=0;n<NWChars.length;n++){
    i=(i+dir+NWChars.length)%NWChars.length;
    const ch=NWChars[i];
    if(store.isOpen(ch.id)){
      if(isEnemy)selectEnemy(ch);else selectPlayer(ch);
      NWAudio.init();NWAudio.click();
      return;
    }
  }
}
function buildCharGrid(){
  const pg=$('char-grid');pg.innerHTML='';
  NWChars.forEach(ch=>pg.appendChild(charCard(ch,(c)=>{
    if(!store.isOpen(c.id))return;
    selectPlayer(c);
  })));
  if(pChar)markSel('char-grid',pChar);
}
function buildEnemyGrid(){
  const eg=$('enemy-grid');eg.innerHTML='';
  NWChars.forEach(ch=>eg.appendChild(charCard(ch,(c)=>{
    if(!store.isOpen(c.id))return;
    selectEnemy(c);
  },{mystery:true})));
  if(eChar)markSel('enemy-grid',eChar);
}
/* ---------- PILIH ARENA ala referensi: grid thumbnail 4 kolom + preview besar ----------
 * 3 arena playable (thumbnail komposit dari art arena) + slot "SEGERA HADIR"
 * bergembok SVG (anti emoji). Thumbnail terpilih = border merah. */
const STAGE_DESC={
  konoha:'Gerbang Konoha — Desa Daun Tersembunyi. Bertarung di bawah rindang pohon sakura, ditemani kelopak bunga yang beterbangan.',
  lembah:'Lembah Akhir — Patung Madara & Hashirama. Medan legendaris tempat dua pendiri desa menentukan akhir pertarungan mereka.',
  akatsuki:'Malam Akatsuki — Bulan Merah. Arena mencekam di bawah bulan merah darah, dijaga pepohonan mati dan bara api beterbangan.'
};
const STAGE_SLOTS=8; /* 3 playable + 5 "segera hadir" = grid 4x2 */
function stageThumb(id){return 'assets/stages/'+id+'_thumb.jpg?v=1';}
function stagePrev(id){return 'assets/stages/'+id+'.jpg?v=1';}
function setStagePreview(id){
  const A=NWGame.ARENAS[id];if(!A)return;
  const img=$('arena-preview-img');
  if(img){img.style.opacity='1';
    img.onerror=function(){img.onerror=null;img.style.opacity='0.25';};
    img.src=stagePrev(id);img.alt=A.name;}
  const nm=$('arena-preview-name');if(nm)nm.textContent=A.name;
  const ds=$('arena-preview-desc');if(ds)ds.textContent=STAGE_DESC[id]||A.sub||'';
}
function buildArenaGrid(){
  const ag=$('arena-grid');if(!ag)return;ag.innerHTML='';
  const ids=Object.keys(NWGame.ARENAS);
  ids.forEach(id=>{
    const A=NWGame.ARENAS[id];
    const d=document.createElement('div');
    d.className='stage-card'+(arena===id?' sel':'');
    d.dataset.id=id;
    d.title=A.name+' — '+A.sub;
    d.innerHTML=`<img class="stage-thumb" src="${stageThumb(id)}" alt="${A.name}" loading="lazy">`+
      `<span class="stage-name">${A.name}</span>`;
    onTap(d,()=>{NWAudio.click();arena=id;setStagePreview(id);
      ag.querySelectorAll('.stage-card').forEach(x=>x.classList.remove('sel'));
      d.classList.add('sel');$('btn-fight').disabled=false;});
    ag.appendChild(d);
  });
  for(let i=ids.length;i<STAGE_SLOTS;i++){
    const d=document.createElement('div');
    d.className='stage-card locked';
    d.title='Stage baru segera hadir';
    d.innerHTML=`<span class="stage-lockbox">${ICON.lock}</span>`+
      `<span class="stage-name dim">SEGERA HADIR</span>`;
    onTap(d,()=>{NWAudio.click();toast('Stage baru segera hadir!');});
    ag.appendChild(d);
  }
  setStagePreview(arena);
}

/* ---------- input keyboard ---------- */
function keyVec(){
  let x=0,y=0;
  if(keys['a']||keys['arrowleft'])x-=1;
  if(keys['d']||keys['arrowright'])x+=1;
  if(keys['w']||keys['arrowup'])y-=1;
  if(keys['s']||keys['arrowdown'])y+=1;
  if(x&&y){x*=0.7071;y*=0.7071;}
  return{x,y};
}
const DIRKEYS={a:[-1,0],d:[1,0],w:[0,-1],s:[0,1],
  arrowleft:[-1,0],arrowright:[1,0],arrowup:[0,-1],arrowdown:[0,1]};
const lastDirTap={};
function keyDirTap(k){
  /* double-tap tombol arah = dash (ala Naruto Senki) */
  const now=performance.now();
  if(lastDirTap[k]&&now-lastDirTap[k]<350){
    lastDirTap[k]=0;
    const v=DIRKEYS[k];
    if(v)NWGame.playerDash(v[0],v[1]);
  }else lastDirTap[k]=now;
}
window.addEventListener('keydown',e=>{
  const k=e.key.toLowerCase();
  if(k===' '){ // SPASI = ATTACK (manual)
    e.preventDefault();
    if(!$('hud').classList.contains('hidden')&&!isPaused()) NWGame.playerAttack();
    return;
  }
  /* Esc / P = buka-tutup menu pause (hanya dalam battle) */
  if(k==='escape'||k==='p'){
    if(!e.repeat&&!$('hud').classList.contains('hidden')){
      e.preventDefault();setPaused(!isPaused());uiClick();
    }
    return;
  }
  keys[k]=true;
  if(['arrowup','arrowdown','arrowleft','arrowright'].includes(k))e.preventDefault();
  if($('hud').classList.contains('hidden'))return;
  if(isPaused())return; // input tempur mati total saat pause
  if(k==='z'||k==='j')NWGame.playerCast(0);
  if(k==='x'||k==='k')NWGame.playerCast(1);
  if(k==='c'||k==='l')NWGame.playerCast(2);
  if(k==='u')NWGame.playerCast(3);
  if(k==='shift')NWGame.playerDash();
  if(DIRKEYS[k]&&!e.repeat)keyDirTap(k);
  NWGame.setInput(keyVec().x,keyVec().y);
});
window.addEventListener('keyup',e=>{
  const k=e.key.toLowerCase();keys[k]=false;
  NWGame.setInput(keyVec().x,keyVec().y);
});

/* ---------- sentuh: 1 joystick analog + dash double-tap ---------- */
function setupTouch(){
  const stick=$('stick'),knob=$('stick-knob');
  let sid=null,cx=0,cy=0;const R=44;
  /* status deteksi "jentik" (flick): tengah -> tepi -> tengah = 1 tap arah */
  const tap={active:false,dir:null,t0:0};
  const lastTap={dir:null,t:0};
  const qdir=(dx,dy)=>Math.abs(dx)>=Math.abs(dy)?(dx>0?'R':'L'):(dy>0?'D':'U');
  const DIRV={R:[1,0],L:[-1,0],U:[0,-1],D:[0,1]};
  /* ubah arah tap ke koordinat dunia */
  const tapVec=d=>DIRV[d]||[1,0];
  stick.addEventListener('touchstart',e=>{
    e.preventDefault();NWAudio.init();
    document.body.classList.add('touchmode');
    const t=e.changedTouches[0];sid=t.identifier;
    const r=stick.getBoundingClientRect();cx=r.left+r.width/2;cy=r.top+r.height/2;
    tap.active=false;tap.dir=null;
  },{passive:false});
  window.addEventListener('touchmove',e=>{
    for(const t of e.changedTouches)if(t.identifier===sid){
      let dx=t.clientX-cx,dy=t.clientY-cy;
      const d=Math.hypot(dx,dy);
      if(d>R){dx=dx/d*R;dy=dy/d*R;}
      knob.style.transform=`translate(calc(-50% + ${dx}px),calc(-50% + ${dy}px))`;
      NWGame.setInput(dx/R,dy/R);
      /* deteksi jentik: dari tengah (<0.3R) ke tepi (>0.85R) lalu kembali */
      const mag=Math.hypot(dx,dy)/R;
      const now=performance.now();
      if(!tap.active&&mag>0.85){tap.active=true;tap.dir=qdir(dx,dy);tap.t0=now;}
      else if(tap.active&&mag<0.3){
        tap.active=false;
        if(now-tap.t0<300){
          if(lastTap.dir===tap.dir&&now-lastTap.t<450){
            lastTap.dir=null;lastTap.t=0;
            const v=tapVec(tap.dir);
            NWGame.playerDash(v[0],v[1]); // DOUBLE-TAP ARAH = DASH
          }else{lastTap.dir=tap.dir;lastTap.t=now;}
        }
      }
    }
  },{passive:true});
  const end=e=>{for(const t of e.changedTouches)if(t.identifier===sid){
    sid=null;tap.active=false;
    knob.style.transform='translate(-50%,-50%)';NWGame.setInput(0,0);}};
  window.addEventListener('touchend',end);
  window.addEventListener('touchcancel',end);
  document.querySelectorAll('.skbtn[data-sk]').forEach(b=>{
    b.addEventListener('touchstart',e=>{e.preventDefault();NWAudio.init();
      document.body.classList.add('touchmode');
      NWGame.playerCast(parseInt(b.dataset.sk,10));},{passive:false});
  });
  $('btn-atk').addEventListener('touchstart',e=>{e.preventDefault();NWAudio.init();
    document.body.classList.add('touchmode');NWGame.playerAttack();},{passive:false});
  /* klik mouse (desktop / emulator) untuk tombol skill */
  document.querySelectorAll('.skbtn[data-sk]').forEach(b=>{
    b.addEventListener('mousedown',e=>{e.preventDefault();NWGame.playerCast(parseInt(b.dataset.sk,10));});
  });
  $('btn-atk').addEventListener('mousedown',e=>{e.preventDefault();NWGame.playerAttack();});
  window.addEventListener('touchstart',()=>document.body.classList.add('touchmode'),{once:true,passive:true});
}

/* label tombol jutsu diisi dari karakter pemain (ikon + nama jutsu) */
function setSkillLabels(ch){
  for(let i=0;i<3;i++){
    const b=$('sk'+i);if(!b)continue;
    const sk=ch.skills[i];
    b.querySelector('b').textContent='J'+(i+1);
    b.title=(sk?sk.name:'')+(sk?' — '+sk.cost+' chakra':'');
    b.style.setProperty('--skc',sk&&sk.color?sk.color:'#2fa8ff');
    const lb=$('skn'+i);if(lb)lb.textContent=sk?sk.name:'';
  }
  const u=$('sk3');
  if(u){u.querySelector('b').textContent='ULT';u.title=ch.ult.name+' — '+ch.ult.cost+' chakra';
    u.style.setProperty('--skc',ch.ult.color||'#ffd23e');}
  const lu=$('skn3');if(lu)lu.textContent=ch.ult.name;
}

/* ---------- orientasi: BEBAS (aturan Bos 2026-10-05) ----------
 * TIDAK ADA lagi pemaksaan landscape: tanpa screen.orientation.lock,
 * tanpa overlay "PUTAR HP KAMU", tanpa putar-CSS paksa.
 * User main dengan orientasi apa pun yang dipegang. Game menyesuaikan:
 * portrait = kamera 620px mengikuti pemain (lihat js/game.js),
 * landscape = letterbox 960x540 seperti semula. */
function updateLayoutMode(){
  /* mode kompak: layar pendek (HP landscape kecil) — bukan paksaan orientasi */
  const compactLand=window.innerHeight<=470;
  document.body.classList.toggle('compactland',compactLand);
  document.body.classList.toggle('portrait',window.innerHeight>window.innerWidth);
}
window.addEventListener('resize',updateLayoutMode);
window.addEventListener('orientationchange',()=>setTimeout(updateLayoutMode,300));

/* ---------- tombol orientasi: OPSI, bukan paksaan (aturan Bos 2026-10-05) ----------
 * Ikon rotate di HUD (.hud-btns) + pojok layar judul. Klik = toggle:
 *   screen.orientation.lock('landscape') <-> screen.orientation.unlock()
 * Preferensi tersimpan di localStorage ('nw_orient'). TIDAK ADA overlay paksa,
 * TIDAK ADA auto-lock saat buka game — lock hanya aktif saat user mengetuk.
 * Promise rejection (browser menolak / butuh fullscreen) diabaikan diam-diam:
 * status dikembalikan agar ikon tetap jujur. */
let orientLocked=false;
/* v15: semua tombol orientasi (menu + HUD + pause) dicat sekaligus via [data-orient] */
function paintOrientBtns(){
  const ic=orientLocked?ICON.lock:ICON.rotate;
  document.querySelectorAll('[data-orient]').forEach(el=>{el.innerHTML=ic;});
}
function setOrientLock(want){
  orientLocked=want;
  try{
    const so=screen.orientation;
    if(so){
      let p;
      if(want)p=so.lock('landscape');
      else if(so.unlock)p=so.unlock();
      if(p&&p.catch)p.catch(()=>{orientLocked=!want;paintOrientBtns();}); // gagal diam-diam
    }
  }catch(e){orientLocked=!want;}
  try{localStorage.setItem('nw_orient',orientLocked?'landscape':'auto');}catch(e){}
  paintOrientBtns();
}
function setupOrientToggle(){
  /* pulihkan tampilan preferensi tersimpan — TANPA auto-lock */
  try{orientLocked=localStorage.getItem('nw_orient')==='landscape';}catch(e){orientLocked=false;}
  paintOrientBtns();
  document.querySelectorAll('[data-orient]').forEach(el=>{
    onTap(el,()=>{
      uiClick();
      setOrientLock(!orientLocked);
      toast(orientLocked?'Orientasi dikunci landscape':'Kunci orientasi dilepas');
    });
  });
}

/* ---------- suara: v15 class-based — semua tombol [data-sound] serentak ---------- */
function paintSoundBtns(){
  const ic=ICON[NWAudio.enabled?'volOn':'volOff'];
  document.querySelectorAll('[data-sound]').forEach(el=>{el.innerHTML=ic;});
}
function toggleSound(){
  NWAudio.setSfx(!NWAudio.enabled);
  paintSoundBtns();
}
/* klik UI yang tetap berbunyi walau SFX game di-mute saat pause */
function uiClick(){
  const p=NWAudio._paused;NWAudio._paused=false;
  NWAudio.init();NWAudio.click();NWAudio._paused=p;
}
/* fullscreen: opsi di HUD + menu pause */
async function toggleFullscreen(){
  try{
    if(document.fullscreenElement)await document.exitFullscreen();
    else await document.documentElement.requestFullscreen();
  }catch(e){toast('Browser tidak mendukung layar penuh');}
}

/* ---------- MENU PAUSE (v15) ----------
 * setPaused(true): NWGame.setPaused -> loop() melewati update/render total
 * (game-time berhenti: timer tak maju, musuh tak bergerak, cooldown diam),
 * SFX game di-mute via NWAudio._paused, overlay tampil (fade/scale CSS).
 * setPaused(false): lanjut — G.last sudah disegarkan tiap frame saat pause,
 * jadi tidak ada lompatan dt. */
let paused=false;
function isPaused(){return paused;}
function setPaused(v){
  v=!!v;
  if(v){
    /* pause hanya bermakna dalam battle (HUD tampil) */
    try{if($('hud').classList.contains('hidden'))return;}catch(e){return;}
  }
  if(v===paused){
    const ov=$('pause-overlay');if(ov)ov.classList.toggle('show',v);
    return;
  }
  paused=v;
  try{NWGame.setPaused(v);}catch(e){}
  NWAudio._paused=v;
  /* musik berhenti saat pause, lanjut saat resume */
  try{if(v)NWAudio.pauseBGM();else NWAudio.resumeBGM();}catch(e){}
  const ov=$('pause-overlay');
  if(ov)ov.classList.toggle('show',v);
}
function restartBattle(){
  /* MULAI ULANG: tutup pause, jalankan ulang match dengan konfigurasi sama.
     Pip ronde sesi (rwP/rwE) TIDAK direset — itu skor sesi, bukan match. */
  setPaused(false);
  launchBattle();
}
function quitToMenu(){
  setPaused(false);
  NWGame.stop();NWGame.clearView();rwP=0;rwE=0;
  $('hud').classList.add('hidden');
  const qo=$('quit-overlay');if(qo)qo.classList.remove('show');
  show('screen-title');
}

/* ---------- SCOREBOARD: portrait + kill/tumbang per petarung + timer + koin ---------- */
function scoreboardHTML(){
  const G=NWGame.getState();if(!G||!G.fighters)return'';
  const heroes=G.fighters.filter(h=>h.kind==='hero');
  const row=h=>{
    const me=h===G.player;
    return '<div class="sb-row'+(me?' me':'')+'">'+
      '<img src="'+(h.ch.img||'')+'" alt="'+h.ch.name+'">'+
      '<span class="sb-name">'+h.ch.name+'<small class="'+(h.team===0?'t0':'t1')+'">'+
      (h.team===0?'TIM KITA':'TIM MUSUH')+(me?' • KAMU':'')+'</small></span>'+
      '<span class="sb-k"><b>'+(h.kills||0)+'</b></span>'+
      '<span class="sb-d"><b>'+(h._pd||0)+'</b></span></div>';
  };
  const t0=heroes.filter(h=>h.team===0),t1=heroes.filter(h=>h.team===1);
  return '<div class="sb-head"><span></span><span>PETARUNG</span>'+
    '<span style="text-align:center">KILL</span><span style="text-align:center">TUMBANG</span></div>'+
    t0.map(row).join('')+t1.map(row).join('')+
    '<div class="sb-foot"><span>'+fmtT(G.time)+'</span><span>'+G.kills[0]+' : '+G.kills[1]+
    '</span><span>KOIN '+G.coins+'</span></div>';
}

/* ---------- DIALOG KELUAR: "Keluar dan kembali ke menu utama? Ya/Tidak" ---------- */
function openQuit(){
  /* buka di atas game yang di-pause; scoreboard live dari objek game */
  setPaused(true);
  const sb=$('quit-scoreboard');if(sb)sb.innerHTML=scoreboardHTML();
  $('quit-overlay').classList.add('show');
}
function closeQuit(){
  $('quit-overlay').classList.remove('show');
  setPaused(false);
}

/* ---------- pause: MUSIK & SUARA (tersambung ke NWAudio) ----------
 * MUSIK = NWAudio.bgm → BGM asli (menu/battle loop); tersimpan 'nw_bgm'.
 * SUARA = NWAudio.enabled → seluruh SFX; tersimpan 'nw_sfx'. */
function paintPauseToggles(){
  const bg=$('btn-bgm'),sf=$('btn-sfx');
  const setB=(el,on)=>{if(!el)return;el.classList.toggle('off',!on);
    const b=el.querySelector('b');if(b)b.textContent=on?'ON':'OFF';};
  setB(bg,NWAudio.bgm!==false);
  setB(sf,!!NWAudio.enabled);
}
function setupPauseToggles(){
  try{NWAudio.restorePrefs();}catch(e){}
  paintPauseToggles();
  onTap($('btn-bgm'),()=>{
    NWAudio.setBgm(!(NWAudio.bgm!==false));
    uiClick();paintPauseToggles();
    toast('Musik: '+(NWAudio.bgm!==false?'ON':'OFF'));
  });
  onTap($('btn-sfx'),()=>{
    NWAudio.setSfx(!NWAudio.enabled);
    uiClick();paintPauseToggles();
    toast('Suara: '+(NWAudio.enabled?'ON':'OFF'));
  });
}

/* ---------- HUD ---------- */
function fmtT(s){const m=Math.floor(s/60),ss=Math.floor(s%60);return m+':'+String(ss).padStart(2,'0');}
/* cache elemen HUD: tickHUD jalan tiap frame render — getElementById/querySelector
 * per frame adalah biaya DOM yang tak perlu. Dibangun malas (lazy) sekali. */
let _hudCache=null;
/* cache tanda tangan untuk blok HUD yang mahal (dibangun ulang hanya saat berubah) */
let _teamsSig='',_towersSig='';
function hud(){
  if(_hudCache)return _hudCache;
  const o={};
  ['hud','hud-php','hud-pghost','hud-pchakra','hud-timer','hud-kills','hud-coins',
   'hud-ehp','hud-eghost','hud-pname','hud-ptitle','hud-pport',
   'hud-ename','hud-etitle','hud-eport','hud-pips',
   'hud-hpnum','hud-coinnum','hud-sdots','hud-teams','hud-score-p','hud-score-e',
   'hud-towers','hud-killnum','hud-deathnum'].forEach(id=>{o[id]=$(id);});
  o.sk=[];
  for(let i=0;i<4;i++){
    const b=$('sk'+i);
    o.sk[i]=b?{b:b,cd:b.querySelector('.cd'),num:b.querySelector('.cdnum')}:null;
  }
  _hudCache=o;return o;
}
/* pip ronde (bulan): best-of-5 sesi ini — emas = kamu, merah = musuh */
function renderPips(){
  const el=$('hud-pips');if(!el)return;
  let h='';
  for(let i=0;i<3;i++)h+='<span class="pip'+(i<rwP?' wp':'')+'" title="Ronde kamu"></span>';
  h+='<span class="pipdiv"></span>';
  for(let i=0;i<3;i++)h+='<span class="pip'+(i<rwE?' we':'')+'" title="Ronde musuh"></span>';
  el.innerHTML=h;
}
/* blok portrait tim tengah: dibangun ulang hanya bila komposisi berubah */
function renderTeams(G,H){
  const heroes=(G.fighters||[]).filter(h=>h.kind==='hero');
  const sig=heroes.map(h=>h.ch.id+':'+h.team+(h.alive?'1':'0')).join('|');
  if(sig===_teamsSig)return;_teamsSig=sig;
  const el=H['hud-teams'];if(!el)return;
  const t0=heroes.filter(h=>h.team===0),t1=heroes.filter(h=>h.team===1);
  const im=h=>'<img class="t'+h.team+'" src="'+(h.ch.img||'')+'" alt="" title="'+h.ch.name+'" style="'+(h.alive?'':'opacity:.3;filter:grayscale(1)')+'">';
  el.innerHTML=t0.map(im).join('')+'<span class="tdiv"></span>'+t1.map(im).join('');
}
/* blok status tower kanan atas: ikon SVG per tower/base, redup bila hancur */
function renderTowers(G,H){
  const ts=(G.towers||[]).concat(G.bases||[]);
  const sig=ts.map(t=>t.kind+t.team+(t.alive?'1':'0')).join('|');
  if(sig===_towersSig)return;_towersSig=sig;
  const el=H['hud-towers'];if(!el)return;
  /* urut: tim 0 dulu lalu tim 1 (kiri=tim kita) */
  ts.sort((a,b)=>a.team-b.team);
  el.innerHTML=ts.map(t=>'<span class="tw t'+t.team+(t.alive?'':' dead')+'" title="'+
    (t.kind==='base'?'Base':'Tower')+' '+(t.team===0?'kita':'musuh')+'">'+ICON.tower+'</span>').join('');
}
function renderSkillDots(p,H){
  const el=H['hud-sdots'];if(!el)return;
  if(!el.children.length)el.innerHTML='<span class="sdot"></span>'.repeat(4);
  for(let i=0;i<4;i++){
    const sk=i<3?p.ch.skills[i]:p.ch.ult;
    const ready=p.cds[i]<=0&&p.chakra>=sk.cost;
    el.children[i].classList.toggle('on',ready);
    el.children[i].title=sk.name+(ready?' — siap':'');
  }
}
function tickHUD(){
  const H=hud();
  if(!H.hud||H.hud.classList.contains('hidden'))return;
  const G=NWGame.getState(),p=G.player;
  if(!p)return;
  /* lacak tumbang per hero (game.js tak menyimpan deaths) — untuk scoreboard */
  const hs=G.fighters||[];
  for(const h of hs){
    if(h.kind!=='hero')continue;
    if(h._pa===undefined){h._pa=true;h._pd=0;}
    if(h._pa&&!h.alive)h._pd++;
    h._pa=h.alive;
  }
  const pr=p.hp/p.maxhp;
  H['hud-php'].style.width=(100*pr)+'%';
  H['hud-php'].classList.toggle('low',pr<0.3);
  if(H['hud-hpnum'])H['hud-hpnum'].textContent=Math.ceil(p.hp);
  /* HP dua lapis: lapis putih menyusut perlahan mengikuti damage (ala fighting) */
  if(pr<ghostP-0.001){if(holdP>0)holdP--;else ghostP=Math.max(pr,ghostP-0.012);}
  else{ghostP=pr;holdP=22;}
  H['hud-pghost'].style.width=(100*ghostP)+'%';
  H['hud-pchakra'].style.width=(100*p.chakra/p.maxchakra)+'%';
  H['hud-timer'].textContent=fmtT(G.time);
  if(H['hud-killnum'])H['hud-killnum'].textContent=G.kills[0];
  if(H['hud-deathnum'])H['hud-deathnum'].textContent=p._pd||0;
  if(H['hud-coinnum'])H['hud-coinnum'].textContent=G.coins;
  if(H['hud-score-p'])H['hud-score-p'].textContent=G.kills[0];
  if(H['hud-score-e'])H['hud-score-e'].textContent=G.kills[1];
  renderTeams(G,H);renderTowers(G,H);renderSkillDots(p,H);
  const foe=G.fighters.find(h=>h.team===1&&h.kind==='hero');
  if(foe){
    const er=foe.hp/foe.maxhp;
    H['hud-ehp'].style.width=(100*er)+'%';
    if(er<ghostE-0.001){if(holdE>0)holdE--;else ghostE=Math.max(er,ghostE-0.012);}
    else{ghostE=er;holdE=22;}
    H['hud-eghost'].style.width=(100*ghostE)+'%';
  }
  for(let i=0;i<4;i++){
    const s=H.sk[i];if(!s)continue;
    const cd=p.cds[i],sk=i<3?p.ch.skills[i]:p.ch.ult;
    const frac=cd>0?cd/sk.cd:0;
    // cooldown radial
    if(s.cd)s.cd.style.background=frac>0
      ?`conic-gradient(rgba(0,0,0,.68) ${Math.round(frac*360)}deg, transparent 0deg)`:'none';
    if(s.num)s.num.textContent=cd>0?Math.ceil(cd):'';
    s.b.classList.toggle('ready',cd<=0&&p.chakra>=sk.cost);
  }
}

/* ---------- boot: loading -> splash -> judul ---------- */
const PRELOAD=[
  'assets/logo-naruto-war.png?v=1','assets/icon-lab-v2.jpg?v=3',
  'assets/title-art.jpg?v=1'
];
function boot(){
  NWChars.forEach(c=>{if(c.img)PRELOAD.push(c.img);});
  show('screen-loading');
  let done=0,fired=false;
  const total=PRELOAD.length+1; // +1 = paket sprite sheet
  const step=()=>{
    if(fired)return;
    done++;
    $('loadfill').style.width=Math.min(100,Math.round(done/total*100))+'%';
    $('loadtxt').textContent='Memuat aset... '+Math.min(done,total)+'/'+total;
    if(done>=total){fired=true;showSplash();}
  };
  PRELOAD.forEach(src=>{
    const im=new Image();
    let ok=false;
    const once=()=>{if(!ok){ok=true;step();}};
    im.onload=once;im.onerror=once;
    im.src=src;
    setTimeout(once,5000); // jangan macet bila gagal
  });
  /* sprite sheet karakter + FX (gagal = fallback prosedural, game tetap jalan) */
  const loadSprites=()=>{
    if(!window.NWSprite){step();return;}
    const jobs=NWChars.filter(c=>c.sprite).map(c=>NWSprite.load(c.id,c.sprite));
    jobs.push(NWSprite.loadFx(window.NWFxSheet||'assets/sprites/fx'));
    Promise.all(jobs).then(()=>{step();}).catch(()=>{step();});
    setTimeout(step,6000); // pengaman: jangan macet
  };
  loadSprites();
}
let splashTimer=null;
function showSplash(){
  show('screen-splash');
  const go=()=>{clearTimeout(splashTimer);show('screen-title');};
  splashTimer=setTimeout(go,2200);
  $('screen-splash').onclick=go;
}

/* ---------- alur ---------- */
let battleStarting=false;
function bindUI(){
  buildCharGrid();buildEnemyGrid();buildArenaGrid();
  /* arena default = konoha (sudah bertanda .sel) -> tombol MULAI aktif langsung
     (temuan QA: kartu terlihat terpilih tapi tombol nonaktif) */
  $('btn-fight').disabled=false;
  setupTouch();updateCoinBar();updateLayoutMode();setupOrientToggle();
  // suara hover di semua tombol
  document.addEventListener('mouseover',e=>{
    if(e.target.closest&&e.target.closest('.btn,.skbtn,.char-card,.mode-card,.stage-card,.iconbtn'))
      NWAudio.hover();
  });
  /* v15: tombol suara & fullscreen class-based (semua layar + HUD + pause) */
  paintSoundBtns();
  document.querySelectorAll('[data-sound]').forEach(el=>
    onTap(el,()=>{NWAudio.init();uiClick();toggleSound();}));
  document.querySelectorAll('[data-fs]').forEach(el=>
    onTap(el,()=>{uiClick();toggleFullscreen();}));
  // mode
  document.querySelectorAll('.mode-card').forEach(c=>onTap(c,()=>{
    NWAudio.init();NWAudio.click();mode=c.dataset.mode;
    document.querySelectorAll('.mode-card').forEach(x=>x.classList.remove('sel'));
    c.classList.add('sel');$('btn-to-char').disabled=false;
  }));
  /* pilihan kesulitan: state aktif jelas (emas + ceklis SVG + aria-pressed + toast),
     tersimpan ke `difficulty` lalu diteruskan ke NWGame.start saat bertarung */
  document.querySelectorAll('[data-diff]').forEach(b=>onTap(b,()=>{
    NWAudio.init();NWAudio.click();difficulty=b.dataset.diff;
    document.querySelectorAll('[data-diff]').forEach(x=>{
      x.classList.remove('sel');x.setAttribute('aria-pressed','false');
    });
    b.classList.add('sel');b.setAttribute('aria-pressed','true');
    toast('Kesulitan: '+b.textContent.trim());
  }));
  onTap($('btn-start'),()=>{NWAudio.init();NWAudio.click();show('screen-mode');});
  onTap($('btn-back-mode'),()=>{NWAudio.click();show('screen-title');});
  onTap($('btn-to-char'),()=>{NWAudio.click();
    document.querySelector('#screen-select .coinbar')||insertCoinBar('screen-select');
    updateCoinBar();show('screen-select');});
  onTap($('btn-back-select'),()=>{NWAudio.click();show('screen-mode');});
  onTap($('btn-to-next'),()=>{NWAudio.click();
    if(mode==='versus'){revealedEnemy.clear();eChar=null;buildEnemyGrid();
      setSplash('enemy',null,true);show('screen-enemy');}
    else show('screen-arena');});
  onTap($('btn-back-enemy'),()=>{NWAudio.click();show('screen-select');});
  onTap($('btn-to-arena2'),()=>{NWAudio.click();show('screen-arena');});
  onTap($('btn-back-arena'),()=>{NWAudio.click();show(mode==='versus'?'screen-enemy':'screen-select');});
  onTap($('btn-fight'),()=>{NWAudio.click();startBattle();});
  onTap($('btn-rematch'),()=>{uiClick();battleStarting=false;startBattle();});
  onTap($('btn-tomenu'),()=>{uiClick();quitToMenu();});
  /* keluar via dialog konfirmasi + scoreboard (ala referensi) */
  onTap($('btn-quit'),()=>{uiClick();openQuit();});
  onTap($('btn-quit-yes'),()=>{uiClick();quitToMenu();});
  onTap($('btn-quit-no'),()=>{uiClick();closeQuit();});
  /* panah splash pilih karakter / lawan */
  onTap($('btn-char-prev'),()=>cycleSel(false,-1));
  onTap($('btn-char-next'),()=>cycleSel(false,1));
  onTap($('btn-enemy-prev'),()=>cycleSel(true,-1));
  onTap($('btn-enemy-next'),()=>cycleSel(true,1));
  setupPauseToggles();
  /* pause dalam game (tombol HUD + keyboard Esc/P) */
  onTap($('btn-pause'),()=>{uiClick();setPaused(true);});
  onTap($('btn-resume'),()=>{setPaused(false);uiClick();});
  onTap($('btn-restart'),()=>{uiClick();restartBattle();});
  onTap($('btn-pause-menu'),()=>{uiClick();quitToMenu();});
  /* catatan: tombol paksa-landscape & kunci-orientasi DIHAPUS (aturan Bos:
     jangan paksa landscape). Fullscreen tetap tersedia sebagai opsi. */
  document.addEventListener('fullscreenchange',()=>{try{NWGame.resize();}catch(e){}});
  NWGame.onEnd((win,stats)=>{
    setPaused(false); // pengaman: overlay pause tak boleh nyangkut di layar akhir
    /* musik: menang → jingle victory (BGM battle berhenti); kalah → BGM berhenti */
    try{if(win)NWAudio.playVictory();else NWAudio.stopBGM();}catch(e){}
    if(win)rwP++;else rwE++;
    renderPips();
    store.coins=store.coins+(stats?stats.coins:0);
    updateCoinBar();
    $('hud').classList.add('hidden');
    $('end-title').textContent=win?'MENANG!':'KALAH';
    $('end-title').style.color=win?'#ffd23e':'#ff5e5e';
    const c=stats?stats.coins:0,k=stats?stats.kills:0;
    $('end-sub').textContent=(win?'Base musuh hancur! ':'')+k+' kill • +'+c+' koin (total: '+store.coins+')';
    const esb=$('end-scoreboard');if(esb)esb.innerHTML=scoreboardHTML();
    show('screen-end');
  });
}
function insertCoinBar(screenId){
  const panel=document.querySelector('#'+screenId+' .panel');
  const d=document.createElement('div');d.className='coinbar';d.innerHTML=ICON.coin+'KOIN: 0';
  panel.insertBefore(d,panel.firstChild);
}
/* inti mulai battle — dipakai startBattle (dari menu) & restartBattle (dari pause) */
function launchBattle(){
  show(null);
  try{NWAudio.playBGM('battle');}catch(e){} /* BGM battle */
  $('hud').classList.remove('hidden');
  document.querySelector('.hud-btns').style.display='block';
  setSkillLabels(pChar);
  NWGame.setInput(0,0);
  setPaused(false);
  NWGame.start({mode,arena,difficulty,player:pChar,enemy:eChar||pChar});
  setupBattleHUD();
}
function startBattle(){
  if(battleStarting)return; // cegah double-start (bug QA: klik ganda)
  battleStarting=true;
  const fb=$('btn-fight');
  const oldTxt=fb.innerHTML;fb.disabled=true;fb.innerHTML='MEMUAT ARENA...';
  /* beri browser satu frame untuk menggambar feedback sebelum kerja berat */
  setTimeout(()=>{
    launchBattle();
    fb.disabled=false;fb.innerHTML=oldTxt;
    battleStarting=false;
  },60);
}
/* isi HUD premium: portrait + nama + julukan kedua sisi, reset lapis HP & pip */
function setupBattleHUD(){
  ghostP=1;ghostE=1;holdP=0;holdE=0;
  _teamsSig='';_towersSig=''; // paksa bangun ulang blok tim & tower
  const G=NWGame.getState();
  $('hud-pname').textContent=pChar.name;
  $('hud-ptitle').textContent=pChar.title||'';
  const pp=$('hud-pport');
  pp.src=pChar.img||'';pp.alt=pChar.name;pp.style.display=pChar.img?'block':'none';
  let en='Tim Musuh',et='',eimg='';
  if(mode==='versus'&&eChar){en=eChar.name;et=eChar.title||'';eimg=eChar.img||'';}
  else if(mode==='training'){en='Boneka Kayu';et='Target Latihan';}
  else if(mode==='survival'){en='Gelombang';et='Musuh Tanpa Akhir';}
  else{const f=G.fighters.find(h=>h.team===1&&h.kind==='hero');
    if(f){en=f.ch.name;et=f.ch.title||'';eimg=f.ch.img||'';}}
  $('hud-ename').textContent=en;
  $('hud-etitle').textContent=et;
  const ep=$('hud-eport');
  ep.src=eimg;ep.alt=en;ep.style.display=eimg?'block':'none';
  renderPips();
}

window.NWUI={tickHUD,bindUI,boot,isPaused,setPaused};
})();
