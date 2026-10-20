import {it,expect} from 'vitest'
import {mkdtemp,readFile,writeFile,rm} from 'node:fs/promises'
import {join} from 'node:path'
import {tmpdir} from 'node:os'
import {updateStocks} from './update-stocks.mjs'
const row={SECURITY_CODE:'000001',SECURITY_NAME_ABBR:'平安银行',TRADE_MARKET_CODE:'069001002001',TRADE_DATE:'2026-10-20 00:00:00',LISTING_STATE:'0',SECURITY_TYPE_CODE:'058001001'}
it('fetches the provider data, validates it and writes a usable snapshot',async()=>{
  const dir=await mkdtemp(join(tmpdir(),'lucky-picker-'))
  try{
    const file=join(dir,'stocks.json')
    const snapshot=await updateStocks({output:file,minStocks:1,fetcher:async()=>({ok:true,json:async()=>({success:true,result:{count:1,pages:1,data:[row]}})}),log:()=>{}})
    const saved=JSON.parse(await readFile(file,'utf8'))
    expect(saved.stocks).toEqual([{code:'000001',name:'平安银行',market:'深市主板'}])
    expect(snapshot.count).toBe(1)
    expect(saved.dataDate).toBe('2026-10-20')
  }finally{await rm(dir,{recursive:true,force:true})}
})
it('keeps an existing snapshot byte-for-byte on an incomplete response',async()=>{
  const dir=await mkdtemp(join(tmpdir(),'lucky-picker-'))
  try{
    const file=join(dir,'stocks.json');await writeFile(file,'OLD COMPLETE SNAPSHOT')
    await expect(updateStocks({output:file,minStocks:1,retries:0,fetcher:async()=>({ok:true,json:async()=>({success:true,result:{count:2,pages:1,data:[row]}})}),log:()=>{}})).rejects.toThrow()
    expect(await readFile(file,'utf8')).toBe('OLD COMPLETE SNAPSHOT')
  }finally{await rm(dir,{recursive:true,force:true})}
})
it('does not overwrite the pool when the provider returns an unexpectedly tiny list',async()=>{
  const dir=await mkdtemp(join(tmpdir(),'lucky-picker-'))
  try{
    const file=join(dir,'stocks.json');await writeFile(file,'OLD COMPLETE SNAPSHOT')
    await expect(updateStocks({output:file,retries:0,fetcher:async()=>({ok:true,json:async()=>({success:true,result:{count:1,pages:1,data:[row]}})}),log:()=>{}})).rejects.toThrow()
    expect(await readFile(file,'utf8')).toBe('OLD COMPLETE SNAPSHOT')
  }finally{await rm(dir,{recursive:true,force:true})}
})
