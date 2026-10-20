import {afterEach,it,expect,vi} from 'vitest'
import {mkdtemp,readFile,writeFile,rm} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {updateHotStocks} from './update-hot-stocks.mjs'
const dirs=[]
afterEach(async()=>{await Promise.all(dirs.splice(0).map(p=>rm(p,{recursive:true,force:true})))})
async function paths(){const dir=await mkdtemp(join(tmpdir(),'hot-stocks-'));dirs.push(dir);return {output:join(dir,'pool.json'),statusOutput:join(dir,'status.json')}}
const base=[{code:'000001',name:'甲',market:'深市主板'}]
const now=()=> '2026-10-21T01:00:00.000Z'
function fetcher(fail){return vi.fn(async url=>{
 if(url.includes('10jqka')&&fail)return {ok:false,status:404}
 return {ok:true,json:async()=>url.includes('stockrank')?{code:0,data:Array.from({length:100},(_,i)=>({sc:'SZ'+String(i+1).padStart(6,'0'),rk:i+1}))}:url.includes('10jqka')?{status_code:0,data:{stock_list:Array.from({length:100},(_,i)=>({code:String(i+1).padStart(6,'0'),order:i<2?2-i:i+1}))}}:{rc:0,data:{diff:[{f12:'000001',f14:'甲',f6:600000000,f8:3,f3:-1,f124:1792481664}]}}}
})}
it('writes a merged actual-source snapshot and records success',async()=>{
 const options=await paths();const pool=await updateHotStocks({...options,base,now,fetcher:fetcher(false)})
 expect(pool.stocks[0]).toMatchObject({code:'000001',eastmoneyRank:1,thsRank:2,change:-1})
 expect(JSON.parse(await readFile(options.output,'utf8'))).toEqual(pool)
 expect(JSON.parse(await readFile(options.statusOutput,'utf8')).success).toBe(true)
})
it('keeps the complete previous snapshot and marks a missing source on failure',async()=>{
 const options=await paths();await writeFile(options.output,'{"previous":true}')
 await expect(updateHotStocks({...options,base,now,fetcher:fetcher(true)})).rejects.toThrow('同花顺')
 expect(await readFile(options.output,'utf8')).toBe('{"previous":true}')
 const status=JSON.parse(await readFile(options.statusOutput,'utf8'))
 expect(status.success).toBe(false);expect(status.sources.ths.ok).toBe(false);expect(status.sources.eastmoney.ok).toBe(true)
})
it('does not replace a good pool when all candidates fail the filter',async()=>{
 const options=await paths();await writeFile(options.output,'{"previous":true}')
 await expect(updateHotStocks({...options,base:[],now,fetcher:fetcher(false)})).rejects.toThrow()
 expect(await readFile(options.output,'utf8')).toBe('{"previous":true}')
})

it('rejects a truncated source list even when HTTP and payload report success',async()=>{
 const options=await paths();await writeFile(options.output,'{"previous":true}')
 const good=fetcher(false)
 const truncated=async(url,opts)=>url.includes('10jqka')?{ok:true,json:async()=>({status_code:0,data:{stock_list:[{code:'000001',order:1}]}})}:good(url,opts)
 await expect(updateHotStocks({...options,base,now,fetcher:truncated})).rejects.toThrow('同花顺')
 expect(await readFile(options.output,'utf8')).toBe('{"previous":true}')
})
