export interface ObservationDay {date:string;open:number;close:number;adjustedOpen:number;adjustedClose:number}
export interface ObservationSnapshot {code:string;from:string;days:ObservationDay[];sessions:string[];updatedAt:string;source:string;calendarThrough:string}
export interface StockObservation {id:string;code:string;name:string;market:string;source:'all'|'hot';addedAt:string;snapshot?:ObservationSnapshot;error?:string}
const key='lucky-stock-observations-v1'
export function baselineDate(time:string){return new Date(time).toLocaleDateString('en-CA',{timeZone:'Asia/Shanghai'})}
const validDate=(s:unknown):s is string=>typeof s==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(s)&&!isNaN(Date.parse(s))&&new Date(s).toISOString().slice(0,10)===s
export function validateSnapshot(value:unknown,code:string):value is ObservationSnapshot {
 const s=value as ObservationSnapshot
 return !!s&&s.code===code&&validDate(s.from)&&(s.calendarThrough===''||validDate(s.calendarThrough))&&typeof s.source==='string'&&typeof s.updatedAt==='string'&&!isNaN(Date.parse(s.updatedAt))&&Array.isArray(s.sessions)&&s.sessions.every(validDate)&&new Set(s.sessions).size===s.sessions.length&&s.sessions.every((v,i)=>!i||v>s.sessions[i-1]!)&&Array.isArray(s.days)&&s.days.every((d,i)=>validDate(d.date)&&(!i||d.date>s.days[i-1]!.date)&&[d.open,d.close,d.adjustedOpen,d.adjustedClose].every(p=>typeof p==='number'&&Number.isFinite(p)&&p>0))
}
export function evaluateObservation(record:StockObservation,snapshot=record.snapshot){
 const base=snapshot?.days.find(d=>d.date>=baselineDate(record.addedAt));const sessions=base?snapshot!.sessions.filter(d=>d>=base.date):[]
 const points=base?snapshot!.days.filter(d=>d.date>=base.date).map(d=>({...d,change:(d.adjustedClose/base.adjustedOpen-1)*100})):[]
 const nodes=[3,10].map(n=>{const date=sessions[n];const point=points.find(p=>p.date===date);return {day:n,date,status:date?(point?'confirmed':'missing'):'pending',point}})
 return {base,points,nodes,progress:Math.max(0,sessions.length-1),completed:!!sessions[10]}
}
export function readObservations(storage:Pick<Storage,'getItem'>=localStorage):{records:StockObservation[];error:string}{try{const raw=storage.getItem(key);if(!raw)return {records:[],error:''};const data=JSON.parse(raw);if(data.version!==1||!Array.isArray(data.records)||data.records.length>1000)throw Error();const ids=new Set();for(const r of data.records){if(!r||typeof r.id!=='string'||ids.has(r.id)||!/^\d{6}$/.test(r.code)||typeof r.name!=='string'||typeof r.market!=='string'||!['all','hot'].includes(r.source)||typeof r.addedAt!=='string'||isNaN(Date.parse(r.addedAt))||(r.snapshot&&!validateSnapshot(r.snapshot,r.code)))throw Error();ids.add(r.id)}return {records:data.records,error:''}}catch{return {records:[],error:'观察存储读取失败，原始存储未覆盖；请检查浏览器存储。'}}}
export function saveObservations(records:StockObservation[],storage:Pick<Storage,'setItem'>=localStorage){storage.setItem(key,JSON.stringify({version:1,records}))}
export async function fetchObservation(record:StockObservation):Promise<ObservationSnapshot>{const response=await fetch(`/api/stock-observations/quote?code=${record.code}&from=${baselineDate(record.addedAt)}`,{signal:AbortSignal.timeout(35000)});const result=await response.json();if(!response.ok)throw Error(result.error||'行情更新失败');if(!validateSnapshot(result,record.code))throw Error('行情响应异常，保留上次完整快照');return result}
