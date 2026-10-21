export function chinaDate(time){return new Date(time).toLocaleDateString('en-CA',{timeZone:'Asia/Shanghai'})}
export function needsCompletedSession(quotes,time){
 const clock=new Date(time).toLocaleTimeString('en-GB',{timeZone:'Asia/Shanghai',hour12:false})
 return clock<'09:30:00'&&quotes.some(q=>q.date===chinaDate(time))
}
export function makeDailyQuoteUrl(code,today){
 const previous=new Date(`${today}T00:00:00Z`);previous.setUTCDate(previous.getUTCDate()-1)
 const url=new URL('https://push2his.eastmoney.com/api/qt/stock/kline/get')
 url.search=new URLSearchParams({secid:(/^[569]/.test(code)?'1.':'0.')+code,klt:'101',fqt:'0',beg:'0',end:previous.toISOString().slice(0,10).replaceAll('-',''),lmt:'5',fields1:'f1,f2,f3,f4,f5,f6',fields2:'f51,f52,f53,f54,f55,f56,f57,f58,f59,f60,f61'}).toString()
 return url.href
}
export function parseDailyQuote(payload,code,today){
 const data=payload?.data
 if(payload?.rc!==0||data?.code!==code||typeof data.name!=='string'||!Array.isArray(data.klines))throw new Error(`${code} 日线数据缺失或代码不匹配`)
 const rows=data.klines.map(line=>String(line).split(',')).filter(r=>/^\d{4}-\d{2}-\d{2}$/.test(r[0])&&r[0]<today).sort((a,b)=>a[0].localeCompare(b[0]))
 const row=rows.at(-1)
 if(!row||[6,8,10].some(i=>!row[i]?.trim()||!Number.isFinite(Number(row[i])))||Number(row[6])<0||Number(row[10])<0)throw new Error(`${code} 最近已完成交易日日线异常`)
 return {code,name:data.name.normalize('NFKC').replace(/\s+/g,''),date:row[0],amount:Number(row[6]),change:Number(row[8]),turnover:Number(row[10])}
}
