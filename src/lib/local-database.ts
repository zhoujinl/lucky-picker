const keys=['lucky-picker:history:v1','lucky-stock-observations-v1','lucky-picker:lottery-observations:v1'] as const
interface Document {value:string;revision:number}
interface Snapshot {version:1;collections:Record<string,Document>;path?:string}
export function createDatabaseClient(fetcher:typeof fetch=(...args)=>fetch(...args)){
 let documents:Record<string,Document>={},migrationWarning='',path=''
 const queues=new Map<string,Promise<void>>(),blocked=new Set<string>()
 async function request(route='',options?:RequestInit){let response:Response;try{response=await fetcher('/api/local-data'+route,options?{...options,headers:{'Content-Type':'application/json'},signal:AbortSignal.timeout(20000)}:{signal:AbortSignal.timeout(20000)})}catch{throw Error('无法连接本地数据库，请确认本项目 Node 服务正在运行后重试')}
  let data;try{data=await response.json()}catch{throw Error('本地数据接口不可用，请通过本项目 Node 服务打开页面')}
  if(!response.ok){const e=new Error(data.error||'本地数据保存失败') as Error&{status:number};e.status=response.status;throw e}return data
 }
 function adopt(data:Snapshot){if(data?.version!==1||!data.collections||!keys.every(k=>typeof data.collections[k]?.value==='string'&&Number.isSafeInteger(data.collections[k]?.revision)))throw Error('本地数据响应无效');documents=data.collections;path=data.path||path}
 async function initialize(legacy?:Pick<Storage,'getItem'>){adopt(await request());migrationWarning='';const collections:Record<string,string>={};try{const source=legacy??globalThis.localStorage;for(const key of keys){const raw=source.getItem(key);if(raw!==null)collections[key]=raw}}catch{migrationWarning='浏览器旧数据无法读取；本地数据库可正常使用，旧记录尚未导入。'}
  if(Object.keys(collections).length){try{adopt(await request('/import',{method:'POST',body:JSON.stringify({version:1,collections,legacy:true})}))}catch(e){migrationWarning=`浏览器旧数据未导入：${(e as Error).message}。原始数据已保留，请先备份后处理。`}}
  blocked.clear()
 }
 function save(key:string,value:string){if(!keys.includes(key as typeof keys[number]))return Promise.reject(Error('未知数据集合'));const operation=(queues.get(key)||Promise.resolve()).catch(()=>{}).then(async()=>{
   if(blocked.has(key))throw Error('此页面数据已过期，请刷新页面后再操作')
   const current=documents[key];if(!current)throw Error('本地数据库尚未加载')
   try{const next=await request('',{method:'PUT',body:JSON.stringify({key,value,revision:current.revision})});if(typeof next.value!=='string'||!Number.isSafeInteger(next.revision))throw Error('保存响应无效');documents[key]=next}catch(e){blocked.add(key);throw e}
  });queues.set(key,operation);return operation
 }
 const storage={getItem:(key:string)=>documents[key]?.value??null}
 async function persist(writer:(storage:Pick<Storage,'setItem'>)=>unknown){let captured:{key:string;value:string}|undefined;const result=writer({setItem(key,value){if(captured)throw Error('一次只能保存一个集合');captured={key,value}}});if(result===false||!captured)throw Error('记录序列化失败');await save(captured.key,captured.value)}
 async function backup(){await Promise.allSettled([...queues.values()]);const data:Snapshot=await request();return {version:1,exportedAt:new Date().toISOString(),collections:Object.fromEntries(keys.map(k=>[k,data.collections[k]!.value]))}}
 async function restore(data:unknown){const input=data as {version:number;collections:Record<string,string>};if(input?.version!==1||!input.collections||!keys.every(k=>typeof input.collections[k]==='string'))throw Error('请选择本项目导出的完整 JSON 备份');await Promise.allSettled([...queues.values()]);await request('/import',{method:'POST',body:JSON.stringify({version:1,collections:input.collections})})}
 return {initialize,save,persist,storage,backup,restore,warning:()=>migrationWarning,path:()=>path}
}
export const localDatabase=createDatabaseClient()
