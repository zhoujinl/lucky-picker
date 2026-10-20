import {describe,it,expect} from 'vitest'
import {makeStockUrl,parseStockPage,createStockSnapshot} from './stock-pool.mjs'
const raw=(code,name,market)=>({SECURITY_CODE:code,SECURITY_NAME_ABBR:name,TRADE_MARKET_CODE:market,TRADE_DATE:'2026-10-20 00:00:00',LISTING_STATE:'0',SECURITY_TYPE_CODE:'058001001'})
const rows=[raw('000001','平安银行','069001002001'),raw('002594','比亚迪','069001002001'),raw('300750','宁德时代','069001002002'),raw('600519','贵州茅台','069001001001'),raw('688001','华兴源创','069001001006')]
const payload=(data=rows,count=data.length,pages=1)=>({success:true,code:0,result:{count,pages,data}})
describe('Eastmoney stock snapshot',()=>{
  it('requests the provider report and a stable code sort on the selected page',()=>{
    const u=new URL(makeStockUrl(3))
    expect(u.origin).toBe('https://datacenter-web.eastmoney.com')
    expect(u.searchParams.get('reportName')).toBe('RPT_DMSK_TS_STOCKNEW')
    expect(u.searchParams.get('pageNumber')).toBe('3')
    expect(u.searchParams.get('pageSize')).toBe('500')
    expect(u.searchParams.get('sortColumns')).toBe('SECURITY_CODE')
  })
  it('normalizes provider names and maps all five supported board codes',()=>{
    const p=parseStockPage(payload([raw('000001',' 平 安Ａ ','069001002001'),...rows.slice(1)]))
    expect(p.stocks).toEqual([
      {code:'000001',name:'平安A',market:'深市主板'},
      {code:'002594',name:'比亚迪',market:'深市主板'},
      {code:'300750',name:'宁德时代',market:'创业板'},
      {code:'600519',name:'贵州茅台',market:'沪市主板'},
      {code:'688001',name:'华兴源创',market:'科创板'},
    ])
    expect(p.dataDate).toBe('2026-10-20')
    expect(p.total).toBe(5)
  })
  it('accepts a valid provider A-share record with an unspecified listing-state field',()=>{
    expect(parseStockPage(payload([{...rows[0],LISTING_STATE:null}])).stocks[0].code).toBe('000001')
  })
  it('classifies risk-warning boards by stock code and preserves the CDR distinction',()=>{
    const p=parseStockPage(payload([
      raw('600053','*ST九鼎','069001001003'),raw('000056','*ST皇庭','069001002005'),raw('300010','ST豆神','069001002005'),
      {...raw('689009','九号公司-WD','069001001006'),SECURITY_TYPE_CODE:'058001008'},
    ]))
    expect(p.stocks.map(s=>s.market)).toEqual(['沪市主板（风险警示）','深市主板（风险警示）','创业板（风险警示）','科创板（CDR）'])
  })
  it.each([
    {success:false,message:'provider error',result:null},
    {success:true,result:{count:0,pages:0,data:[]}},
    payload([raw('600519','茅台','unknown')]),
    payload([{...rows[0],SECURITY_CODE:'not-a-code'}]),
    payload([{...rows[0],SECURITY_NAME_ABBR:''}]),
    payload([{...rows[0],LISTING_STATE:'1'}]),
    payload([{...rows[0],SECURITY_TYPE_CODE:'fund'}]),
    payload([{...rows[0],TRADE_DATE:'bad date'}]),
    payload([rows[0],{...rows[1],TRADE_DATE:'2026-10-19 00:00:00'}]),
  ])('rejects malformed, out-of-scope or inconsistent provider data',p=>expect(()=>parseStockPage(p)).toThrow())
  it('joins every page into a sorted, dated snapshot with exact count',()=>{
    const p1=parseStockPage(payload([rows[2],rows[0]],5,2))
    const p2=parseStockPage(payload([rows[4],rows[3],rows[1]],5,2))
    const snapshot=createStockSnapshot([p1,p2],'2026-10-21T01:00:00+08:00')
    expect(snapshot.count).toBe(5)
    expect(snapshot.stocks.map(s=>s.code)).toEqual(['000001','002594','300750','600519','688001'])
    expect(snapshot.dataDate).toBe('2026-10-20')
    expect(snapshot.fetchedAt).toBe('2026-10-21T01:00:00+08:00')
    expect(snapshot.source).toBe('东方财富')
  })
  it('rejects truncated or duplicated pagination instead of overwriting a complete snapshot',()=>{
    const p1=parseStockPage(payload(rows.slice(0,2),5,2))
    expect(()=>createStockSnapshot([p1],'2026-10-21T01:00:00+08:00')).toThrow()
    const p2=parseStockPage(payload(rows.slice(0,3),5,2))
    expect(()=>createStockSnapshot([p1,p2],'2026-10-21T01:00:00+08:00')).toThrow()
  })
  it('rejects count or trade-date changes between pages',()=>{
    const p1=parseStockPage(payload(rows.slice(0,2),5,2))
    const changed=parseStockPage(payload(rows.slice(2),6,2))
    expect(()=>createStockSnapshot([p1,changed],'2026-10-21T01:00:00+08:00')).toThrow()
    const older={...parseStockPage(payload(rows.slice(2),5,2)),dataDate:'2026-10-19'}
    expect(()=>createStockSnapshot([p1,older],'2026-10-21T01:00:00+08:00')).toThrow()
  })
})
