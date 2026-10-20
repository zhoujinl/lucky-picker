import {afterEach,expect,it,vi} from 'vitest'
import {copyText} from './clipboard'
afterEach(()=>vi.unstubAllGlobals())
it('returns success after writing the actual requested text',async()=>{
  let result=''
  vi.stubGlobal('navigator',{clipboard:{writeText:async(text:string)=>{result=text}}})
  expect(await copyText('01 02 + 03')).toBe(true)
  expect(result).toBe('01 02 + 03')
})
it('returns false when clipboard permission is refused',async()=>{
  vi.stubGlobal('navigator',{clipboard:{writeText:async()=>{throw new Error('denied')}}})
  expect(await copyText('hello')).toBe(false)
})
it('returns false when the clipboard API is missing',async()=>{
  vi.stubGlobal('navigator',{})
  expect(await copyText('hello')).toBe(false)
})
