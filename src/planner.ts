import { $, input, on, attempt, once, escape, dateHeading, saved } from './ui';
import { publicData } from './services';
import { dateKey, shiftDate, tasksFor, changeTask, uid, type Task, type PublicData } from './model';
import { calendar, dayButtons } from './calendar';
import { turnPage } from './page-turn';
let selected=dateKey(),revision=0,important=false,pending:Task|undefined;
const reasons=new Map<string,string>();
const forms=new Map<string,{text:string;notes:string;repeat:string;important:boolean}>();
function captureForm():void{forms.set(selected,{text:input('newTaskText').value,notes:input('newTaskNotes').value,repeat:input('repeatSelect').value,important});}
function restoreForm():void{const f=forms.get(selected);input('newTaskText').value=f?.text||'';input('newTaskNotes').value=f?.notes||'';input('repeatSelect').value=f?.repeat||'none';important=f?.important||false;updateStar();}
function updateStar():void{$('importantToggle').classList.toggle('active',important);$('importantToggle').textContent=important?'★ Important':'☆ Mark as important';$('importantToggle').setAttribute('aria-pressed',String(important));}
export async function renderPlanner():Promise<void>{
  const token=++revision,key=selected;dateHeading(key,'');
  const data=await publicData.read();if(token!==revision)return;
  const tasks=tasksFor(data,key),done=tasks.filter(t=>t.done).length;
  $('progressText').textContent=tasks.length?`${done} of ${tasks.length} done`:'No tasks';$('progressFill').style.width=`${tasks.length?done/tasks.length*100:0}%`;
  const list=$('dayTaskList');
  // Edited reasons are captured on input, so untouched disclosure fields stay closed.
  list.innerHTML=tasks.map(t=>`<div class="task-item-single ${t.done?'done':''} ${t.important?'important':''}" data-id="${t.id}" draggable="true">
    <input class="task-check" type="checkbox" aria-label="Complete ${escape(t.text)}" ${t.done?'checked':''}>
    <div class="task-main"><div class="task-text-row"><span class="task-text">${escape(t.text)}</span>${t.important?'<span class="priority-star">★</span>':''}${t.seriesId?'<span class="repeat-badge" aria-label="Repeating task">↻</span>':''}</div>${t.notes?`<div class="task-notes">${escape(t.notes)}</div>`:''}
    <details ${reasons.has(t.id)?'open':''}><summary class="reason-link">${t.reason?'Reason: '+escape(t.reason):'Add a reason or reflection'}</summary><div class="reason-input-row"><input data-reason="${t.id}" aria-label="Reason for this task" value="${escape(reasons.get(t.id)??t.reason)}"><button class="reason-save">Save</button></div></details></div>
    <div class="task-actions"><button class="icon-btn move-up" aria-label="Move task up">↑</button><button class="icon-btn move-down" aria-label="Move task down">↓</button><button class="task-del" aria-label="Delete ${escape(t.text)}">×</button></div></div>`).join('')||'<div class="empty">No tasks for this date.</div>';
  let dragged:string|undefined;
  for(const task of tasks){
    const row=[...list.children].find(el=>(el as HTMLElement).dataset.id===task.id) as HTMLElement;
    const run=(action:()=>Promise<void>)=>{void attempt(action);};
    row.querySelector<HTMLInputElement>('.task-check')!.onchange=e=>{const checked=(e.target as HTMLInputElement).checked;run(async()=>{await publicData.update(d=>changeTask(d,task,{done:checked}));saved();await renderPlanner();});};
    row.querySelector<HTMLButtonElement>('.task-del')!.onclick=()=>{
      if(task.seriesId){pending=task;$('recurringChoiceModal').classList.add('show');}
      else run(async()=>{await publicData.update(d=>{d.tasks=d.tasks.filter(t=>t.id!==task.id);});await renderPlanner();saved();});
    };
    const reason=row.querySelector<HTMLInputElement>('[data-reason]')!;reason.oninput=()=>reasons.set(task.id,reason.value);
    const saveReason=()=>run(async()=>{const value=reason.value;await publicData.update(d=>changeTask(d,task,{reason:value}));if(reasons.get(task.id)===value)reasons.delete(task.id);await renderPlanner();saved();});
    row.querySelector<HTMLButtonElement>('.reason-save')!.onclick=saveReason;reason.onkeydown=e=>{if(e.key==='Enter')saveReason();};
    for(const [selector,delta]of [['.move-up',-1],['.move-down',1]] as const)row.querySelector<HTMLButtonElement>(selector)!.onclick=()=>run(()=>move(task.id,delta,key));
    row.ondragstart=e=>{if((e.target as HTMLElement).matches('input')){e.preventDefault();return;}dragged=task.id;e.dataTransfer?.setData('text/plain',task.id);};
    row.ondragover=e=>e.preventDefault();row.ondrop=e=>{e.preventDefault();const from=dragged;if(from)run(()=>reorder(from,task.id,key));};
  }
}
function persistOrder(d:PublicData,key:string,ids:string[]):void{const tasks=tasksFor(d,key);ids.forEach((id,i)=>{const t=tasks.find(t=>t.id===id);if(t)changeTask(d,t,{order:i});});}
async function move(id:string,delta:number,key:string):Promise<void>{await publicData.update(d=>{const ids=tasksFor(d,key).map(t=>t.id),i=ids.indexOf(id),j=i+delta;if(i>=0&&j>=0&&j<ids.length){[ids[i],ids[j]]=[ids[j],ids[i]];persistOrder(d,key,ids);}});await renderPlanner();saved();}
async function reorder(from:string,to:string,key:string):Promise<void>{await publicData.update(d=>{const ids=tasksFor(d,key).map(t=>t.id),i=ids.indexOf(from),j=ids.indexOf(to);if(i>=0&&j>=0){ids.splice(i,1);ids.splice(j,0,from);persistOrder(d,key,ids);}});await renderPlanner();saved();}
export function initPlanner():void{
  for(const id of ['newTaskText','newTaskNotes','repeatSelect'])on(id,'input',captureForm);
  on('importantToggle','click',()=>{important=!important;updateStar();captureForm();});
  async function add():Promise<void>{await once('task-add',async()=>{
    captureForm();const key=selected,f={...forms.get(key)!},text=f.text.trim();if(!text)return;
    await publicData.update(d=>{
      if(f.repeat==='none')d.tasks.push({id:uid(),date:key,text,notes:f.notes,important:f.important,done:false,reason:'',order:Date.now()});
      else d.series.push({id:uid(),text,notes:f.notes,important:f.important,repeat:f.repeat as 'daily'|'weekly',start:key,exceptions:[],order:Date.now()});
    });
    if(selected===key){captureForm();if(JSON.stringify(forms.get(key))===JSON.stringify(f)){forms.delete(key);restoreForm();}}
    else if(JSON.stringify(forms.get(key))===JSON.stringify(f))forms.delete(key);
    saved();await renderPlanner();
  });}
  on('addTaskBtn','click',add);on('newTaskText','keydown',e=>{if((e as KeyboardEvent).key==='Enter')return add();});
  on('choiceCancel','click',()=>{pending=undefined;$('recurringChoiceModal').classList.remove('show');});
  for(const id of ['choiceJustThis','choiceAllFuture'])on(id,'click',async()=>{
    await once('recurring-delete',async()=>{const task=pending;if(!task)return;
      await publicData.update(d=>{
        const s=d.series.find(s=>s.id===task.seriesId);if(!s)return;
        if(id==='choiceJustThis'){if(!s.exceptions.includes(task.date))s.exceptions.push(task.date);d.tasks=d.tasks.filter(t=>!(t.seriesId===s.id&&t.date===task.date));}
        else{s.end=shiftDate(task.date,-1);d.tasks=d.tasks.filter(t=>!(t.seriesId===s.id&&t.date>=task.date));}
      });pending=undefined;$('recurringChoiceModal').classList.remove('show');await renderPlanner();saved();
    });
  });
  const select=async(key:string)=>{const previous=selected;captureForm();selected=key;restoreForm();await renderPlanner();if(selected===key&&previous!==key)turnPage($('dayTaskList'),key>previous?1:-1);};dayButtons('',()=>selected,select);
  calendar('','calendarOverlay',()=>selected,select,async()=>{const d=await publicData.read();return key=>tasksFor(d,key).length>0;});
}
