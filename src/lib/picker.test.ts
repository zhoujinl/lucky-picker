import { afterEach, describe, expect, it, vi } from 'vitest'
import { formatTicket, generateTickets, lotteries, pickStock, randomInt, replaceTicket, type LotteryId } from './picker'
afterEach(() => vi.restoreAllMocks())
describe('lottery rules', () => {
  it.each<[LotteryId, number, number, number, number]>([['ssq',6,33,1,16], ['dlt',5,35,2,12], ['qlc',7,30,0,0]])('%s obeys zone counts, ranges, sorting and uniqueness', (id, n, max, backN, backMax) => {
    for (let batch = 0; batch < 30; batch++) {
      const tickets = generateTickets(id,10)
      expect(tickets).toHaveLength(10)
      expect(new Set(tickets.map(t => JSON.stringify(t))).size).toBe(10)
      for (const t of tickets) {
        for (const [values, count, limit] of [[t.primary,n,max],[t.secondary,backN,backMax]] as const) {
          expect(values).toHaveLength(count)
          expect(new Set(values).size).toBe(count)
          expect(values).toEqual([...values].sort((a,b) => a-b))
          expect(values.every(x => Number.isInteger(x) && x >= 1 && x <= limit)).toBe(true)
        }
      }
    }
  })
  it.each<[LotteryId,number]>([['pl3',3],['pl5',5],['fc3d',3]])('%s preserves digit positions and permits repeated zeros', (id,n) => {
    vi.spyOn(crypto,'getRandomValues').mockImplementation((array) => { (array as Uint32Array).fill(0); return array })
    expect(generateTickets(id,1)).toEqual([{primary:Array(n).fill(0),secondary:[]}])
  })
  it('generates ten unique positional tickets within 0–9', () => {
    for (const id of ['pl3','pl5'] as const) {
      const result = generateTickets(id,10)
      expect(new Set(result.map(t => JSON.stringify(t))).size).toBe(10)
      expect(result.every(t => t.primary.length === (id === 'pl3' ? 3 : 5) && t.primary.every(x => x >= 0 && x <= 9) && !t.secondary.length)).toBe(true)
    }
  })
  it('replaces only the selected row and avoids all existing combinations', () => {
    const before = generateTickets('ssq',10)
    const after = replaceTicket('ssq',before,4)
    expect(after[4]).not.toEqual(before[4])
    expect(after.filter((_,i)=>i!==4)).toEqual(before.filter((_,i)=>i!==4))
    expect(new Set(after.map(t=>JSON.stringify(t))).size).toBe(10)
    expect(before).not.toBe(after)
  })
  it('rejects invalid counts and row indices', () => {
    expect(()=>generateTickets('ssq',0 as 1)).toThrow()
    expect(()=>replaceTicket('ssq',[],0)).toThrow()
  })
})
describe('random sampling', () => {
  it('rejects the biased uint32 tail before mapping into the range', () => {
    const values=[4294967295,4294967294,4294967290,9]
    vi.spyOn(crypto,'getRandomValues').mockImplementation((array) => { (array as Uint32Array)[0]=values.shift()!; return array })
    expect(randomInt(10)).toBe(9)
    expect(values).toHaveLength(0)
  })
  it.each([0,-1,1.5,NaN,4294967297])('rejects invalid random bound %s', n => expect(()=>randomInt(n)).toThrow())
  it('can select the first and last members of the declared stock pool', async () => {
    const {stocks}=await import('../data/stocks')
    const values=[0,stocks.length-1]
    vi.spyOn(crypto,'getRandomValues').mockImplementation((array) => { (array as Uint32Array)[0]=values.shift()!; return array })
    expect(pickStock()).toEqual(stocks[0])
    expect(pickStock()).toEqual(stocks.at(-1))
    expect(new Set(stocks.map(s=>s.code)).size).toBe(stocks.length)
    expect(stocks.every(s=>/^\d{6}$/.test(s.code) && s.name && s.market)).toBe(true)
  })
})

describe('new lottery formats', () => {
  it('7星彩 retains six ordered digits and an independent final 0–14 number', () => {
    const values=[9,0,9,1,0,2,14]
    vi.spyOn(crypto,'getRandomValues').mockImplementation(array=>{(array as Uint32Array)[0]=values.shift()!;return array})
    const ticket=generateTickets('qxc',1)[0]
    expect(ticket).toEqual({primary:[9,0,9,1,0,2],secondary:[14]})
    expect(formatTicket('qxc',ticket)).toBe('9 0 9 1 0 2 + 14')
  })
  it('7星彩 permits zeros in every position', () => {
    vi.spyOn(crypto,'getRandomValues').mockImplementation(array=>{(array as Uint32Array).fill(0);return array})
    expect(formatTicket('qxc',generateTickets('qxc',1)[0])).toBe('0 0 0 0 0 0 + 0')
  })
  it('generates ten distinct 7星彩 tickets and replaces only the requested row', () => {
    const tickets=generateTickets('qxc',10)
    expect(new Set(tickets.map(t=>JSON.stringify(t))).size).toBe(10)
    for(const t of tickets){expect(t.primary).toHaveLength(6);expect(t.primary.every(n=>n>=0&&n<=9)).toBe(true);expect(t.secondary).toHaveLength(1);expect(t.secondary[0]).toBeGreaterThanOrEqual(0);expect(t.secondary[0]).toBeLessThanOrEqual(14)}
    const next=replaceTicket('qxc',tickets,3)
    expect(next[3]).not.toEqual(tickets[3])
    expect(next.filter((_,i)=>i!==3)).toEqual(tickets.filter((_,i)=>i!==3))
  })
  it('formats 福彩3D positions and 七乐彩 selections correctly',()=>{
    expect(formatTicket('fc3d',{primary:[0,0,9],secondary:[]})).toBe('0 0 9')
    expect(formatTicket('qlc',{primary:[1,2,3,4,5,6,30],secondary:[]})).toBe('01 02 03 04 05 06 30')
  })
  it('provides a schedule and introduction for all seven lotteries',()=>{
    expect(lotteries).toHaveLength(7)
    for(const rule of lotteries){expect(rule.drawSchedule).toMatch(/21:/);expect(rule.drawRule.length).toBeGreaterThan(15);expect(rule.scheduleUrl).toMatch(/^https:/)}
  })
})
