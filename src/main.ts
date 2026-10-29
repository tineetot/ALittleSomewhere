import './styles.css';
import './stationery.css';
import { initBackdrop } from './backdrop';
import { $, on, attempt, initUI } from './ui';
import { initJournal, openJournal, flushJournal, privatePending, journalDecorationContext } from './journal';
import { initReflect, renderReflect, flushReflect, reflectPending } from './reflect';
import { initPlanner, renderPlanner } from './planner';
import { initPassport, renderPassport, flushPassport, passportPending } from './passport';
import { renderSpin } from './spin';
import { vault } from './services';
let active='planner';
let tabRevision=0;
async function renderActive():Promise<void>{
  if(active==='journal')await openJournal();if(active==='reflect')await renderReflect();if(active==='planner')await renderPlanner();if(active==='passport')await renderPassport();if(active==='wheel')await renderSpin();
}
export async function flushAll():Promise<void>{await Promise.all([vault.unlocked?flushJournal():Promise.resolve(),flushReflect(),flushPassport()]);}
initUI();initJournal();initReflect();initPlanner();initPassport();void attempt(initBackdrop);
document.querySelectorAll<HTMLButtonElement>('nav.tabs button').forEach(button=>button.onclick=()=>{void attempt(async()=>{
  const token=++tabRevision;active=button.dataset.tab!;
  document.querySelectorAll<HTMLButtonElement>('nav.tabs button').forEach(b=>{b.classList.toggle('active',b===button);b.setAttribute('aria-current',b===button?'page':'false');});
  document.querySelectorAll<HTMLElement>('.tab-panel').forEach(p=>p.classList.toggle('active',p.id===`tab-${active}`));
  journalDecorationContext(active==='journal');
  if(token===tabRevision)await renderActive();void attempt(flushAll);
});});
on('refreshView','click',async()=>{await flushAll();await renderActive();});
window.addEventListener('beforeunload',e=>{if(privatePending()||reflectPending()||passportPending()){e.preventDefault();e.returnValue='';}});
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden')void attempt(flushAll);});
void attempt(renderActive);
if(import.meta.env.PROD&&'serviceWorker' in navigator){
  let registration:ServiceWorkerRegistration|undefined;
  let refreshing=false;
  navigator.serviceWorker.addEventListener('controllerchange',()=>{if(refreshing)location.reload();});
  void navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).then(r=>{
    registration=r;
    if(r.waiting)$('updateNotice').hidden=false;
    r.addEventListener('updatefound',()=>{const worker=r.installing;worker?.addEventListener('statechange',()=>{if(worker.state==='installed'&&navigator.serviceWorker.controller)$('updateNotice').hidden=false;});});
  }).catch(()=>{$('offlineState').hidden=false;$('offlineState').textContent='Offline setup failed. Retry online.';});
  on('updateApp','click',async()=>{
    if(privatePending()||passportPending())throw new Error('Finish saving photos and private changes before updating.');
    await flushAll();refreshing=true;registration?.waiting?.postMessage({type:'ACTIVATE_UPDATE'});
  });
  on('checkUpdates','click',async()=>{await registration?.update();$('offlineState').hidden=false;$('offlineState').textContent=registration?.waiting?'Update available.':'Up to date.';});
}else $('checkUpdates').hidden=true;
