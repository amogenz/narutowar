/* ============================================================================
 * Naruto War — audio WebAudio: BGM loop (menu/battle), jingle victory, SFX.
 *
 * MUSIK 100% ORIGINAL — komposisi sendiri bergaya epik-ninja (taiko,
 * seruling ala-shakuhachi, string, brass, choir). BUKAN kutipan OST mana
 * pun (bukan "Departure To The Front Lines", bukan "Experienced Many
 * Battles", bukan karya Yasuharu Takanashi): hanya gayanya yang mirip —
 * orkestra pertempuran dengan taiko + seruling Jepang.
 *
 * File opsional assets/music/{menu,battle,victory}.mp3 dipakai bila ADA
 * (HEAD 200); bila 404 → synth bawaan di bawah yang dipakai. Lihat
 * assets/music/README.md.
 *
 * API yang dipakai ui.js / game.js (kompatibel ke belakang):
 *   enabled (SFX on/off), bgm (MUSIK on/off), _paused (mute SFX saat pause),
 *   init(), tone(), noise(), hit(), skill(), ult(), tower(), click(),
 *   hover(), win(), lose(), drum()
 * API baru:
 *   setBgm(on), setSfx(on), restorePrefs(),
 *   playBGM('menu'|'battle'), stopBGM(), pauseBGM(), resumeBGM(),
 *   playVictory()  (jingle heroik one-shot saat menang)
 * ========================================================================== */
