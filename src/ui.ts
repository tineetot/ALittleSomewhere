import DOMPurify from 'dompurify';
export const $ = <T extends HTMLElement=HTMLElement>(id:string):T => {const el=document.getElementById(id);if(!el)throw new Error(`Missing UI element ${id}`);return el as T;};
export const input = (id:string) => $<HTMLInputElement>(id);
export const escape = (value:string) => value.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
export function sanitize(html:string):string {
  const clean=DOMPurify.sanitize(html,{ALLOWED_TAGS:['p','div','br','b','strong','i','em','u','s','ul','ol','li','blockquote','mark','span'],ALLOWED_ATTR:['class','data-note-id'],ALLOW_DATA_ATTR:false});
  const template=document.createElement('template');template.innerHTML=clean;
  template.content.querySelectorAll<HTMLElement>('*').forEach(el=>{
    el.removeAttribute('class');
    if(el.tagName==='MARK'&&/^[a-zA-Z0-9-]{1,80}$/.test(el.dataset.noteId||''))el.className='note-highlight';
    else el.removeAttribute('data-note-id');
  });
  return template.innerHTML;
}
export const on = (id:string,event:string,action:(e:Event)=>void|Promise<void>) => $(id).addEventListener(event,e=>{void attempt(()=>Promise.resolve(action(e)));});
let retry: (()=>Promise<unknown>)|undefined;
let errorRevision=0;
export function error(message:string,action?:()=>Promise<unknown>):void {errorRevision++;$('appErrorText').textContent=message;retry=action;$('appRetry').hidden=!action;$('appError').hidden=false;}
export function clearError():void {retry=undefined;$('appErrorText').textContent='';$('appError').hidden=true;}
export async function attempt<T>(action:()=>Promise<T>):Promise<T|undefined> {const revision=errorRevision;try{const result=await action();if(revision===errorRevision)$('appError').hidden=true;return result;}catch(e){error(e instanceof Error?e.message:'This action could not finish. Your input is still here.',action);}}
let saveNoticeTimer:ReturnType<typeof setTimeout>|undefined;
function saveNotice(text:string):void {clearTimeout(saveNoticeTimer);$('saveState').textContent=text;$('saveState').classList.add('show');}
export function saved():void {saveNotice('Saved');saveNoticeTimer=setTimeout(()=>$('saveState').classList.remove('show'),2200);}
export function saving():void {saveNotice('Saving…');}
export function dirty():void {saveNotice('Unsaved');}
const busy=new Set<string>();
export async function once(name:string,action:()=>Promise<void>):Promise<void> {if(busy.has(name))return;busy.add(name);try{await action();}finally{busy.delete(name);}}
export function initUI():void {
  const closeDecorations=()=>{$<HTMLDetailsElement>('decorateDrawer').open=false;$('decorateDrawer').querySelector('summary')?.focus();};
  on('closeDecorate','click',closeDecorations);
  // Some touch engines suppress the compatibility click immediately after a captured drag.
  let closeTouch:{id:number;x:number;y:number}|undefined;
  $('closeDecorate').addEventListener('pointerdown',event=>{if(event.pointerType==='touch')closeTouch={id:event.pointerId,x:event.clientX,y:event.clientY};});
  $('closeDecorate').addEventListener('pointercancel',()=>{closeTouch=undefined;});
  $('closeDecorate').addEventListener('pointerup',event=>{const start=closeTouch;closeTouch=undefined;if(start&&start.id===event.pointerId&&Math.hypot(event.clientX-start.x,event.clientY-start.y)<10){event.preventDefault();closeDecorations();}});
  $('decorateDrawer').addEventListener('keydown',event=>{if(event.key==='Escape'){$<HTMLDetailsElement>('decorateDrawer').open=false;$('decorateDrawer').querySelector('summary')?.focus();}});
  $('appRetry').addEventListener('click',()=>{const action=retry;if(action)void attempt(action);});
  on('dismissError','click',clearError);
  const previous=new Map<HTMLElement,HTMLElement|null>();
  const overlays=document.querySelectorAll<HTMLElement>('.modal-overlay,.calendar-overlay');
  overlays.forEach(el=>{
    el.setAttribute('role','dialog');el.setAttribute('aria-modal','true');el.setAttribute('aria-label',el.id.includes('calendar')?'Choose a date':el.id==='photoLightbox'?'Photo viewer':el.id==='noteBubbleModal'?'Highlight note':'Repeating task deletion');el.tabIndex=-1;
    new MutationObserver(()=>{
      const open=el.classList.contains('show');
      if(open&&!previous.has(el)){previous.set(el,document.activeElement as HTMLElement);(el.querySelector<HTMLElement>('button,input,textarea')||el).focus();}
      if(!open&&previous.has(el)){previous.get(el)?.focus();previous.delete(el);if(el.id==='photoLightbox')inputImage().removeAttribute('src');}
    }).observe(el,{attributes:true,attributeFilter:['class']});
    el.addEventListener('click',e=>{if(e.target===el)el.classList.remove('show');});
    el.addEventListener('keydown',e=>{
      if(e.key==='Escape'){el.classList.remove('show');e.stopPropagation();}
      if(e.key==='Tab'){
        const all=[...el.querySelectorAll<HTMLElement>('button:not(:disabled),input:not(:disabled),textarea:not(:disabled),[tabindex="0"]')].filter(n=>n.getClientRects().length);
        const first=all[0],last=all.at(-1);
        if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus();}
      }
    });
  });
  on('lightboxClose','click',()=>closePhoto());
  document.querySelectorAll<HTMLInputElement|HTMLTextAreaElement|HTMLSelectElement>('input,textarea,select').forEach(el=>{
    if(!el.labels?.length&&!el.getAttribute('aria-label'))el.setAttribute('aria-label',el.getAttribute('placeholder')||el.id.replace(/([A-Z])/g,' $1'));
  });
}
const inputImage=()=>$<HTMLImageElement>('lightboxImg');
export function showPhoto(src:string,alt='Photo memory'):void {inputImage().src=src;inputImage().alt=alt;$('photoLightbox').classList.add('show');}
export function closePhoto():void {$('photoLightbox').classList.remove('show');inputImage().removeAttribute('src');}
export function dateHeading(key:string,prefix:string):void {
  const d=new Date(`${key}T12:00:00`);
  $(prefix?prefix+'DayNameBig':'dayNameBig').textContent=d.toLocaleDateString(undefined,{weekday:'long'});
  $(prefix?prefix+'DayNumBig':'dayNumBig').textContent=d.toLocaleDateString(undefined,{month:'long',day:'numeric',year:'numeric'});
}
export async function preparePhoto(file:File):Promise<string> {
  if(!file.type.startsWith('image/'))throw new Error('Please choose an image file.');
  if(file.size>30*1024*1024)throw new Error('Choose a photo smaller than 30 MB.');
  const url=URL.createObjectURL(file);
  try{
    const img=new Image();img.src=url;await img.decode();
    const ratio=Math.min(1,1400/Math.max(img.naturalWidth,img.naturalHeight));
    const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(img.naturalWidth*ratio));canvas.height=Math.max(1,Math.round(img.naturalHeight*ratio));
    const ctx=canvas.getContext('2d');if(!ctx)throw new Error('Photo preparation is unavailable.');ctx.fillStyle='#fffaf4';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(img,0,0,canvas.width,canvas.height);
    return canvas.toDataURL('image/jpeg',.8);
  }catch{throw new Error('This photo could not be prepared. Try a JPEG, PNG, or WebP image. Existing photos are safe.');}finally{URL.revokeObjectURL(url);}
}
