<script setup lang="ts">
import {computed,ref,watch} from 'vue'
import {readObservations,saveObservations,evaluateObservation,fetchObservation,baselineDate,type StockObservation} from '../lib/stock-observations'
import './stock-observations.css'
const props=defineProps<{active:boolean}>()
const emit=defineEmits<{notice:[message:string];change:[count:number]}>()
const initial=readObservations(),records=ref(initial.records),storageError=ref(initial.error),filter=ref('all'),busy=ref(false),selected=ref<string|null>(null)
const evaluations=computed(()=>records.value.map(record=>({record,result:evaluateObservation(record)})))
const visible=computed(()=>evaluations.value.filter(({result})=>filter.value==='all'||(filter.value==='done'?result.completed:!result.completed)))
function persist(){try{saveObservations(records.value);storageError.value=''}catch{storageError.value='本次观察变更无法持久保存；关闭页面后可能丢失。';emit('notice',storageError.value)}emit('change',records.value.filter(r=>!evaluateObservation(r).completed).length)}
function hasActive(code:string){return records.value.some(r=>r.code===code&&!evaluateObservation(r).completed)}
function addStock(stock:{code:string;name:string;market:string},source:'all'|'hot') {if(hasActive(stock.code)){emit('notice','该股票已在观察中');return}if(!/^\d{6}$/.test(stock.code)){emit('notice','股票代码无效');return}records.value.unshift({...stock,source,id:crypto.randomUUID(),addedAt:new Date().toISOString()});persist();emit('notice','已加入股票观察');if(props.active)void refresh()}
function remove(record:StockObservation){if(!window.confirm(`移除 ${record.name} 的这次观察？`))return;records.value=records.value.filter(r=>r.id!==record.id);persist()}
async function refresh(){if(busy.value)return;busy.value=true;try{for(const record of [...records.value]){try{const snapshot=await fetchObservation(record);if(records.value.some(r=>r.id===record.id)){record.snapshot=snapshot;record.error=''}}catch(e){record.error=e instanceof Error?e.message:'行情更新失败'}persist()}}finally{busy.value=false}}
watch(()=>props.active,active=>{if(active)void refresh()},{immediate:true})
watch(()=>records.value.length,()=>emit('change',records.value.filter(r=>!evaluateObservation(r).completed).length),{immediate:true})
const percent=(n:number)=>`${n>0?'+':''}${n.toFixed(2)}%`
function chart(points:{change:number}[]){const values=points.map(p=>p.change),low=Math.min(0,...values),high=Math.max(0,...values),span=high-low||1;return points.map((p,i)=>`${20+i*560/Math.max(1,points.length-1)},${150-(p.change-low)/span*125}`).join(' ')}
function nodePosition(points:{date:string;change:number}[],date:string){const index=points.findIndex(p=>p.date===date);const values=points.map(p=>p.change),low=Math.min(0,...values),high=Math.max(0,...values);return {x:20+index*560/Math.max(1,points.length-1),y:150-(points[index]!.change-low)/(high-low||1)*125}}
defineExpose({addStock,hasActive})
</script>
<template>
<section class="stock-observations" aria-label="我的股票观察">
 <div class="stock-observation-heading"><div><h2>我的观察</h2><p>回看基准后的第 3、10 个市场交易日</p></div><button type="button" :disabled="busy" @click="refresh">{{busy?'正在更新…':'刷新行情'}}</button></div>
 <p v-if="storageError" role="alert" class="stock-observation-warning">{{storageError}}</p>
 <div class="stock-observation-filters" aria-label="观察筛选"><button v-for="item in [{key:'all',label:'全部'},{key:'active',label:'观察中'},{key:'done',label:'已完成'}]" :key="item.key" :aria-pressed="filter===item.key" @click="filter=item.key">{{item.label}}</button></div>
 <p class="stock-observation-note">涨跌幅使用同一次更新中的前复权价格计算，可能与原始价格简单相除不同。基准日为第 0 日；停牌仍计入市场交易日。为确认上游日线更新，当日收盘及节点在下一自然日后核实。</p>
 <p v-if="!visible.length" class="stock-observation-empty">暂无{{filter==='done'?'已完成':filter==='active'?'进行中':''}}观察。从选股结果点击「加入观察」开始。</p>
 <article v-for="{record,result} in visible" :key="record.id" class="stock-observation-card">
  <div class="stock-observation-heading"><h3>{{record.name}} <small>{{record.code}} · {{record.market}}</small></h3><span>{{result.completed?'已完成':'观察中'}}</span></div>
  <p class="stock-observation-note">{{record.source==='hot'?'热门股盲选':'全市场随机'}} · 加入于 {{new Date(record.addedAt).toLocaleString('zh-CN',{timeZone:'Asia/Shanghai',hour12:false})}}</p>
  <p v-if="record.error" role="alert" class="stock-observation-warning">{{record.error}}。{{record.snapshot?'保留上次完整快照。':'尚无行情，等待更新。'}}</p>
  <p v-if="!result.base">等待 {{baselineDate(record.addedAt)}} 或之后首个有效交易日的已确认开盘行情；若已开盘，等待当日收盘行情核实。</p>
  <template v-else>
   <p>基准开盘 {{result.base.open.toFixed(2)}} 元 · {{result.base.date}} <span> · 已确认 {{result.progress}} 个交易日</span></p>
   <p v-if="result.points.length">最新收盘 {{result.points.at(-1)!.close.toFixed(2)}} 元 · {{result.points.at(-1)!.date}} <strong>{{percent(result.points.at(-1)!.change)}}</strong></p>
  </template>
  <div class="stock-observation-nodes"><div v-for="node in result.nodes" :key="node.day"><b>第 {{node.day}} 日</b><span>{{node.date||'日期待市场日历确认'}}</span><strong>{{node.point?percent(node.point.change):node.status==='missing'?'当日停牌／无行情':'等待交易日行情'}}</strong></div></div>
  <p v-if="record.snapshot" class="stock-observation-note">数据更新 {{new Date(record.snapshot.updatedAt).toLocaleString('zh-CN',{timeZone:'Asia/Shanghai',hour12:false})}} · {{record.snapshot.source}} · 市场日历截至 {{record.snapshot.calendarThrough||'暂无已确认交易日'}}</p>
  <div class="stock-observation-actions"><button @click="selected=selected===record.id?null:record.id">{{selected===record.id?'收起详情':'查看走势与价格'}}</button><button @click="remove(record)">移除观察</button></div>
  <div v-if="selected===record.id" class="stock-observation-details">
   <template v-if="result.points.length"><svg viewBox="0 0 600 180" role="img" aria-label="每日收盘相对基准开盘的复权涨跌幅，详细数值见下方表格"><polyline :points="chart(result.points)" fill="none" stroke="currentColor" stroke-width="3"/><g v-for="node in result.nodes.filter(n=>n.point)" :key="node.day"><circle :cx="nodePosition(result.points,node.date!).x" :cy="nodePosition(result.points,node.date!).y" r="5" fill="currentColor"/><text :x="nodePosition(result.points,node.date!).x-12" :y="nodePosition(result.points,node.date!).y-9">{{node.day}}日</text></g><text x="20" y="177">{{result.points[0]!.date}}</text><text x="480" y="177">{{result.points.at(-1)!.date}}</text></svg><div class="stock-observation-table"><table><caption>原始价格与复权涨跌幅</caption><thead><tr><th>日期</th><th>开盘</th><th>收盘</th><th>涨跌幅</th><th>节点</th></tr></thead><tbody><tr v-for="point in result.points" :key="point.date"><td>{{point.date}}</td><td>{{point.open.toFixed(2)}}</td><td>{{point.close.toFixed(2)}}</td><td>{{percent(point.change)}}</td><td>{{result.nodes.find(n=>n.date===point.date)?.day ? `第 ${result.nodes.find(n=>n.date===point.date)!.day} 日` : point.date===result.base?.date?'基准日':'—'}}</td></tr></tbody></table></div></template><p v-else>暂无已确认日线。</p>
  </div>
 </article>
</section>
</template>
