import { $, input, on, attempt, once, sanitize, saving, saved, dirty, preparePhoto, closePhoto, showPhoto, dateHeading, escape, clearError } from './ui';
import { vault } from './services';
import { dateKey, emptyDay, FRAME_STYLES, type Day, type PhotoFrame } from './model';
import { StickerDesk } from './stickers';
import { moodArt } from './stationery-art';
import { turnPage } from './page-turn';
import { Drafts } from './drafts';
import { SerialQueue } from './storage';
import { calendar, dayButtons } from './calendar';
import { JOURNAL_PROMPTS } from './content';
const moods=['🥰','😊','😌','🥱','😢','😤','🥳','😴','🤔','😭'];
const drafts=new Drafts<Partial<Day>>();
const saves=new SerialQueue();
let selected=dateKey(), rendered:string|undefined, current=emptyDay(), revision=0, photoIndex=0;
let timer:ReturnType<typeof setTimeout>|undefined;
let locking=false, uploads=new Set<Promise<void>>(), uploadFailed=false;
let pendingUpload:{key:string;files:File[]}|undefined;
let noteTarget:{date:string;id:string}|undefined;
let ready=false;
let promptText='';
let desk:StickerDesk;
export function journalDecorationContext(active:boolean):void {desk?.refresh(active&&ready&&vault.unlocked&&!locking);}
const editor=()=>$('journalText');
export const privatePending=()=>drafts.size>0||uploads.size>0||!!pendingUpload;
function patch(value:Partial<Day>,key=rendered):void {
  if(!key||locking||!vault.unlocked)return;
  drafts.set(key,{...drafts.get(key),...value});
  if(key===rendered)Object.assign(current,value);
  dirty();clearTimeout(timer);timer=setTimeout(()=>{void attempt(flushJournal);},350);
}
export async function flushJournal():Promise<void>{
  clearTimeout(timer);
  await saves.run(async()=>{
    const snapshot=drafts.snapshot();if(!snapshot.size)return;saving();
    await vault.update(data=>{for(const [key,{value}] of snapshot)data.days[key]={...(data.days[key]||emptyDay()),...value};});
    drafts.acknowledge(snapshot);if(!drafts.size)saved();
  });
}
async function select(key:string):Promise<void>{
  if(locking)return;
  if(noteTarget&&$('noteBubbleModal').classList.contains('show')){patch({highlightNotes:{...current.highlightNotes,[noteTarget.id]:input('noteBubbleText').value}},noteTarget.date);$('noteBubbleModal').classList.remove('show');noteTarget=undefined;}
  const previous=selected;selected=key;await renderJournal();if(selected===key&&previous!==key&&ready)turnPage($('journalPaper'),key>previous?1:-1);void attempt(flushJournal);
}
export async function openJournal():Promise<void>{
  $('journalLockScreen').style.display=vault.unlocked?'none':'block';
  $('journalContent').style.display=vault.unlocked?'block':'none';
  if(vault.unlocked){await renderJournal();window.dispatchEvent(new Event('journalviewchange'));return;}
  const exists=await vault.exists();
  $('passphraseHelp').textContent=exists?'Enter your passphrase.':'Choose a passphrase of at least 12 characters.';
  $('confirmPassphraseWrap').hidden=exists;input('journalPinInput').autocomplete=exists?'current-password':'new-password';
  $('unlockJournalBtn').textContent=exists?'Unlock my pages':'Create private pages';
  window.dispatchEvent(new Event('journalviewchange'));
}
async function renderJournal():Promise<void>{
  if(!vault.unlocked)return;
  const token=++revision,key=selected;ready=false;rendered=undefined;desk?.clear();resetPrompt();
  editor().contentEditable='false';editor().replaceChildren();input('memoryNote').value='';$('memoryGallery').replaceChildren();$('moodRow').replaceChildren();
  input('memoryNote').disabled=true;input('memoryImageInput').disabled=true;
  dateHeading(key,'j');$('journalStamp').textContent=new Date(`${key}T12:00:00`).toLocaleDateString(undefined,{month:'short',day:'numeric'});
  const data=await vault.read();if(token!==revision||!vault.unlocked||locking)return;
  current={...(data.days[key]||emptyDay()),...drafts.get(key)};rendered=key;ready=true;photoIndex=0;
  editor().innerHTML=sanitize(current.html);editor().contentEditable='true';
  const picker=$<HTMLSelectElement>('fontPicker');const fonts=[...picker.options].map(o=>o.value);if(!fonts.includes(current.font))current.font=emptyDay().font;
  picker.value=current.font;editor().style.fontFamily=current.font;
  drawMoods();drawPhotos();input('memoryNote').disabled=false;input('memoryNote').value=current.note;updateCount();input('memoryImageInput').disabled=uploads.size>0;
  journalDecorationContext(document.querySelector('[data-tab="journal"]')?.classList.contains('active')||false);
}
function drawMoods():void{
  $('moodRow').innerHTML=moods.map((m,i)=>`<button class="mood-btn ${m===current.mood?'selected':''}" data-mood="${m}" title="${['Loved','Happy','Calm','Tired','Sad','Frustrated','Celebrating','Sleepy','Thoughtful','Tearful'][i]}" aria-label="Mood ${['loved','happy','calm','tired','sad','frustrated','celebrating','sleepy','thoughtful','tearful'][i]}" aria-pressed="${m===current.mood}">${moodArt(i)}</button>`).join('');
  $('moodRow').querySelectorAll<HTMLButtonElement>('button').forEach(b=>b.onclick=()=>{if(!ready||locking)return;patch({mood:current.mood===b.dataset.mood?'':b.dataset.mood!});drawMoods();});
}
function drawPhotos():void{
  photoIndex=Math.max(0,Math.min(photoIndex,current.images.length-1));
  const image=current.images[photoIndex];
  const frame=current.photoFrames?.[photoIndex]||'print';
  $('memoryGallery').innerHTML=image?`<div class="memory-slide"><div class="memory-photo photo-frame frame-${frame}"><button class="memory-photo-open" aria-label="Open this photo fullscreen"><img src="${image}" alt="Memory from ${selected}"></button></div><div class="memory-photo-caption"><label class="memory-field-label" for="memoryPhotoCaption">Caption for this photo</label><textarea id="memoryPhotoCaption" maxlength="300" rows="2" placeholder="A tiny detail to remember…" aria-label="Caption for photo ${photoIndex+1} of ${current.images.length}"></textarea><div id="memoryPhotoCaptionCount" class="memory-note-count">${(current.photoCaptions?.[photoIndex]||'').length} / 300</div></div></div>`:'<div class="memory-empty">No photos yet.</div>';
  const photoCaption=$('memoryGallery').querySelector<HTMLTextAreaElement>('#memoryPhotoCaption');
  if(photoCaption){photoCaption.value=current.photoCaptions?.[photoIndex]||'';photoCaption.disabled=!ready||locking;}
  $('memoryFrameControl').hidden=!image;input('memoryFrame').value=frame;
  $('memoryGallery').querySelector('button')?.addEventListener('click',()=>{if(vault.unlocked)showPhoto(image,`Memory from ${selected}`);});
  const img=$('memoryGallery').querySelector('img');if(img)img.onload=()=>img.parentElement?.parentElement?.style.setProperty('--memory-photo-ratio',String(img.naturalWidth/img.naturalHeight));
  $('memoryPagination').hidden=!image;$('memoryCounter').textContent=`${photoIndex+1} / ${current.images.length}`;
  $<HTMLButtonElement>('memoryPrevPhoto').disabled=photoIndex===0;$<HTMLButtonElement>('memoryNextPhoto').disabled=photoIndex>=current.images.length-1;
  $('memoryRemovePhoto').hidden=!image;
}
function resetPrompt():void{
  promptText='';$('promptPocketText').textContent='';$('promptPocketSlip').hidden=true;$('promptPocketSlip').classList.remove('is-opening');
  const toggle=$<HTMLButtonElement>('promptPocketToggle');toggle.setAttribute('aria-expanded','false');toggle.textContent='Find a little prompt';$('promptPocketStatus').textContent='';
}
function drawPrompt():void{
  const choices=JOURNAL_PROMPTS.filter(prompt=>prompt!==promptText);promptText=choices[Math.floor(Math.random()*choices.length)]!;
  $('promptPocketText').textContent=promptText;$('promptPocketSlip').hidden=false;
  const slip=$('promptPocketSlip');slip.classList.remove('is-opening');void slip.offsetWidth;slip.classList.add('is-opening');
  const toggle=$<HTMLButtonElement>('promptPocketToggle');toggle.setAttribute('aria-expanded','true');toggle.textContent='Tuck prompt away';$('promptPocketStatus').textContent='';
}
function tuckPrompt():void{
  $('promptPocketSlip').hidden=true;$('promptPocketSlip').classList.remove('is-opening');
  const toggle=$<HTMLButtonElement>('promptPocketToggle');toggle.setAttribute('aria-expanded','false');toggle.textContent='Find a little prompt';
}
function usePrompt():void{
  if(!ready||locking||!promptText)return;
  const page=editor();
  if(page.textContent?.trim()){const gap=document.createElement('p');gap.append(document.createElement('br'));page.append(gap);}
  const prompt=document.createElement('p'),strong=document.createElement('strong');strong.textContent=promptText;prompt.append(strong);
  const answer=document.createElement('p');answer.append(document.createElement('br'));page.append(prompt,answer);
  captureHtml();page.focus({preventScroll:true});const range=document.createRange();range.selectNodeContents(answer);range.collapse(false);
  const selection=window.getSelection();selection?.removeAllRanges();selection?.addRange(range);
  $('promptPocketStatus').textContent='Prompt added to your page. Your writing saves automatically.';tuckPrompt();
}
function updateCount():void{$('memoryNoteCount').textContent=`${input('memoryNote').value.length} / 500`;}
function captureHtml():void{if(ready&&rendered)patch({html:sanitize(editor().innerHTML)});}
async function unlock():Promise<void>{
  await once('unlock',async()=>{
    input('unlockJournalBtn').disabled=true;
    try{await vault.unlock(input('journalPinInput').value,input('confirmPassphrase').value);input('journalPinInput').value='';input('confirmPassphrase').value='';$('pinError').textContent='';await openJournal();}
    catch(e){$('pinError').textContent=(e as Error).message;}
    finally{input('unlockJournalBtn').disabled=false;}
  });
}
async function lock():Promise<void>{
  if(locking)return;
  // Flush the note modal too; locking never discards an unfinished private draft.
  if(noteTarget&&$('noteBubbleModal').classList.contains('show'))patch({highlightNotes:{...current.highlightNotes,[noteTarget.id]:input('noteBubbleText').value}},noteTarget.date);
  locking=true;desk.clear();$('journalPaper').getAnimations().forEach(a=>a.cancel());editor().contentEditable='false';input('memoryNote').disabled=true;input('memoryImageInput').disabled=true;input('memoryFrame').disabled=true;
  const photoCaption=$('memoryGallery').querySelector<HTMLTextAreaElement>('#memoryPhotoCaption');if(photoCaption)photoCaption.disabled=true;
  try{
    await Promise.all([...uploads]);if(uploadFailed&&pendingUpload)await startUpload(pendingUpload);
    await flushJournal();await vault.lock();revision++;ready=false;rendered=undefined;current=emptyDay();drafts.clear();noteTarget=undefined;
    closePhoto();$('noteBubbleModal').classList.remove('show');input('noteBubbleText').value='';$('calendarOverlayJournal').classList.remove('show');$('calendarDaysJ').replaceChildren();$('journalText').replaceChildren();$('memoryGallery').replaceChildren();input('memoryNote').value='';input('memoryImageInput').value='';$('moodRow').replaceChildren();$('journalStamp').textContent='';$('memoryCounter').textContent='';$('memoryNoteCount').textContent='';$('memoryError').hidden=true;pendingUpload=undefined;uploadFailed=false;clearError();$('memoryStatus').textContent='';
    $('memoryFrameControl').hidden=true;input('memoryFrame').value='print';resetPrompt();
    const photoCaption=$('memoryGallery').querySelector<HTMLTextAreaElement>('#memoryPhotoCaption');if(photoCaption)photoCaption.value='';
    await openJournal();
  }finally{locking=false;input('memoryFrame').disabled=false;if(vault.unlocked){editor().contentEditable=ready?'true':'false';input('memoryNote').disabled=!ready;input('memoryImageInput').disabled=!ready;const photoCaption=$('memoryGallery').querySelector<HTMLTextAreaElement>('#memoryPhotoCaption');if(photoCaption)photoCaption.disabled=!ready;journalDecorationContext(document.querySelector('[data-tab="journal"]')?.classList.contains('active')||false);}}
}
export function initJournal():void {
  desk=new StickerDesk(()=>current,value=>patch(value));
  editor().setAttribute('role','textbox');editor().setAttribute('aria-label','Daily journal entry');editor().setAttribute('aria-multiline','true');
  on('unlockJournalBtn','click',unlock);on('journalPinInput','keydown',e=>{if((e as KeyboardEvent).key==='Enter')return unlock();});
  on('lockJournalBtn','click',lock);
  on('promptPocketToggle','click',()=>{if(!ready||locking)return;if($('promptPocketSlip').hidden)drawPrompt();else tuckPrompt();});
  on('promptPocketAnother','click',()=>{if(ready&&!locking)drawPrompt();});
  on('promptPocketUse','click',usePrompt);
  on('journalText','input',captureHtml);
  on('journalText','paste',e=>{
    e.preventDefault();const paste=e as ClipboardEvent;
    const html=paste.clipboardData?.getData('text/html');
    document.execCommand('insertHTML',false,html?sanitize(html):escape(paste.clipboardData?.getData('text/plain')||'').replace(/\n/g,'<br>'));captureHtml();
  });
  on('journalText','drop',e=>{e.preventDefault();});
  document.querySelectorAll<HTMLButtonElement>('.fmt-btn[data-cmd]').forEach(button=>{
    button.onmousedown=e=>e.preventDefault();button.onclick=()=>{if(!ready||locking)return;editor().focus();document.execCommand(button.dataset.cmd!);captureHtml();};
  });
  on('fontPicker','change',()=>{if(ready&&!locking){editor().style.fontFamily=input('fontPicker').value;patch({font:input('fontPicker').value});}});
  $('highlightNoteBtn').onmousedown=e=>e.preventDefault();
  on('highlightNoteBtn','click',()=>{
    if(!ready||locking)return;const selection=window.getSelection();if(!selection?.rangeCount||selection.isCollapsed)return;
    const range=selection.getRangeAt(0);if(!editor().contains(range.commonAncestorContainer))return;
    const id=crypto.randomUUID(),mark=document.createElement('mark');mark.className='note-highlight';mark.dataset.noteId=id;
    mark.append(range.extractContents());range.insertNode(mark);selection.removeAllRanges();captureHtml();openNote(id);
  });
  on('journalText','click',e=>{const mark=(e.target as HTMLElement).closest<HTMLElement>('mark[data-note-id]');if(mark)openNote(mark.dataset.noteId!);});
  function openNote(id:string):void{if(!rendered||locking)return;noteTarget={date:rendered,id};input('noteBubbleText').value=current.highlightNotes[id]||'';$('noteBubbleModal').classList.add('show');}
  on('noteBubbleSave','click',async()=>{if(!noteTarget)return;patch({highlightNotes:{...current.highlightNotes,[noteTarget.id]:input('noteBubbleText').value}},noteTarget.date);await flushJournal();$('noteBubbleModal').classList.remove('show');noteTarget=undefined;input('noteBubbleText').value='';});
  on('noteBubbleText','input',()=>{if(noteTarget)patch({highlightNotes:{...current.highlightNotes,[noteTarget.id]:input('noteBubbleText').value}},noteTarget.date);});
  on('noteBubbleCancel','click',()=>{$('noteBubbleModal').classList.remove('show');noteTarget=undefined;input('noteBubbleText').value='';});
  on('noteBubbleDelete','click',async()=>{
    if(!noteTarget||noteTarget.date!==rendered)return;
    editor().querySelectorAll<HTMLElement>('mark[data-note-id]').forEach(mark=>{if(mark.dataset.noteId===noteTarget?.id)mark.replaceWith(...mark.childNodes);});
    const notes={...current.highlightNotes};delete notes[noteTarget.id];patch({html:sanitize(editor().innerHTML),highlightNotes:notes});await flushJournal();$('noteBubbleModal').classList.remove('show');noteTarget=undefined;input('noteBubbleText').value='';
  });
  on('memoryNote','input',()=>{if(!ready)return;patch({note:input('memoryNote').value});updateCount();});
  on('memoryNote','blur',flushJournal);
  on('memoryGallery','input',event=>{
    const target=event.target;if(!(target instanceof HTMLTextAreaElement)||target.id!=='memoryPhotoCaption'||!ready||locking)return;
    const captions=current.images.map((_,index)=>current.photoCaptions?.[index]||'');captions[photoIndex]=target.value;patch({photoCaptions:captions});
    $('memoryPhotoCaptionCount').textContent=`${target.value.length} / 300`;
  });
  on('memoryGallery','focusout',event=>{if((event.target as HTMLElement).id==='memoryPhotoCaption')void attempt(flushJournal);});
  on('memoryFrame','change',()=>{if(!ready||locking)return;const frame=input('memoryFrame').value as PhotoFrame;if(!FRAME_STYLES.includes(frame))return;const frames=current.images.map((_,i)=>current.photoFrames?.[i]||'print');frames[photoIndex]=frame;patch({photoFrames:frames});drawPhotos();});
  for(const [id,delta] of [['memoryPrevPhoto',-1],['memoryNextPhoto',1]] as const)on(id,'click',()=>{photoIndex+=delta;drawPhotos();});
  on('memoryGallery','keydown',e=>{if((e.target as HTMLElement).closest('textarea,input,select'))return;const key=(e as KeyboardEvent).key;if(key==='ArrowRight'||key==='ArrowLeft'){e.preventDefault();photoIndex+=key==='ArrowRight'?1:-1;drawPhotos();}});
  on('memoryRemovePhoto','click',async()=>{
    if(locking||!ready)return;const key=rendered!,index=photoIndex,source=current.images[index];if(!confirm('Remove this photo?'))return;
    const remove=(day:Day)=>{const target=day.images[index]===source?index:day.images.indexOf(source);if(target<0)return;day.photoFrames=day.images.map((_,i)=>day.photoFrames?.[i]||'print');day.photoFrames.splice(target,1);if(day.photoCaptions)day.photoCaptions=day.images.map((_,i)=>day.photoCaptions?.[i]||'').filter((_,i)=>i!==target);day.images.splice(target,1);};
    await flushJournal();await vault.update(data=>{const day=data.days[key];if(day)remove(day);});if(key===rendered){remove(current);drawPhotos();}saved();
  });
  on('memoryImageInput','change',async()=>{
    if(locking||!ready||uploads.size)return;const key=rendered!,files=[...input('memoryImageInput').files||[]];if(!files.length)return;
    pendingUpload={key,files};await startUpload(pendingUpload);
  });
  on('memoryRetryBtn','click',async()=>{if(pendingUpload)await startUpload(pendingUpload);await flushJournal();if(!locking)await renderJournal();});
  dayButtons('J',()=>selected,select);
  calendar('J','calendarOverlayJournal',()=>selected,select,async()=>{const data=await vault.read();return key=>{const d={...data.days[key],...drafts.get(key)};return !!(d.html||d.mood||d.images?.length||d.note||d.stickers?.length);};});
}
async function startUpload(selection:{key:string;files:File[]}):Promise<void>{
  if(uploads.size){await Promise.all([...uploads]);return;}
  const operation=uploadMemories(selection);uploads.add(operation);
  try{await operation;}finally{uploads.delete(operation);}
}
async function uploadMemories(selection:{key:string;files:File[]}):Promise<void>{
    const {key,files}=selection;uploadFailed=false;
      input('memoryImageInput').disabled=true;
      try{
        $('memoryStatus').textContent='Preparing photos…';
        const images:string[]=[];for(const file of files)images.push(await preparePhoto(file));
        await flushJournal();await vault.update(data=>{const day=data.days[key]||emptyDay();if(day.photoCaptions)day.photoCaptions=[...day.images.map((_,i)=>day.photoCaptions?.[i]||''),...images.map(()=> '')];day.images.push(...images);data.days[key]=day;});
        if(key===rendered){if(current.photoCaptions)current.photoCaptions=[...current.images.map((_,i)=>current.photoCaptions?.[i]||''),...images.map(()=> '')];current.images.push(...images);photoIndex=current.images.length-images.length;drawPhotos();}
        input('memoryImageInput').value='';$('memoryStatus').textContent='';saved();
        pendingUpload=undefined;$('memoryError').hidden=true;
      }catch(e){uploadFailed=true;$('memoryStatus').textContent='Photo upload failed. Your selected files and existing photos are retained.';$('memoryErrorText').textContent='Your photos have not saved yet. Retry when storage is available.';$('memoryError').hidden=false;throw e;}
      finally{input('memoryImageInput').disabled=locking||!ready;}
}
