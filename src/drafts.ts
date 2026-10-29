// Snapshots keep the originating identity and value through navigation and failed saves.
export class Drafts<T> {
  private values=new Map<string,{value:T;revision:number}>();
  private revision=0;
  get size():number{return this.values.size;}
  set(key:string,value:T):void{this.values.set(key,{value:structuredClone(value),revision:++this.revision});}
  get(key:string):T|undefined{return this.values.get(key)?.value;}
  snapshot():Map<string,{value:T;revision:number}>{return structuredClone(this.values);}
  acknowledge(snapshot:Map<string,{value:T;revision:number}>):void{for(const [key,draft] of snapshot)if(this.values.get(key)?.revision===draft.revision)this.values.delete(key);}
  clear():void{this.values.clear();}
}
