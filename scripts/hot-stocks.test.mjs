import {describe,it,expect} from 'vitest'
import {parseEastmoneyRanks,parseThsRanks,parseQuotes,buildHotPool} from './hot-stocks.mjs'
const base=[{code:'000001',name:'甲',market:'深市主板'},{code:'600001',name:'乙',market:'沪市主板'},{code:'000002',name:'丙',market:'深市主板'}]
const ranks=[{code:'000001',rank:1},{code:'600001',rank:2},{code:'000002',rank:3}]
const quotes=[{code:'000001',name:'甲',amount:500000000,turnover:1,change:2,date:'2026-10-20'},{code:'600001',name:'乙',amount:900000000,turnover:5,change:-4,date:'2026-10-20'},{code:'000002',name:'丙',amount:800000000,turnover:3,change:0,date:'2026-10-20'}]
describe('hot stock sources and filters',()=>{
 it('normalizes source ranks without losing leading zeros',()=>{
  expect(parseEastmoneyRanks({code:0,data:[{sc:'SZ000001',rk:1}]})).toEqual([{code:'000001',rank:1}])
  expect(parseThsRanks({status_code:0,data:{stock_list:[{code:'000001',order:1}]}})).toEqual([{code:'000001',rank:1}])
 })
 it('rejects empty, failed, duplicate and malformed ranks',()=>{
  for(const data of [[],[{sc:'SZ000001',rk:1},{sc:'SZ000001',rk:2}],[{sc:'bad',rk:1}],[{sc:'SZ000001',rk:0}]])expect(()=>parseEastmoneyRanks({code:0,data})).toThrow()
  expect(()=>parseThsRanks({status_code:1,data:{stock_list:[{code:'000001',order:1}]}})).toThrow()
 })
 it('converts quote timestamp to a China date and excludes missing numeric fields',()=>{
  const rows=parseQuotes({rc:0,data:{diff:[{f12:'000001',f14:'甲',f6:500000000,f8:1,f3:0,f124:1792481664},{f12:'600001',f14:'乙',f6:'-',f8:5,f3:0,f124:1792481664}]}})
  expect(rows).toHaveLength(1);expect(rows[0].date).toBe('2026-10-20');expect(rows[0].amount).toBe(500000000)
  expect(()=>parseQuotes({rc:1,data:null})).toThrow()
 })
 it('merges both top 100 lists once and preserves both ranks without weighting',()=>{
  const pool=buildHotPool(ranks,[{code:'000001',rank:9},{code:'000002',rank:5}],quotes,base)
  expect(pool.stocks).toHaveLength(3)
  expect(pool.stocks.find(s=>s.code==='000001')).toMatchObject({eastmoneyRank:1,thsRank:9})
  expect(pool.stocks.find(s=>s.code==='600001')).toMatchObject({eastmoneyRank:2,thsRank:null})
  expect(pool.dataDate).toBe('2026-10-20')
 })
 it('excludes ST, delisting, low amount, low turnover, stale or absent quotes and non-pool codes',()=>{
  for(const patch of [{name:'*ST甲'},{name:'甲退'},{amount:499999999},{turnover:.99},{date:'2026-10-19'}]){
   const result=buildHotPool(ranks,[],[{...quotes[0],...patch},quotes[1]],base)
   expect(result.stocks.map(s=>s.code)).toEqual(['600001'])
  }
  expect(buildHotPool([...ranks,{code:'999999',rank:4}],[],quotes,base).stocks).toHaveLength(3)
  expect(()=>buildHotPool(ranks,[],[],base)).toThrow()
 })
 it('includes threshold boundaries and declines rather than claiming an uptrend',()=>{
  const result=buildHotPool(ranks,[],quotes,base)
  expect(result.stocks.map(s=>s.code)).toContain('000001')
  expect(result.stocks.find(s=>s.code==='600001').change).toBe(-4)
 })
})
it('identifies the offending source row instead of hiding every rank issue behind one generic error',()=>{
 expect(()=>parseEastmoneyRanks({code:0,data:[{sc:'SZ000001',rk:1},{sc:'SZ000001',rk:2}]})).toThrow('重复股票代码 000001')
 expect(()=>parseEastmoneyRanks({code:0,data:[{sc:'SZ000001',rk:'1'}]})).toThrow('排名格式异常')
})
