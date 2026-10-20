import {readFile,writeFile,rename,rm} from 'node:fs/promises'
import {fileURLToPath,pathToFileURL} from 'node:url'
import {EASTMONEY_URL,THS_URL,parseEastmoneyRanks,parseThsRanks,parseQuotes,buildHotPool,makeQuoteUrl} from './hot-stocks.mjs'
const dataDir=fileURLToPath(new URL('../src/data/',import.meta.url))
async function atomicWrite(path,data) {
 const tmp=`${path}.${process.pid}.tmp`
 try{await writeFile(tmp,JSON.stringify(data,null,2)+'\n',{flag:'wx'});await rename(tmp,path)}finally{await rm(tmp,{force:true})}
}
export async function updateHotStocks({output=`${dataDir}hot-stock-pool.json`,statusOutput=`${dataDir}hot-stock-status.json`,base,fetcher=fetch,now=()=>new Date().toISOString()}={}) {
 const attemptedAt=now(),sources={}
 async function request(url,options={}) {
  const response=await fetcher(url,{...options,headers:{'User-Agent':'Mozilla/5.0','Content-Type':'application/json','Referer':url.includes('10jqka')?'https://eq.10jqka.com.cn/':'https://guba.eastmoney.com/'},signal:AbortSignal.timeout(20000)})
  if(!response.ok)throw new Error(`HTTP ${response.status}`)
  return response.json()
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
  const quotes=[]
  for(let i=0;i<codes.length;i+=50)quotes.push(...parseQuotes(await request(makeQuoteUrl(codes.slice(i,i+50)))))
  const pool=buildHotPool(eastmoney,ths,quotes,members)
  const fetchedAt=now()
  if(pool.dataDate>fetchedAt.slice(0,10))throw new Error('行情日期异常')
  const snapshot={...pool,fetchedAt,sources:{eastmoney:{count:eastmoney.length,url:'https://guba.eastmoney.com/rank/'},ths:{count:ths.length,url:'https://eq.10jqka.com.cn/webpage/ths-hot-list/index.html?showStatusBar=true'}},quoteSource:'https://quote.eastmoney.com/center/gridlist.html#hs_a_board'}
  await atomicWrite(output,snapshot)
  await atomicWrite(statusOutput,{attemptedAt,success:true,sources,error:null})
  return snapshot
 }catch(error){await atomicWrite(statusOutput,{attemptedAt,success:false,sources,error:error.message});throw error}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 try{const pool=await updateHotStocks();console.log(`热门池：${pool.candidateCount} 个热榜候选 → ${pool.count} 只合格股票；行情日期 ${pool.dataDate}`)}
 catch(error){console.error(`热门池更新失败，保留上次完整快照：${error.message}`);process.exitCode=1}
}
