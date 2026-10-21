import {defaultLotteryIssue} from './lottery-default-issue.mjs'
const GAMES={ssq:{name:'双色球',p:6,max:33,s:1,smax:16},fc3d:{name:'福彩3D',p:3,max:9,s:0,smax:0},qlc:{name:'七乐彩',p:7,max:30,s:1,smax:30},dlt:{name:'超级大乐透',game:'85',p:5,max:35,s:2,smax:12},pl3:{name:'排列3',game:'35',p:3,max:9,s:0,smax:0},pl5:{name:'排列5',game:'350133',p:5,max:9,s:0,smax:0},qxc:{name:'7星彩',game:'04',p:6,max:9,s:1,smax:14}}
const CWL='https://www.cwl.gov.cn/cwl_admin/front/cwlkj/search/kjxx/findDrawNotice'
const SPORTS='https://webapi.sporttery.cn/gateway/lottery/getHistoryPageListV1.qry'
const positional=id=>['fc3d','pl3','pl5','qxc'].includes(id)
function check(id,issue){if(!GAMES[id]||!/^\d{5,7}$/.test(issue))throw Error('无效的彩种或期号')}
export function normalizeOfficialDraw(id,issue,row){
 check(id,issue);const g=GAMES[id],sport=!!g.game
 if(String(sport?row.lotteryDrawNum:row.code)!==issue)throw Error('官方期号不符')
 if(sport&&String(row.lotteryGameNum)!==g.game)throw Error('官方彩种不符')
 if(!sport&&row.name!==g.name&&!(id==='fc3d'&&row.name==='3D'))throw Error('官方彩种不符')
 const nums=s=>typeof s==='string'&&s.trim()?s.trim().split(/[,\s]+/).map(v=>/^\d{1,2}$/.test(v)?Number(v):NaN):[]
 const all=sport?nums(row.lotteryDrawResult):[],primary=sport?all.slice(0,g.p):nums(row.red),secondary=sport?all.slice(g.p):nums(row.blue)
 for(const [a,count,max] of [[primary,g.p,g.max],[secondary,g.s,g.smax]])if(a.length!==count||a.some(n=>!Number.isInteger(n)||n<(positional(id)?0:1)||n>max)||(!positional(id)&&new Set(a).size!==a.length))throw Error('官方开奖号码不完整或无效')
 if(id==='qlc'&&primary.includes(secondary[0]))throw Error('官方特别号重复')
 const raw=String(sport?row.lotteryDrawTime:row.date);if(!/^\d{4}-\d{2}-\d{2}/.test(raw))throw Error('官方开奖日期缺失')
 const day=raw.slice(0,10);if(!Number.isFinite(Date.parse(day))||new Date(day).toISOString().slice(0,10)!==day)throw Error('开奖日期无效')
 const source=sport?SPORTS:CWL
 return {id,issue,primary,secondary,drawTime:day,source,updatedAt:new Date().toISOString()}
}
export function createLotteryObservationApi({fetchImpl=fetch,now=Date.now,issueProvider=null,timeoutMs=8000}={}){
 const cache=new Map(),pending=new Map();let concurrent=0
 async function fetchJson(url){if(concurrent>=8)throw Error('官方查询繁忙，请稍后重试');concurrent++;try{const r=await fetchImpl(url,{signal:AbortSignal.timeout(timeoutMs),headers:{Accept:'application/json','User-Agent':'Mozilla/5.0',Referer:'https://www.lottery.gov.cn/'}});if(!r.ok)throw Error(`官方来源 HTTP ${r.status}`);return await r.json()}finally{concurrent--}}
 async function getResult(id,issue){check(id,issue);const key=id+':'+issue,c=cache.get(key);if(c&&now()-c.time<60000)return c.value;if(pending.has(key))return pending.get(key)
 const promise=(async()=>{let value;try{const g=GAMES[id];const url=new URL(g.game?SPORTS:CWL);Object.entries(g.game?{gameNo:g.game,provinceId:'0',pageSize:'30',pageNo:'1',isVerify:'1',startTerm:issue,endTerm:issue}:{name:id==='fc3d'?'3d':id,issueStart:issue,issueEnd:issue,issueCount:'1',pageNo:'1',pageSize:'1',systemType:'PC'}).forEach(([k,v])=>url.searchParams.set(k,v));const json=await fetchJson(url.href);if(g.game?json.success!==true:json.state!==0)throw Error('官方来源返回查询失败');const list=g.game?json.value?.list:json.result;if(!Array.isArray(list))throw Error('官方来源返回结构无效');const row=list.find(r=>String(g.game?r.lotteryDrawNum:r.code)===issue);value=row?{status:'published',result:{...normalizeOfficialDraw(id,issue,row),source:url.href}}:{status:'unpublished',message:'指定期次官方完整结果尚未发布'}
 }catch(e){value={status:'source-error',message:`官方数据暂不可用：${e.message}`}}cache.set(key,{time:now(),value});if(cache.size>500)cache.delete(cache.keys().next().value);return value})().finally(()=>pending.delete(key));pending.set(key,promise);return promise
 }
 async function getIssues(id,issue){if(!GAMES[id]||(issue&&!/^\d{5,7}$/.test(issue)))throw Error('无效的彩种或期号');if(issueProvider){try{const issues=await issueProvider(id,issue);return {issues:issues.filter(x=>x.id===id&&x.confirmed===true&&/^\d{5,7}$/.test(x.issue)&&(!issue||x.issue===issue)&&Date.parse(x.cutoff)>now()&&Date.parse(x.drawTime)>=Date.parse(x.cutoff)&&/^https:\/\//.test(x.source)),message:''}}catch(e){return {issues:[],message:`官方期次查询失败：${e.message}`}}}const source=GAMES[id].game?'https://www.lottery.gov.cn/':'https://www.cwl.gov.cn/'
 try{
 const key='latest:'+id,cached=cache.get(key);let latest
 if(cached&&now()-cached.time<60000)latest=cached.value
 else {const g=GAMES[id],url=new URL(g.game?SPORTS:CWL);Object.entries(g.game?{gameNo:g.game,provinceId:'0',pageSize:'1',pageNo:'1',isVerify:'1'}:{name:id==='fc3d'?'3d':id,issueCount:'1',pageNo:'1',pageSize:'1',systemType:'PC'}).forEach(([k,v])=>url.searchParams.set(k,v));const data=await fetchJson(url.href);if(g.game?data.success!==true:data.state!==0)throw Error('最新开奖查询失败');const row=(g.game?data.value?.list:data.result)?.[0];if(!row)throw Error('最新开奖尚未发布');latest=normalizeOfficialDraw(id,String(g.game?row.lotteryDrawNum:row.code),row);cache.set(key,{time:now(),value:latest})}
 return {issues:[],defaultIssue:defaultLotteryIssue(id,latest,now()),message:'已按最新开奖和北京时间常规开奖日程预填，可修改；休市及临时调整以官方公告为准。',source}
 }catch(e){return {issues:[],message:`默认期号暂不可用：${e.message}。可手动填写。`,source}}}
 async function middleware(req,res,next){const url=new URL(req.url,'http://localhost');if(!url.pathname.startsWith('/api/lottery-observations/'))return next();res.setHeader('Content-Type','application/json; charset=utf-8');res.setHeader('Cache-Control','no-store');try{if(req.method!=='GET'){res.statusCode=405;res.end(JSON.stringify({error:'仅支持 GET'}));return}const route=url.pathname.slice('/api/lottery-observations/'.length);if(!['issues','result'].includes(route)||[...url.searchParams.keys()].some(k=>!['id','issue'].includes(k)))throw Error('无效查询');const id=url.searchParams.get('id'),issue=url.searchParams.get('issue')||undefined;const data=route==='issues'?await getIssues(id,issue):await getResult(id,issue);res.end(JSON.stringify(data))}catch(e){res.statusCode=400;res.end(JSON.stringify({error:e.message}))}}
 return {getResult,getIssues,middleware}
}
export function lotteryObservationApiPlugin(options){const api=createLotteryObservationApi(options);return {name:'lottery-observation-api',configureServer(server){server.middlewares.use(api.middleware)},configurePreviewServer(server){server.middlewares.use(api.middleware)}}}
