import { stocks, type Stock } from '../data/stocks'
export type LotteryId = 'ssq' | 'dlt' | 'pl3' | 'pl5'
export interface Ticket { primary: number[]; secondary: number[] }
export interface Lottery { id: LotteryId; name: string; issuer: string; description: string; primaryCount: number; primaryMax: number; secondaryCount: number; secondaryMax: number; ruleUrl: string }
export const lotteries: Lottery[] = [
  { id:'ssq', name:'双色球', issuer:'中国福利彩票', description:'红球 01–33 选 6 个，蓝球 01–16 选 1 个', primaryCount:6, primaryMax:33, secondaryCount:1, secondaryMax:16, ruleUrl:'https://www.scflcp.com.cn/yxgz/823145252.jhtml' },
  { id:'dlt', name:'超级大乐透', issuer:'中国体育彩票', description:'前区 01–35 选 5 个，后区 01–12 选 2 个', primaryCount:5, primaryMax:35, secondaryCount:2, secondaryMax:12, ruleUrl:'https://www.gstc.org.cn/newsDetail/030600/030601' },
  { id:'pl3', name:'排列三', issuer:'中国体育彩票', description:'按百、十、个位随机生成，数字 0–9，可重复', primaryCount:3, primaryMax:9, secondaryCount:0, secondaryMax:0, ruleUrl:'https://www.sport.gov.cn/cpzx/n5649/c663326/content.html' },
  { id:'pl5', name:'排列五', issuer:'中国体育彩票', description:'按万、千、百、十、个位随机生成，数字 0–9，可重复', primaryCount:5, primaryMax:9, secondaryCount:0, secondaryMax:0, ruleUrl:'https://m.lottery.gov.cn/ksjz/plw/guize/' },
]
export function randomInt(maxExclusive: number): number {
  if (!Number.isSafeInteger(maxExclusive) || maxExclusive < 1 || maxExclusive > 2**32) throw new RangeError('随机范围无效')
  const limit = Math.floor(2**32 / maxExclusive) * maxExclusive
  const buffer = new Uint32Array(1)
  for (let attempt=0; attempt<10000; attempt++) {
    crypto.getRandomValues(buffer)
    if (buffer[0] < limit) return buffer[0] % maxExclusive
  }
  throw new Error('随机源暂时不可用，请重试')
}
function sample(count: number, max: number): number[] {
  const pool = Array.from({length:max},(_,i)=>i+1)
  for (let i=0;i<count;i++) {
    const j=i+randomInt(max-i)
    ;[pool[i],pool[j]]=[pool[j],pool[i]]
  }
  return pool.slice(0,count).sort((a,b)=>a-b)
}
function uniqueTicket(id: LotteryId, excluded: Set<string>): Ticket {
  const rule = lotteries.find(l=>l.id===id)
  if (!rule) throw new RangeError('未知彩种')
  for (let attempt=0; attempt<10000;attempt++) {
    const ticket: Ticket = rule.secondaryCount
      ? {primary:sample(rule.primaryCount,rule.primaryMax),secondary:sample(rule.secondaryCount,rule.secondaryMax)}
      : {primary:Array.from({length:rule.primaryCount},()=>randomInt(10)),secondary:[]}
    if (!excluded.has(JSON.stringify(ticket))) return ticket
  }
  throw new Error('暂时无法生成不同的号码，请重试')
}
export function generateTickets(id: LotteryId, count: 1 | 10): Ticket[] {
  if (count !== 1 && count !== 10) throw new RangeError('仅支持生成 1 组或 10 组')
  const excluded = new Set<string>()
  return Array.from({length:count},()=>{
    const ticket=uniqueTicket(id,excluded)
    excluded.add(JSON.stringify(ticket))
    return ticket
  })
}
export function replaceTicket(id: LotteryId, tickets: Ticket[], index: number): Ticket[] {
  if (!Number.isInteger(index) || index < 0 || index >= tickets.length) throw new RangeError('无效的组号')
  const next=[...tickets]
  next[index]=uniqueTicket(id,new Set(tickets.map(t=>JSON.stringify(t))))
  return next
}
export function pickStock(): Stock { return stocks[randomInt(stocks.length)] }
export function formatTicket(id: LotteryId, t: Ticket): string {
  const digits=id==='pl3'||id==='pl5'
  return t.primary.map(n=>digits?String(n):String(n).padStart(2,'0')).join(' ') + (t.secondary.length?' + '+t.secondary.map(n=>String(n).padStart(2,'0')).join(' '):'')
}
