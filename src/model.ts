export interface Activity { e: string; n: string; b: string }
export interface Task { id: string; date: string; text: string; notes: string; important: boolean; done: boolean; reason: string; order: number; seriesId?: string }
export interface Series { id: string; text: string; notes: string; important: boolean; repeat: 'daily'|'weekly'; start: string; end?: string; exceptions: string[]; order: number }
export const FRAME_STYLES = ['print','tape','scallop'] as const;
export type PhotoFrame = typeof FRAME_STYLES[number];
export const STICKER_KINDS = ['bow','flower','stamp','clip','label','leaf'] as const;
export type StickerKind = typeof STICKER_KINDS[number];
export interface Sticker { id:string; kind:StickerKind; x:number; y:number; size:number; rotation:number }
export interface Passport { id: string; date: string; main: Activity; side: Activity; notes: string; rating: number; images: string[]; photoFrames?:PhotoFrame[]; todos: {id:string;text:string;done:boolean}[] }
export interface Flow { id: string; stage: 'main'|'mainResult'|'side'|'sideResult'|'confirm'; main?: Activity; side?: Activity; mainRespun: boolean; sideRespun: boolean }
export interface PublicData { version: 2; tasks: Task[]; series: Series[]; gratitude: {id:string;date:string;text:string}[]; answers: Record<string,string>; passport: Passport[]; flow: Flow }
export interface Day { html: string; font: string; mood: string; highlightNotes: Record<string,string>; images: string[]; note: string; stickers?:Sticker[]; photoFrames?:PhotoFrame[]; photoCaptions?:string[] }
export interface PrivateData { version: 2; days: Record<string,Day> }
export const uid = () => crypto.randomUUID();
export const emptyFlow = (): Flow => ({ id: uid(), stage:'main', mainRespun:false, sideRespun:false });
export const emptyPublic = (): PublicData => ({ version:2,tasks:[],series:[],gratitude:[],answers:{},passport:[],flow:emptyFlow() });
export const emptyDay = (): Day => ({html:'',font:"'Caveat', cursive",mood:'',highlightNotes:{},images:[],note:''});
export function dateKey(d = new Date()): string { return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; }
export const parseDate = (key: string) => new Date(`${key}T12:00:00`);
export function shiftDate(key: string, n: number): string { const d=parseDate(key); d.setDate(d.getDate()+n); return dateKey(d); }
export function applies(s: Series, key: string): boolean { return key>=s.start && (!s.end || key<=s.end) && !s.exceptions.includes(key) && (s.repeat==='daily' || parseDate(s.start).getDay()===parseDate(key).getDay()); }
export function tasksFor(data: PublicData, key: string): Task[] {
  const result = data.tasks.filter(t=>t.date===key);
  for(const s of data.series) if(applies(s,key) && !result.some(t=>t.seriesId===s.id)) result.push({id:`${s.id}:${key}`,date:key,text:s.text,notes:s.notes,important:s.important,done:false,reason:'',order:s.order,seriesId:s.id});
  return result.sort((a,b)=>Number(a.done)-Number(b.done) || a.order-b.order);
}
export function changeTask(data: PublicData, task: Task, patch: Partial<Task>): void {
  let found=data.tasks.find(t=>t.id===task.id);
  if(!found){
    if(!task.seriesId)return; // A task deleted in another operation must stay deleted.
    const series=data.series.find(s=>s.id===task.seriesId);if(!series||!applies(series,task.date))return;
    found=structuredClone(task); data.tasks.push(found);
  }
  Object.assign(found,patch);
}
export const wheelRotation = (index: number, count: number, current: number): number => current + 5*360 + ((270-(index+.5)*360/count-current)%360+360)%360;

