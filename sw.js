const CACHE="a-little-somewhere-v2-8592b0b7a0433941";
const SHELL=["./apple-touch-icon.png","./assets/caveat-latin-500-normal-B9SDL8cy.woff2","./assets/caveat-latin-500-normal-Do9veZfZ.woff","./assets/fraunces-latin-500-italic-Bp1RWfBU.woff","./assets/fraunces-latin-500-italic-CjxnbVsv.woff2","./assets/fraunces-latin-600-normal-BFCDtZfi.woff2","./assets/fraunces-latin-600-normal-DL5QCzvS.woff","./assets/homemade-apple-latin-400-normal-BBARCPg0.woff","./assets/homemade-apple-latin-400-normal-BTOiQ2xw.woff2","./assets/index-BpcbMT0Y.js","./assets/index-BYn6UmbI.css","./assets/indie-flower-latin-400-normal-BinrgpLs.woff","./assets/indie-flower-latin-400-normal-DFHVYtpv.woff2","./assets/patrick-hand-latin-400-normal-B7HHA2Vw.woff2","./assets/patrick-hand-latin-400-normal-Df9_VoRQ.woff","./assets/quicksand-latin-400-normal-BqXBKzPR.woff","./assets/quicksand-latin-400-normal-BSDtH9U0.woff2","./assets/quicksand-latin-600-normal-CkxN0sDw.woff","./assets/quicksand-latin-600-normal-DTBPeRoM.woff2","./assets/quicksand-latin-700-normal-Dpk7G9Y6.woff2","./assets/quicksand-latin-700-normal-HjJN-aaT.woff","./assets/shadows-into-light-latin-400-normal-C6MG6Ljx.woff","./assets/shadows-into-light-latin-400-normal-DLUEKdH9.woff2","./icon-192.png","./icon-512.png","./index.html","./manifest.json","./THIRD_PARTY_LICENSES.txt"];
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(SHELL))));
self.addEventListener('message',event=>{if(event.data?.type==='ACTIVATE_UPDATE')self.skipWaiting();});
self.addEventListener('activate',event=>event.waitUntil((async()=>{
  const keys=await caches.keys();
  await Promise.all(keys.filter(k=>k!==CACHE && (k.startsWith('a-little-somewhere-v2-') || /^a-little-somewhere-v[0-9]+$/.test(k))).map(k=>caches.delete(k)));
  await self.clients.claim();
})()));
self.addEventListener('fetch',event=>{
  const url=new URL(event.request.url),scope=new URL(self.registration.scope);
  if(event.request.method!=='GET'||url.origin!==scope.origin||!url.pathname.startsWith(scope.pathname))return;
  const relative='./'+url.pathname.slice(scope.pathname.length);
  if(event.request.mode==='navigate'){
    event.respondWith(caches.open(CACHE).then(cache=>cache.match('./index.html')).then(cached=>cached||fetch(event.request)));return;
  }
  if(!SHELL.includes(relative)||url.search)return;
  event.respondWith(caches.open(CACHE).then(async cache=>{
    const cached=await cache.match(event.request,{ignoreVary:true});if(cached)return cached;
    const response=await fetch(event.request);
    if(response.ok&&response.type==='basic')await cache.put(event.request,response.clone());return response;
  }));
});
