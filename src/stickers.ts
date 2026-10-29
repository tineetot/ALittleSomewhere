import { $, input, on } from './ui';
import { STICKER_KINDS, uid, type Day, type Sticker, type StickerKind } from './model';
import { stickerArt } from './stationery-art';

const clamp=(v:number,min:number,max:number)=>Math.max(min,Math.min(max,v));
export class StickerDesk {
  private selected?:string;
  private arranging=false;
  private available=false;
  private drag?:{id:string;pointer:number;dx:number;dy:number};
  constructor(private read:()=>Day,private write:(patch:Partial<Day>)=>void){
    $('stickerTray').innerHTML=STICKER_KINDS.map(kind=>`<button class="sticker-choice" draggable="true" data-kind="${kind}" aria-label="Add ${kind} sticker">${stickerArt(kind)}<span>${kind}</span></button>`).join('');
    $('stickerTray').querySelectorAll<HTMLButtonElement>('button').forEach(button=>{
      button.onclick=()=>this.add(button.dataset.kind as StickerKind);
      button.ondragstart=event=>{if(!this.available){event.preventDefault();return;}event.dataTransfer?.setData('application/x-stationery-sticker',button.dataset.kind!);if(event.dataTransfer)event.dataTransfer.effectAllowed='copy';};
    });
    $('journalPaper').addEventListener('dragover',event=>{if(this.available&&event.dataTransfer?.types.includes('application/x-stationery-sticker'))event.preventDefault();});
    $('journalPaper').addEventListener('drop',event=>{
      if(!this.available)return;const kind=event.dataTransfer?.getData('application/x-stationery-sticker') as StickerKind;if(!STICKER_KINDS.includes(kind))return;
      event.preventDefault();const rect=$('stickerLayer').getBoundingClientRect();this.add(kind,clamp((event.clientX-rect.left)/rect.width*100,0,100),clamp((event.clientY-rect.top)/rect.height*100,0,100));
    });
    on('arrangeStickers','click',()=>this.setArranging(!this.arranging));
    on('removeSticker','click',()=>{if(!this.available||!this.selected)return;this.write({stickers:(this.read().stickers||[]).filter(s=>s.id!==this.selected)});this.selected=undefined;this.draw();});
    for(const [id,field] of [['stickerSize','size'],['stickerRotation','rotation']] as const)on(id,'input',()=>{this.update({[field]:Number(input(id).value)});this.draw();});
    const layer=$('stickerLayer');
    layer.addEventListener('pointerdown',event=>{
      if(!this.arranging||!this.available)return;
      const button=(event.target as Element).closest<HTMLButtonElement>('[data-sticker]');if(!button)return;
      this.selected=button.dataset.sticker;button.focus();this.controls();
      const rect=layer.getBoundingClientRect(),sticker=this.read().stickers?.find(s=>s.id===this.selected);if(!sticker)return;
      this.drag={id:sticker.id,pointer:event.pointerId,dx:event.clientX-rect.left-sticker.x/100*rect.width,dy:event.clientY-rect.top-sticker.y/100*rect.height};
      button.setPointerCapture(event.pointerId);
    });
    layer.addEventListener('pointermove',event=>{
      if(!this.drag||!this.available||event.pointerId!==this.drag.pointer)return;
      const rect=layer.getBoundingClientRect();this.update({x:clamp((event.clientX-rect.left-this.drag.dx)/rect.width*100,0,100),y:clamp((event.clientY-rect.top-this.drag.dy)/rect.height*100,0,100)});this.position();
    });
    for(const event of ['pointerup','pointercancel','lostpointercapture'])layer.addEventListener(event,()=>{this.drag=undefined;});
    layer.addEventListener('keydown',event=>{
      if(!this.arranging||!this.available)return;
      const button=(event.target as Element).closest<HTMLButtonElement>('[data-sticker]');if(!button)return;this.selected=button.dataset.sticker;
      const sticker=this.read().stickers?.find(s=>s.id===this.selected);if(!sticker)return;
      const step=event.shiftKey?5:1;
      if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key)){
        event.preventDefault();this.update({x:clamp(sticker.x+(event.key==='ArrowLeft'?-step:event.key==='ArrowRight'?step:0),0,100),y:clamp(sticker.y+(event.key==='ArrowUp'?-step:event.key==='ArrowDown'?step:0),0,100)});this.position();
      }else if(event.key==='Delete'||event.key==='Backspace'){event.preventDefault();$('removeSticker').click();}
      else if(event.key==='Escape'){event.preventDefault();this.setArranging(false);$('arrangeStickers').focus();}
    });
    $('decorateDrawer').addEventListener('toggle',()=>{if(!$<HTMLDetailsElement>('decorateDrawer').open)this.setArranging(false);});
  }
  refresh(available:boolean):void {this.available=available;this.selected=undefined;this.drag=undefined;this.setArranging(false);$('journalDecorationTools').hidden=!available;this.draw();}
  clear():void {this.refresh(false);$('stickerLayer').replaceChildren();input('stickerSize').value='80';input('stickerRotation').value='-8';}
  private add(kind:StickerKind,x=76,y?:number):void {
    if(!this.available)return;const stickers=this.read().stickers||[];
    if(stickers.length>=40){$('stickerHint').textContent='This page has 40 stickers. Remove one to add another.';return;}
    const next:Sticker={id:uid(),kind,x,y:y??70+stickers.length%3*8,size:80,rotation:-8};
    this.write({stickers:[...stickers,next]});this.selected=next.id;this.setArranging(true);this.draw();
    $('stickerLayer').querySelector<HTMLButtonElement>(`[data-sticker="${next.id}"]`)?.focus();
  }
  private setArranging(value:boolean):void {
    this.arranging=value&&this.available;
    $('stickerLayer').setAttribute('aria-hidden',String(!this.arranging));
    $('journalPaper').classList.toggle('arranging-stickers',this.arranging);
    $('arrangeStickers').setAttribute('aria-pressed',String(this.arranging));$('arrangeStickers').textContent=this.arranging?'Done arranging':'Arrange stickers';
    if(this.available)$('journalText').contentEditable=String(!this.arranging);
    $('stickerHint').textContent=this.arranging?'Drag a sticker, or select one and use the arrow keys.':'Choose a sticker to place on this page.';
    $('stickerLayer').querySelectorAll<HTMLButtonElement>('button').forEach(button=>button.tabIndex=this.arranging?0:-1);
  }
  private update(patch:Partial<Sticker>):void {if(!this.available||!this.selected)return;this.write({stickers:(this.read().stickers||[]).map(s=>s.id===this.selected?{...s,...patch}:s)});}
  private position():void {
    for(const sticker of this.read().stickers||[]){const button=$('stickerLayer').querySelector<HTMLElement>(`[data-sticker="${sticker.id}"]`);if(button){button.style.left=`${sticker.x}%`;button.style.top=`${sticker.y}%`;button.style.width=`${sticker.size}px`;button.style.transform=`translate(-50%,-50%) rotate(${sticker.rotation}deg)`;button.classList.toggle('selected',sticker.id===this.selected);button.setAttribute('aria-pressed',String(sticker.id===this.selected));}}
  }
  private controls():void {
    const sticker=this.read().stickers?.find(s=>s.id===this.selected);$('selectedStickerTools').hidden=!sticker;
    if(sticker){input('stickerSize').value=String(sticker.size);input('stickerRotation').value=String(sticker.rotation);}
    this.position();
  }
  private draw():void {
    $('stickerLayer').innerHTML=(this.available?this.read().stickers||[]:[]).map(sticker=>`<button class="page-sticker" data-sticker="${sticker.id}" aria-label="${sticker.kind} sticker" tabindex="${this.arranging?0:-1}">${stickerArt(sticker.kind)}</button>`).join('');
    $('stickerLayer').querySelectorAll<HTMLButtonElement>('button').forEach(button=>button.onclick=()=>{if(this.arranging){this.selected=button.dataset.sticker;this.controls();}});
    this.controls();
  }
}
