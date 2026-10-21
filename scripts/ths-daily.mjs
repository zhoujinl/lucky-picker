export function makeDailyMetadataUrl(codes){
 const url=new URL('https://datacenter-web.eastmoney.com/api/data/v1/get')
 url.search=new URLSearchParams({reportName:'RPT_DMSK_TS_STOCKNEW',columns:'SECURITY_CODE,TRADE_DATE,SECURITY_NAME_ABBR,TURNOVERRATE,CHANGE_RATE',pageNumber:'1',pageSize:'500',filter:`(SECURITY_CODE in (${codes.map(c=>`"${c}"`).join(',')}))`}).toString()
 return url.href
}
export function parseDailyMetadata(payload,today){
 if(payload?.success!==true||!Array.isArray(payload.result?.data))throw new Error('东方财富历史成交指标查询失败')
 return payload.result.data.filter(r=>/^\d{6}$/.test(r.SECURITY_CODE)&&/^\d{4}-\d{2}-\d{2}/.test(r.TRADE_DATE)&&r.TRADE_DATE.slice(0,10)<today&&typeof r.SECURITY_NAME_ABBR==='string'&&[r.TURNOVERRATE,r.CHANGE_RATE].every(Number.isFinite)).map(r=>({code:r.SECURITY_CODE,date:r.TRADE_DATE.slice(0,10),name:r.SECURITY_NAME_ABBR,turnover:r.TURNOVERRATE,change:r.CHANGE_RATE}))
}
export function parseThsDaily(text,code,metadata){
 const prefix=`quotebridge_v6_line_hs_${code}_01_last(`,trimmed=text.trim().replace(/;$/,'')
 if(!trimmed.startsWith(prefix)||!trimmed.endsWith(')')||metadata?.code!==code)throw new Error(`同花顺 ${code} 日线标识异常`)
 const payload=JSON.parse(trimmed.slice(prefix.length,-1))
 if(typeof payload.data!=='string')throw new Error(`同花顺 ${code} 日线缺失`)
 const row=payload.data.split(';').map(r=>r.split(',')).find(r=>r[0]===metadata.date.replaceAll('-',''))
 if(!row)throw Object.assign(new Error(`同花顺 ${code} 缺少同日 ${metadata.date} 成交额`),{code:'DAILY_DATE_MISSING'})
 if(!row[6]?.trim()||!Number.isFinite(Number(row[6]))||Number(row[6])<0)throw new Error(`同花顺 ${code} 缺少同日 ${metadata.date} 成交额`)
 return {...metadata,amount:Number(row[6]),source:'ths'}
}
