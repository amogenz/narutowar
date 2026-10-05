/* Naruto War — data karakter ninja */
window.NWChars = [
  {
    id:'naruto', name:'Naruto Uzumaki', title:'Jinchuriki Konoha', cost:0,
    body:'#ff8c1a', head:'#f2c19b', accent:'#1e4fd8',
    img:'assets/portraits/naruto.png?v=1',
    sprite:'assets/sprites/naruto',
    hp:110, speed:3.4, atk:8,
    skills:[
      {name:'Rasengan', desc:'Bola chakra spiral', cost:20, cd:4, kind:'blast', dmg:26, speed:9, color:'#4db8ff', radius:14, fx:'rasengan'},
      {name:'Kage Bunshin', desc:'2 klon bayangan 10 dtk', cost:25, cd:12, kind:'clone'},
      {name:'Fuuton: Renkudan', desc:'Gelombang angin', cost:20, cd:6, kind:'wave', dmg:18, speed:7, color:'#a8e6ff', radius:20}
    ],
    ult:{name:'Bijuudama', desc:'Bom bijuu raksasa', cost:70, cd:25, kind:'ultblast', dmg:70, speed:6, color:'#ff4d4d', radius:26, boom:95, fx:'explosion'}
  },
  {
    id:'sasuke', name:'Sasuke Uchiha', title:'Klan Uchiha Terakhir', cost:200,
    body:'#2a2f4d', head:'#f2c19b', accent:'#2a4bd7',
    img:'assets/portraits/sasuke.png?v=1',
    sprite:'assets/sprites/sasuke',
    hp:100, speed:3.6, atk:9,
    skills:[
      {name:'Chidori', desc:'Tusukan petir', cost:22, cd:5, kind:'dash', dmg:30, color:'#ffe14d', range:170, fx:'chidori'},
      {name:'Katon: Goukakyuu', desc:'Bola api besar', cost:20, cd:6, kind:'wave', dmg:20, speed:6.5, color:'#ff6a00', radius:20, fx:'katon'},
      {name:'Amaterasu', desc:'Api hitam 4 dtk', cost:25, cd:10, kind:'dot', dmg:9, dur:4, color:'#151515', radius:46}
    ],
    ult:{name:'Susanoo Slash', desc:'Tebasan Susanoo', cost:70, cd:25, kind:'nova', dmg:60, color:'#a64dff', radius:120, fx:'explosion'}
  },
  {
    id:'kakashi', name:'Kakashi Hatake', title:'Ninja Peniru', cost:150,
    body:'#1f4d3a', head:'#e8b98d', accent:'#c8c8c8',
    img:'assets/portraits/kakashi.png?v=1',
    sprite:'assets/sprites/kakashi',
    hp:105, speed:3.5, atk:8,
    skills:[
      {name:'Raikiri', desc:'Pedang petir', cost:22, cd:5, kind:'dash', dmg:28, color:'#66ccff', range:160, fx:'chidori'},
      {name:'Suiton: Suijinheki', desc:'Dinding air', cost:18, cd:6, kind:'wave', dmg:16, speed:7, color:'#3399ff', radius:20},
      {name:'Doton: Dinding Tanah', desc:'Perisai 6 dtk', cost:20, cd:12, kind:'shield', dur:6}
    ],
    ult:{name:'Kamui', desc:'Teleport + ledakan dimensi', cost:70, cd:25, kind:'kamui', dmg:55, color:'#5e2bd8', radius:110, fx:'explosion'}
  },
  {
    id:'sakura', name:'Sakura Haruno', title:'Ninja Medis Konoha', cost:50,
    body:'#c2274f', head:'#f2c19b', accent:'#ff8fb0',
    img:'assets/portraits/sakura.png?v=1',
    sprite:'assets/sprites/sakura',
    hp:115, speed:3.2, atk:10,
    skills:[
      {name:'Pukulan Sakura', desc:'Pukulan super', cost:20, cd:5, kind:'nova', dmg:30, color:'#ff9a3e', radius:80, fx:'explosion'},
      {name:'Shousen Jutsu', desc:'Pulihkan 40 HP', cost:25, cd:10, kind:'heal', amount:40, fx:'heal'},
      {name:'Gelombang Kejut', desc:'Shockwave chakra', cost:18, cd:6, kind:'wave', dmg:18, speed:7.5, color:'#ffc46b', radius:18}
    ],
    ult:{name:'Byakugou', desc:'Segel + ledakan chakra', cost:70, cd:25, kind:'healnova', heal:80, dmg:40, color:'#ff4dd2', radius:110, fx:'explosion'}
  },
  {
    id:'lee', name:'Rock Lee', title:'Ahli Taijutsu', cost:100,
    body:'#2f8f3f', head:'#e8b98d', accent:'#ffcf3e',
    img:'assets/portraits/lee.png?v=1',
    hp:105, speed:4.0, atk:9,
    skills:[
      {name:'Konoha Senpuu', desc:'Pusaran tendangan', cost:18, cd:4, kind:'nova', dmg:22, color:'#7dff8a', radius:75, fx:'slash'},
      {name:'Hachimon: Gerbang 1', desc:'Cepat 5 dtk', cost:20, cd:10, kind:'buff', dur:5},
      {name:'Omote Renge', desc:'Serangan berputar', cost:20, cd:6, kind:'dash', dmg:26, color:'#ffe14d', range:150}
    ],
    ult:{name:'Asa Kujaku', desc:'Merak pagi: 5 ledakan', cost:70, cd:25, kind:'multinova', dmg:15, color:'#ff7a1a', radius:90, hits:5, fx:'explosion'}
  },
  {
    id:'gaara', name:'Gaara', title:'Kazekage Pasir', cost:250,
    body:'#8f5f2f', head:'#e8b98d', accent:'#d9a441',
    img:'assets/portraits/gaara.png?v=1',
    hp:120, speed:3.0, atk:8,
    skills:[
      {name:'Sabaku Kyuu', desc:'Peti pasir (stun 2 dtk)', cost:22, cd:7, kind:'stun', dmg:15, speed:7, color:'#e0b25e', radius:14, stun:2},
      {name:'Perisai Pasir', desc:'Perisai 6 dtk', cost:20, cd:12, kind:'shield', dur:6},
      {name:'Sabaku Taisou', desc:'Gelombang pasir', cost:20, cd:6, kind:'wave', dmg:20, speed:6, color:'#d9a441', radius:22}
    ],
    ult:{name:'Sabaku Saitaisou', desc:'Kuburan pasir raksasa', cost:70, cd:25, kind:'nova', dmg:65, color:'#c98f2e', radius:130, fx:'explosion'}
  },
  {
    id:'itachi', name:'Itachi Uchiha', title:'Akatsuki • Mangekyou', cost:300,
    body:'#1c1c28', head:'#f2c19b', accent:'#c22a2a',
    img:'assets/portraits/itachi.png?v=1',
    sprite:'assets/sprites/itachi',
    hp:100, speed:3.5, atk:9,
    skills:[
      {name:'Tsukuyomi', desc:'Ilusi (stun 2 dtk)', cost:24, cd:9, kind:'stun', dmg:14, speed:8, color:'#c22a2a', radius:14, stun:2},
      {name:'Amaterasu', desc:'Api hitam 4 dtk', cost:25, cd:10, kind:'dot', dmg:9, dur:4, color:'#151515', radius:46},
      {name:'Katon: Goukakyuu', desc:'Bola api besar', cost:20, cd:6, kind:'wave', dmg:20, speed:6.5, color:'#ff6a00', radius:20, fx:'katon'}
    ],
    ult:{name:'Susanoo', desc:'Ksatria Susanoo', cost:70, cd:25, kind:'nova', dmg:62, color:'#ff3b3b', radius:125, fx:'explosion'}
  },
  {
    id:'joly', name:'Joly', title:'Maskot AMOGENZ LAB • Karakter Rahasia', cost:400,
    body:'#22c55e', head:'#e8b98d', accent:'#0b3d22', peci:true,
    img:'assets/portraits/joly.png?v=1', secret:true,
    sprite:'assets/sprites/joly',
    hp:115, speed:3.8, atk:9,
    skills:[
      {name:'Peci Spin', desc:'Putaran peci sakti', cost:20, cd:5, kind:'nova', dmg:24, color:'#7dff9e', radius:80, fx:'slash'},
      {name:'Gelombang Telepati', desc:'Sinyal telepati', cost:20, cd:6, kind:'wave', dmg:18, speed:7, color:'#7ee0ff', radius:18},
      {name:'Langkah Joly', desc:'Gerak kilat 5 dtk', cost:20, cd:10, kind:'buff', dur:5}
    ],
    ult:{name:'Amogenz Barrage', desc:'Rentetan lab 5 ledakan', cost:70, cd:25, kind:'multinova', dmg:16, color:'#ffd23e', radius:95, hits:5, fx:'explosion'}
  }
];

/* sheet FX jutsu bersama (assets/sprites/fx.png) — kontrak di assets/sprites/CONTRACT.md */
window.NWFxSheet = 'assets/sprites/fx';
