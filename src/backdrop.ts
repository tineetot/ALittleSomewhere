import { storage } from './services';
import { SerialQueue, exclusive } from './storage';
import { attempt } from './ui';
const patterns=['paper','gingham','dots','floral'];
const queue=new SerialQueue();
function apply(pattern:string):void {
  document.body.dataset.paper=pattern;
  document.querySelectorAll<HTMLButtonElement>('button[data-paper]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.paper===pattern)));
}
export async function initBackdrop():Promise<void> {
  const settings=await storage.get('appearance');
  if(settings!==undefined&&(!settings||typeof settings!=='object'||!('pattern' in settings)||!patterns.includes(String(settings.pattern))))throw new Error('Background setting could not be read.');
  apply(settings?String((settings as {pattern:string}).pattern):'paper');
  document.querySelectorAll<HTMLButtonElement>('button[data-paper]').forEach(button=>button.addEventListener('click',()=>{
    const pattern=button.dataset.paper!;
    void attempt(()=>queue.run(()=>exclusive('appearance',async()=>{await storage.put('appearance',{pattern});apply(pattern);})));
  }));
}
