/* Naruto War — bootstrap.
 * Canvas di-resize dinamis = viewport x devicePixelRatio (max 2);
 * dunia logis tetap 960x540, game me-letterbox sendiri di render(). */
(function(){
'use strict';
function fit(){
  if(window.NWGame&&NWGame.resize)NWGame.resize();
}
window.addEventListener('load',()=>{
  NWGame.init(document.getElementById('game'));
  NWUI.bindUI();
  NWUI.boot();
  fit();
});
window.addEventListener('resize',fit);
window.addEventListener('orientationchange',()=>setTimeout(fit,300));
// cegah scroll/zoom gesture di HP
document.addEventListener('gesturestart',e=>e.preventDefault());
document.addEventListener('dblclick',e=>e.preventDefault(),{passive:false});
})();
