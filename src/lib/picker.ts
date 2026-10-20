import { stocks, type Stock } from '../data/stocks'
export type LotteryId = 'ssq' | 'dlt' | 'pl3' | 'pl5' | 'fc3d' | 'qxc' | 'qlc'
export interface Ticket { primary: number[]; secondary: number[] }
export interface Lottery {
  id: LotteryId; name: string; issuer: string; description: string
  mode: 'combination' | 'positional'
  primaryCount: number; primaryMax: number; secondaryCount: number; secondaryMax: number
  drawSchedule: string; drawRule: string; ruleUrl: string; scheduleUrl: string
}
const sportsSchedule = 'https://m.lottery.gov.cn/xxgk/tzggz/20221220/10027143.html'
export const lotteries: Lottery[] = [
  { id:'ssq', name:'双色球', issuer:'中国福利彩票', mode:'combination', description:'红球 01–33 选 6 个，蓝球 01–16 选 1 个', primaryCount:6, primaryMax:33, secondaryCount:1, secondaryMax:16,
    drawSchedule:'每周二、四、日 21:15', drawRule:'摇出 6 个红球和 1 个蓝球；各区号码不计顺序，红球全中且蓝球相同为一等奖，其余按命中组合判奖。',
    ruleUrl:'https://www.scflcp.com.cn/yxgz/823145252.jhtml', scheduleUrl:'https://mzj.sz.gov.cn/szmz/pc/bmxx/mzfwzy/flcp/bmxx/content/post_2929813.html' },
  { id:'dlt', name:'超级大乐透', issuer:'中国体育彩票', mode:'combination', description:'前区 01–35 选 5 个，后区 01–12 选 2 个', primaryCount:5, primaryMax:35, secondaryCount:2, secondaryMax:12,
    drawSchedule:'每周一、三、六 21:25', drawRule:'前区摇出 5 个号码，后区摇出 2 个号码；各区号码不计顺序，前后区全部命中为一等奖，其余按命中组合判奖。',
    ruleUrl:'https://www.gstc.org.cn/newsDetail/030600/030601', scheduleUrl:sportsSchedule },
  { id:'pl3', name:'排列三', issuer:'中国体育彩票', mode:'positional', description:'按百、十、个位随机生成，数字 0–9，可重复', primaryCount:3, primaryMax:9, secondaryCount:0, secondaryMax:0,
    drawSchedule:'每日 21:25', drawRule:'按顺序摇出 3 位 0–9 数字，可出现重复数字。这里生成直选号码，三位数字及位置全部对应才中直选奖；组选另按官方玩法判奖。',
    ruleUrl:'https://www.sport.gov.cn/cpzx/n5649/c663326/content.html', scheduleUrl:sportsSchedule },
  { id:'pl5', name:'排列五', issuer:'中国体育彩票', mode:'positional', description:'按万、千、百、十、个位随机生成，数字 0–9，可重复', primaryCount:5, primaryMax:9, secondaryCount:0, secondaryMax:0,
    drawSchedule:'每日 21:25', drawRule:'按顺序摇出 5 位 0–9 数字，可出现重复数字；所选的五位数字与开奖号码逐位完全相同即中奖。',
    ruleUrl:'https://m.lottery.gov.cn/ksjz/plw/guize/', scheduleUrl:sportsSchedule },
  { id:'fc3d', name:'福彩3D', issuer:'中国福利彩票', mode:'positional', description:'按百、十、个位随机生成，数字 0–9，可重复', primaryCount:3, primaryMax:9, secondaryCount:0, secondaryMax:0,
    drawSchedule:'每日 21:15', drawRule:'按顺序摇出 3 位 0–9 数字，可出现重复数字。这里生成单选（直选）号码，三位数字及位置全部对应才中单选奖；组选另按官方玩法判奖。',
    ruleUrl:'https://www.swlc.net.cn/games/3d.html', scheduleUrl:'https://www.swlc.net.cn/lottery/3d.html?view=previous' },
  { id:'qxc', name:'7星彩', issuer:'中国体育彩票', mode:'positional', description:'前六位各选 0–9，可重复；最后一位选 0–14', primaryCount:6, primaryMax:9, secondaryCount:1, secondaryMax:14,
    drawSchedule:'每周二、五、日 21:25', drawRule:'依次摇出前六位 0–9 数字，再从 0–14 中摇出最后一位。按对应位置判奖，七个位置全部命中为一等奖，其余按官方命中条件判奖。',
    ruleUrl:'https://www.nmtc.com.cn/ggtz/21145.html', scheduleUrl:'https://m.sxtc.com.cn/cjdlt/list/page.html' },
  { id:'qlc', name:'七乐彩', issuer:'中国福利彩票', mode:'combination', description:'从 01–30 中选 7 个不同号码，不另选特别号', primaryCount:7, primaryMax:30, secondaryCount:0, secondaryMax:0,
    drawSchedule:'每周一、三、五 21:15', drawRule:'从 30 个号码中先摇出 7 个基本号，再摇出 1 个特别号。投注只选 7 个号码，顺序不限；命中全部基本号为一等奖，其余按基本号及特别号的命中情况判奖。',
    ruleUrl:'https://www.swlc.net.cn/games/qlc.html', scheduleUrl:'https://www.swlc.net.cn/lottery/qlc.html?view=previous' },
]
export function isPositional(id: LotteryId): boolean {
  return lotteries.find(l=>l.id===id)?.mode === 'positional'
}
export function formatBall(id: LotteryId, n: number): string {
  return isPositional(id) ? String(n) : String(n).padStart(2,'0')
}
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
    const ticket: Ticket = rule.mode === 'combination'
      ? {primary:sample(rule.primaryCount,rule.primaryMax),secondary:sample(rule.secondaryCount,rule.secondaryMax)}
      : {primary:Array.from({length:rule.primaryCount},()=>randomInt(rule.primaryMax+1)),secondary:Array.from({length:rule.secondaryCount},()=>randomInt(rule.secondaryMax+1))}
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
  return t.primary.map(n=>formatBall(id,n)).join(' ') + (t.secondary.length?' + '+t.secondary.map(n=>formatBall(id,n)).join(' '):'')
}
