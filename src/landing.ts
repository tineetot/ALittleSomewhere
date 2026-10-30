import { initLandingScene } from './landing-scene';
import './landing.css';
import { attempt } from './ui';
export function initLanding(flush:()=>Promise<void>):void{
const landing=document.getElementById('landing')!,shell=document.getElementById('appShell')!;
landing.innerHTML=`
<div class="welcome-mast"><div class="brand"><span class="seal"><img src="/icon-192.png" alt=""></span><span class="display italic">A Little Somewhere</span></div></div>
<div class="welcome-intro"><h1>A place for<br>your everyday.</h1></div>
<div class="diary-desk">
<button id="paperNote" class="desk-note" aria-label="Turn over the paper note" aria-pressed="false"><svg viewBox="0 0 100 80" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M50 32C20 0 8 30 43 39C5 60 22 78 50 44C78 78 95 60 57 39C92 30 80 0 50 32Z"/><path d="M47 40L37 69M53 40L63 69"/><circle cx="50" cy="38" r="6" fill="#f9cddd"/></svg></button>
<button id="pressedFlower" class="desk-flower" aria-label="Turn the pressed flower" aria-pressed="false"><svg viewBox="0 0 120 200" aria-hidden="true"><path d="M55 180Q84 90 61 48" fill="none" stroke="#707c59" stroke-width="3" stroke-linecap="round"/><g fill="#a6ad86" stroke="#707c59" stroke-width="2" stroke-linejoin="round"><path d="M65 138Q20 127 29 99Q64 99 65 138Z"/><path d="M70 112Q112 98 101 76Q72 78 70 112Z"/></g><g fill="#e8a8ba" stroke="#b7748d" stroke-width="1.4"><ellipse cx="59" cy="31" rx="14" ry="23"/><ellipse cx="59" cy="31" rx="14" ry="23" transform="rotate(72 59 48)"/><ellipse cx="59" cy="31" rx="14" ry="23" transform="rotate(144 59 48)"/><ellipse cx="59" cy="31" rx="14" ry="23" transform="rotate(216 59 48)"/><ellipse cx="59" cy="31" rx="14" ry="23" transform="rotate(288 59 48)"/></g><circle cx="59" cy="48" r="10" fill="#d4af69"/></svg></button>
<div class="diary-book" id="diaryBook"><div class="diary-inside" inert><h2 class="display italic">A Little<br>Somewhere</h2><a id="enterSpace" class="welcome-primary" href="#space">Open my space &nearr;</a></div>
<div class="diary-cover" id="diaryCover"><div class="cover-border"><div class="display italic">A Little<br>Somewhere</div><svg class="cover-flower" viewBox="0 0 100 110" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M49 99V49M49 83C22 85 17 66 23 62C42 60 49 75 49 83ZM49 70C75 71 84 54 78 50C61 49 50 60 49 70Z"/><g transform="translate(49 30)"><path d="M0-9C-20-37-33-12-13-2C-43 2-24 29-8 13C-6 44 21 31 11 12C39 26 41-4 15-5C33-29 4-39 0-9Z"/><circle r="8"/><circle r="3" fill="currentColor" stroke="none"/></g></svg></div><span class="diary-ribbon"></span></div></div>
<span class="desk-pencil" aria-hidden="true"></span></div>
<div class="welcome-actions"><button id="openDiary" class="welcome-primary" aria-controls="diaryBook" aria-expanded="false">Open diary &nearr;</button><p id="diaryStatus" class="welcome-sr" role="status"></p></div>`;
initLandingScene(landing);
let opened=false,opening=false;
const open=document.getElementById('openDiary') as HTMLButtonElement,enter=document.getElementById('enterSpace')!,inside=landing.querySelector<HTMLElement>('.diary-inside')!;
open.onclick=async()=>{if(opening||opened)return;opening=true;open.disabled=true;open.setAttribute('aria-expanded','true');landing.classList.add('diary-open');if(!matchMedia('(prefers-reduced-motion: reduce)').matches)await new Promise(r=>setTimeout(r,1250));opened=true;opening=false;inside.inert=false;document.getElementById('diaryCover')!.setAttribute('aria-hidden','true');open.hidden=true;document.getElementById('diaryStatus')!.textContent='Diary opened.';if(!landing.hidden)enter.focus({preventScroll:true});};
for(const id of ['paperNote','pressedFlower']){const button=document.getElementById(id)!;button.onclick=()=>{const pressed=button.getAttribute('aria-pressed')!=='true';button.setAttribute('aria-pressed',String(pressed));};}
const show=(space:boolean,focus:boolean)=>{shell.hidden=!space;shell.inert=!space;landing.hidden=space;landing.inert=space;document.body.classList.toggle('on-cover',!space);document.querySelector<HTMLAnchorElement>('.skip-link')!.href=space?'#mainContent':'#openDiary';if(focus){window.scrollTo(0,0);if(space){const main=document.getElementById('mainContent')!;main.tabIndex=-1;main.focus({preventScroll:true});}else(opened?enter:open).focus({preventScroll:true});}};
let revision=0;
window.addEventListener('hashchange',()=>{const token=++revision;void attempt(async()=>{const space=location.hash==='#space';if(!space){try{await flush();}catch(error){history.replaceState(null,'','#space');throw error;}}if(token===revision)show(space,true);});});
document.getElementById('returnCover')!.onclick=()=>{void attempt(async()=>{await flush();location.hash='cover';});};
show(location.hash==='#space',false);
}
