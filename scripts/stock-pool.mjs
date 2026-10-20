export const PAGE_SIZE=500
const markets={
  '069001001001':'沪市主板',
  '069001001006':'科创板',
  '069001002001':'深市主板',
  '069001002002':'创业板',
  '069001002005':'风险警示板',
  '069001001003':'沪市主板（风险警示）',
}
export function makeStockUrl(page) {
  if (!Number.isInteger(page)||page<1) throw new Error('页码无效')
  const url=new URL('https://datacenter-web.eastmoney.com/api/data/v1/get')
  url.search=new URLSearchParams({
    reportName:'RPT_DMSK_TS_STOCKNEW',
    columns:'SECURITY_CODE,SECURITY_NAME_ABBR,TRADE_MARKET_CODE,TRADE_DATE,LISTING_STATE,SECURITY_TYPE_CODE',
    pageNumber:String(page),pageSize:String(PAGE_SIZE),sortColumns:'SECURITY_CODE',sortTypes:'1',source:'WEB',client:'WEB',
  }).toString()
  return url.href
}
export function parseStockPage(payload) {
  const result=payload?.result
  if (payload?.success!==true || !result || !Number.isInteger(result.count) || result.count<1 || !Number.isInteger(result.pages) || result.pages<1 || !Array.isArray(result.data) || !result.data.length) throw new Error('东方财富返回无效股票列表')
  const dates=new Set()
  const stocks=result.data.map(row=>{
    let market=markets[row.TRADE_MARKET_CODE]
    if (row.TRADE_MARKET_CODE==='069001002005') market=/^30/.test(row.SECURITY_CODE)?'创业板（风险警示）':'深市主板（风险警示）'
    if (row.SECURITY_TYPE_CODE==='058001008' && row.TRADE_MARKET_CODE==='069001001006') market='科创板（CDR）'
    const name=typeof row.SECURITY_NAME_ABBR==='string'?row.SECURITY_NAME_ABBR.normalize('NFKC').replace(/\s+/g,''):''
    const dataDate=typeof row.TRADE_DATE==='string'?row.TRADE_DATE.slice(0,10):''
    if (!/^\d{6}$/.test(row.SECURITY_CODE) || !name || !market || (row.LISTING_STATE!==null && row.LISTING_STATE!=='0') || !['058001001','058001008'].includes(row.SECURITY_TYPE_CODE) || !/^\d{4}-\d{2}-\d{2}$/.test(dataDate) || !Number.isFinite(Date.parse(dataDate))) throw new Error('股票记录缺少有效的 A 股代码、名称、市场或日期')
    dates.add(dataDate)
    return {code:row.SECURITY_CODE,name,market}
  })
  if (dates.size!==1) throw new Error('同一页股票数据日期不一致')
  return {total:result.count,pageCount:result.pages,dataDate:[...dates][0],stocks}
}
export function createStockSnapshot(pages,fetchedAt) {
  const first=pages[0]
  if (!first || pages.length!==first.pageCount || pages.some(p=>p.total!==first.total||p.pageCount!==first.pageCount||p.dataDate!==first.dataDate)) throw new Error('股票分页不完整或更新期间数据发生变化')
  const stocks=pages.flatMap(p=>p.stocks).sort((a,b)=>a.code.localeCompare(b.code))
  if (stocks.length!==first.total || new Set(stocks.map(s=>s.code)).size!==stocks.length) throw new Error('股票数量不符或分页包含重复代码，保留旧股票池')
  return {
    source:'东方财富',
    sourceUrl:'https://data.eastmoney.com/stockcomment/',
    reportName:'RPT_DMSK_TS_STOCKNEW',
    coverage:'沪深 A 股及科创板 CDR（东方财富接口收录，不含北交所）',
    dataDate:first.dataDate,
    fetchedAt,
    count:stocks.length,
    stocks,
  }
}
