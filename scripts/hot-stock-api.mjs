import {mkdir} from 'node:fs/promises'
import {resolve} from 'node:path'
import {updateHotStocks} from './update-hot-stocks.mjs'
// Runtime writes stay outside src: refreshing must not trigger a page reload.
async function update(){
 const dir=resolve(process.env.LUCKY_DATA_DIR||'.lucky-data')
 await mkdir(dir,{recursive:true})
 return updateHotStocks({dailyCacheDir:resolve(dir,'daily'),output:resolve(dir,'hot-stock-pool.json'),statusOutput:resolve(dir,'hot-stock-status.json')})
}
export function createHotStockApi({update:refresh=update}={}){
 let pending
 return async(req,res,next)=>{
  if(req.url?.split('?')[0]!=='/api/hot-stocks/sync')return next()
  res.setHeader('Content-Type','application/json; charset=utf-8')
  res.setHeader('Cache-Control','no-store')
  if(req.method!=='POST'){res.statusCode=405;res.setHeader('Allow','POST');res.end(JSON.stringify({error:'请使用 POST 同步'}));return}
  try{
   if(!pending)pending=Promise.resolve().then(refresh).finally(()=>{pending=undefined})
   const snapshot=await pending
   res.end(JSON.stringify({snapshot}))
  }catch(error){res.statusCode=502;res.end(JSON.stringify({error:error.message||'同步失败'}))}
 }
}
export function hotStockApiPlugin(){
 return {name:'hot-stock-sync-api',configureServer(server){server.middlewares.use(createHotStockApi())},configurePreviewServer(server){server.middlewares.use(createHotStockApi())}}
}
