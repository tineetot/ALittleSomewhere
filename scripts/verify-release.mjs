import { readFile, readdir, stat } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { createHash } from 'node:crypto';
const root=resolve('dist');
async function files(dir){const result=[];for(const item of await readdir(dir,{withFileTypes:true})){const path=`${dir}/${item.name}`;if(item.isDirectory())result.push(...await files(path));else result.push(path);}return result;}
const paths=await files('dist');
if(paths.some(p=>/node_modules|test-results|playwright|\.git|\.map$|\.ts$|package-lock/.test(p)))throw new Error('Unexpected release artifact');
async function localAsset(path,from=root){const target=resolve(from,path.split('?')[0]);if(!target.startsWith(root+'/')&&!target.startsWith(root+'\\'))throw new Error('Asset outside release');await stat(target);}
const html=await readFile('dist/index.html','utf8');
for(const match of html.matchAll(/(?:src|href)="([^"#]+)"/g)){if(!/^https?:/.test(match[1]))await localAsset(match[1]);}
for(const path of paths.filter(p=>p.endsWith('.css'))){const css=await readFile(path,'utf8');for(const match of css.matchAll(/url\(["']?([^"')]+)["']?\)/g))if(!match[1].startsWith('data:'))await localAsset(match[1],resolve(dirname(path)));}
const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);if(new Set(ids).size!==ids.length)throw new Error('Duplicate HTML ID');
const manifest=JSON.parse(await readFile('dist/manifest.json','utf8'));
for(const icon of manifest.icons){await localAsset(icon.src);const png=await readFile(`dist/${icon.src}`);if(`${png.readUInt32BE(16)}x${png.readUInt32BE(20)}`!==icon.sizes)throw new Error('Icon size mismatch');}
const hash=createHash('sha256');for(const path of paths.filter(p=>!p.endsWith('/sw.js')))hash.update(await readFile(path));
const expected=`a-little-somewhere-v2-${hash.digest('hex').slice(0,16)}`;
if(!(await readFile('dist/sw.js','utf8')).includes(`const CACHE="${expected}"`))throw new Error('Service worker does not match release');
console.log(`Release verified: ${paths.length} intended files, asset references, icons, IDs and worker fingerprint.`);
