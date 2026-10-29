import { $, input, on, attempt, once, dateHeading, escape, saved, dirty } from './ui';
import { publicData } from './services';
import { dateKey, shiftDate, parseDate, uid } from './model';
import { PROMPTS, QUOTES } from './content';
import { Drafts } from './drafts';
import { SerialQueue } from './storage';
import { calendar, dayButtons } from './calendar';
import { turnPage } from './page-turn';
const drafts=new Drafts<string>(),saves=new SerialQueue();
let selected=dateKey(),revision=0,timer:ReturnType<typeof setTimeout>|undefined;
export const reflectPending=()=>drafts.size>0;
export async function flushReflect():Promise<void>{clearTimeout(timer);await saves.run(async()=>{const snapshot=drafts.snapshot();if(!snapshot.size)return;await publicData.update(data=>{for(const [key,d]of snapshot)data.answers[key]=d.value;});drafts.acknowledge(snapshot);if(!drafts.size)saved();});}
const index=(key:string)=>{const d=parseDate(key);return Math.floor((Date.UTC(d.getFullYear(),d.getMonth(),d.getDate())-Date.UTC(d.getFullYear(),0,0))/86400000);};
function streak(has:(key:string)=>boolean):number{let key=dateKey(),n=0;if(!has(key))key=shiftDate(key,-1);while(has(key)&&n<100000){n++;key=shiftDate(key,-1);}return n;}
export async function renderReflect():Promise<void>{
  const token=++revision,key=selected;dateHeading(key,'r');const q=QUOTES[index(key)%QUOTES.length];
  $('quoteCard').innerHTML=`<div class="quote-mark">“</div><div class="quote-text">${escape(q.t)}</div><div class="quote-author">— ${escape(q.a)}</div>`;
  $('promptText').textContent=PROMPTS[index(key)%PROMPTS.length];input('promptAnswer').disabled=true;input('promptAnswer').value=drafts.get(key)||'';
  const data=await publicData.read();if(token!==revision)return;
  input('promptAnswer').value=drafts.get(key)??data.answers[key]??'';input('promptAnswer').disabled=false;
  const items=data.gratitude.filter(g=>g.date===key);
  $('gratitudeList').innerHTML=items.map((g,i)=>`<div class="gratitude-item"><span class="g-num">${i+1}.</span><span class="g-text">${escape(g.text)}</span><button class="g-del" data-id="${g.id}" aria-label="Remove gratitude">×</button></div>`).join('')||'<p class="habit-empty">No gratitude added.</p>';
  $('gratitudeList').querySelectorAll<HTMLButtonElement>('button').forEach(b=>b.onclick=()=>{void attempt(async()=>{await publicData.update(d=>{d.gratitude=d.gratitude.filter(g=>g.id!==b.dataset.id);});await renderReflect();saved();});});
  $('streakRow').innerHTML=`<div class="streak-chip"><div class="num">${streak(k=>data.gratitude.some(g=>g.date===k))}</div><div class="label">Gratitude streak</div></div><div class="streak-chip"><div class="num">${streak(k=>!!(drafts.get(k)??data.answers[k])?.trim())}</div><div class="label">Reflection streak</div></div>`;
}
export function initReflect():void{
  on('promptAnswer','input',()=>{drafts.set(selected,input('promptAnswer').value);dirty();clearTimeout(timer);timer=setTimeout(()=>{void attempt(flushReflect);},350);});
  async function add():Promise<void>{await once('gratitude-add',async()=>{const key=selected,text=input('gratitudeInput').value.trim();if(!text)return;await publicData.update(d=>{d.gratitude.push({id:uid(),date:key,text});});if(input('gratitudeInput').value.trim()===text)input('gratitudeInput').value='';await renderReflect();saved();});}
  on('gratitudeAddBtn','click',add);on('gratitudeInput','keydown',e=>{if((e as KeyboardEvent).key==='Enter')return add();});
  const select=async(key:string)=>{const previous=selected;selected=key;await renderReflect();if(selected===key&&previous!==key)turnPage($('promptAnswer').parentElement!,key>previous?1:-1);void attempt(flushReflect);};dayButtons('R',()=>selected,select);
  calendar('R','calendarOverlayReflect',()=>selected,select,async()=>{const d=await publicData.read();return k=>!!(drafts.get(k)??d.answers[k])?.trim()||d.gratitude.some(g=>g.date===k);});
}
