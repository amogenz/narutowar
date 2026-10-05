/* Naruto War — audio WebAudio sederhana (bisa dimatikan) */
(function(){
  const S = {
    ctx:null, enabled:true,
    /* _paused: di-set ui.js saat menu pause terbuka — SFX game dibisukan
       sementara (klik UI tetap bisa bunyi via uiClick yang membuka kunci sesaat) */
    _paused:false,
    init(){
      if(!this.ctx){
        try{ this.ctx = new (window.AudioContext||window.webkitAudioContext)(); }catch(e){}
      }
      if(this.ctx && this.ctx.state==='suspended' && !this._paused) this.ctx.resume();
    },
    tone(freq,dur,type,vol,slide){
      if(!this.enabled||this._paused) return;
      this.init();
      if(!this.ctx) return;
      const t=this.ctx.currentTime, o=this.ctx.createOscillator(), g=this.ctx.createGain();
      o.type=type||'square'; o.frequency.setValueAtTime(freq,t);
      if(slide) o.frequency.exponentialRampToValueAtTime(Math.max(30,slide),t+dur);
      g.gain.setValueAtTime(vol||0.12,t);
      g.gain.exponentialRampToValueAtTime(0.001,t+dur);
      o.connect(g); g.connect(this.ctx.destination);
      o.start(t); o.stop(t+dur+0.02);
    },
    noise(dur,vol){
      if(!this.enabled||this._paused) return;
      this.init(); if(!this.ctx) return;
      const t=this.ctx.currentTime, len=this.ctx.sampleRate*dur, buf=this.ctx.createBuffer(1,len,this.ctx.sampleRate);
      const d=buf.getChannelData(0);
      for(let i=0;i<len;i++) d[i]=(Math.random()*2-1)*(1-i/len);
      const s=this.ctx.createBufferSource(), g=this.ctx.createGain();
      s.buffer=buf; g.gain.value=vol||0.15;
      s.connect(g); g.connect(this.ctx.destination); s.start(t);
    },
    hit(){ this.noise(0.08,0.12); },
    skill(){ this.tone(300,0.18,'sawtooth',0.1,900); },
    ult(){ this.tone(120,0.7,'sawtooth',0.16,40); this.noise(0.5,0.2); },
    tower(){ this.tone(90,0.4,'triangle',0.18,45); this.noise(0.3,0.18); },
    win(){ [523,659,784,1046].forEach((f,i)=>setTimeout(()=>this.tone(f,0.25,'square',0.1),i*130)); },
    lose(){ [400,320,240,160].forEach((f,i)=>setTimeout(()=>this.tone(f,0.3,'sawtooth',0.1),i*150)); },
    drum(){ // genta perang
      [0,180,360,540,800].forEach((d,i)=>{
        setTimeout(()=>{ this.tone(i===4?70:55,0.35,'sine',0.28,38); this.noise(0.12,0.1); },d);
      });
    },
    hover(){ this.tone(880,0.04,'sine',0.04); },
    click(){ this.tone(600,0.06,'square',0.07); }
  };
  window.NWAudio = S;
})();
