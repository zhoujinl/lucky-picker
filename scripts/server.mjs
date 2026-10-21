import {createServer} from 'node:http'
import {readFile} from 'node:fs/promises'
import {resolve,extname,sep} from 'node:path'
import {createHotStockApi} from './hot-stock-api.mjs'
import {createStockObservationApi} from './stock-observation-api.mjs'
import {createLotteryObservationApi} from './lottery-observation-api.mjs'
const root=resolve('dist'),hotApi=createHotStockApi(),stockApi=createStockObservationApi(),lotteryApi=createLotteryObservationApi()
const api=(req,res,next)=>hotApi(req,res,()=>stockApi(req,res,()=>lotteryApi.middleware(req,res,next)))
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.ico':'image/x-icon'}
const server=createServer((req,res)=>{
 void api(req,res,async()=>{
  if(req.method!=='GET'&&req.method!=='HEAD'){res.statusCode=405;res.end();return}
  try{
   const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname)
   const file=resolve(root,'.'+(pathname==='/'?'/index.html':pathname))
   if(!file.startsWith(root+sep)){res.statusCode=403;res.end();return}
   const data=await readFile(file)
   res.setHeader('Content-Type',types[extname(file)]||'application/octet-stream')
   res.setHeader('Cache-Control','no-cache')
   res.end(req.method==='HEAD'?undefined:data)
  }catch{res.statusCode=404;res.end('Not found')}
 })
})
server.listen(Number(process.env.PORT||5173),process.env.HOST||'127.0.0.1',()=>console.log('Lucky Picker server ready:',server.address()))
