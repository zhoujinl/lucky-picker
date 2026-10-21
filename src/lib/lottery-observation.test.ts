import { describe,it,expect } from 'vitest'
import { sortObservationsNewestFirst, evaluate, validateDraw, addObservations, loadObservations, saveObservations } from './lottery-observation'
const draw=(id:any, primary:number[],secondary:number[]=[],extra={})=>({id,issue:id==='dlt'?'26014':'2026001',primary,secondary,drawTime:'2026-02-02T21:15:00+08:00',source:'https://www.cwl.gov.cn/',updatedAt:'2026-02-03T00:00:00Z',...extra})
const comb=(n:number,max:number,h:number)=>[...Array.from({length:h},(_,i)=>i+1),...Array.from({length:n-h},(_,i)=>max-i)]
describe('verified base prize tiers',()=>{
 it.each([[6,1,1],[6,0,2],[5,1,3],[5,0,4],[4,1,4],[4,0,5],[3,1,5],[2,1,6],[0,0,0]])('ssq %i+%i', (a,b,t)=>expect(evaluate('ssq',{primary:comb(6,33,a),secondary:[b?1:16]},draw('ssq',[1,2,3,4,5,6],[1],{specialRegime:false})).tier).toBe(t))
 it.each([[5,2,1],[5,1,2],[5,0,3],[4,2,3],[4,1,4],[4,0,5],[3,2,5],[3,1,6],[2,2,6],[3,0,7],[2,1,7],[1,2,7],[0,2,7],[0,0,0]])('dlt 2026 %i+%i',(a,b,t)=>expect(evaluate('dlt',{primary:comb(5,35,a),secondary:comb(2,12,b)},draw('dlt',[1,2,3,4,5],[1,2])).tier).toBe(t))
 it.each([[7,0,1],[6,1,2],[6,0,3],[5,1,4],[5,0,5],[4,1,6],[4,0,7],[3,0,0]])('qlc %i+special %i',(a,b,t)=>expect(evaluate('qlc',{primary:[...Array.from({length:a},(_,i)=>i+1),...(b?[8]:[]),...Array.from({length:7-a-b},(_,i)=>30-i)],secondary:[]},draw('qlc',[1,2,3,4,5,6,7],[8])).tier).toBe(t))
 it.each([[6,1,1],[6,0,2],[5,1,3],[5,0,4],[4,1,4],[4,0,5],[3,1,5],[3,0,6],[2,1,6],[1,1,6],[0,1,6],[2,0,0]])('qxc %i+%i',(a,b,t)=>expect(evaluate('qxc',{primary:[0,0,0,0,0,0].map((_,i)=>i<a?0:1),secondary:[b?14:0]},draw('qxc',[0,0,0,0,0,0],[14])).tier).toBe(t))
 it.each(['pl3','fc3d','pl5'] as const)('positions and leading zeros %s',id=>{const p=id==='pl5'?[0,0,1,2,2]:[0,0,1];expect(evaluate(id,{primary:p,secondary:[]},draw(id,p)).tier).toBe(1);expect(evaluate(id,{primary:[...p].reverse(),secondary:[]},draw(id,p)).tier).toBe(0)})
 it('does not guess ssq special regime or historical rule versions',()=>{expect(evaluate('ssq',{primary:comb(6,33,3),secondary:[16]},draw('ssq',[1,2,3,4,5,6],[1])).status).toBe('unsupported');expect(evaluate('dlt',{primary:[1,2,3,4,5],secondary:[1,2]},draw('dlt',[1,2,3,4,5],[1,2],{issue:'26013'})).status).toBe('unsupported')})
 it('validates issue, special ball, date, counts and duplicates',()=>{for(const extra of [{issue:'wrong'},{primary:[1,1,2,3,4,5]},{secondary:[]},{drawTime:''}])expect(()=>validateDraw('ssq','2026001',draw('ssq',[1,2,3,4,5,6],[1],extra))).toThrow();expect(()=>validateDraw('qlc','2026001',draw('qlc',[1,2,3,4,5,6,7],[7]))).toThrow()})
})
describe('durable observations',()=>{
 const issue={id:'pl3' as const,issue:'26001',cutoff:'2099-01-01T20:00:00+08:00',drawTime:'2099-01-01T21:25:00+08:00',source:'https://www.lottery.gov.cn/',confirmed:true as const}
 it('deduplicates same issue preserving positional order; refuses cutoff',()=>{const t={primary:[0,0,1],secondary:[]};const rows=addObservations([],issue,[t,t]);expect(rows).toHaveLength(1);expect(addObservations(rows,issue,[t])).toHaveLength(1);expect(()=>addObservations([], {...issue,cutoff:'2000-01-01'},[t])).toThrow()})
 it('does not silently discard corrupted or unavailable storage',()=>{expect(()=>loadObservations({getItem:()=>'{'})).toThrow();expect(()=>saveObservations({setItem:()=>{throw Error('quota')}},[])).toThrow()})
})
import { addUnverifiedObservations } from './lottery-observation'
it('allows explicit manual issue without inventing cutoff or draw time',()=>{const rows=addUnverifiedObservations([],'pl3','26001',[{primary:[0,0,1],secondary:[]}]);expect(rows[0]?.issueVerification).toBe('unverified');expect(rows[0]?.drawTime).toBe('');expect(rows[0]?.cutoff).toBe('');expect(()=>addUnverifiedObservations([],'pl3','next',[])).toThrow()})
it('checks the verified ssq special prize only with explicit regime data',()=>{const t={primary:[1,2,3,31,32,33],secondary:[16]};expect(evaluate('ssq',t,draw('ssq',[1,2,3,4,5,6],[1],{specialRegime:true})).label).toBe('福运奖');expect(evaluate('ssq',t,draw('ssq',[1,2,3,4,5,6],[1],{specialRegime:false})).status).toBe('lost')})
it('keeps positional permutations separate and normalizes combination order for deduplication',()=>{expect(addUnverifiedObservations([],'pl3','26001',[{primary:[0,0,1],secondary:[]},{primary:[1,0,0],secondary:[]}])).toHaveLength(2);expect(addUnverifiedObservations([],'ssq','2026001',[{primary:[1,2,3,4,5,6],secondary:[1]},{primary:[6,5,4,3,2,1],secondary:[1]}])).toHaveLength(1)})

