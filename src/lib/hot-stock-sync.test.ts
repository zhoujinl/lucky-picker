import {it,expect} from 'vitest'
import {createHotStockSync} from './hot-stock-sync'
import {hotSnapshot} from './hot-stocks'
it('uses the new pool only after successful sync and retains it on failure',async()=>{
 let finish!:(r:Response)=>void
 const sync=createHotStockSync(()=>new Promise(r=>finish=r))
 const first=sync.refresh()
 expect(sync.loading.value).toBe(true)
 const newer={...hotSnapshot,fetchedAt:'2026-10-21T03:00:00Z'}
 finish(new Response(JSON.stringify({snapshot:newer})))
 await first
 expect(sync.snapshot.value.fetchedAt).toBe(newer.fetchedAt)
 const second=sync.refresh()
 finish(new Response(JSON.stringify({error:'同花顺超时'}),{status:502}))
 await second
 expect(sync.error.value).toContain('同花顺超时')
 expect(sync.snapshot.value.fetchedAt).toBe(newer.fetchedAt)
 expect(sync.loading.value).toBe(false)
})
it('rejects malformed or empty successful responses and keeps the saved pool',async()=>{
 const sync=createHotStockSync(async()=>new Response(JSON.stringify({snapshot:{stocks:[]}})))
 await sync.refresh()
 expect(sync.error.value).toBeTruthy()
 expect(sync.snapshot.value.stocks.length).toBeGreaterThan(0)
})
