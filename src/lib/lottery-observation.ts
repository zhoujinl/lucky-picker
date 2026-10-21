import {normalizeObservationNote,validObservationNote} from './observation-note'
import { lotteries, isPositional, type LotteryId, type Ticket } from './picker'
export interface OfficialIssue { id:LotteryId; issue:string; cutoff:string; drawTime:string; source:string; confirmed:true }
export interface OfficialDraw extends Ticket { id:LotteryId; issue:string; drawTime:string; source:string; updatedAt:string; specialRegime?:boolean }
export interface Evaluation { status:'won'|'lost'|'unsupported'; tier?:number; label:string; primaryHits:number[]; secondaryHits:number[]; ruleVersion:string }
export interface LotteryObservation { key:string; note?:string; id:LotteryId; issue:string; ticket:Ticket; cutoff:string; drawTime:string; source:string; addedAt:string; issueVerification?:'unverified'|'verified'; result?:OfficialDraw; error?:string }
export const LOTTERY_STORAGE_KEY='lucky-picker:lottery-observations:v1'
export function validateTicket(id:LotteryId,t:Ticket,result=false):void {
 const l=lotteries.find(x=>x.id===id);if(!l||!t||!Array.isArray(t.primary)||!Array.isArray(t.secondary))throw Error('号码结构无效')
 const secondaryCount=result&&id==='qlc'?1:l.secondaryCount
 for(const [numbers,count,max] of [[t.primary,l.primaryCount,l.primaryMax],[t.secondary,secondaryCount,id==='qlc'?30:l.secondaryMax]] as const){if(numbers.length!==count||numbers.some(n=>!Number.isInteger(n)||n<(isPositional(id)?0:1)||n>max)||(!isPositional(id)&&new Set(numbers).size!==numbers.length))throw Error('号码数量、范围或重复值无效')}
 if(result&&id==='qlc'&&t.primary.includes(t.secondary[0]!))throw Error('特别号不能与基本号重复')
}
export function validateDraw(id:LotteryId,issue:string,value:unknown):OfficialDraw {
 const d=value as OfficialDraw
 if(!d||d.id!==id||d.issue!==issue||!/^\d{5,7}$/.test(issue)||!/^\d{4}-\d{2}-\d{2}(?:T|$)/.test(d.drawTime)||!Number.isFinite(Date.parse(d.drawTime))||!Number.isFinite(Date.parse(d.updatedAt))||!/^https:\/\//.test(d.source))throw Error('官方开奖结果缺失、期号不符或日期无效')
 validateTicket(id,d,true);return d
}
export function evaluate(id:LotteryId,t:Ticket,d:OfficialDraw):Evaluation {
 validateTicket(id,t);validateDraw(id,d.issue,d)
 const positions=isPositional(id),p=t.primary.map((n,i)=>positions?n===d.primary[i]:d.primary.includes(n)),s=t.secondary.map((n,i)=>positions?n===d.secondary[i]:d.secondary.includes(n));const a=p.filter(Boolean).length,b=s.filter(Boolean).length
 const base={primaryHits:p.flatMap((yes,i)=>yes?[i]:[]),secondaryHits:s.flatMap((yes,i)=>yes?[i]:[]),ruleVersion:`${id}:2026-verified`}
 const unsupported=():Evaluation=>({...base,status:'unsupported',label:'暂不支持核奖'})
 if(!/^2026\d{3}$/.test(d.issue)&&!/^26\d{3}$/.test(d.issue))return unsupported()
 let tier=0
 if(id==='dlt') {if(Number(d.issue)<26014)return unsupported();tier=({'5,2':1,'5,1':2,'5,0':3,'4,2':3,'4,1':4,'4,0':5,'3,2':5,'3,1':6,'2,2':6,'3,0':7,'2,1':7,'1,2':7,'0,2':7} as Record<string,number>)[`${a},${b}`]||0;base.ruleVersion='dlt:26014'}
 else if(id==='ssq'){tier=a===6?(b?1:2):a===5?(b?3:4):a===4?(b?4:5):a===3&&b?5:b?6:0;if(a===3&&!b){if(d.specialRegime===undefined)return unsupported();if(d.specialRegime)return {...base,status:'won',tier:7,label:'福运奖'}}}
 else if(id==='qlc'){const special=t.primary.includes(d.secondary[0]!)?1:0;tier=a===7?1:a===6?(special?2:3):a===5?(special?4:5):a===4?(special?6:7):0}
 else if(id==='qxc'){tier=a===6?(b?1:2):a===5&&b?3:a+b===5?4:a+b===4?5:a+b===3||b?6:0}
 else tier=a===t.primary.length?1:0
 const name=id==='pl3'?'直选奖':id==='fc3d'?'单选奖':id==='pl5'?'一等奖':`${['','一','二','三','四','五','六','七'][tier]}等奖`
 return {...base,status:tier?'won':'lost',tier,label:tier?name:'未命中'}
}
export function addObservations(rows:LotteryObservation[],issue:OfficialIssue,tickets:Ticket[],now=Date.now(),note=''):LotteryObservation[]{
 const normalizedNote=normalizeObservationNote(note)
 if(issue.confirmed!==true||!/^\d{5,7}$/.test(issue.issue)||!Number.isFinite(Date.parse(issue.cutoff))||Date.parse(issue.cutoff)<=now||!Number.isFinite(Date.parse(issue.drawTime))||Date.parse(issue.drawTime)<Date.parse(issue.cutoff)||!/^https:\/\//.test(issue.source))throw Error('无法确认官方期号或已停止销售，请刷新期次')
 if(tickets.length<1||tickets.length>10)throw Error('每次仅支持 1 至 10 组')
 const next=[...rows];for(const t of tickets){validateTicket(issue.id,t);const ticket={primary:[...t.primary],secondary:[...t.secondary]};if(!isPositional(issue.id)){ticket.primary.sort((a,b)=>a-b);ticket.secondary.sort((a,b)=>a-b)}const key=`${issue.id}:${issue.issue}:${JSON.stringify(ticket)}`;if(!next.some(r=>r.key===key))next.push({key,note:normalizedNote,id:issue.id,issue:issue.issue,ticket,cutoff:issue.cutoff,drawTime:issue.drawTime,source:issue.source,addedAt:new Date(now).toISOString()})}if(next.length>1000)throw Error('最多保存 1000 组观察');return next
}
export function loadObservations(storage:Pick<Storage,'getItem'>):LotteryObservation[]{const raw=storage.getItem(LOTTERY_STORAGE_KEY);if(!raw)return [];try{const value=JSON.parse(raw);if(value.version!==1||!Array.isArray(value.rows)||value.rows.length>1000)throw Error();for(const r of value.rows){validateTicket(r.id,r.ticket);if(!validObservationNote(r.note)||typeof r.key!=='string'||!/^\d{5,7}$/.test(r.issue)||!Number.isFinite(Date.parse(r.addedAt)))throw Error();if(r.result)validateDraw(r.id,r.issue,r.result)}return value.rows}catch{throw Error('彩票观察存储损坏，请先备份浏览器数据；未覆盖原记录')}}
export function saveObservations(storage:Pick<Storage,'setItem'>,rows:LotteryObservation[]):void{try{storage.setItem(LOTTERY_STORAGE_KEY,JSON.stringify({version:1,rows}))}catch{throw Error('彩票观察保存失败，请检查浏览器存储空间或权限')}}
export function observationStatus(r:LotteryObservation,now=Date.now()):Evaluation['status']|'pending'|'checking'{return r.result?evaluate(r.id,r.ticket,r.result).status:Date.parse(r.drawTime)>now?'pending':'checking'}

export function addUnverifiedObservations(rows:LotteryObservation[],id:LotteryId,issue:string,tickets:Ticket[],now=Date.now(),note=''):LotteryObservation[]{
 const normalizedNote=normalizeObservationNote(note)
 if(!/^\d{5,7}$/.test(issue)||tickets.length<1||tickets.length>10)throw Error('请填写官方公告或票面上的原始数字期号（5 至 7 位）')
 const next=[...rows];for(const t of tickets){validateTicket(id,t);const ticket={primary:[...t.primary],secondary:[...t.secondary]};if(!isPositional(id)){ticket.primary.sort((a,b)=>a-b);ticket.secondary.sort((a,b)=>a-b)}const key=`${id}:${issue}:${JSON.stringify(ticket)}`;if(!next.some(r=>r.key===key))next.push({key,note:normalizedNote,id,issue,ticket,cutoff:'',drawTime:'',source:lotteries.find(l=>l.id===id)!.scheduleUrl,addedAt:new Date(now).toISOString(),issueVerification:'unverified'})}if(next.length>1000)throw Error('最多保存 1000 组观察');return next
}
