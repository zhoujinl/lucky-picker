export const MIN_AMOUNT=500000000
export const MIN_TURNOVER=1
export const EASTMONEY_URL='https://emappdata.eastmoney.com/stockrank/getAllCurrentList'
export const THS_URL='https://eq.10jqka.com.cn/open/api/hot_list/v1/hot_stock/a/hour/data.txt'
function ranks(rows,codeOf,rankOf) {
  if (!Array.isArray(rows)||!rows.length) throw new Error('热榜为空')
  const result=rows.map(row=>({code:codeOf(row),rank:rankOf(row)}))
  const codes=new Set(),positions=new Set()
  result.forEach((r,index)=>{
   if(!/^\d{6}$/.test(r.code))throw new Error(`热榜第 ${index+1} 条股票代码格式异常`)
   if(!Number.isInteger(r.rank)||r.rank<1)throw new Error(`热榜 ${r.code} 排名格式异常：${JSON.stringify(r.rank)}`)
   if(codes.has(r.code))throw new Error(`热榜重复股票代码 ${r.code}（排名 ${r.rank}）`)
   if(positions.has(r.rank))throw new Error(`热榜重复排名 ${r.rank}（股票 ${r.code}）`)
   codes.add(r.code);positions.add(r.rank)
  })
  return result.filter(r=>r.rank<=100)
}
export function parseEastmoneyRanks(payload) {
  if(payload?.code!==0)throw new Error('东方财富热榜返回失败')
  return ranks(payload.data,r=>/^(SH|SZ|BJ)\d{6}$/.test(r.sc)?r.sc.slice(2):'',r=>r.rk)
}
export function parseThsRanks(payload) {
  if(payload?.status_code!==0)throw new Error('同花顺热榜返回失败')
  return ranks(payload.data?.stock_list,r=>r.code,r=>r.order)
}
export function parseQuotes(payload) {
  if(payload?.rc!==0||!Array.isArray(payload.data?.diff))throw new Error('东方财富行情返回失败')
  return payload.data.diff.filter(r=>/^\d{6}$/.test(r.f12)&&typeof r.f14==='string'&&r.f14.trim()&&[r.f6,r.f8,r.f3,r.f124].every(n=>typeof n==='number'&&Number.isFinite(n))&&r.f124>0&&r.f6>=0&&r.f8>=0).map(r=>({code:r.f12,name:r.f14.normalize('NFKC').replace(/\s+/g,''),amount:r.f6,turnover:r.f8,change:r.f3,date:new Date(r.f124*1000).toLocaleDateString('en-CA',{timeZone:'Asia/Shanghai'})}))
}
export function buildHotPool(eastmoney,ths,quotes,base) {
  const dates=quotes.map(q=>q.date).sort()
  const dataDate=dates.at(-1)
  if(!dataDate)throw new Error('没有有效行情')
  const union=new Set([...eastmoney,...ths].map(r=>r.code))
  const em=new Map(eastmoney.map(r=>[r.code,r.rank])), th=new Map(ths.map(r=>[r.code,r.rank]))
  const members=new Map(base.map(s=>[s.code,s]))
  const stocks=quotes.filter(q=>union.has(q.code)&&members.has(q.code)&&!(/ST|退/i.test(q.name))&&q.amount>=MIN_AMOUNT&&q.turnover>=MIN_TURNOVER&&q.date===dataDate).map(q=>({...q,market:members.get(q.code).market,eastmoneyRank:em.get(q.code)??null,thsRank:th.get(q.code)??null})).sort((a,b)=>a.code.localeCompare(b.code))
  if(!stocks.length)throw new Error(`行情日期 ${dataDate} 无股票满足成交额 ≥ 5 亿、换手率 ≥ 1% 等条件；行情可能尚未形成，请稍后重试`)
  if(new Set(stocks.map(s=>s.code)).size!==stocks.length)throw new Error('行情接口返回重复股票，已保留上次完整股票池')
  return {dataDate,count:stocks.length,candidateCount:union.size,thresholds:{minAmount:MIN_AMOUNT,minTurnover:MIN_TURNOVER},stocks}
}
export function makeQuoteUrl(codes) {
 const url=new URL('https://push2.eastmoney.com/api/qt/ulist.np/get')
 url.search=new URLSearchParams({fltt:'2',secids:codes.map(code=>(/^[569]/.test(code)?'1.':'0.')+code).join(','),fields:'f12,f14,f6,f8,f3,f124'}).toString()
 return url.href
}