// A malformed saved record is an error, never a reason to write an empty collection.
const obj = (v: unknown): v is Record<string,unknown> => !!v && typeof v==='object' && !Array.isArray(v);
const str = (v: unknown): v is string => typeof v==='string';
const identifier = (v: unknown) => str(v) && /^[a-zA-Z0-9:-]{1,100}$/.test(v);
const num = (v: unknown): v is number => typeof v==='number' && Number.isFinite(v);
const frames = (v:unknown) => v===undefined || (Array.isArray(v)&&v.every(f=>FRAME_STYLES.includes(f)));
const captions = (v:unknown,max:number) => v===undefined || (Array.isArray(v)&&v.length<=max&&v.every(c=>str(c)&&c.length<=300));
const between = (v:unknown,min:number,max:number) => num(v)&&v>=min&&v<=max;
export const validStickers = (v:unknown):v is Sticker[] => Array.isArray(v)&&v.length<=40&&new Set(v.map(s=>s?.id)).size===v.length&&v.every(s=>obj(s)&&identifier(s.id)&&STICKER_KINDS.includes(s.kind as StickerKind)&&between(s.x,0,100)&&between(s.y,0,100)&&between(s.size,48,144)&&between(s.rotation,-180,180));
const bool = (v: unknown): v is boolean => typeof v==='boolean';
const strings = (v: unknown) => Array.isArray(v) && v.every(str);
const record = (v: unknown) => obj(v) && Object.values(v).every(str);
const date = (v: unknown) => str(v) && /^\d{4}-\d{2}-\d{2}$/.test(v);
const activity = (v: unknown) => obj(v) && str(v.e) && str(v.n) && str(v.b);
export const safeImage = (v: unknown): v is string => str(v) && /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(v);
export function validPublic(v: unknown): v is PublicData {
  if(!obj(v) || v.version!==2) return false;
  return Array.isArray(v.tasks) && v.tasks.every(t=>obj(t)&&identifier(t.id)&&date(t.date)&&str(t.text)&&str(t.notes)&&bool(t.done)&&bool(t.important)&&str(t.reason)&&num(t.order)&&(t.seriesId===undefined||identifier(t.seriesId))) &&
    Array.isArray(v.series) && v.series.every(s=>obj(s)&&identifier(s.id)&&str(s.text)&&str(s.notes)&&bool(s.important)&&['daily','weekly'].includes(String(s.repeat))&&date(s.start)&&(s.end===undefined||date(s.end))&&strings(s.exceptions)&&num(s.order)) &&
    Array.isArray(v.gratitude)&&v.gratitude.every(g=>obj(g)&&identifier(g.id)&&date(g.date)&&str(g.text)) && record(v.answers) &&
    Array.isArray(v.passport)&&v.passport.every(p=>obj(p)&&identifier(p.id)&&str(p.date)&&activity(p.main)&&activity(p.side)&&str(p.notes)&&num(p.rating)&&p.rating>=0&&p.rating<=5&&Number.isInteger(p.rating)&&Array.isArray(p.images)&&p.images.every(safeImage)&&frames(p.photoFrames)&&Array.isArray(p.todos)&&p.todos.every(t=>obj(t)&&identifier(t.id)&&str(t.text)&&bool(t.done))) &&
    obj(v.flow)&&identifier(v.flow.id)&&['main','mainResult','side','sideResult','confirm'].includes(String(v.flow.stage))&&bool(v.flow.mainRespun)&&bool(v.flow.sideRespun)&&
    (v.flow.main===undefined||activity(v.flow.main))&&(v.flow.side===undefined||activity(v.flow.side))&&
    (v.flow.stage==='main'||activity(v.flow.main))&&(v.flow.stage!=='confirm'&&v.flow.stage!=='sideResult'||activity(v.flow.side));
}
export function validPrivate(v: unknown): v is PrivateData {
  return obj(v)&&v.version===2&&obj(v.days)&&Object.entries(v.days).every(([key,d])=>date(key)&&obj(d)&&str(d.html)&&str(d.font)&&str(d.mood)&&record(d.highlightNotes)&&Array.isArray(d.images)&&d.images.every(safeImage)&&str(d.note)&&(d.stickers===undefined||validStickers(d.stickers))&&frames(d.photoFrames)&&captions(d.photoCaptions,d.images.length));
}