it('keeps a batch note through saving and loading, without replacing a duplicate note',()=>{
 const now=Date.parse('2026-10-21T01:00:00Z'),tickets=[{primary:[0,0,1],secondary:[]},{primary:[1,0,0],secondary:[]}]
 const rows=addUnverifiedObservations([],'pl3','26280',tickets,now,'  生日号\n观察这一期  ')
 expect(rows.map(r=>r.note)).toEqual(['生日号\n观察这一期','生日号\n观察这一期'])
 let raw='';saveObservations({setItem:(_key,value)=>{raw=value}},rows)
 expect(loadObservations({getItem:()=>raw})[0]?.note).toBe('生日号\n观察这一期')
 expect(addUnverifiedObservations(rows,'pl3','26280',tickets,now,'新备注')[0]?.note).toBe('生日号\n观察这一期')
 expect(()=>addUnverifiedObservations([],'pl3','26280',tickets,now,'字'.repeat(301))).toThrow(/300/)
})
it('also attaches notes to officially confirmed issues',()=>{
 const now=Date.parse('2026-10-21T01:00:00Z'),issue={id:'pl3' as const,issue:'26280',cutoff:'2026-10-21T12:00:00Z',drawTime:'2026-10-21T13:25:00Z',source:'https://www.lottery.gov.cn/',confirmed:true as const}
 expect(addObservations([],issue,[{primary:[0,1,2],secondary:[]}],now,'自己的组合')[0]?.note).toBe('自己的组合')
})


it('shows new and existing lottery observations newest first while preserving batch order',()=>{
 const ticket=(n:number)=>({primary:[0,0,n],secondary:[]})
 const older=addUnverifiedObservations([],'pl3','26280',[ticket(1)],Date.parse('2026-10-20T01:00:00Z'))
 const stored=addUnverifiedObservations(older,'pl3','26281',[ticket(2),ticket(3)],Date.parse('2026-10-21T01:00:00Z'))
 const originalKeys=stored.map(r=>r.key)
 const visible=sortObservationsNewestFirst(stored)
 expect(visible.map(r=>r.ticket.primary[2])).toEqual([2,3,1])
 expect(stored.map(r=>r.key)).toEqual(originalKeys)
 let raw='';saveObservations({setItem:(_key,value)=>{raw=value}},stored)
 expect(sortObservationsNewestFirst(loadObservations({getItem:()=>raw})).map(r=>r.ticket.primary[2])).toEqual([2,3,1])
})
