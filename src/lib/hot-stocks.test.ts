import {afterEach,it,expect,vi} from 'vitest'
import {hotStocks,pickHotStock,formatHotStock} from './hot-stocks'
afterEach(()=>vi.restoreAllMocks())
it('can draw the first and last hot-pool members equally without rank weighting',()=>{
 const values=[0,hotStocks.length-1]
 vi.spyOn(crypto,'getRandomValues').mockImplementation(array=>{(array as Uint32Array)[0]=values.shift()!;return array})
 expect(pickHotStock()).toEqual(hotStocks[0]);expect(pickHotStock()).toEqual(hotStocks.at(-1))
})
it('refuses an empty hot pool without falling back to general stocks',()=>expect(()=>pickHotStock([])).toThrow('热门池'))
it('copies source ranks, liquidity figures and the actual quote date',()=>{
 const text=formatHotStock({...hotStocks[0],eastmoneyRank:7,thsRank:null})
 expect(text).toContain('东方财富 #7');expect(text).toContain('同花顺 未进前100');expect(text).toContain('成交额');expect(text).toContain(hotStocks[0].date)
})
