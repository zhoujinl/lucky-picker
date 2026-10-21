const datePattern=/^\d{4}-\d{2}-\d{2}$/
const validDate=s=>datePattern.test(s)&&!Number.isNaN(Date.parse(s))&&new Date(s).toISOString().slice(0,10)===s
export function parseObservationDaily(payload,symbol,field){
 const item=payload?.data?.[symbol]
 if(payload?.code!==0||item?.qt?.[symbol]?.[2]!==symbol.slice(2)||!Array.isArray(item[field]))throw Error('日线证券标识或数据异常')
 const seen=new Set()
 return item[field].map(row=>{const [date,o,c]=row,open=Number(o),close=Number(c);if(!validDate(date)||seen.has(date)||!(open>0&&close>0)||!Number.isFinite(open+close))throw Error('日线日期或价格异常');seen.add(date);return {date,open,close}}).sort((a,b)=>a.date.localeCompare(b.date))
}
export function createStockObservationApi({fetch:fetcher=globalThis.fetch,now=()=>new Date(),cacheMs=60000,timeoutMs=10000,maxConcurrent=3}={}){
 const cache=new Map(),pending=new Map();let running=0
 async function get(symbol,from,adjustment){
  const url=new URL('https://web.ifzq.gtimg.cn/appstock/app/fqkline/get');url.searchParams.set('param',`${symbol},day,${from},,640,${adjustment}`)
  const response=await fetcher(url,{signal:AbortSignal.timeout(timeoutMs)});if(!response.ok)throw Error(`行情源 HTTP ${response.status}`)
  return parseObservationDaily(await response.json(),symbol,adjustment==='qfq'?'qfqday':'day')
 }
 async function quote(code,from){
  const key=code+from,stamp=now();if(cache.has(key)&&stamp-cache.get(key).time<cacheMs)return cache.get(key).value
  if(pending.has(key))return pending.get(key)
  if(running>=maxConcurrent)throw Object.assign(Error('行情请求繁忙，请稍后刷新'),{status:429})
  const task=(async()=>{running++;try{
   const symbol=(/^[569]/.test(code)?'sh':/^[48]/.test(code)?'bj':'sz')+code
   if(symbol.startsWith('bj'))throw Error('当前行情源暂不支持北交所观察')
   const [raw,adjusted,calendar]=await Promise.all([get(symbol,from,''),get(symbol,from,'qfq'),get('sh000001',from,'')]);const today=stamp.toLocaleDateString('en-CA',{timeZone:'Asia/Shanghai'})
   const mapped=new Map(adjusted.map(r=>[r.date,r]));const days=raw.filter(r=>r.date<today).map(r=>{const a=mapped.get(r.date);if(!a)throw Error('原始与复权日线日期不一致');return {...r,adjustedOpen:a.open,adjustedClose:a.close}})
   const sessions=calendar.filter(r=>r.date<today).map(r=>r.date)
   if(raw.length>=640||calendar.length>=640)throw Error('观察跨度超过行情源范围，无法完整回补')
   const value={code,from,source:'腾讯日线；上证指数市场交易日序列',updatedAt:stamp.toISOString(),days,sessions,calendarThrough:sessions.at(-1)||'',finality:'仅采用北京时间今日之前日线，当日收盘延后确认'}
   cache.set(key,{time:+stamp,value});if(cache.size>300)cache.delete(cache.keys().next().value);return value
  }finally{running--}})().finally(()=>pending.delete(key));pending.set(key,task);return task
 }
 return async(req,res,next)=>{if(req.url?.split('?')[0]!=='/api/stock-observations/quote')return next();res.setHeader('Content-Type','application/json; charset=utf-8');res.setHeader('Cache-Control','no-store');try{
  if(req.method!=='GET')throw Object.assign(Error('请使用 GET'),{status:405});const url=new URL(req.url,'http://localhost'),code=url.searchParams.get('code'),from=url.searchParams.get('from');if(!/^\d{6}$/.test(code||'')||!validDate(from||'')||from>now().toLocaleDateString('en-CA',{timeZone:'Asia/Shanghai'}))throw Object.assign(Error('股票代码或开始日期无效'),{status:400});res.end(JSON.stringify(await quote(code,from)))
 }catch(error){res.statusCode=error.status||502;res.end(JSON.stringify({error:error.message||'行情更新失败'}))}}
}
export function stockObservationApiPlugin(){const api=createStockObservationApi();return {name:'stock-observation-api',configureServer(s){s.middlewares.use(api)},configurePreviewServer(s){s.middlewares.use(api)}}}
