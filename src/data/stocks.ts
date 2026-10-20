export interface Stock { code: string; name: string; market: string }
export const stockPoolUpdatedAt = '2026-10-21'
export const stockSources = [
  { title: '上交所披露的基金持仓证券清单（2021-06-30）', url: 'https://www.sse.com.cn/disclosure/fund/announcement/c/new/2021-08-31/515130_20210831_1_S2URykz9.pdf' },
  { title: '深交所统计月报（2026-06）', url: 'https://docs.static.szse.cn/www/market/periodical/month/W020260706503108158062.html' },
]
// Manually maintained sample, not a current listing-status or market-data feed.
export const stocks: Stock[] = [
  {code:'600519',name:'贵州茅台',market:'沪市主板'},
  {code:'600036',name:'招商银行',market:'沪市主板'},
  {code:'601318',name:'中国平安',market:'沪市主板'},
  {code:'600276',name:'恒瑞医药',market:'沪市主板'},
  {code:'600900',name:'长江电力',market:'沪市主板'},
  {code:'600887',name:'伊利股份',market:'沪市主板'},
  {code:'601398',name:'工商银行',market:'沪市主板'},
  {code:'600030',name:'中信证券',market:'沪市主板'},
  {code:'000858',name:'五粮液',market:'深市主板'},
  {code:'000333',name:'美的集团',market:'深市主板'},
  {code:'002594',name:'比亚迪',market:'深市主板'},
  {code:'002475',name:'立讯精密',market:'深市主板'},
  {code:'002415',name:'海康威视',market:'深市主板'},
  {code:'300750',name:'宁德时代',market:'创业板'},
  {code:'300059',name:'东方财富',market:'创业板'},
  {code:'300274',name:'阳光电源',market:'创业板'},
]
