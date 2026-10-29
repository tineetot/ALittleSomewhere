import { readdir,readFile,writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
async function files(dir){const result=[];for(const item of await readdir(dir,{withFileTypes:true})){const path=`${dir}/${item.name}`;if(item.isDirectory())result.push(...await files(path));else if(item.name!=='sw.js')result.push(path);}return result;}
const packages=['dompurify','@fontsource/fraunces','@fontsource/quicksand','@fontsource/caveat','@fontsource/shadows-into-light','@fontsource/homemade-apple','@fontsource/patrick-hand','@fontsource/indie-flower'];
const notices=await Promise.all(packages.map(async name=>`${name}\n${await readFile(`node_modules/${name}/LICENSE`,'utf8')}`));
await writeFile('dist/THIRD_PARTY_LICENSES.txt',notices.join('\n\n========================================\n\n'));
const paths=await files('dist');
const digest=createHash('sha256');for(const p of paths)digest.update(await readFile(p));
const name=`a-little-somewhere-v2-${digest.digest('hex').slice(0,16)}`;
const urls=paths.map(p=>'./'+p.slice(5));
await writeFile('dist/sw.js',`const CACHE=${JSON.stringify(name)};
const SHELL=${JSON.stringify(urls)};
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
`);
console.log(`Offline shell: ${paths.length} files, ${name}`);
