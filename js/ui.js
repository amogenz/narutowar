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

/* ---------- koin & unlock (localStorage) ---------- */
const store={
  get coins(){return parseInt(localStorage.getItem('nw_coins')||'0',10);},
  set coins(v){localStorage.setItem('nw_coins',String(v));},
  get unlocked(){try{return JSON.parse(localStorage.getItem('nw_unlocked')||'["naruto"]');}catch(e){return['naruto'];}},
  set unlocked(v){localStorage.setItem('nw_unlocked',JSON.stringify(v));},
  isOpen(id){return this.unlocked.includes(id);},
  unlock(id){
    const u=this.unlocked;if(!u.includes(id)){u.push(id);this.unlocked=u;}
  }
};

function show(id){
  document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active'));
  if(id)$(id).classList.add('active');
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
/* opts.mystery: tampil sebagai siluet "???" sampai diungkap (layar PILIH LAWAN) */
function charCard(ch,onPick,opts){
  opts=opts||{};
  const mystery=!!opts.mystery&&!revealedEnemy.has(ch.id);
  const d=document.createElement('div');
  const open=store.isOpen(ch.id);
  d.className='char-card'+(ch.secret?' secret':'')+(open?'':' locked')+(mystery?' mystery':'');
  d.dataset.id=ch.id;
  d.title=open?ch.name+' — '+ch.title:'Terkunci — butuh '+ch.cost+' koin';
  const sk=ch.skills.map(s=>s.name).join(' • ');
  const face=ch.img
    ?`<img class="char-img${mystery?' sil':''}" src="${ch.img}" alt="${mystery?'???':ch.name}">`
    :`<div class="char-dot" style="background:${ch.body};border-color:${ch.accent}"></div>`;
  const tag=ch.secret?'<span class="secrettag">RAHASIA</span> ':'';
  const lockVeil=open?'':`<div class="lockveil"><span class="lockicon">🔒</span></div>`;
  const lockTag=open?'':`<br><span class="locktag">🔒 BUTUH ${ch.cost} KOIN</span>`;
  const dName=mystery?'???':ch.name;
  const dTitle=mystery?'Lawan misterius':ch.title;
  const dSk=mystery?'??? • ??? • ???':sk;
  const dUlt=mystery?'ULT: ???':'ULT: '+ch.ult.name;
  d.innerHTML=`${face}${lockVeil}<h3>${tag}${dName}</h3><p><b>${dTitle}</b><br>${dSk}<br><span class="ult">${dUlt}</span>${lockTag}</p>`;
  onTap(d,()=>{
    NWAudio.init();NWAudio.click();
    if(mystery){
      /* ketuk pertama = ungkap siluet, ketuk kedua = pilih */
      revealedEnemy.add(ch.id);
      buildEnemyGrid();
      if(eChar){const s=document.querySelector('#enemy-grid .char-card[data-id="'+eChar.id+'"]');if(s)s.classList.add('sel');}
      toast('Lawan terungkap: '+ch.name+' — ketuk lagi untuk memilih.');
      return;
    }
    if(!open){
      if(store.coins>=ch.cost){
        store.coins=store.coins-ch.cost;store.unlock(ch.id);
        NWAudio.win();buildCharGrid();buildEnemyGrid();updateCoinBar();
        toast(ch.name+' terbuka! Selamat bertarung.');
      }else{
        d.classList.remove('shake');void d.offsetWidth;d.classList.add('shake');
        toast('🔒 '+ch.name+' terkunci — butuh '+ch.cost+' koin (kamu: '+store.coins+').');
      }
      return;
    }
    onPick(ch,d);
  });
  return d;
}
function updateCoinBar(){
  document.querySelectorAll('.coinbar').forEach(el=>el.textContent='KOIN: '+store.coins);
}
function buildCharGrid(){
  const pg=$('char-grid');pg.innerHTML='';
  NWChars.forEach(ch=>pg.appendChild(charCard(ch,(c,el)=>{
    pChar=c;
    pg.querySelectorAll('.char-card').forEach(x=>x.classList.remove('sel'));
    el.classList.add('sel');
    $('btn-to-next').disabled=false;
  })));
}
function buildEnemyGrid(){
  const eg=$('enemy-grid');eg.innerHTML='';
  NWChars.forEach(ch=>eg.appendChild(charCard(ch,(c,el)=>{
    eChar=c;
    eg.querySelectorAll('.char-card').forEach(x=>x.classList.remove('sel'));
    el.classList.add('sel');
    $('btn-to-arena2').disabled=false;
  },{mystery:true})));
}
function buildArenaGrid(){
  const ag=$('arena-grid');ag.innerHTML='';
  const prev={konoha:'linear-gradient(180deg,#5f9fdf 55%,#5da24c 55%)',
    lembah:'linear-gradient(180deg,#ff9a5a 55%,#8f6f3c 55%)',
    akatsuki:'linear-gradient(180deg,#1a1030 55%,#232a3a 55%)'};
  Object.keys(NWGame.ARENAS).forEach(id=>{
    const A=NWGame.ARENAS[id];
    const d=document.createElement('div');
    d.className='arena-card'+(arena===id?' sel':'');
    d.innerHTML=`<div class="arena-prev" style="background:${prev[id]}"></div><h3>${A.name}</h3><p>${A.sub}</p>`;
    onTap(d,()=>{NWAudio.click();arena=id;
      ag.querySelectorAll('.arena-card').forEach(x=>x.classList.remove('sel'));
      d.classList.add('sel');$('btn-fight').disabled=false;});
    ag.appendChild(d);
  });
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
    if(!$('hud').classList.contains('hidden')) NWGame.playerAttack();
    return;
  }
  keys[k]=true;
  if(['arrowup','arrowdown','arrowleft','arrowright'].includes(k))e.preventDefault();
  if($('hud').classList.contains('hidden'))return;
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
  /* ubah arah tap ke koordinat dunia (koreksi bila paksa-rotasi CSS aktif) */
  const tapVec=d=>{
    const v=DIRV[d]||[1,0];
    if(window.NWForceRotate)return[-v[1],v[0]];
    return v;
  };
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
      if(window.NWForceRotate)NWGame.setInput(-dy/R,dx/R);
      else NWGame.setInput(dx/R,dy/R);
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

/* ---------- landscape: auto + toggle manual ---------- */
function orientLocked(){
  return document.body.classList.contains('forcerotate') ||
    (screen.orientation&&screen.orientation.type&&screen.orientation.type.indexOf('landscape')===0);
}
async function lockLandscape(){
  try{
    if(document.documentElement.requestFullscreen)
      await document.documentElement.requestFullscreen().catch(()=>{});
    if(screen.orientation&&screen.orientation.lock)
      await screen.orientation.lock('landscape');
  }catch(e){}
  checkOrientation();updateOrientBtn();
}
function releaseOrientation(){
  try{if(document.exitFullscreen&&document.fullscreenElement)document.exitFullscreen().catch(()=>{});}catch(e){}
  try{if(screen.orientation&&screen.orientation.unlock)screen.orientation.unlock();}catch(e){}
  document.body.classList.remove('forcerotate');
  window.NWForceRotate=false;
  updateOrientBtn();checkOrientation();
}
function updateOrientBtn(){
  const b=$('btn-orient');if(!b)return;
  b.classList.toggle('locked',orientLocked());
  b.title=orientLocked()?'Lepas kunci landscape':'Kunci landscape';
}
async function tryLandscape(){ await lockLandscape(); }
function checkOrientation(){
  const portrait=window.innerHeight>window.innerWidth&&!document.body.classList.contains('forcerotate');
  $('rotate-overlay').classList.toggle('hidden',!portrait);
  if(!portrait)document.body.classList.remove('forcerotate');
  updateOrientBtn();
}
window.addEventListener('resize',checkOrientation);
window.addEventListener('orientationchange',()=>setTimeout(checkOrientation,300));

/* ---------- HUD ---------- */
function fmtT(s){const m=Math.floor(s/60),ss=Math.floor(s%60);return m+':'+String(ss).padStart(2,'0');}
/* pip ronde (bulan): best-of-5 sesi ini — emas = kamu, merah = musuh */
function renderPips(){
  const el=$('hud-pips');if(!el)return;
  let h='';
  for(let i=0;i<3;i++)h+='<span class="pip'+(i<rwP?' wp':'')+'" title="Ronde kamu"></span>';
  h+='<span class="pipdiv"></span>';
  for(let i=0;i<3;i++)h+='<span class="pip'+(i<rwE?' we':'')+'" title="Ronde musuh"></span>';
  el.innerHTML=h;
}
function tickHUD(){
  if($('hud').classList.contains('hidden'))return;
  const G=NWGame.getState(),p=G.player;
  if(!p)return;
  const pr=p.hp/p.maxhp;
  const php=$('hud-php');
  php.style.width=(100*pr)+'%';
  php.classList.toggle('low',pr<0.3);
  /* HP dua lapis: lapis putih menyusut perlahan mengikuti damage (ala fighting) */
  if(pr<ghostP-0.001){if(holdP>0)holdP--;else ghostP=Math.max(pr,ghostP-0.012);}
  else{ghostP=pr;holdP=22;}
  $('hud-pghost').style.width=(100*ghostP)+'%';
  $('hud-pchakra').style.width=(100*p.chakra/p.maxchakra)+'%';
  $('hud-timer').textContent=fmtT(G.time);
  $('hud-kills').textContent='KILL '+G.kills[0];
  $('hud-coins').textContent='KOIN '+G.coins;
  const foe=G.fighters.find(h=>h.team===1&&h.kind==='hero');
  if(foe){
    const er=foe.hp/foe.maxhp;
    $('hud-ehp').style.width=(100*er)+'%';
    if(er<ghostE-0.001){if(holdE>0)holdE--;else ghostE=Math.max(er,ghostE-0.012);}
    else{ghostE=er;holdE=22;}
    $('hud-eghost').style.width=(100*ghostE)+'%';
  }
  for(let i=0;i<4;i++){
    const b=$('sk'+i);if(!b)continue;
    const cd=p.cds[i],sk=i<3?p.ch.skills[i]:p.ch.ult;
    const frac=cd>0?cd/sk.cd:0;
    // cooldown radial
    b.querySelector('.cd').style.background=frac>0
      ?`conic-gradient(rgba(0,0,0,.68) ${Math.round(frac*360)}deg, transparent 0deg)`:'none';
    const cn=b.querySelector('.cdnum');if(cn)cn.textContent=cd>0?Math.ceil(cd):'';
    b.classList.toggle('ready',cd<=0&&p.chakra>=sk.cost);
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
  setupTouch();updateCoinBar();checkOrientation();
  // suara hover di semua tombol
  document.addEventListener('mouseover',e=>{
    if(e.target.closest&&e.target.closest('.btn,.skbtn,.char-card,.mode-card,.arena-card,.iconbtn'))
      NWAudio.hover();
  });
  const muteToggle=()=>{
    NWAudio.enabled=!NWAudio.enabled;
    const t=NWAudio.enabled?'🔊':'🔇';
    $('btn-sound').textContent=t;$('btn-mute-title').textContent=t;
  };
  onTap($('btn-mute-title'),()=>{NWAudio.init();muteToggle();});
  // mode
  document.querySelectorAll('.mode-card').forEach(c=>onTap(c,()=>{
    NWAudio.init();NWAudio.click();mode=c.dataset.mode;
    document.querySelectorAll('.mode-card').forEach(x=>x.classList.remove('sel'));
    c.classList.add('sel');$('btn-to-char').disabled=false;
  }));
  document.querySelectorAll('[data-diff]').forEach(b=>onTap(b,()=>{
    NWAudio.click();difficulty=b.dataset.diff;
    document.querySelectorAll('[data-diff]').forEach(x=>x.classList.remove('sel'));
    b.classList.add('sel');
  }));
  onTap($('btn-start'),()=>{NWAudio.init();NWAudio.click();show('screen-mode');});
  onTap($('btn-back-mode'),()=>{NWAudio.click();show('screen-title');});
  onTap($('btn-to-char'),()=>{NWAudio.click();
    document.querySelector('#screen-select .coinbar')||insertCoinBar('screen-select');
    updateCoinBar();show('screen-select');});
  onTap($('btn-back-select'),()=>{NWAudio.click();show('screen-mode');});
  onTap($('btn-to-next'),()=>{NWAudio.click();
    if(mode==='versus'){revealedEnemy.clear();buildEnemyGrid();show('screen-enemy');}
    else show('screen-arena');});
  onTap($('btn-back-enemy'),()=>{NWAudio.click();show('screen-select');});
  onTap($('btn-to-arena2'),()=>{NWAudio.click();show('screen-arena');});
  onTap($('btn-back-arena'),()=>{NWAudio.click();show(mode==='versus'?'screen-enemy':'screen-select');});
  onTap($('btn-fight'),()=>{NWAudio.click();startBattle();});
  onTap($('btn-rematch'),()=>{NWAudio.click();battleStarting=false;startBattle();});
  onTap($('btn-tomenu'),()=>{NWAudio.click();NWGame.stop();rwP=0;rwE=0;$('hud').classList.add('hidden');show('screen-title');});
  onTap($('btn-quit'),()=>{NWAudio.click();NWGame.stop();rwP=0;rwE=0;$('hud').classList.add('hidden');show('screen-title');});
  onTap($('btn-sound'),()=>{NWAudio.init();muteToggle();});
  onTap($('btn-force-landscape'),async()=>{
    NWAudio.init();NWAudio.click();
    try{
      if(document.documentElement.requestFullscreen)
        await document.documentElement.requestFullscreen().catch(()=>{});
      if(screen.orientation&&screen.orientation.lock){
        await screen.orientation.lock('landscape');checkOrientation();return;
      }
      throw 0;
    }catch(e){
      document.body.classList.add('forcerotate');
      window.NWForceRotate=true;
      $('rotate-overlay').classList.add('hidden');
      updateOrientBtn();
    }
  });
  onTap($('btn-orient'),async()=>{
    NWAudio.click();
    if(orientLocked())releaseOrientation();
    else await lockLandscape();
  });
  onTap($('btn-fs'),async()=>{
    NWAudio.click();
    try{
      if(document.fullscreenElement)await document.exitFullscreen();
      else await document.documentElement.requestFullscreen();
    }catch(e){toast('Browser tidak mendukung layar penuh');}
  });
  document.addEventListener('fullscreenchange',()=>{try{NWGame.resize();}catch(e){}});
  NWGame.onEnd((win,stats)=>{
    if(win)rwP++;else rwE++;
    renderPips();
    store.coins=store.coins+(stats?stats.coins:0);
    updateCoinBar();
    $('hud').classList.add('hidden');
    $('end-title').textContent=win?'MENANG!':'KALAH';
    $('end-title').style.color=win?'#ffd23e':'#ff5e5e';
    const c=stats?stats.coins:0,k=stats?stats.kills:0;
    $('end-sub').textContent=(win?'Base musuh hancur! ':'')+k+' kill • +'+c+' koin (total: '+store.coins+')';
    show('screen-end');
  });
}
function insertCoinBar(screenId){
  const panel=document.querySelector('#'+screenId+' .panel');
  const d=document.createElement('div');d.className='coinbar';d.textContent='KOIN: 0';
  panel.insertBefore(d,panel.firstChild);
}
function startBattle(){
  if(battleStarting)return; // cegah double-start (bug QA: klik ganda)
  battleStarting=true;
  const fb=$('btn-fight');
  const oldTxt=fb.innerHTML;fb.disabled=true;fb.innerHTML='MEMUAT ARENA...';
  /* beri browser satu frame untuk menggambar feedback sebelum kerja berat */
  setTimeout(()=>{
    show(null);
    $('hud').classList.remove('hidden');
    document.querySelector('.hud-btns').style.display='block';
    setSkillLabels(pChar);
    NWGame.setInput(0,0);
    tryLandscape();
    NWGame.start({mode,arena,difficulty,player:pChar,enemy:eChar||pChar});
    setupBattleHUD();
    fb.disabled=false;fb.innerHTML=oldTxt;
    battleStarting=false;
  },60);
}
/* isi HUD premium: portrait + nama + julukan kedua sisi, reset lapis HP & pip */
function setupBattleHUD(){
  ghostP=1;ghostE=1;holdP=0;holdE=0;
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

window.NWUI={tickHUD,bindUI,boot};
})();
