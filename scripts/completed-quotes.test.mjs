import {it,expect} from 'vitest'
import {mkdtemp,rm} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {loadCompletedQuotes} from './completed-quotes.mjs'
const payload={rc:0,data:{code:'000001',name:'甲',klines:['2026-10-20,1,1,1,1,1,600000000,0,-1,0,3']}}
it('retries a dropped connection and reuses validated daily candles across refreshes',async()=>{
 const cacheDir=await mkdtemp(join(tmpdir(),'daily-cache-'));let attempts=0
 try{
 const request=async()=>{if(++attempts===1)throw new Error('socket closed');return payload}
 const first=await loadCompletedQuotes(['000001'],'2026-10-21',request,{cacheDir})
 expect(first[0].amount).toBe(600000000)
 const second=await loadCompletedQuotes(['000001'],'2026-10-21',async()=>{throw new Error('should use cache')},{cacheDir})
 expect(second).toEqual(first)
 }finally{await rm(cacheDir,{recursive:true,force:true})}
})
it('reports the failed stock and never substitutes fabricated daily data',async()=>{
 await expect(loadCompletedQuotes(['000001'],'2026-10-21',async()=>{throw new Error('socket closed')})).rejects.toThrow('000001')
})
it('uses an explicit alternate daily source after persistent connection failure and caches its verified quote',async()=>{
 const cacheDir=await mkdtemp(join(tmpdir(),'daily-alternate-'))
 const quote={code:'000001',name:'甲',date:'2026-10-20',amount:6e8,turnover:3,change:-1,source:'ths'}
 try{
 const rows=await loadCompletedQuotes(['000001'],'2026-10-21',async()=>{throw new Error('socket closed')},{cacheDir,fallback:async()=>quote})
 expect(rows).toEqual([quote])
 expect(await loadCompletedQuotes(['000001'],'2026-10-21',async()=>{throw new Error('offline')},{cacheDir})).toEqual([quote])
 }finally{await rm(cacheDir,{recursive:true,force:true})}
})
