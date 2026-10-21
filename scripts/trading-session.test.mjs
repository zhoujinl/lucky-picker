import {it,expect} from 'vitest'
import {needsCompletedSession,parseDailyQuote,makeDailyQuoteUrl} from './trading-session.mjs'
it('uses completed daily data when the feed has rolled over before the open',()=>{
 expect(needsCompletedSession([{date:'2026-10-21',amount:0}], '2026-10-21T00:50:00Z')).toBe(true)
 expect(needsCompletedSession([{date:'2026-10-20',amount:2e9}], '2026-10-21T00:50:00Z')).toBe(false)
 expect(needsCompletedSession([{date:'2026-10-21',amount:2e9}], '2026-10-21T02:00:00Z')).toBe(false)
})
it('reads amount, change and turnover from latest completed daily candle, ignoring today',()=>{
 const payload={rc:0,data:{code:'002242',name:'九阳股份',klines:['2026-10-19,17,18,19,16,123,2865615481.91,19,5.06,0.90,20.04','2026-10-20,19,20,20,19,123,2391220324.90,6.63,10.01,1.87,15.52','2026-10-21,20,20,20,20,0,0,0,0,0,0']}}
 expect(parseDailyQuote(payload,'002242','2026-10-21')).toMatchObject({code:'002242',date:'2026-10-20',amount:2391220324.90,change:10.01,turnover:15.52})
 expect(()=>parseDailyQuote({...payload,data:{...payload.data,code:'600000'}},'002242','2026-10-21')).toThrow()
 expect(()=>parseDailyQuote({rc:0,data:{code:'002242',name:'甲',klines:['2026-10-20,1,1,1,1,1,-,0,0,0,1']}},'002242','2026-10-21')).toThrow()
 const url=new URL(makeDailyQuoteUrl('002242','2026-10-21'));expect(url.searchParams.get('secid')).toBe('0.002242');expect(url.searchParams.get('end')).toBe('20261020')
})
