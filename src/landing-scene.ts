export function initLandingScene(landing:HTMLElement):void{
const scene=document.createElement('div');scene.className='landing-scene';scene.setAttribute('aria-hidden','true');
const bloom='<g fill="#f9cddd" stroke="#c85c82" stroke-width="1.3"><ellipse cy="-14" rx="8" ry="15"/><ellipse cy="-14" rx="8" ry="15" transform="rotate(72)"/><ellipse cy="-14" rx="8" ry="15" transform="rotate(144)"/><ellipse cy="-14" rx="8" ry="15" transform="rotate(216)"/><ellipse cy="-14" rx="8" ry="15" transform="rotate(288)"/></g><circle r="6" fill="#dfae6a"/>';
scene.innerHTML=`<div class="scene-wash"></div><div class="scene-gingham"></div><div class="scene-paper"></div><div class="scene-doily"></div>
<svg class="scene-botanical botanical-left" viewBox="0 0 200 370"><g fill="none" stroke="#8b9975" stroke-width="2"><path d="M30 370Q155 230 80 20M70 300Q7 260 35 226Q82 242 70 300M109 220Q179 201 166 168Q119 169 109 220M107 143Q49 122 62 91Q102 98 107 143"/></g><g transform="translate(81 44)">${bloom}</g><g transform="translate(149 222) scale(.65)">${bloom}</g><g transform="translate(43 295) scale(.5)">${bloom}</g></svg>
<svg class="scene-botanical botanical-right" viewBox="0 0 200 370"><g fill="none" stroke="#8b9975" stroke-width="2"><path d="M30 370Q155 230 80 20M70 300Q7 260 35 226Q82 242 70 300M109 220Q179 201 166 168Q119 169 109 220M107 143Q49 122 62 91Q102 98 107 143"/></g><g transform="translate(81 44)">${bloom}</g><g transform="translate(149 222) scale(.65)">${bloom}</g></svg>
<svg class="scene-thread" viewBox="0 0 1200 300" preserveAspectRatio="none"><path d="M-40 250C110 20 220 310 390 170S530 55 700 170S980 320 1240 30" fill="none" stroke="#c85c82" stroke-width="1.5" stroke-dasharray="3 7"/></svg>`;
landing.prepend(scene);
const butterfly=document.createElement('button');butterfly.className='scene-butterfly';butterfly.type='button';butterfly.setAttribute('aria-label','Flutter the paper butterfly');butterfly.setAttribute('aria-pressed','false');
butterfly.innerHTML='<svg viewBox="0 0 100 90" aria-hidden="true"><g fill="#fde6ee" stroke="#c85c82" stroke-width="1.5"><path d="M49 46C-8-17 3 67 45 52C4 55 26 97 49 55Z"/><path d="M51 46C108-17 97 67 55 52C96 55 74 97 51 55Z"/></g><path d="M50 37V63M50 39L43 28M50 39L57 28" fill="none" stroke="#963b5d" stroke-width="2"/><path d="M19 27L36 43M81 27L64 43" stroke="#fffaf4" stroke-width="3"/></svg>';
butterfly.onclick=()=>butterfly.setAttribute('aria-pressed',String(butterfly.getAttribute('aria-pressed')!=='true'));
landing.append(butterfly);
const ribbon=document.createElement('button');ribbon.type='button';ribbon.className='scene-ribbon';ribbon.setAttribute('aria-label','Tug the ribbon');ribbon.setAttribute('aria-pressed','false');
ribbon.innerHTML='<span></span><span></span><i></i>';ribbon.onclick=()=>ribbon.setAttribute('aria-pressed',String(ribbon.getAttribute('aria-pressed')!=='true'));landing.append(ribbon);
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
let frame=0,x=0,y=0;
const reset=()=>{scene.style.setProperty('--scene-x','0px');scene.style.setProperty('--scene-y','0px');};
landing.addEventListener('pointermove',event=>{if(reduced.matches||event.pointerType!=='mouse')return;const box=landing.getBoundingClientRect();x=(event.clientX-box.left-box.width/2)/box.width*14;y=(event.clientY-box.top-box.height/2)/box.height*10;if(!frame)frame=requestAnimationFrame(()=>{frame=0;if(!landing.hidden&&!reduced.matches){scene.style.setProperty('--scene-x',x+'px');scene.style.setProperty('--scene-y',y+'px');}});});
landing.addEventListener('pointerleave',reset);reduced.addEventListener('change',reset);
}
