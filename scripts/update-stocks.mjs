import {writeFile,rename,rm} from 'node:fs/promises'
import {fileURLToPath,pathToFileURL} from 'node:url'
import {setTimeout as delay} from 'node:timers/promises'
import {PAGE_SIZE,makeStockUrl,parseStockPage,createStockSnapshot} from './stock-pool.mjs'

export async function updateStocks({
  output=fileURLToPath(new URL('../src/data/stock-pool.json',import.meta.url)),
  minStocks=1000,retries=2,fetcher=fetch,log=console.log,
}={}) {
  async function fetchPage(page) {
    for (let attempt=0;;attempt++) {
      try {
        const response=await fetcher(makeStockUrl(page),{signal:AbortSignal.timeout(20000)})
        if (!response.ok) throw new Error(`HTTP ${response.status}`)
        return parseStockPage(await response.json())
      } catch(error) {
        if (attempt>=retries) throw error
        await delay(500*(attempt+1))
      }
    }
  }
  const first=await fetchPage(1)
  if (first.total<minStocks || first.total>20000 || first.pageCount!==Math.ceil(first.total/PAGE_SIZE)) throw new Error('股票总数或分页信息异常')
  const pages=[first]
  log(`东方财富：${first.total} 只，${first.pageCount} 页`)
  for (let page=2;page<=first.pageCount;page++) {
    await delay(200)
    pages.push(await fetchPage(page))
    log(`已抓取 ${page}/${first.pageCount} 页`)
  }
  const snapshot=createStockSnapshot(pages,new Date().toISOString())
  const temporary=`${output}.${process.pid}.tmp`
  try {
    await writeFile(temporary,JSON.stringify(snapshot,null,2)+'\n',{flag:'wx'})
    await rename(temporary,output)
  } finally { await rm(temporary,{force:true}) }
  return snapshot
}

if (process.argv[1] && import.meta.url===pathToFileURL(process.argv[1]).href) {
  try {const snapshot=await updateStocks();console.log(`已更新 ${snapshot.count} 只股票，数据日期 ${snapshot.dataDate}`)}
  catch(error){console.error(`股票池更新失败，旧数据保持不变：${error.message}`);process.exitCode=1}
}