(function(){
'use strict';
var AC = (typeof window!=='undefined') && (window.AudioContext||window.webkitAudioContext);
var N = function(m){ return 440*Math.pow(2,(m-69)/12); }; /* MIDI -> Hz */
var clampN = function(v,a,b){ return v<a?a:(v>b?b:v); };

/* ================= KOMPOSISI (original) ================= */
/* MENU — tenang tapi heroik. 60 BPM, ketuk = 1/8 (0.5 dtk), loop 32 ketuk
 * (4 birama). Pad: Am(add9) | Fmaj7 | C | G. Melodi seruling original. */
var MENU_CHORDS=[[57,60,64,71],[53,57,60,64],[48,55,60,64],[55,59,62,67]];
var MENU_MEL=[ /* [ketuk, midi, panjangKetuk] */
  [0,76,2],[2,74,2],[4,72,2],[6,74,2],
  [8,76,4],[12,72,4],
  [16,74,2],[18,76,2],[20,79,2],[22,76,2],
  [24,74,4],[28,69,4]
];
/* BATTLE — tempo cepat 132 BPM, ketuk = 1/16, loop 64 ketuk (4 birama).
 * Taiko drive sinkop + riff string 16-an + stab brass. */
var B_DON=[0,3,6,10,12,16,19,22,26,28,32,35,38,42,44,48,51,54,58,60];
var B_KA =[4,12,20,28,36,44,52,60];
var RIFF_AM=[45,0,45,45, 48,0,45,0, 52,0,48,45, 43,0,45,0];
var RIFF_F =[41,0,41,41, 45,0,41,0, 48,0,45,41, 40,0,41,0];
var RIFF_G =[43,0,43,43, 47,0,43,0, 50,0,47,43, 41,0,43,0];
var B_RIFFS=[RIFF_AM,RIFF_AM,RIFF_F,RIFF_G];
var B_STABS=[[57,60,64],[57,60,64],[53,57,60],[55,59,62]];
var B_BASS =[45,45,41,43];

var TRACKS={
  menu:{dur:0.5,len:32,step:function(s,t,A){
    var bar=(s/8)|0, st=s%8;
    if(st===0){
      A.pad(MENU_CHORDS[bar],t,3.9,0.055);
      A.taiko(t,0.20,100); /* don lembut tiap birama */
    }
    if(s===14||s===30) A.taiko(t,0.09,170); /* ka lembut (pickup) */
    for(var i=0;i<MENU_MEL.length;i++){
      var e=MENU_MEL[i];
      if(e[0]===s) A.flute(t,N(e[1]),e[2]*0.5*0.92,0.15);
    }
  }},
  battle:{dur:60/132/4,len:64,step:function(s,t,A){
    var bar=(s/16)|0, st=s%16;
    if(B_DON.indexOf(s)>=0) A.taiko(t,0.30,110);
    if(B_KA.indexOf(s)>=0)  A.taiko(t,0.16,190);
    var r=B_RIFFS[bar][st];
    if(r) A.strStacc(t,N(r),0.105,0.085);
    if(st%4===0) A.brass(t,N(B_BASS[bar]),0.22,0.10); /* bass per ketuk */
    if(st===0) A.brassChord(B_STABS[bar],t,0.42,0.095); /* stab akor */
  }}
};

/* ================= MESIN ================= */
var S={
  ctx:null, enabled:true, bgm:true, _paused:false, _gestured:false,
  _sGain:null, _mGain:null,
  _M:{kind:null,playing:false,step:0,next:0,timer:null,el:null},
  _want:null, _fileCache:{},

  /* --- lifecycle --- */
  init(){
    if(!this.ctx){
      if(!AC) return;
      try{ this.ctx=new AC(); }catch(e){ return; }
      var c=this.ctx;
      this._sGain=c.createGain(); this._sGain.gain.value=0.9;
      this._sGain.connect(c.destination);
      this._mGain=c.createGain(); this._mGain.gain.value=0.55;
      this._mGain.connect(c.destination);
    }
    if(this.ctx.state==='suspended'){
      try{ var p=this.ctx.resume(); if(p&&p.catch)p.catch(function(){}); }catch(e){}
    }
    this._gestured=true;
  },
  /* gestur pertama user: mulai BGM yang sudah diminta (autoplay policy).
     Dipisah dari init() agar klik UI saat pause (uiClick) tak me-restart BGM. */
  _onFirstGesture(){
    if(this._want&&this.bgm!==false&&!this._paused&&!this._M.playing)
      this._startTrack(this._want);
  },
  restorePrefs(){
    try{
      var b=localStorage.getItem('nw_bgm');
      if(b==='off')this.bgm=false; else if(b==='on')this.bgm=true;
      var s=localStorage.getItem('nw_sfx');
      if(s==='off')this.enabled=false; else if(s==='on')this.enabled=true;
    }catch(e){}
  },
  setBgm(on){
    this.bgm=!!on;
    try{ localStorage.setItem('nw_bgm',this.bgm?'on':'off'); }catch(e){}
    if(this.bgm){ this.resumeBGM(); }
    else this._stopTrack();
  },
  setSfx(on){
    this.enabled=!!on;
    try{ localStorage.setItem('nw_sfx',this.enabled?'on':'off'); }catch(e){}
  },

  /* --- BGM --- */
  playBGM(kind){
    if(!kind) return;
    if(this._M.playing&&this._M.kind===kind) return; /* sudah jalan */
    this._want=kind;
    if(this.bgm===false||!this._gestured) return; /* tunggu gestur/pref */
    this._startTrack(kind);
  },
  stopBGM(){ this._want=null; this._stopTrack(); },
  pauseBGM(){ this._stopTrack(); }, /* _want tetap → resume lanjut */
  resumeBGM(){
    if(this._paused) return; /* lanjutkan saat resume via setPaused(false) */
    if(this._want&&this.bgm!==false&&this._gestured&&!this._M.playing)
      this._startTrack(this._want);
  },
  _fileCheck(kind,cb){
    var c=this._fileCache;
    if(kind in c){ cb(c[kind]); return; }
    var url='assets/music/'+kind+'.mp3?v=1';
    if(typeof fetch==='undefined'){ c[kind]=false; cb(false); return; }
    fetch(url,{method:'HEAD'}).then(function(r){ c[kind]=!!r.ok; cb(!!r.ok); })
      .catch(function(){ c[kind]=false; cb(false); });
  },
  _startTrack(kind){
    if(!this.ctx) this.init();
    if(!this.ctx) return;
    this._stopTrack();
    var m=this._M, self=this;
    m.kind=kind; m.playing=true;
    this._fileCheck(kind,function(ok){
      if(!m.playing||m.kind!==kind) return; /* keburu diganti */
      if(ok){
        var el=new Audio('assets/music/'+kind+'.mp3?v=1');
        el.loop=true; el.volume=(kind==='battle'?0.55:0.45);
        m.el=el;
        try{ var p=el.play(); if(p&&p.catch)p.catch(function(){}); }catch(e){}
      }else{
        m.step=0; m.next=self.ctx.currentTime+0.1;
        m.timer=setInterval(function(){ self._tick(); },60);
      }
    });
  },
  _stopTrack(){
    var m=this._M;
    m.playing=false; m.kind=null;
    if(m.timer){ clearInterval(m.timer); m.timer=null; }
    if(m.el){ try{ m.el.pause(); m.el.removeAttribute('src'); }catch(e){} m.el=null; }
  },
  _tick(){
    var m=this._M;
    if(!m.playing||!m.timer||!this.ctx) return;
    var T=TRACKS[m.kind];
    if(!T||this.bgm===false||this._paused) return;
    var ahead=this.ctx.currentTime+0.4, guard=0;
    while(m.next<ahead&&guard++<256){
      T.step(m.step,m.next,this);
      m.next+=T.dur; m.step=(m.step+1)%T.len;
    }
  },

  /* --- victory jingle (one-shot, original) --- */
  playVictory(){
    this.stopBGM();
    if(this.bgm===false) return;
    this.init(); if(!this.ctx) return;
    var self=this;
    this._fileCheck('victory',function(ok){
      if(!self.ctx) return;
      if(ok){
        try{
          var el=new Audio('assets/music/victory.mp3?v=1');
          el.volume=0.5;
          var p=el.play(); if(p&&p.catch)p.catch(function(){});
        }catch(e){}
        return;
      }
      var t=self.ctx.currentTime+0.05, i;
      for(i=0;i<6;i++) self.taiko(t+i*0.13,0.14+0.03*i,120); /* roll taiko */
      var mt=t+0.85;
      var seq=[[69,0.32],[72,0.32],[76,0.32],[81,0.75]]; /* A4 C5 E5 A5 */
      seq.forEach(function(e2,idx){
        var tt=mt+idx*0.34;
        self.brass(tt,N(e2[0]),e2[1],0.14);
        self.flute(tt,N(e2[0]+12),e2[1],0.05);
      });
      var fc=mt+1.55; /* akor final Am */
      self.brassChord([57,60,64,69,76],fc,2.2,0.11);
      self.pad([57,60,64,69],fc,2.2,0.06);
      self.taiko(fc,0.32,100); self.taiko(fc+0.9,0.28,100);
      self.taiko(fc+1.6,0.22,140);
    });
  },

  /* ================= VOICE BGM (via _mGain) ================= */
  _env(t,peak,atk,dur){
    var g=this.ctx.createGain();
    g.gain.setValueAtTime(0.0001,t);
    g.gain.linearRampToValueAtTime(Math.max(0.0002,peak),t+atk);
    g.gain.exponentialRampToValueAtTime(0.0001,t+Math.max(atk+0.02,dur));
    return g;
  },
  _tone(t,f,dur,type,vol,slideTo,atk,dest){
    var c=this.ctx,o=c.createOscillator(),g=this._env(t,vol,atk||0.01,dur);
    o.type=type; o.frequency.setValueAtTime(Math.max(20,f),t);
    if(slideTo) o.frequency.exponentialRampToValueAtTime(Math.max(20,slideTo),t+dur);
    o.connect(g); g.connect(dest||this._sGain);
    o.start(t); o.stop(t+dur+0.05);
    return o;
  },
  _noiseBurst(t,dur,vol,fType,fFreq,fEnd,dest){
    var c=this.ctx,len=Math.max(1,(c.sampleRate*dur)|0);
    var buf=c.createBuffer(1,len,c.sampleRate),d=buf.getChannelData(0);
    for(var i=0;i<len;i++) d[i]=(Math.random()*2-1)*(1-i/len);
    var s=c.createBufferSource(); s.buffer=buf;
    var f=c.createBiquadFilter(); f.type=fType||'lowpass';
    f.frequency.setValueAtTime(fFreq||800,t);
    if(fEnd) f.frequency.exponentialRampToValueAtTime(Math.max(40,fEnd),t+dur);
    var g=this._env(t,vol,0.005,dur);
    s.connect(f); f.connect(g); g.connect(dest||this._sGain);
    s.start(t);
  },
  taiko(t,vol,base){ /* gendang perang: sine drop + snap */
    if(!this.ctx) return;
    this._tone(t,base||110,0.28,'sine',vol,42,0.004,this._mGain);
    this._noiseBurst(t,0.09,vol*0.5,'lowpass',900,200,this._mGain);
  },
  flute(t,f,dur,vol){ /* seruling: sine + vibrato + napas */
    if(!this.ctx) return;
    var c=this.ctx;
    dur=Math.max(0.12,dur);
    var o=c.createOscillator(),g=this._env(t,vol,0.08,dur);
    o.type='sine'; o.frequency.setValueAtTime(f,t);
    var lfo=c.createOscillator(),lg=c.createGain();
    lfo.frequency.value=5.5; lg.gain.value=f*0.006;
    lfo.connect(lg); lg.connect(o.frequency);
    lfo.start(t); lfo.stop(t+dur+0.05);
    var o2=c.createOscillator(),g2=c.createGain();
    o2.type='triangle'; o2.frequency.value=f*2; g2.gain.value=0.12;
    o.connect(g); o2.connect(g2); g2.connect(g); g.connect(this._mGain);
    o.start(t); o.stop(t+dur+0.05);
    o2.start(t); o2.stop(t+dur+0.05);
    this._noiseBurst(t,dur,vol*0.12,'bandpass',f*2,f*2,this._mGain);
  },
  strings(t,f,dur,vol){ /* string lembut: 2 saw detune, lowpass */
    if(!this.ctx) return;
    var c=this.ctx;
    dur=Math.max(0.3,dur);
    var g=this._env(t,vol,0.5,dur);
    var fl=c.createBiquadFilter(); fl.type='lowpass'; fl.frequency.value=1100;
    [-6,6].forEach(function(ct){
      var o=c.createOscillator(); o.type='sawtooth';
      o.frequency.value=f; o.detune.value=ct;
      o.connect(fl); o.start(t); o.stop(t+dur+0.1);
    });
    fl.connect(g); g.connect(this._mGain);
  },
  strStacc(t,f,dur,vol){ /* string staccato (riff battle) */
    if(!this.ctx) return;
    var c=this.ctx;
    dur=Math.max(0.08,dur);
    var g=this._env(t,vol,0.01,dur);
    var fl=c.createBiquadFilter(); fl.type='lowpass'; fl.frequency.value=2400;
    var o=c.createOscillator(); o.type='sawtooth'; o.frequency.value=f;
    o.connect(fl); fl.connect(g); g.connect(this._mGain);
    o.start(t); o.stop(t+dur+0.05);
  },
  brass(t,f,dur,vol){ /* brass heroik */
    if(!this.ctx) return;
    var c=this.ctx;
    dur=Math.max(0.12,dur);
    var g=this._env(t,vol,0.07,dur);
    var fl=c.createBiquadFilter(); fl.type='lowpass'; fl.frequency.value=2600;
    var o=c.createOscillator(); o.type='sawtooth'; o.frequency.value=f;
    o.connect(fl); fl.connect(g); g.connect(this._mGain);
    o.start(t); o.stop(t+dur+0.05);
  },
  brassChord(arr,t,dur,vol){
    for(var i=0;i<arr.length;i++) this.brass(t,N(arr[i]),dur,vol);
  },
  choir(t,f,dur,vol){ /* pad choir tipis */
    if(!this.ctx) return;
    var c=this.ctx;
    dur=Math.max(0.5,dur);
    var g=this._env(t,vol,0.7,dur);
    [0,4].forEach(function(ct){
      var o=c.createOscillator(); o.type='triangle';
      o.frequency.value=f; o.detune.value=ct;
      o.connect(g); o.start(t); o.stop(t+dur+0.1);
    });
    var sub=c.createOscillator(),sg=c.createGain();
    sub.type='sine'; sub.frequency.value=f/2; sg.gain.value=0.4;
    sub.connect(sg); sg.connect(g);
    sub.start(t); sub.stop(t+dur+0.1);
    g.connect(this._mGain);
  },
  pad(arr,t,dur,vol){ /* string + choir gabungan */
    for(var i=0;i<arr.length;i++){
      this.strings(t,N(arr[i]),dur,vol);
      this.choir(t,N(arr[i]),dur,vol*0.8);
    }
  },

  /* ================= SFX (via _sGain; hormat enabled & _paused) ================= */
  _sfxOk(){ return this.enabled&&!this._paused; },
  tone(freq,dur,type,vol,slide){
    if(!this._sfxOk()) return;
    this.init(); if(!this.ctx) return;
    this._tone(this.ctx.currentTime,freq,dur,type||'square',vol||0.12,slide,0.005,this._sGain);
  },
  noise(dur,vol){
    if(!this._sfxOk()) return;
    this.init(); if(!this.ctx) return;
    this._noiseBurst(this.ctx.currentTime,dur,vol||0.15,'lowpass',3000,300,this._sGain);
  },
  hit(){ /* pukulan: snap + thump */
    if(!this._sfxOk()) return;
    this.init(); if(!this.ctx) return;
    var t=this.ctx.currentTime;
    this._noiseBurst(t,0.07,0.22,'highpass',1200,4000,this._sGain);
    this._tone(t,160,0.12,'sine',0.28,55,0.004,this._sGain);
  },
  skill(){ /* jutsu: whoosh naik + kilau */
    if(!this._sfxOk()) return;
    this.init(); if(!this.ctx) return;
    var t=this.ctx.currentTime;
    this._noiseBurst(t,0.28,0.16,'bandpass',400,3200,this._sGain);
    this._tone(t,600,0.18,'triangle',0.08,1800,0.01,this._sGain);
  },
  ult(){ /* ledakan: sub drop + boom + crackle */
    if(!this._sfxOk()) return;
    this.init(); if(!this.ctx) return;
    var t=this.ctx.currentTime;
    this._tone(t,95,0.9,'sine',0.34,28,0.005,this._sGain);
    this._noiseBurst(t,0.7,0.30,'lowpass',2500,120,this._sGain);
    this._noiseBurst(t+0.05,0.4,0.18,'highpass',2000,6000,this._sGain);
  },
  tower(){ /* bangunan runtuh */
    if(!this._sfxOk()) return;
    this.init(); if(!this.ctx) return;
    var t=this.ctx.currentTime;
    this._tone(t,70,0.5,'triangle',0.30,36,0.008,this._sGain);
    this._noiseBurst(t,0.35,0.22,'lowpass',900,150,this._sGain);
  },
  click(){ /* klik UI */
    if(!this._sfxOk()) return;
    this.init(); if(!this.ctx) return;
    this._tone(this.ctx.currentTime,700,0.055,'triangle',0.09,500,0.004,this._sGain);
  },
  hover(){
    if(!this._sfxOk()) return;
    this.init(); if(!this.ctx) return;
    this._tone(this.ctx.currentTime,880,0.04,'sine',0.035,null,0.004,this._sGain);
  },
  win(){ /* fanfare mini (unlock & akhir match; jingle penuh via playVictory) */
    if(!this._sfxOk()) return;
    this.init(); if(!this.ctx) return;
    var t=this.ctx.currentTime+0.02, self=this;
    this.taiko(t,0.25,110);
    [[76,0],[79,0.14],[81,0.28]].forEach(function(e){
      self.brass(t+e[1],N(e[0]),0.3,0.12);
    });
  },
  lose(){ /* sting kalah: turun minor */
    if(!this._sfxOk()) return;
    this.init(); if(!this.ctx) return;
    var t=this.ctx.currentTime+0.02, self=this;
    [[64,0],[62,0.25],[60,0.5],[57,0.75]].forEach(function(e){
      self.strings(t+e[1],N(e[0]),0.5,0.10);
    });
  },
  drum(){ /* genta perang pembuka (hormat MUSIK) */
    if(this.bgm===false||this._paused) return;
    this.init(); if(!this.ctx) return;
    var t=this.ctx.currentTime+0.03, self=this;
    [[0,110,0.30],[0.22,110,0.28],[0.44,130,0.30],[0.66,110,0.28],[1.0,90,0.40]]
      .forEach(function(e){
        self._tone(t+e[0],e[1],0.3,'sine',e[2],40,0.004,self._mGain);
        self._noiseBurst(t+e[0],0.1,e[2]*0.4,'lowpass',700,150,self._mGain);
      });
  }
};

/* preferensi tersimpan langsung dipulihkan (sebelum ui.js bind) */
try{ S.restorePrefs(); }catch(e){}

/* gestur pertama user = kunci AudioContext (autoplay policy) */
if(typeof document!=='undefined'&&document.addEventListener){
  var unlock=function(){ S._gestured=true; S.init(); S._onFirstGesture(); };
  ['pointerdown','touchend','keydown'].forEach(function(ev){
    document.addEventListener(ev,unlock,{once:true,passive:true});
  });
}

window.NWAudio=S;
})();
