import {readFile,writeFile,rename,rm} from 'node:fs/promises'
import {fileURLToPath,pathToFileURL} from 'node:url'
import {EASTMONEY_URL,THS_URL,parseEastmoneyRanks,parseThsRanks,parseQuotes,buildHotPool,makeQuoteUrl} from './hot-stocks.mjs'
import {chinaDate,needsCompletedSession} from './trading-session.mjs'
import {makeDailyMetadataUrl,parseDailyMetadata,parseThsDaily} from './ths-daily.mjs'
import {loadCompletedQuotes} from './completed-quotes.mjs'
const dataDir=fileURLToPath(new URL('../src/data/',import.meta.url))
async function atomicWrite(path,data) {
 const tmp=`${path}.${process.pid}.tmp`
 try{await writeFile(tmp,JSON.stringify(data,null,2)+'\n',{flag:'wx'});await rename(tmp,path)}finally{await rm(tmp,{force:true})}
}
export async function updateHotStocks({output=`${dataDir}hot-stock-pool.json`,statusOutput=`${dataDir}hot-stock-status.json`,dailyCacheDir,base,fetcher=fetch,now=()=>new Date().toISOString()}={}) {
 const attemptedAt=now(),sources={}
 const deadline=AbortSignal.timeout(75000)
 async function request(url,options={},text=false) {
  const response=await fetcher(url,{...options,headers:{'User-Agent':'Mozilla/5.0','Content-Type':'application/json','Referer':url.includes('10jqka')?'https://eq.10jqka.com.cn/':'https://guba.eastmoney.com/'},signal:AbortSignal.any([deadline,AbortSignal.timeout(20000)])})
  if(!response.ok)throw new Error(`HTTP ${response.status}`)
  return text?response.text():response.json()
 }
 async function getRanks(key,url,parse,options) {
  try{const rows=parse(await request(url,options));if(rows.length!==100||rows.some(r=>r.rank>100))throw new Error('前100名不完整');sources[key]={ok:true,count:rows.length};return rows}
  catch(error){sources[key]={ok:false,error:error.message};throw new Error(`${key==='eastmoney'?'东方财富':'同花顺'}：${error.message}`)}
 }
 try {
  const results=await Promise.allSettled([
   getRanks('eastmoney',EASTMONEY_URL,parseEastmoneyRanks,{method:'POST',body:JSON.stringify({appId:'appId01',globalId:'786e4c21-70dc-435a-93bb-38',marketType:'',pageNo:1,pageSize:100})}),
   getRanks('ths',THS_URL,parseThsRanks),
  ])
  const errors=results.filter(r=>r.status==='rejected')
  if(errors.length)throw new Error(errors.map(r=>r.reason.message).join('；'))
  const [eastmoney,ths]=results.map(r=>r.value)
  const members=base??JSON.parse(await readFile(`${dataDir}stock-pool.json`,'utf8')).stocks
  const allowed=new Set(members.map(s=>s.code))
  const codes=[...new Set([...eastmoney,...ths].map(r=>r.code))].filter(c=>allowed.has(c))
  let quotes=[]
  for(let i=0;i<codes.length;i+=50)quotes.push(...parseQuotes(await request(makeQuoteUrl(codes.slice(i,i+50)))))
  let quoteBasis='current-quotes'
  const dailyExcludedCodes=[]
  if(needsCompletedSession(quotes,attemptedAt)){
   const today=chinaDate(attemptedAt)
   let metadata
   const fallback=async(code)=>{
    metadata??=request(makeDailyMetadataUrl(codes)).then(p=>new Map(parseDailyMetadata(p,today).map(q=>[q.code,q])))
    const row=(await metadata).get(code)
    if(!row)throw new Error(`东方财富 ${code} 缺少最近已完成交易日指标`)
    for(let attempt=0;attempt<2;attempt++){
     try{return parseThsDaily(await request(`https://d.10jqka.com.cn/v6/line/hs_${code}/01/last.js?_=${Date.now()}`,{},true),code,row)}
     catch(error){if(error.code!=='DAILY_DATE_MISSING')throw error;if(attempt===1){dailyExcludedCodes.push(code);return null}}
    }
   }
   quotes=await loadCompletedQuotes(codes,today,request,{cacheDir:dailyCacheDir,signal:deadline,fallback})
   quoteBasis='completed-session'
  }
  const pool=buildHotPool(eastmoney,ths,quotes,members)
  const fetchedAt=now()
  if(pool.dataDate>fetchedAt.slice(0,10))throw new Error('行情日期异常')
  const snapshot={...pool,fetchedAt,quoteBasis,dailyExcludedCodes,dailyFallbackCount:quotes.filter(q=>q.source==='ths').length,sources:{eastmoney:{count:eastmoney.length,url:'https://guba.eastmoney.com/rank/'},ths:{count:ths.length,url:'https://eq.10jqka.com.cn/webpage/ths-hot-list/index.html?showStatusBar=true'}},quoteSource:'https://quote.eastmoney.com/center/gridlist.html#hs_a_board'}
  await atomicWrite(output,snapshot)
  await atomicWrite(statusOutput,{attemptedAt,success:true,sources,error:null})
  return snapshot
 }catch(error){await atomicWrite(statusOutput,{attemptedAt,success:false,sources,error:error.message});throw error}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 try{const pool=await updateHotStocks();console.log(`热门池：${pool.candidateCount} 个热榜候选 → ${pool.count} 只合格股票；行情日期 ${pool.dataDate}`)}
 catch(error){console.error(`热门池更新失败，保留上次完整快照：${error.message}`);process.exitCode=1}
}
