import { IndexedStorage, Repository } from './storage';
import { emptyPublic, validPublic } from './model';
import { Vault } from './privacy';
export const storage=new IndexedStorage();
export const publicData=new Repository(storage,'public',emptyPublic,validPublic);
export const vault=new Vault(storage);
