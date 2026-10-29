import { $, on, attempt } from './ui';
import { dateKey, parseDate, shiftDate } from './model';
export function calendar(suffix:string,overlay:string,getDate:()=>string,select:(key:string)=>Promise<void>,hasEntries:()=>Promise<(key:string)=>boolean>):void {
  let cursor=getDate().slice(0,7)+'-01';let revision=0;
  async function render():Promise<void>{
    const current=++revision,month=cursor;const has=await hasEntries();if(current!==revision)return;
    const d=parseDate(month),y=d.getFullYear(),m=d.getMonth();$('calMonthLabel'+suffix).textContent=d.toLocaleDateString(undefined,{month:'long',year:'numeric'});
    const cells:string[]=[];for(let i=0;i<new Date(y,m,1).getDay();i++)cells.push('<span class="cal-day cal-day--blank" aria-hidden="true"></span>');
    for(let i=1;i<=new Date(y,m+1,0).getDate();i++){const key=dateKey(new Date(y,m,i));cells.push(`<button class="cal-day ${key===dateKey()?'today':''} ${key===getDate()?'selected':''}" data-key="${key}" aria-label="${key}${has(key)?', has entries':''}" ${key===getDate()?'aria-current="date"':''}>${i}${has(key)?'<span class="dot"></span>':''}</button>`);}
    const rows=[];for(let i=0;i<cells.length;i+=7)rows.push(`<div class="cal-row">${cells.slice(i,i+7).join('')}</div>`);
    $('calendarDays'+suffix).innerHTML=rows.join('');
    $('calendarDays'+suffix).querySelectorAll<HTMLButtonElement>('[data-key]').forEach(button=>button.onclick=()=>{void attempt(async()=>{await select(button.dataset.key!);$(overlay).classList.remove('show');});});
  }
  on('openCalendar'+suffix+'Btn','click',async()=>{cursor=getDate().slice(0,7)+'-01';await render();$(overlay).classList.add('show');});
  on('closeCalendar'+suffix+'Btn','click',()=>{$(overlay).classList.remove('show');});
  for(const [id,delta] of [['calPrevMonth',-1],['calNextMonth',1]] as const)on(id+suffix,'click',async()=>{const d=parseDate(cursor);d.setMonth(d.getMonth()+delta);cursor=dateKey(d);await render();});
}
export function dayButtons(suffix:string,getDate:()=>string,select:(key:string)=>Promise<void>):void {
  for(const [id,delta] of [['prev',-1],['next',1]] as const)on(id+suffix+'DayBtn','click',()=>select(shiftDate(getDate(),delta)));
  on('today'+suffix+'Btn','click',()=>select(dateKey()));
}
