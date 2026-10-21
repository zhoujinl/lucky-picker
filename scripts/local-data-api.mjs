import {DatabaseSync} from 'node:sqlite'
import {mkdirSync,chmodSync} from 'node:fs'
import {dirname,join} from 'node:path'
import {homedir} from 'node:os'
import {createHash} from 'node:crypto'
const H='lucky-picker:history:v1',S='lucky-stock-observations-v1',L='lucky-picker:lottery-observations:v1'
const keys=[H,S,L],empty={[H]:'[]',[S]:'{"version":1,"records":[]}',[L]:'{"version":1,"rows":[]}'}
const games={ssq:[6,33,1,16],dlt:[5,35,2,12],pl3:[3,9,0,0],pl5:[5,9,0,0],fc3d:[3,9,0,0],qxc:[6,9,1,14],qlc:[7,30,0,0]}
const str=(x,max=1000)=>typeof x==='string'&&x.length>0&&x.length<=max
const date=x=>str(x)&&Number.isFinite(Date.parse(x))
function ticket(id,t,result=false){const g=games[id];if(!g||!t)return false;const positional=['pl3','pl5','fc3d','qxc'].includes(id);return [[t.primary,g[0],g[1]],[t.secondary,result&&id==='qlc'?1:g[2],id==='qlc'?30:g[3]]].every(([a,n,max])=>Array.isArray(a)&&a.length===n&&a.every(v=>Number.isInteger(v)&&v>=(positional?0:1)&&v<=max)&&(positional||new Set(a).size===a.length))&&!(result&&id==='qlc'&&t.primary.includes(t.secondary[0]))}
const calendarDate=x=>typeof x==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(x)&&Number.isFinite(Date.parse(x))&&new Date(x).toISOString().slice(0,10)===x
function snapshotValid(s,code){
 if(!s||s.code!==code||!calendarDate(s.from)||!date(s.updatedAt)||Date.parse(s.updatedAt)>Date.now()||!str(s.source)||!Array.isArray(s.sessions)||s.sessions.length>10000||!Array.isArray(s.days)||s.days.length>10000)return false
 const cutoff=new Date(s.updatedAt).toLocaleDateString('en-CA',{timeZone:'Asia/Shanghai'})
 if(s.from>cutoff||!s.sessions.every((d,i)=>calendarDate(d)&&d>=s.from&&d<cutoff&&(!i||d>s.sessions[i-1]))||s.calendarThrough!==(s.sessions.at(-1)||''))return false
 const sessions=new Set(s.sessions)
 return s.days.every((d,i)=>d&&calendarDate(d.date)&&sessions.has(d.date)&&(!i||d.date>s.days[i-1].date)&&['open','close','adjustedOpen','adjustedClose'].every(k=>typeof d[k]==='number'&&Number.isFinite(d[k])&&d[k]>0))
}
function validate(key,value){
 if(!keys.includes(key)||typeof value!=='string'||Buffer.byteLength(value)>20*1024*1024)throw Error('无效的数据集合或数据过大')
 const data=JSON.parse(value),rows=key===H?data:key===S?data?.records:data?.rows
 if(!Array.isArray(rows)||rows.length>(key===H?10000:1000)||(key!==H&&data.version!==1))throw Error('记录格式或数量无效')
 const ids=new Set()
 for(const r of rows){
  if(!r||typeof r!=='object')throw Error('记录格式无效')
  const id=key===L?r.key:r.id
  if(!str(id,2000)||ids.has(id))throw Error('记录标识缺失或重复');ids.add(id)
  if(key===H){if(!date(r.createdAt)||!str(r.label)||!Array.isArray(r.lines)||!r.lines.length||r.lines.length>100||!r.lines.every(x=>str(x,10000)))throw Error('历史记录无效')}
  else if(key===S){
   if(!/^\d{6}$/.test(r.code)||!str(r.name)||!str(r.market)||!['all','hot'].includes(r.source)||!date(r.addedAt))throw Error('股票观察无效')
   if(r.snapshot&&!snapshotValid(r.snapshot,r.code))throw Error('股票行情快照无效')
  }else{
   if(!ticket(r.id,r.ticket)||!/^\d{5,7}$/.test(r.issue)||!date(r.addedAt)||typeof r.cutoff!=='string'||typeof r.drawTime!=='string'||!/^https:\/\//.test(r.source))throw Error('彩票观察无效')
   if(r.result&&(!ticket(r.id,r.result,true)||r.result.id!==r.id||r.result.issue!==r.issue||!/^\d{4}-\d{2}-\d{2}(?:T|$)/.test(r.result.drawTime)||!date(r.result.drawTime)||!date(r.result.updatedAt)||!/^https:\/\//.test(r.result.source)))throw Error('开奖结果无效')
  }
 }
 return rows
}
const pack=(key,rows)=>JSON.stringify(key===H?rows:key===S?{version:1,records:rows}:{version:1,rows})
export function createLocalDataStore({path=join(process.env.LUCKY_PICKER_DATA_DIR||join(homedir(),'.lucky-picker'),'data.sqlite')}={}){
 mkdirSync(dirname(path),{recursive:true,mode:0o700})
 const db=new DatabaseSync(path);let closed=false;chmodSync(path,0o600)
 db.exec('PRAGMA busy_timeout=5000; PRAGMA journal_mode=WAL; CREATE TABLE IF NOT EXISTS documents (key TEXT PRIMARY KEY,value TEXT NOT NULL,revision INTEGER NOT NULL); CREATE TABLE IF NOT EXISTS migrations (fingerprint TEXT PRIMARY KEY); CREATE TABLE IF NOT EXISTS legacy_records (collection TEXT NOT NULL,id TEXT NOT NULL,PRIMARY KEY(collection,id))')
 const get=db.prepare('SELECT value,revision FROM documents WHERE key=?'),put=db.prepare('INSERT INTO documents (key,value,revision) VALUES (?,?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value,revision=excluded.revision')
 const readOne=key=>get.get(key)||{value:empty[key],revision:0}
 function transaction(action){db.exec('BEGIN IMMEDIATE');try{const result=action();db.exec('COMMIT');return result}catch(e){db.exec('ROLLBACK');throw e}}
 function read(){return {version:1,path,collections:Object.fromEntries(keys.map(key=>[key,readOne(key)]))}}
 function save(key,value,revision){const rows=validate(key,value);return transaction(()=>{const old=readOne(key);if(!Number.isSafeInteger(revision)||old.revision!==revision){const e=Error('其他页面已更新此数据，请刷新页面后再操作，未覆盖新记录');e.status=409;throw e}const next={value:pack(key,key===H?rows.slice(0,50):rows),revision:old.revision+1};put.run(key,next.value,next.revision);return next})}
 function importData(collections,legacy=false){
  if(!collections||typeof collections!=='object'||Array.isArray(collections)||Object.keys(collections).some(k=>!keys.includes(k)))throw Error('备份集合无效')
  const entries=keys.filter(k=>collections[k]!=null).map(key=>[key,validate(key,collections[key])])
  const fingerprint=createHash('sha256').update(JSON.stringify(entries)).digest('hex')
  return transaction(()=>{
   const alreadyImported=legacy&&db.prepare('SELECT 1 FROM migrations WHERE fingerprint=?').get(fingerprint)
   const seen=db.prepare('SELECT 1 FROM legacy_records WHERE collection=? AND id=?'),mark=db.prepare('INSERT OR IGNORE INTO legacy_records (collection,id) VALUES (?,?)')
   const eligible=entries.map(([key,incoming])=>[key,legacy?incoming.filter(r=>{const id=key===L?r.key:r.id,exists=seen.get(key,id);mark.run(key,id);return !exists&&!alreadyImported}):incoming])
   if(alreadyImported)return read()
   for(const [key,incoming] of eligible){const old=readOne(key),rows=validate(key,old.value),ids=new Set(rows.map(r=>key===L?r.key:r.id));const merged=[...rows,...incoming.filter(r=>!ids.has(key===L?r.key:r.id))];if(key===H)merged.sort((a,b)=>Date.parse(b.createdAt)-Date.parse(a.createdAt));if(key!==H&&merged.length>1000)throw Error('合并后观察超过 1000 条，请先导出并整理记录');const value=pack(key,key===H?merged.slice(0,50):merged);if(value!==old.value)put.run(key,value,old.revision+1)}
   if(legacy)db.prepare('INSERT INTO migrations (fingerprint) VALUES (?)').run(fingerprint)
   return read()
  })
 }
 return {read,save,import:importData,close(){if(!closed){db.close();closed=true}},path}
}
export function createLocalDataApi(options){
 const store=createLocalDataStore(options)
 async function middleware(req,res,next){
  const url=new URL(req.url,'http://localhost');if(!url.pathname.startsWith('/api/local-data'))return next()
  res.setHeader('Content-Type','application/json; charset=utf-8');res.setHeader('Cache-Control','no-store')
  try{
   const origin=req.headers.origin,host=req.headers.host
   if(!['localhost','127.0.0.1','[::1]'].includes(new URL('http://'+host).hostname)||(origin&&new URL(origin).host!==host)||req.headers['sec-fetch-site']==='cross-site'){res.statusCode=403;res.end(JSON.stringify({error:'仅允许同源访问本地数据'}));return}
   if(url.pathname==='/api/local-data'&&req.method==='GET'){res.end(JSON.stringify(store.read()));return}
   if(!['PUT','POST'].includes(req.method)){res.statusCode=405;res.end(JSON.stringify({error:'不支持的请求方法'}));return}
   if(!req.headers['content-type']?.startsWith('application/json'))throw Error('仅接受 JSON 数据')
   const chunks=[];let size=0;for await(const chunk of req){size+=Buffer.byteLength(chunk);if(size>24*1024*1024)throw Error('数据超过 24 MB 限制');chunks.push(Buffer.from(chunk))}
   const data=JSON.parse(Buffer.concat(chunks).toString('utf8'));let result
   if(url.pathname==='/api/local-data'&&req.method==='PUT')result=store.save(data.key,data.value,data.revision)
   else if(url.pathname==='/api/local-data/import'&&req.method==='POST'){if(data.version!==1)throw Error('备份版本无效');result=store.import(data.collections,data.legacy===true)}
   else {res.statusCode=404;res.end(JSON.stringify({error:'接口不存在'}));return}
   res.end(JSON.stringify(result))
  }catch(e){res.statusCode=e.status||400;res.end(JSON.stringify({error:e.message||'本地数据库操作失败'}))}
 }
 return {middleware,store}
}
export function localDataApiPlugin(options){let api;const install=server=>{api??=createLocalDataApi(options);server.middlewares.use(api.middleware);server.httpServer?.once('close',()=>api.store.close())};return {name:'local-data-api',configureServer:install,configurePreviewServer:install}}
