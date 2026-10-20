import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest'
import {HISTORY_KEY,readHistory,saveHistory,type HistoryEntry} from './history'
let memory:Map<string,string>
beforeEach(()=>{
  memory=new Map()
  vi.stubGlobal('localStorage',{getItem:(k:string)=>memory.get(k)??null,setItem:(k:string,v:string)=>memory.set(k,v)})
})
afterEach(()=>vi.unstubAllGlobals())
const entry=(i:number):HistoryEntry=>({id:`entry-${i}`,createdAt:'2026-10-21T01:00:00.000Z',label:'双色球',lines:['01 02 03 04 05 06 + 07']})
describe('browser history',()=>{
  it('persists only the most recent 50 operations in their supplied newest-first order',()=>{
    expect(saveHistory(Array.from({length:60},(_,i)=>entry(i)))).toBe(true)
    expect(readHistory()).toHaveLength(50)
    expect(readHistory()[0].id).toBe('entry-0')
    expect(readHistory()[49].id).toBe('entry-49')
  })
  it.each(['not JSON','null','{}','[1]','[{"id":"x"}]','[{"id":"x","createdAt":"invalid","label":"x","lines":["x"]}]'])('recovers from corrupt or malformed storage %s',value=>{
    memory.set(HISTORY_KEY,value)
    expect(readHistory()).toEqual([])
  })
  it('starts empty with no record and stays empty after clearing',()=>{
    expect(readHistory()).toEqual([])
    saveHistory([entry(0)])
    expect(saveHistory([])).toBe(true)
    expect(readHistory()).toEqual([])
  })
  it('keeps failures of browser storage recoverable',()=>{
    vi.stubGlobal('localStorage',{getItem:()=>{throw new Error('denied')},setItem:()=>{throw new Error('quota')}})
    expect(readHistory()).toEqual([])
    expect(saveHistory([entry(0)])).toBe(false)
  })
})
