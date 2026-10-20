<script setup lang="ts">
import {computed,ref,watch} from 'vue'
import AppIcon from './AppIcon.vue'
import {pickHotStock,formatHotStock,type HotStock} from '../lib/hot-stocks'
import {hotStockSync} from '../lib/hot-stock-sync'
const props=defineProps<{active:boolean}>()
const {snapshot:hotSnapshot,loading,error,refresh}=hotStockSync
const hotStocks=computed(()=>hotSnapshot.value.stocks)
const emit=defineEmits<{copy:[text:string];picked:[lines:string[]];notice:[message:string]}>()
const result=ref<HotStock|null>(null)
const sourceOpen=ref(false)
watch(()=>props.active,active=>{if(active){result.value=null;void refresh()}},{immediate:true})
const updatedAt=computed(()=>new Date(hotSnapshot.value.fetchedAt).toLocaleString('zh-CN',{timeZone:'Asia/Shanghai',hour12:false}))
const isOld=()=>Date.now()-Date.parse(hotSnapshot.value.fetchedAt)>24*60*60*1000
function draw(){
 if(loading.value)return
 try{result.value=pickHotStock(hotStocks.value);emit('picked',[formatHotStock(result.value)]);emit('notice','你的热门股盲选结果已揭晓')}
 catch(error){emit('notice',error instanceof Error?error.message:'抽取失败，请重试')}
}
</script>
<template>
 <section class="hot-picker" aria-label="热门股盲选">
  <div class="hot-heading"><span class="hot-eyebrow">IN THE SPOTLIGHT</span><span class="hot-tag">双榜热度 · 流动性筛选</span></div>
  <div class="stock-intro"><span class="stock-icon"><AppIcon name="sparkle" :size="28"/></span><div><h2>从热度里，遇见新的可能。</h2><p>{{hotStocks.length}} 只符合条件的沪深股票，等概率盲选一只。</p></div></div>
  <div class="hot-criteria"><span>成交额 ≥ 5 亿</span><span>换手率 ≥ 1%</span><span>排除 ST / 退市</span></div>
  <p v-if="loading" class="hot-warning" role="status">正在同步东方财富、同花顺热榜及行情，请稍候…</p>
  <p v-if="error" class="hot-warning" role="status">自动同步未完成：{{error}}。当前使用上次完整快照（{{updatedAt}}），未混入普通股票池。</p>
  <p v-if="isOld()" class="hot-warning" role="status">这份快照已超过 24 小时，请等待自动同步成功后参考。下方仍可探索已保存的历史热门股。</p>
  <div v-if="!result" class="stock-empty hot-empty"><span class="blind-symbol" aria-hidden="true">?</span><p>先把名字藏起来，让好奇心先行。</p><span>点击揭晓，再看它为什么入选</span></div>
  <div v-else class="stock-result hot-result" aria-live="polite">
   <span class="stock-market">{{result.market}}</span><span v-if="result.eastmoneyRank && result.thsRank" class="dual-rank">双榜上榜</span>
   <p class="stock-code">{{result.code}}</p><h3>{{result.name}}</h3>
   <div class="hot-ranks"><div><span>东方财富人气榜</span><strong>{{result.eastmoneyRank?'#'+result.eastmoneyRank:'未进前100'}}</strong></div><div><span>同花顺小时热榜</span><strong>{{result.thsRank?'#'+result.thsRank:'未进前100'}}</strong></div></div>
   <dl class="hot-metrics"><div><dt>成交额</dt><dd>{{(result.amount/1e8).toFixed(2)}}<small> 亿</small></dd></div><div><dt>换手率</dt><dd>{{result.turnover.toFixed(2)}}<small>%</small></dd></div><div><dt>当日涨跌幅</dt><dd>{{result.change>0?'+':''}}{{result.change.toFixed(2)}}<small>%</small></dd></div></dl>
   <button class="text-button" @click="emit('copy',formatHotStock(result))"><AppIcon name="copy" :size="15"/>复制股票与入选依据</button>
  </div>
  <button class="button button-primary stock-draw" :disabled="loading || !hotStocks.length" @click="draw"><AppIcon name="shuffle"/>{{loading?'正在同步热门股…':result?'再盲选一只':'揭晓一只热门股'}}<AppIcon name="arrow" :size="18"/></button>
  <p class="hot-explainer">热度代表关注，成交数据反映活跃程度；以上阈值是本工具的筛选口径，不代表上涨概率或收益预测。</p>
  <p class="hot-explainer" role="status">最近成功同步：{{updatedAt}}（北京时间）<button v-if="error && !loading" class="text-button" @click="refresh">重试同步</button></p>
  <div class="stock-meta"><span>行情日期：{{hotSnapshot.dataDate}} · 非实时快照</span><button class="text-button" :aria-expanded="sourceOpen" @click="sourceOpen=!sourceOpen">{{sourceOpen?'收起依据':'筛选与来源'}}<AppIcon name="chevron" :size="12"/></button></div>
  <div v-if="sourceOpen" class="source-details hot-sources">
   <p>东方财富 {{hotSnapshot.sources.eastmoney.count}} 名＋同花顺小时榜 {{hotSnapshot.sources.ths.count}} 名，合并去重共 {{hotSnapshot.candidateCount}} 个候选；与沪深股票池匹配，并按同一最新行情日期筛选，剩余 {{hotStocks.length}} 只。双榜上榜只作标记，不增加抽中权重。</p>
   <p>排除成交额低于 5 亿元、换手率低于 1%、ST、退市名称及缺失或日期落后的行情。未按涨跌幅筛选，可能抽中下跌股票。</p>
   <p>热榜抓取：{{updatedAt}}（北京时间）。行情日期与热榜时间可能不同；休市时成交指标来自最近交易日。每次进入热门股盲选都会自动同步两榜与行情；同步失败时保留上次完整数据。</p>
   <a :href="hotSnapshot.sources.eastmoney.url" target="_blank" rel="noopener noreferrer">东方财富 · 人气榜 ↗</a><a :href="hotSnapshot.sources.ths.url" target="_blank" rel="noopener noreferrer">同花顺 · 热榜 ↗</a><a :href="hotSnapshot.quoteSource" target="_blank" rel="noopener noreferrer">东方财富 · 行情数据 ↗</a>
  </div>
 </section>
</template>
