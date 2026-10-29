import { exclusive, SerialQueue, type StorageAdapter } from './storage';
import { validPrivate, type PrivateData } from './model';
const ITERATIONS=600_000;
interface Envelope {version:2; salt:Uint8Array; iv:Uint8Array; ciphertext:ArrayBuffer; iterations:number}
function envelope(v:unknown):v is Envelope { const e=v as Envelope;return !!e&&e.version===2&&e.salt instanceof Uint8Array&&e.salt.length===16&&e.iv instanceof Uint8Array&&e.iv.length===12&&e.ciphertext instanceof ArrayBuffer&&e.iterations===ITERATIONS; }
export async function derive(passphrase:string,salt:Uint8Array<ArrayBuffer>):Promise<CryptoKey> {
  const material=await crypto.subtle.importKey('raw',new TextEncoder().encode(passphrase),'PBKDF2',false,['deriveKey']);
  return crypto.subtle.deriveKey({name:'PBKDF2',hash:'SHA-256',salt,iterations:ITERATIONS},material,{name:'AES-GCM',length:256},false,['encrypt','decrypt']);
}
export async function seal(data:PrivateData,key:CryptoKey,salt:Uint8Array):Promise<Envelope> {
  const iv=crypto.getRandomValues(new Uint8Array(12));
  const ciphertext=await crypto.subtle.encrypt({name:'AES-GCM',iv,additionalData:new TextEncoder().encode('als:v2:vault')},key,new TextEncoder().encode(JSON.stringify(data)));
  return {version:2,iv,salt,iterations:ITERATIONS,ciphertext};
}
async function unseal(e:Envelope,key:CryptoKey):Promise<PrivateData> {
  const bytes=await crypto.subtle.decrypt({name:'AES-GCM',iv:new Uint8Array(e.iv),additionalData:new TextEncoder().encode('als:v2:vault')},key,e.ciphertext);
  const data:unknown=JSON.parse(new TextDecoder().decode(bytes));
  if(!validPrivate(data))throw new Error('Invalid private data');
  return data;
}
export class Vault {
  private key?:CryptoKey;
  private salt?:Uint8Array;
  private queue=new SerialQueue();
  get unlocked():boolean {return !!this.key;}
  constructor(private storage:StorageAdapter){}
  async exists():Promise<boolean> { const value=await this.storage.get('vault');if(value!==undefined&&!envelope(value))throw new Error('Private storage is unreadable. It has not been replaced.');return value!==undefined; }
  async unlock(passphrase:string,confirm?:string):Promise<void> {
    await exclusive('vault',async()=>{
      const raw=await this.storage.get('vault');
      if(raw===undefined){
        if(passphrase.length<12)throw new Error('Choose a passphrase with at least 12 characters.');
        if(passphrase!==confirm)throw new Error('The two passphrases must match.');
        const salt=crypto.getRandomValues(new Uint8Array(16));const key=await derive(passphrase,salt);
        await this.storage.put('vault',await seal({version:2,days:{}},key,salt));this.key=key;this.salt=salt;
      }else{
        if(!envelope(raw))throw new Error('Private storage is unreadable. It has not been replaced.');
        const key=await derive(passphrase,new Uint8Array(raw.salt));
        try{await unseal(raw,key);}catch{throw new Error('Unable to unlock: passphrase is incorrect or saved data is damaged. Nothing has been replaced.');}
        this.key=key;this.salt=raw.salt;
      }
    });
  }
  async read():Promise<PrivateData> {
    if(!this.key)throw new Error('Unlock Journal first.');
    const raw=await this.storage.get('vault');if(!envelope(raw))throw new Error('Private storage is unreadable. Nothing has been replaced.');
    try{return await unseal(raw,this.key);}catch{throw new Error('Private data could not be read safely. Nothing has been replaced.');}
  }
  update(change:(data:PrivateData)=>void):Promise<void> {
    return this.queue.run(()=>exclusive('vault',async()=>{const data=await this.read();change(data);if(!validPrivate(data))throw new Error('Invalid private change.');if(!this.key||!this.salt)throw new Error('Journal is locked.');await this.storage.put('vault',await seal(data,this.key,this.salt));}));
  }
  async lock():Promise<void> {await this.queue.idle();this.key=undefined;this.salt=undefined;}
}
