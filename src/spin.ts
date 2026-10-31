import { MAIN_ACTIVITIES, SIDE_ACTIVITIES, PALETTE } from './content';
import { $, escape, attempt, once, saved } from './ui';
import { publicData } from './services';
import { emptyFlow, wheelRotation } from './model';
import { mutatePassport } from './passport';
let spinning=false,revision=0;
function draw(canvas:HTMLCanvasElement,list:typeof MAIN_ACTIVITIES):void {
  canvas.width=500;canvas.height=500;const ctx=canvas.getContext('2d')!;
  list.forEach((item,i)=>{const a=i*2*Math.PI/list.length,b=(i+1)*2*Math.PI/list.length;ctx.beginPath();ctx.moveTo(250,250);ctx.arc(250,250,245,a,b);ctx.closePath();ctx.fillStyle=PALETTE[i%PALETTE.length];ctx.fill();ctx.strokeStyle='#fffaf4';ctx.stroke();ctx.save();ctx.translate(250,250);ctx.rotate((a+b)/2);ctx.textAlign='right';ctx.font='22px sans-serif';ctx.fillText(String(i+1).padStart(2,'0'),225,8);ctx.restore();});
}
function preserveDecorateToolbar(card:HTMLElement):void {
  const toolbar=document.querySelector<HTMLElement>('.desk-toolbar');
  if(toolbar&&card.contains(toolbar))$('mainContent').append(toolbar);
}
export async function renderSpin():Promise<void>{
  if(spinning)return;
  const token=++revision,data=await publicData.read();if(token!==revision)return;const flow=data.flow,card=$('wheelCard');
  if(flow.stage==='confirm'){
    preserveDecorateToolbar(card);
    card.innerHTML=`<div class="wheel-heading-row"><div class="wheel-heading-copy"><div class="eyebrow">Your picks</div><h2>Solo date</h2></div></div><div class="combo">${[flow.main!,flow.side!].map(a=>`<div class="piece"><h3>${escape(a.n)}</h3><div class="budget-pill">Est. ${escape(a.b)}</div></div>`).join('<span class="plus">+</span>')}</div><div class="action-row"><button class="primary" id="startDateBtn">Add to my Passport</button><button class="ghost" id="startOverBtn">Start over</button></div>`;
    window.dispatchEvent(new Event('tabcontentrendered'));
    $('startDateBtn').onclick=()=>{void attempt(()=>once('passport-create',async()=>{
      await mutatePassport(d=>{if(!d.passport.some(p=>p.id===flow.id))d.passport.unshift({id:flow.id,date:new Date().toISOString(),main:flow.main!,side:flow.side!,rating:0,notes:'',images:[],todos:[]});if(d.flow.id===flow.id)d.flow=emptyFlow();});
      // Entry creation and session reset are one durable transaction.
      saved();document.querySelector<HTMLButtonElement>('[data-tab="passport"]')!.click();await renderSpin();
    }));};
    $('startOverBtn').onclick=()=>{void attempt(async()=>{await publicData.update(d=>{if(d.flow.id!==flow.id)throw new Error('This activity session changed. Reopen Spin.');d.flow=emptyFlow();});await renderSpin();});};return;
  }
  const side=flow.stage.startsWith('side'),list=side?SIDE_ACTIVITIES:MAIN_ACTIVITIES,item=side?flow.side:flow.main,respun=side?flow.sideRespun:flow.mainRespun;
  preserveDecorateToolbar(card);
  card.innerHTML=`<div class="wheel-heading-row"><div class="wheel-heading-copy"><div class="eyebrow">${side?'02 / Side activity':'04 / Main activity'}</div><h2>${side?'Side activity':'Pick a solo date'}</h2></div></div><p class="lead">${side?`Your main pick: ${escape(flow.main!.n)}`:'One respin per activity.'}</p><div class="wheel-stage"><div class="wheel-wrap"><div class="pointer"></div><canvas class="wheel-canvas" id="activityWheel" role="img" aria-label="Activity wheel"></canvas><div class="hub" aria-hidden="true">✳</div></div><div id="spinResult">${item?`<div class="result-name display">${escape(item.n)}</div><div class="budget-pill">Est. ${escape(item.b)}</div><div class="action-row"><button class="primary" id="keepActivity">Keep it</button>${!respun?'<button class="ghost" id="spinActivity">Respin (1 left)</button>':''}</div>`:'<button class="primary" id="spinActivity">Spin the wheel</button>'}</div></div>`;
  window.dispatchEvent(new Event('tabcontentrendered'));
  const canvas=$<HTMLCanvasElement>('activityWheel');draw(canvas,list);
  if(item){const i=list.findIndex(a=>a.n===item.n);canvas.style.transform=`rotate(${wheelRotation(Math.max(0,i),list.length,0)%360}deg)`;}
  const spin=document.getElementById('spinActivity');
  if(spin)spin.onclick=()=>{void attempt(()=>once('wheel-spin',async()=>{
    if(spinning)return;spinning=true;(spin as HTMLButtonElement).disabled=true;
    const index=crypto.getRandomValues(new Uint32Array(1))[0]%list.length;
    const rotation=wheelRotation(index,list.length,item?wheelRotation(Math.max(0,list.findIndex(a=>a.n===item.n)),list.length,0)%360:0);
    try{
      // Persist the outcome before animation so reloads preserve the result and respin allowance.
      await publicData.update(d=>{if(d.flow.id!==flow.id||d.flow.stage!==flow.stage)throw new Error('This activity session changed in another tab. Reopen Spin.');const f=d.flow;if(side){f.side=list[index];f.sideRespun=!!item;f.stage='sideResult';}else{f.main=list[index];f.mainRespun=!!item;f.stage='mainResult';}});
      const duration=matchMedia('(prefers-reduced-motion: reduce)').matches?0:2400;
      canvas.style.transition=`transform ${duration}ms cubic-bezier(.17,.67,.16,1)`;canvas.style.transform=`rotate(${rotation}deg)`;
      if(duration)await new Promise<void>(resolve=>setTimeout(resolve,duration+50));
    }finally{spinning=false;}
    if(canvas.isConnected)await renderSpin();
  }));};
  const keep=document.getElementById('keepActivity');if(keep)keep.onclick=()=>{void attempt(()=>once('keep-activity',async()=>{await publicData.update(d=>{if(d.flow.id!==flow.id||d.flow.stage!==flow.stage)throw new Error('This activity session changed. Reopen Spin.');d.flow.stage=side?'confirm':'side';});await renderSpin();}));};
}
