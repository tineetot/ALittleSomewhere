import { $, escape, on, attempt, once, saved, dirty, preparePhoto, showPhoto } from './ui';
import { publicData } from './services';
import { uid, FRAME_STYLES, type PublicData, type PhotoFrame } from './model';
import { frameOptions } from './photo-frames';
import { Drafts } from './drafts';
import { SerialQueue } from './storage';
const notes=new Drafts<string>(),saves=new SerialQueue();
const todoDrafts=new Map<string,string>();
let mode:'view'|'edit'='view',revision=0,timer:ReturnType<typeof setTimeout>|undefined;
const uploads=new Set<Promise<void>>();
const photoSelections=new Map<string,File[]>();
export const passportPending=()=>notes.size>0||uploads.size>0||photoSelections.size>0;
export async function mutatePassport(change?:(d:PublicData)=>void):Promise<void>{
  await saves.run(async()=>{const snapshot=notes.snapshot();await publicData.update(d=>{for(const [id,n]of snapshot){const entry=d.passport.find(p=>p.id===id);if(entry)entry.notes=n.value;}change?.(d);});notes.acknowledge(snapshot);if(!notes.size)saved();});
}
export async function flushPassport():Promise<void>{clearTimeout(timer);if(notes.size)await mutatePassport();await saves.idle();}
export async function renderPassport():Promise<void>{
  const token=++revision;
  document.querySelectorAll<HTMLButtonElement>('.mode-btn').forEach(b=>{b.classList.toggle('active',b.dataset.mode===mode);b.setAttribute('aria-pressed',String(b.dataset.mode===mode));});
  const data=await publicData.read();if(token!==revision)return;
  const focused=document.activeElement as HTMLTextAreaElement|null;
  const focus=focused?.matches('.notes-field')?{id:focused.closest<HTMLElement>('[data-id]')?.dataset.id,start:focused.selectionStart,end:focused.selectionEnd,scroll:focused.scrollTop}:undefined;
  $('passportList').querySelectorAll<HTMLInputElement>('.new-todo-input').forEach(el=>todoDrafts.set(el.closest<HTMLElement>('[data-id]')!.dataset.id!,el.value));
  $('passportList').innerHTML=data.passport.map(p=>{
    const note=notes.get(p.id)??p.notes;
    const date=new Date(p.date).toLocaleDateString(undefined,{weekday:'long',month:'long',day:'numeric',year:'numeric'});
    const title=`${escape(p.main.n)} <span class="sub">+ ${escape(p.side.n)}</span>`;
    if(mode==='view')return `<article class="view-card" data-id="${p.id}">${p.images.length?`<div class="view-gallery">${p.images.map((src,i)=>`<button class="photo-open photo-frame frame-${p.photoFrames?.[i]||'print'}" data-photo="${i}" aria-label="Open photo ${i+1}"><img src="${src}" alt="Solo date photo ${i+1}"></button>`).join('')}</div>`:''}<div class="view-card-body"><div class="view-card-date">${date}</div><h3 class="view-card-title">${title}</h3><div class="view-stars" aria-label="${p.rating} out of 5 stars">${'★'.repeat(p.rating)+'☆'.repeat(5-p.rating)}</div><div class="view-notes">${escape(note)||'No notes.'}</div><div class="view-todos">${p.todos.map(t=>`<div class="view-todo-row ${t.done?'done':''}"><span>${t.done?'✓':'○'}</span><span>${escape(t.text)}</span></div>`).join('')}</div></div></article>`;
    return `<article class="entry-page" data-id="${p.id}"><div class="entry-date">${date}</div><h3 class="entry-title">${title}</h3><div class="budget-pill">${escape(p.main.b)} · ${escape(p.side.b)}</div>
      <div class="stars" aria-label="Rate this date">${[1,2,3,4,5].map(n=>`<button class="icon-btn ${n<=p.rating?'filled':''}" data-rating="${n}" aria-label="${n} stars" aria-pressed="${n===p.rating}">${n<=p.rating?'★':'☆'}</button>`).join('')}</div>
      <label class="field-label" for="notes-${p.id}">Notes</label><textarea id="notes-${p.id}" class="notes-field" placeholder="How did it go? What did you notice?">${escape(note)}</textarea>
      <div class="field-label">To-dos</div>${p.todos.map(t=>`<div class="todo-row ${t.done?'done':''}" data-todo="${t.id}"><input class="todo-check" type="checkbox" aria-label="Complete ${escape(t.text)}" ${t.done?'checked':''}><span class="todo-text">${escape(t.text)}</span><button class="icon-btn todo-del" aria-label="Delete to-do">×</button></div>`).join('')}
      <div class="todo-row"><input class="new-todo-input" aria-label="New Passport to-do" placeholder="Something to try…" value="${escape(todoDrafts.get(p.id)||'')}"><button class="icon-btn add-todo">＋ Add</button></div>
      <div class="field-label">Photos</div><div class="imgs-row">${p.images.map((src,i)=>`<div class="passport-photo"><div class="photo-frame frame-${p.photoFrames?.[i]||'print'}"><img src="${src}" alt="Solo date photo ${i+1}"><button class="rm" data-remove="${i}" aria-label="Remove photo ${i+1}">×</button></div><label class="frame-control">Frame<select data-frame="${i}" aria-label="Frame for photo ${i+1}">${frameOptions(p.photoFrames?.[i])}</select></label></div>`).join('')}</div>
      <label class="upload-label">Add photos<input type="file" class="img-input" accept="image/*" multiple aria-label="Add Passport photos"></label>${photoSelections.has(p.id)?'<button class="ghost retry-photos">Retry selected photos</button>':''}<p class="photo-status" role="status"></p><button class="delete-entry">Delete this page</button></article>`;
  }).join('')||'<div class="card empty">No entries yet.</div>';
  for(const p of data.passport){
    const row=$('passportList').querySelector<HTMLElement>(`[data-id="${p.id}"]`)!;
    row.querySelectorAll<HTMLButtonElement>('[data-photo]').forEach(b=>b.onclick=()=>showPhoto(p.images[Number(b.dataset.photo)]));
    if(mode==='view')continue;
    const run=(action:()=>Promise<void>)=>{void attempt(action);};
    const note=row.querySelector<HTMLTextAreaElement>('.notes-field')!;
    note.oninput=()=>{notes.set(p.id,note.value);dirty();clearTimeout(timer);timer=setTimeout(()=>{void attempt(flushPassport);},350);};
    note.onblur=()=>run(flushPassport);
    row.querySelectorAll<HTMLButtonElement>('[data-rating]').forEach(b=>b.onclick=()=>run(async()=>{const rating=Number(b.dataset.rating);await mutatePassport(d=>{const e=d.passport.find(x=>x.id===p.id);if(e)e.rating=e.rating===rating?0:rating;});await renderPassport();}));
    const todo=row.querySelector<HTMLInputElement>('.new-todo-input')!;todo.oninput=()=>todoDrafts.set(p.id,todo.value);
    const add=()=>run(()=>once(`todo:${p.id}`,async()=>{const text=todo.value.trim(),id=uid();if(!text)return;await mutatePassport(d=>{d.passport.find(x=>x.id===p.id)?.todos.push({id,text,done:false});});if(todo.value.trim()===text){todo.value='';todoDrafts.delete(p.id);}await renderPassport();}));
    row.querySelector<HTMLButtonElement>('.add-todo')!.onclick=add;todo.onkeydown=e=>{if(e.key==='Enter')add();};
    row.querySelectorAll<HTMLElement>('[data-todo]').forEach(el=>{
      el.querySelector<HTMLInputElement>('.todo-check')!.onchange=e=>{const done=(e.target as HTMLInputElement).checked;run(async()=>{await mutatePassport(d=>{const t=d.passport.find(x=>x.id===p.id)?.todos.find(x=>x.id===el.dataset.todo);if(t)t.done=done;});await renderPassport();});};
      el.querySelector<HTMLButtonElement>('.todo-del')!.onclick=()=>run(async()=>{await mutatePassport(d=>{const e=d.passport.find(x=>x.id===p.id);if(e)e.todos=e.todos.filter(t=>t.id!==el.dataset.todo);});await renderPassport();});
    });
    row.querySelectorAll<HTMLButtonElement>('[data-remove]').forEach(b=>b.onclick=()=>run(async()=>{const index=Number(b.dataset.remove),source=p.images[index];await mutatePassport(d=>{const e=d.passport.find(x=>x.id===p.id);if(e){const target=e.images[index]===source?index:e.images.indexOf(source);if(target<0)return;e.photoFrames=e.images.map((_,i)=>e.photoFrames?.[i]||'print');e.photoFrames.splice(target,1);e.images.splice(target,1);}});await renderPassport();}));
    row.querySelectorAll<HTMLSelectElement>('[data-frame]').forEach(select=>select.onchange=()=>run(async()=>{
      const index=Number(select.dataset.frame),source=p.images[index],frame=select.value as PhotoFrame;if(!FRAME_STYLES.includes(frame))return;
      await mutatePassport(data=>{const entry=data.passport.find(e=>e.id===p.id);if(!entry)return;const target=entry.images[index]===source?index:entry.images.indexOf(source);if(target<0)return;entry.photoFrames=entry.images.map((_,i)=>entry.photoFrames?.[i]||'print');entry.photoFrames[target]=frame;});await renderPassport();
    }));
    const upload=row.querySelector<HTMLInputElement>('.img-input')!;
    const uploadPhotos=()=>once(`photos:${p.id}`,async()=>{
      const files=photoSelections.get(p.id)||[];if(!files.length)return;
      const operation=(async()=>{upload.disabled=true;const status=row.querySelector<HTMLElement>('.photo-status')!;
        try{status.textContent='Preparing photos…';const images:string[]=[];for(const file of files)images.push(await preparePhoto(file));await mutatePassport(d=>{const e=d.passport.find(x=>x.id===p.id);if(!e)throw new Error('This Passport page was removed.');e.images.push(...images);});photoSelections.delete(p.id);upload.value='';status.textContent='Photos saved';await renderPassport();}
        catch(e){status.textContent='Upload failed. Your selected files are retained. Use Retry to try again.';throw e;}finally{upload.disabled=false;}
      })();uploads.add(operation);try{await operation;}finally{uploads.delete(operation);}
    });
    upload.onchange=()=>{photoSelections.set(p.id,[...upload.files||[]]);run(uploadPhotos);};
    row.querySelector<HTMLButtonElement>('.retry-photos')?.addEventListener('click',()=>run(uploadPhotos));
    row.querySelector<HTMLButtonElement>('.delete-entry')!.onclick=()=>run(async()=>{if(!confirm('Delete this Passport page and its photos?'))return;await mutatePassport(d=>{d.passport=d.passport.filter(x=>x.id!==p.id);});todoDrafts.delete(p.id);photoSelections.delete(p.id);await renderPassport();});
  }
  if(focus?.id&&mode==='edit'){const field=$('passportList').querySelector<HTMLTextAreaElement>(`[data-id="${focus.id}"] .notes-field`);field?.focus({preventScroll:true});field?.setSelectionRange(focus.start,focus.end);if(field)field.scrollTop=focus.scroll;}
}
export function initPassport():void {document.querySelectorAll<HTMLButtonElement>('.mode-btn').forEach(b=>b.onclick=()=>{void attempt(async()=>{await flushPassport();mode=b.dataset.mode as 'view'|'edit';await renderPassport();});});}
