import {it,expect} from 'vitest'
import {defaultLotteryIssue} from './lottery-default-issue.mjs'
it('defaults to next SSQ issue before the next drawing and advances after draw time',()=>{
 const latest={issue:'2026120',drawTime:'2026-10-20'}
 expect(defaultLotteryIssue('ssq',latest,Date.parse('2026-10-21T04:00:00Z'))).toMatchObject({issue:'2026121',drawTime:'2026-10-22T21:15:00+08:00',estimated:true})
 expect(defaultLotteryIssue('ssq',latest,Date.parse('2026-10-22T13:15:00Z')).issue).toBe('2026122')
})
it('uses Beijing time and resets the sequence on the new year',()=>{
 expect(defaultLotteryIssue('fc3d',{issue:'2026351',drawTime:'2026-12-31'},Date.parse('2026-12-31T16:01:00Z')).issue).toBe('2027001')
 expect(defaultLotteryIssue('dlt',{issue:'26150',drawTime:'2026-12-30'},Date.parse('2026-12-31T16:01:00Z')).issue).toBe('27001')
})
it('does not infer from outdated or future latest results',()=>{
 expect(()=>defaultLotteryIssue('ssq',{issue:'2026120',drawTime:'2026-10-20'},Date.parse('2026-11-20T00:00:00Z'))).toThrow()
 expect(()=>defaultLotteryIssue('ssq',{issue:'2026120',drawTime:'2026-10-20'},Date.parse('2026-10-19T00:00:00Z'))).toThrow()
})
