import {ref} from 'vue'
import {hotSnapshot} from './hot-stocks'
type Snapshot=typeof hotSnapshot
const cacheKey='lucky-picker-hot-snapshot-v1'
function valid(value:Snapshot):boolean {
 return !!value&&Number.isFinite(Date.parse(value.fetchedAt))&&/^\d{4}-\d{2}-\d{2}$/.test(value.dataDate)&&value.sources?.eastmoney?.count===100&&value.sources?.ths?.count===100&&Array.isArray(value.stocks)&&value.stocks.length>0&&value.count===value.stocks.length&&value.stocks.every(s=>/^\d{6}$/.test(s.code)&&typeof s.name==='string'&&[s.amount,s.turnover,s.change].every(Number.isFinite))
}
export function createHotStockSync(fetcher:typeof fetch=fetch){
 let initial=hotSnapshot
 try{if(typeof window==='undefined')throw new Error('No browser storage');const cached=JSON.parse(localStorage.getItem(cacheKey)||'null');if(valid(cached))initial=cached}catch{/* Bundled snapshot remains available. */}
 const snapshot=ref<Snapshot>(initial),loading=ref(false),error=ref('')
 let pending:Promise<void>|undefined
 function refresh():Promise<void>{
  if(pending)return pending
  loading.value=true;error.value=''
  pending=(async()=>{
   try{
    const response=await fetcher('/api/hot-stocks/sync',{method:'POST',cache:'no-store',signal:AbortSignal.timeout(90000)})
    let payload
    try{payload=await response.json()}catch{throw new Error('同步接口不可用，请确认已启动支持自动同步的服务')}
    if(!response.ok)throw new Error(payload.error||`同步失败（HTTP ${response.status}）`)
    if(!valid(payload.snapshot))throw new Error('同步数据不完整，已保留上次完整股票池')
    snapshot.value=payload.snapshot
    try{if(typeof window!=='undefined')localStorage.setItem(cacheKey,JSON.stringify(payload.snapshot))}catch{/* Storage restrictions do not prevent syncing. */}
   }catch(e){error.value=e instanceof Error?e.message:'同步失败，请稍后重试'}
   finally{loading.value=false;pending=undefined}
  })()
  return pending
 }
 return {snapshot,loading,error,refresh}
}
export const hotStockSync=createHotStockSync()
