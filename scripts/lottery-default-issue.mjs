// Suggested period only: official results still validate the exact saved issue.
const schedules={ssq:{days:[0,2,4],time:'21:15'},dlt:{days:[1,3,6],time:'21:25'},pl3:{time:'21:25'},pl5:{time:'21:25'},fc3d:{time:'21:15'},qxc:{days:[0,2,5],time:'21:25'},qlc:{days:[1,3,5],time:'21:15'}}
export function defaultLotteryIssue(id,latest,now=Date.now()){
 const rule=schedules[id],day=latest?.drawTime?.slice(0,10),period=latest?.issue
 const today=new Date(now).toLocaleDateString('en-CA',{timeZone:'Asia/Shanghai'})
 if(!rule||!/^\d{4}-\d{2}-\d{2}$/.test(day||'')||!/^\d{5}$|^\d{7}$/.test(period||'')||day>today||Date.parse(today)-Date.parse(day)>14*86400000)throw Error('最新开奖信息尚未更新，暂无法计算默认期号')
 let sequence=Number(period.slice(-3)),year=Number(day.slice(0,4));const date=new Date(day+'T00:00:00Z')
 if(!Number.isFinite(+date)||date.toISOString().slice(0,10)!==day||Number(period.slice(0,-3))!==(period.length===7?year:year%100))throw Error('最新开奖期号与日期不匹配')
 for(let i=0;i<22;i++){
  date.setUTCDate(date.getUTCDate()+1)
  if(rule.days&&!rule.days.includes(date.getUTCDay()))continue
  if(date.getUTCFullYear()!==year){year=date.getUTCFullYear();sequence=0}
  sequence++
  if(sequence>999)throw Error('默认期号超出范围')
  const drawTime=`${date.toISOString().slice(0,10)}T${rule.time}:00+08:00`
  if(Date.parse(drawTime)>now)return {issue:`${period.length===7?year:String(year%100).padStart(2,'0')}${String(sequence).padStart(3,'0')}`,drawTime,estimated:true}
 }
 throw Error('暂无法计算默认期号')
}
