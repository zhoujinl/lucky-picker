import {it,expect} from 'vitest'
import {parseThsDaily,makeDailyMetadataUrl,parseDailyMetadata} from './ths-daily.mjs'
it('matches THS daily amount with same-day official change and turnover without deriving returns',()=>{
 const text='quotebridge_v6_line_hs_002242_01_last('+JSON.stringify({name:'九阳股份',data:'20261020,19.37,20.56,19.32,20.56,118196397,2391220300.00,15.516,,2200,45232'})+')'
 const meta={code:'002242',date:'2026-10-20',name:'九阳股份',turnover:15.5161,change:10.0054}
 expect(parseThsDaily(text,'002242',meta)).toMatchObject({amount:2391220300,turnover:15.5161,change:10.0054,source:'ths'})
 expect(()=>parseThsDaily(text,'002242',{...meta,date:'2026-10-19'})).toThrow('同日')
 expect(()=>parseThsDaily(text,'000001',meta)).toThrow()
 const url=new URL(makeDailyMetadataUrl(['002242']));expect(url.searchParams.get('reportName')).toBe('RPT_DMSK_TS_STOCKNEW')
 expect(parseDailyMetadata({success:true,result:{data:[{SECURITY_CODE:'002242',TRADE_DATE:'2026-10-20 00:00:00',SECURITY_NAME_ABBR:'九阳股份',TURNOVERRATE:15.5161,CHANGE_RATE:10.0054}]}},'2026-10-21')[0]).toEqual(meta)
})
it('marks a valid but stale daily feed so the candidate can be excluded like other missing quotes',()=>{
 try{parseThsDaily('quotebridge_v6_line_hs_000001_01_last({"data":"20261019,1,1,1,1,1,600000000,3,,,0"})','000001',{code:'000001',date:'2026-10-20'})}
 catch(error){expect(error.code).toBe('DAILY_DATE_MISSING');return}
 throw new Error('expected stale daily data to be rejected')
})
