
'use strict';
const $=id=>document.getElementById(id);
const fresh=$('new'),old=$('old'),play=$('play'),seek=$('seek'),wipe=$('wipe'),status=$('status'),comparison=$('comparison');
const DURATION=355.348837,chapters=[...document.querySelectorAll('[data-time]')];
let dragging=false,comparisonOn=false,lastChapter=-1;
const stamp=t=>String(Math.floor(t/60)).padStart(2,'0')+':'+String(Math.floor(t%60)).padStart(2,'0');
function updateTime(){const t=fresh.currentTime;if(!dragging)seek.value=t;$('time').textContent=stamp(t)+' / 05:55';const i=chapters.findLastIndex(b=>t>=Number(b.dataset.time));if(i!==lastChapter){chapters.forEach((b,n)=>{b.classList.toggle('active',n===i);if(n===i)b.setAttribute('aria-current','true');else b.removeAttribute('aria-current')});lastChapter=i}}
function mode(v){v=Math.max(0,Math.min(100,Number(v)));wipe.value=v;fresh.style.clipPath=comparisonOn?`inset(0 ${100-v}% 0 0)`:'none';$('divider').style.left=v+'%';$('divider').hidden=!comparisonOn||v<1||v>99;$('v1pill').hidden=!comparisonOn||v>98;$('v2pill').hidden=!comparisonOn||v<2;document.querySelectorAll('[data-mode]').forEach(b=>{const active=Number(b.dataset.mode)===v;b.classList.toggle('active',active);b.setAttribute('aria-pressed',String(active))})}
function syncOld(force=false){if(!comparisonOn||old.readyState<1)return;const drift=old.currentTime-fresh.currentTime;if(force||Math.abs(drift)>.09){old.currentTime=fresh.currentTime;old.playbackRate=1}else old.playbackRate=Math.abs(drift)<.025?1:Math.min(1.03,Math.max(.97,1-drift*.4))}
async function playOld(){if(!comparisonOn)return;syncOld(true);try{await old.play()}catch{status.textContent='初版画面仍在加载，成片可以继续观看。'}}
function jump(t){fresh.currentTime=Math.min(DURATION-.001,Math.max(0,t));syncOld(true);updateTime()}
async function toggle(){if(!fresh.paused){fresh.pause();return}try{await fresh.play();status.textContent=''}catch{status.textContent='视频暂未开始，请稍后重试，或使用下方的成片下载。'}}
play.onclick=toggle;fresh.onplay=()=>{play.textContent='暂停';playOld()};fresh.onpause=()=>{play.textContent='播放';old.pause()};fresh.onended=()=>{old.pause();play.textContent='重播'};fresh.ontimeupdate=()=>{updateTime();if(!fresh.paused&&!old.seeking)syncOld()};fresh.onseeked=()=>syncOld(true);
seek.onpointerdown=()=>dragging=true;seek.oninput=()=>jump(Number(seek.value));seek.onchange=()=>{dragging=false;jump(Number(seek.value))};seek.onpointercancel=()=>dragging=false;
comparison.ontoggle=()=>{comparisonOn=comparison.open;old.hidden=!comparisonOn;if(comparisonOn){if(!old.getAttribute('src')){old.src=old.dataset.src;old.addEventListener('loadedmetadata',()=>{syncOld(true);if(!fresh.paused)playOld()},{once:true});old.load()}else{syncOld(true);if(!fresh.paused)playOld()}}else old.pause();mode(Number(wipe.value))};
wipe.oninput=()=>mode(wipe.value);document.querySelectorAll('[data-mode]').forEach(b=>b.onclick=()=>mode(b.dataset.mode));
const divider=$('divider');function dragWipe(e){const r=$('stage').getBoundingClientRect();mode((e.clientX-r.left)/r.width*100)}divider.onpointerdown=e=>{divider.setPointerCapture(e.pointerId);dragWipe(e)};divider.onpointermove=e=>{if(divider.hasPointerCapture(e.pointerId))dragWipe(e)};divider.onpointerup=e=>{if(divider.hasPointerCapture(e.pointerId))divider.releasePointerCapture(e.pointerId)};
chapters.forEach(b=>b.onclick=()=>{jump(Number(b.dataset.time));$('stage').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'center'})});
$('mute').onclick=e=>{fresh.muted=!fresh.muted;e.currentTarget.textContent=fresh.muted?'声音关':'声音开';e.currentTarget.setAttribute('aria-pressed',String(fresh.muted))};
function theater(on){$('screen').classList.toggle('theater',on);document.body.style.overflow=on?'hidden':'';$('fullscreen').textContent=on?'退出影院':'影院模式';$('fullscreen').setAttribute('aria-pressed',String(on))}$('fullscreen').onclick=()=>theater(!$('screen').classList.contains('theater'));
$('quality').onchange=e=>{const t=fresh.currentTime,resume=!fresh.paused;fresh.pause();fresh.addEventListener('loadedmetadata',()=>{fresh.currentTime=t;if(resume)toggle()},{once:true});fresh.src=e.target.value;fresh.load()};
document.addEventListener('keydown',e=>{if(e.key==='Escape')theater(false);if(e.target.closest('input,select,button,a,summary'))return;if(e.code==='Space'){e.preventDefault();toggle()}if(e.key==='ArrowRight'){e.preventDefault();jump(fresh.currentTime+5)}if(e.key==='ArrowLeft'){e.preventDefault();jump(fresh.currentTime-5)}});
fresh.onerror=()=>status.textContent='视频暂时未能加载，可以尝试切换画质，或下载成片观看。';old.onerror=()=>status.textContent='初版画面暂不可用，仍可正常观看 V2 成片。';mode(100);wipe.value=50;updateTime();
