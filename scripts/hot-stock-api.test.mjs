import {it,expect} from 'vitest'
import {createServer} from 'node:http'
import {createHotStockApi} from './hot-stock-api.mjs'
it('refreshes on each entry request, shares overlapping work and reports failure without a fake success',async()=>{
 let calls=0,release
 const api=createHotStockApi({update:async()=>{calls++;await new Promise(r=>release=r);return {count:calls}}})
 const server=createServer((req,res)=>api(req,res,()=>{res.statusCode=404;res.end()}))
 await new Promise(r=>server.listen(0,'127.0.0.1',r))
 const url=`http://127.0.0.1:${server.address().port}/api/hot-stocks/sync`
 try{
 const a=fetch(url,{method:'POST'}),b=fetch(url,{method:'POST'})
 await new Promise(r=>setTimeout(r,50));release()
 expect((await (await a).json()).snapshot.count).toBe(1)
 expect((await (await b).json()).snapshot.count).toBe(1)
 const c=fetch(url,{method:'POST'});await new Promise(r=>setTimeout(r,30));release()
 expect((await (await c).json()).snapshot.count).toBe(2)
 expect((await fetch(url)).status).toBe(405)
 }finally{server.closeAllConnections();await new Promise(r=>server.close(r))}
})
it('returns upstream failure as 502 and allows another attempt',async()=>{
 let calls=0
 const api=createHotStockApi({update:async()=>{if(++calls===1)throw new Error('同花顺超时');return {count:9}}})
 const server=createServer((req,res)=>api(req,res,()=>res.end()))
 await new Promise(r=>server.listen(0,'127.0.0.1',r))
 const url=`http://127.0.0.1:${server.address().port}/api/hot-stocks/sync`
 try{
 const failed=await fetch(url,{method:'POST'})
 expect(failed.status).toBe(502);expect((await failed.json()).error).toBe('同花顺超时')
 expect((await (await fetch(url,{method:'POST'})).json()).snapshot.count).toBe(9)
 }finally{server.closeAllConnections();await new Promise(r=>server.close(r))}
})
