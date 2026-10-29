import { describe, it, expect, vi, beforeAll } from 'vitest';
import { emptyPublic, emptyDay, validPublic, validPrivate, validStickers, dateKey, tasksFor, changeTask, wheelRotation } from '../src/model';
import { Repository, type StorageAdapter } from '../src/storage';
import { Vault } from '../src/privacy';
import { Drafts } from '../src/drafts';
class Memory implements StorageAdapter {
  data=new Map<string,unknown>(); fail=false;
  async get(key:string){return structuredClone(this.data.get(key));}
  async put(key:string,value:unknown){if(this.fail)throw new Error('write failed');this.data.set(key,structuredClone(value));}
}
it('accepts existing pages and rejects damaged decoration records rather than dropping them',()=>{
  const sticker={id:'s',kind:'bow',x:40,y:70,size:80,rotation:-8};
  expect(validPrivate({version:2,days:{'2026-10-29':emptyDay()}})).toBe(true);
  expect(validPrivate({version:2,days:{'2026-10-29':{...emptyDay(),stickers:[sticker],photoFrames:['tape','scallop']}}})).toBe(true);
  expect(validStickers([{...sticker,x:Infinity}])).toBe(false);
  expect(validStickers([sticker,sticker])).toBe(false);
  expect(validPrivate({version:2,days:{'2026-10-29':{...emptyDay(),photoFrames:['unknown']}}})).toBe(false);
});
beforeAll(()=>{vi.stubGlobal('navigator',{locks:{request:async(_name:string,action:()=>Promise<unknown>)=>action()}});});
describe('serialized repository operations (mock storage)',()=>{
  it('retains independent overlapping updates',async()=>{const repo=new Repository(new Memory(),'public',emptyPublic,validPublic);await Promise.all(Array.from({length:40},(_,i)=>repo.update(d=>{d.answers[String(i)]=String(i);})));expect(Object.keys((await repo.read()).answers)).toHaveLength(40);});
  it('does not replace unreadable saved records',async()=>{const memory=new Memory();memory.data.set('public',{bad:true});const repo=new Repository(memory,'public',emptyPublic,validPublic);await expect(repo.update(d=>{d.answers.today='new';})).rejects.toThrow('unreadable');expect(memory.data.get('public')).toEqual({bad:true});});
  it('failed saves leave durable data intact and later operations work',async()=>{const memory=new Memory(),repo=new Repository(memory,'public',emptyPublic,validPublic);await repo.update(d=>{d.answers.today='original';});memory.fail=true;await expect(repo.update(d=>{d.answers.today='failed';})).rejects.toThrow('write failed');memory.fail=false;expect((await repo.read()).answers.today).toBe('original');await repo.update(d=>{d.answers.tomorrow='next';});expect((await repo.read()).answers).toEqual({today:'original',tomorrow:'next'});});
});
describe('date-bound drafts',()=>{
  it('acknowledges only saved revisions and preserves later edits',()=>{const d=new Drafts<string>();d.set('2026-10-28','first');const snapshot=d.snapshot();d.set('2026-10-28','second');d.set('2026-10-29','next day');d.acknowledge(snapshot);expect(d.get('2026-10-28')).toBe('second');expect(d.get('2026-10-29')).toBe('next day');d.acknowledge(d.snapshot());expect(d.size).toBe(0);});
});
describe('recurring tasks',()=>{
  it('uses the same occurrences for tasks and calendar, with daily and weekly exceptions',()=>{const d=emptyPublic();d.series.push({id:'s',text:'Walk',notes:'',important:false,repeat:'weekly',start:'2026-10-28',exceptions:[],order:0});expect(tasksFor(d,'2026-10-27')).toHaveLength(0);expect(tasksFor(d,'2026-11-04')).toHaveLength(1);expect(tasksFor(d,'2026-11-05')).toHaveLength(0);d.series[0].exceptions.push('2026-11-04');expect(tasksFor(d,'2026-11-04')).toHaveLength(0);d.series[0].repeat='daily';expect(tasksFor(d,'2026-11-05')).toHaveLength(1);d.series[0].end='2026-11-05';expect(tasksFor(d,'2026-11-06')).toHaveLength(0);});
  it('materializes one occurrence only when changed',()=>{const d=emptyPublic();d.series.push({id:'s',text:'Walk',notes:'',important:false,repeat:'daily',start:'2026-10-28',exceptions:[],order:0});const task=tasksFor(d,'2026-10-29')[0];changeTask(d,task,{done:true});changeTask(d,task,{reason:'A good day'});expect(tasksFor(d,'2026-10-29')).toHaveLength(1);expect(d.tasks[0]).toMatchObject({done:true,reason:'A good day'});});
  it('does not resurrect tasks deleted by another operation',()=>{const d=emptyPublic();d.series.push({id:'s',text:'Walk',notes:'',important:false,repeat:'daily',start:'2026-10-28',exceptions:[],order:0});const task=tasksFor(d,'2026-10-29')[0];d.series[0].exceptions.push(task.date);changeTask(d,task,{done:true});expect(d.tasks).toHaveLength(0);});
});
it('every wheel outcome lands its center at the top pointer through respins',()=>{for(const count of [20,21])for(let i=0;i<count;i++)for(const current of [0,49,178,359]){const rotation=wheelRotation(i,count,current);expect((rotation+(i+.5)*360/count)%360).toBeCloseTo(270,7);expect(rotation-current).toBeGreaterThanOrEqual(1800);}});
describe('Web Crypto vault with real cryptography and mock storage',()=>{
  it('uses authenticated ciphertext, reopens, rejects wrong passwords and tampering',async()=>{
    const memory=new Memory(),vault=new Vault(memory);await vault.unlock('a long passphrase ♡','a long passphrase ♡');await vault.update(d=>{d.days['2026-10-28']={...emptyDay(),html:'<b>private text</b>',note:'private caption'};});
    expect(JSON.stringify(memory.data.get('vault'))).not.toContain('private text');await vault.lock();await expect(vault.read()).rejects.toThrow('Unlock');await expect(vault.unlock('incorrect passphrase')).rejects.toThrow('Unable to unlock');await vault.unlock('a long passphrase ♡');expect((await vault.read()).days['2026-10-28'].note).toBe('private caption');
    const raw=memory.data.get('vault') as {ciphertext:ArrayBuffer};new Uint8Array(raw.ciphertext)[0]^=1;await expect(vault.read()).rejects.toThrow('read safely');await expect(vault.update(d=>{d.days={};})).rejects.toThrow();
  });
  it('keeps the previous ciphertext on failed writes and supports retry',async()=>{const memory=new Memory(),vault=new Vault(memory);await vault.unlock('another long passphrase','another long passphrase');memory.fail=true;await expect(vault.update(d=>{d.days['2026-10-28']=emptyDay();})).rejects.toThrow();memory.fail=false;expect((await vault.read()).days).toEqual({});await vault.update(d=>{d.days['2026-10-28']=emptyDay();});expect(Object.keys((await vault.read()).days)).toHaveLength(1);});
});
