import snapshot from './stock-pool.json'
export interface Stock { code: string; name: string; market: string }
export const stocks: Stock[] = snapshot.stocks
export const stockPoolUpdatedAt = snapshot.dataDate
export const stockPoolFetchedAt = snapshot.fetchedAt
export const stockPoolCoverage = snapshot.coverage
export const stockSources = [{ title: '东方财富 · 千股千评股票列表', url: snapshot.sourceUrl }]
