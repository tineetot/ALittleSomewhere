export const DB_NAME='a-little-somewhere-v2';
export interface StorageAdapter { get(key:string):Promise<unknown>; put(key:string,value:unknown):Promise<void> }
export class IndexedStorage implements StorageAdapter {
  private database?: Promise<IDBDatabase>;
  private open(): Promise<IDBDatabase> {
    if(!this.database) this.database=new Promise((resolve,reject)=>{
      const request=indexedDB.open(DB_NAME,1);
      request.onupgradeneeded=()=>request.result.createObjectStore('records');
      request.onerror=()=>{this.database=undefined;reject(new Error('Device storage could not open. Check browser storage permissions.'));};
      request.onblocked=()=>{this.database=undefined;reject(new Error('Close another copy of this app, then retry.'));};
      request.onsuccess=()=>{request.result.onversionchange=()=>{request.result.close();this.database=undefined;};resolve(request.result);};
    });
    return this.database;
  }
  async get(key:string):Promise<unknown> {
    const db=await this.open();
    return new Promise((resolve,reject)=>{const tx=db.transaction('records','readonly');const r=tx.objectStore('records').get(key);tx.oncomplete=()=>resolve(r.result);tx.onabort=tx.onerror=()=>reject(new Error('Saved data could not be read. Nothing has been replaced.'));});
  }
  async put(key:string,value:unknown):Promise<void> {
    const db=await this.open();
    return new Promise((resolve,reject)=>{const tx=db.transaction('records','readwrite');tx.objectStore('records').put(value,key);tx.oncomplete=()=>resolve();tx.onabort=tx.onerror=()=>reject(new Error('Save failed. Your draft is still here. Check available device storage and retry.'));});
  }
}
// The lock covers read → transform → write, including encryption, across browser tabs.
export class SerialQueue {
  private tail: Promise<unknown>=Promise.resolve();
  run<T>(action:()=>Promise<T>):Promise<T> { const next=this.tail.then(action);this.tail=next.catch(()=>{});return next; }
  idle():Promise<unknown> { return this.tail; }
}
export async function exclusive<T>(name:string, action:()=>Promise<T>):Promise<T> {
  if(!navigator.locks) throw new Error('This browser needs Web Locks support to save safely. Use a current Chrome, Edge, Firefox, or Safari.');
  return navigator.locks.request(`${DB_NAME}:${name}`,action);
}
export class Repository<T> {
  private queue=new SerialQueue();
  private initialValue:T;
  constructor(private storage:StorageAdapter, private name:string, initial:()=>T, private validate:(v:unknown)=>v is T){this.initialValue=initial();}
  async read():Promise<T> { const raw=await this.storage.get(this.name);if(raw===undefined)return structuredClone(this.initialValue);if(!this.validate(raw))throw new Error('Saved data is unreadable. Nothing has been replaced.');return structuredClone(raw); }
  update(change:(data:T)=>void):Promise<T> { return this.queue.run(()=>exclusive(this.name,async()=>{const data=await this.read();change(data);if(!this.validate(data))throw new Error('Invalid change; saved data has not been replaced.');await this.storage.put(this.name,data);return data;})); }
}
