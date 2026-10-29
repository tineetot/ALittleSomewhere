export function turnPage(element:HTMLElement,direction:number):void {
  element.getAnimations().forEach(animation=>animation.cancel());
  if(matchMedia('(prefers-reduced-motion: reduce)').matches)return;
  element.animate([
    {transform:`perspective(1200px) rotateY(${direction*5}deg) translateX(${direction*8}px)`,opacity:.65,transformOrigin:direction>0?'left center':'right center'},
    {transform:'perspective(1200px) rotateY(0deg) translateX(0)',opacity:1},
  ],{duration:260,easing:'cubic-bezier(.2,.7,.2,1)'});
}
