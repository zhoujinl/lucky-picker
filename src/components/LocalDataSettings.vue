<script setup lang="ts">
import {ref} from 'vue'
import {localDatabase} from '../lib/local-database'
const busy=ref(false),message=ref(localDatabase.warning()),input=ref<HTMLInputElement|null>(null)
async function backup(){if(busy.value)return;busy.value=true;try{const data=await localDatabase.backup(),url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'})),link=document.createElement('a');link.href=url;link.download=`lucky-picker-backup-${new Date().toLocaleDateString('en-CA',{timeZone:'Asia/Shanghai'})}.json`;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);message.value='备份文件已导出，包含历史记录和两份观察列表。'}catch(e){message.value=(e as Error).message}finally{busy.value=false}}
async function restore(event:Event){const file=(event.target as HTMLInputElement).files?.[0];if(!file||busy.value)return;busy.value=true;try{if(file.size>24*1024*1024)throw Error('备份文件超过 24 MB 限制');await localDatabase.restore(JSON.parse(await file.text()));window.location.reload()}catch(e){message.value=`导入失败：${(e as Error).message}。原有数据库记录未覆盖。`}finally{busy.value=false;if(input.value)input.value.value=''}}
</script>
<template>
 <details class="local-data-settings" :open="!!localDatabase.warning()"><summary>本机保存 · SQLite <span>数据与备份</span></summary><div><p>历史记录与观察列表保存在本机数据库，清理浏览器数据不会删除。浏览器旧记录会自动合并导入。</p><p v-if="localDatabase.path()" class="database-path">保存位置：{{localDatabase.path()}}</p><button :disabled="busy" @click="backup">导出备份</button><button :disabled="busy" @click="input?.click()">导入备份</button><input ref="input" type="file" accept=".json,application/json" aria-label="选择备份文件" hidden @change="restore"><p>导入会合并记录，重复项保留数据库现有内容。数据库位于运行 Node 服务的电脑。</p><p v-if="message" role="status">{{message}}</p></div></details>
</template>
<style scoped>
.local-data-settings{margin:8px 0 20px;color:var(--muted,#73766e);font-size:12px;line-height:1.7}.local-data-settings summary{cursor:pointer}.local-data-settings summary span{margin-left:12px;text-decoration:underline;text-underline-offset:3px}.local-data-settings>div{margin-top:10px;padding:14px 18px;border:1px solid var(--border,#e5e3da);border-radius:12px;background:#fffefa}.local-data-settings p{margin:6px 0}.database-path{overflow-wrap:anywhere}.local-data-settings button{font:inherit;padding:7px 12px;border:1px solid #d6d7cd;border-radius:8px;background:white;color:#4d5a44;margin:8px 8px 8px 0;cursor:pointer}.local-data-settings button:disabled{opacity:.5}
</style>
