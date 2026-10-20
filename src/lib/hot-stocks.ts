import snapshot from '../data/hot-stock-pool.json'
import status from '../data/hot-stock-status.json'
import {randomInt} from './picker'
export interface HotStock {
 code:string;name:string;market:string;amount:number;turnover:number;change:number;date:string
 eastmoneyRank:number|null;thsRank:number|null
}
export const hotSnapshot=snapshot
export const hotStatus: {success:boolean;attemptedAt:string;error:string|null}=status
export const hotStocks:HotStock[]=snapshot.stocks
export function pickHotStock(pool:HotStock[]=hotStocks):HotStock {
 if(!pool.length)throw new Error('热门池暂无可用股票，请更新数据后重试')
 return pool[randomInt(pool.length)]
}
export function formatHotStock(stock:HotStock):string {
 return `${stock.code} ${stock.name} · ${stock.market}\n东方财富 ${stock.eastmoneyRank?'#'+stock.eastmoneyRank:'未进前100'} · 同花顺 ${stock.thsRank?'#'+stock.thsRank:'未进前100'}\n成交额 ${(stock.amount/1e8).toFixed(2)} 亿 · 换手率 ${stock.turnover.toFixed(2)}%\n行情日期 ${stock.date} · 热门股盲选，仅供探索`
}
