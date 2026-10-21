import {mkdir,readFile,writeFile,rename,rm} from 'node:fs/promises'
import {join} from 'node:path'
import {makeDailyQuoteUrl,parseDailyQuote} from './trading-session.mjs'
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms))
export async function loadCompletedQuotes(codes,today,request,{cacheDir,signal,fallback}={}){
 const results=[];let index=0,failed=false,useFallback=false
 if(cacheDir)await mkdir(join(cacheDir,today),{recursive:true})
 function valid(q,code){return q?.code===code&&typeof q.name==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(q.date)&&q.date<today&&[q.amount,q.turnover,q.change].every(Number.isFinite)&&q.amount>=0&&q.turnover>=0}
 async function one(code){
  const path=cacheDir&&join(cacheDir,today,`${code}.json`)
  if(path){try{const cached=JSON.parse(await readFile(path,'utf8'));if(valid(cached,code))return cached}catch{/* Missing or invalid cache must be fetched again. */}}
  async function save(quote){
   if(quote===null)return null
   if(!valid(quote,code))throw new Error(`${code} 缓存日线字段异常`)
   if(path){const tmp=`${path}.${process.pid}.tmp`;try{await writeFile(tmp,JSON.stringify(quote));await rename(tmp,path)}finally{await rm(tmp,{force:true})}}
   return quote
  }
  if(useFallback&&fallback)return save(await fallback(code))
  let error
  for(let attempt=0;attempt<3;attempt++){
   if(signal?.aborted)throw signal.reason
   try{
    const raw=await request(makeDailyQuoteUrl(code,today)),quote=parseDailyQuote(raw,code,today)
    return save(quote)
   }catch(e){error=e;if(attempt<2)await pause(300*(attempt+1))}
  }
  if(fallback){useFallback=true;return save(await fallback(code))}
  throw new Error(`东方财富 ${code} 已完成交易日日线请求失败（已尝试 3 次）：${error?.cause?.code||error?.message||'未知错误'}`)
 }
 await Promise.all(Array.from({length:Math.min(2,codes.length)},async()=>{
  while(index<codes.length&&!failed){
   const code=codes[index++]
   try{const quote=await one(code);if(quote)results.push(quote);await pause(100)}catch(e){failed=true;throw e}
  }
 }))
 return results
}
