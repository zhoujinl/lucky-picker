<script setup lang="ts">
import {computed,onUnmounted,ref} from 'vue'
import AppIcon from './components/AppIcon.vue'
import TicketList from './components/TicketList.vue'
import HistoryList from './components/HistoryList.vue'
import HotStockPicker from './components/HotStockPicker.vue'
import StockObservations from './components/StockObservations.vue'
import LotteryObservations from './components/LotteryObservations.vue'
import {formatTicket,generateTickets,lotteries,pickStock,replaceTicket,type LotteryId,type Ticket} from './lib/picker'
import {readHistory,saveHistory,type HistoryEntry} from './lib/history'
import LocalDataSettings from './components/LocalDataSettings.vue'
import {localDatabase} from './lib/local-database'
import {copyText} from './lib/clipboard'
import {stocks,stockPoolUpdatedAt,stockPoolFetchedAt,stockPoolCoverage,stockSources,type Stock} from './data/stocks'
const mode=ref<'lottery'|'stock'>('lottery')
const selected=ref<LotteryId>('ssq')
const lottery=computed(()=>lotteries.find(l=>l.id===selected.value)!)
const tickets=ref<Ticket[]>([])
const stock=ref<Stock|null>(null)
const stockMode=ref<'all'|'hot'|'watch'>('all')
const lotteryMode=ref<'pick'|'watch'>('pick')
const stockObservations=ref<InstanceType<typeof StockObservations>|null>(null)
const lotteryObservations=ref<InstanceType<typeof LotteryObservations>|null>(null)
const stockObservationCount=ref(0)
const lotteryObservationCount=ref(0)
function observeStock(value:Stock,source:'all'|'hot'){stockObservations.value?.addStock(value,source);stockMode.value='watch'}
function isStockObserved(code:string){return stockObservations.value?.hasActive(code)??false}
function observeTickets(values:Ticket[]){lotteryObservations.value?.open(selected.value,values)}
const history=ref<HistoryEntry[]>(readHistory(localDatabase.storage))
const notice=ref('')
const storageWarning=ref('')
const manualCopy=ref('')
const clearDialog=ref<HTMLDialogElement|null>(null)
const sourceOpen=ref(false)
const generation=ref(0)
let timer:ReturnType<typeof setTimeout>|undefined
function notify(message:string){notice.value=message;clearTimeout(timer);timer=setTimeout(()=>notice.value='',3500)}
onUnmounted(()=>clearTimeout(timer))
let historyQueue=Promise.resolve()
function updateHistory(change:(rows:HistoryEntry[])=>HistoryEntry[]){
 const operation=historyQueue.catch(()=>{}).then(async()=>{const next=change(history.value);await localDatabase.persist(storage=>saveHistory(next,storage));history.value=next;storageWarning.value=''})
 historyQueue=operation;return operation
}
function remember(label:string,lines:string[]){
 const entry={id:crypto.randomUUID(),createdAt:new Date().toISOString(),label,lines}
 void updateHistory(rows=>[entry,...rows].slice(0,50)).catch(e=>{storageWarning.value=`历史记录未保存：${(e as Error).message}；本次结果仍可查看和复制。`})
}
function generate(count:1|10){
  try {
    const next=generateTickets(selected.value,count)
    tickets.value=next;generation.value++
    remember(lottery.value.name,next.map(t=>formatTicket(selected.value,t)))
    notify(`已为你生成 ${count} 组号码`)
  }catch(e){notify(e instanceof Error?e.message:'生成失败，请重试')}
}
function regenerate(index:number){
  try{ tickets.value=replaceTicket(selected.value,tickets.value,index);generation.value++;remember(lottery.value.name,tickets.value.map(t=>formatTicket(selected.value,t)));notify(`第 ${index+1} 组已重新生成`) }
  catch(e){notify(e instanceof Error?e.message:'生成失败，请重试')}
}
function selectLottery(id:LotteryId){selected.value=id;tickets.value=[]}
async function copy(text:string){
  if(await copyText(text)){notify('已复制到剪贴板')}else{manualCopy.value=text;notify('无法自动复制，请选中下方文本手动复制')}
}
function allTickets(){return lottery.value.name+'\n'+tickets.value.map(t=>formatTicket(selected.value,t)).join('\n')}
function drawStock(){
  try{stock.value=pickStock();generation.value++;remember('幸运选股',[`${stock.value.code} ${stock.value.name} · ${stock.value.market}`]);notify('你的幸运股票已揭晓')}
  catch(e){notify(e instanceof Error?e.message:'抽取失败，请重试')}
}
async function clearHistory(){try{await updateHistory(()=>[]);clearDialog.value?.close();notify('当前记录已清空')}catch(e){storageWarning.value=(e as Error).message;notify('清空失败，原记录已保留')}}
</script>
<template>
  <div class="app-shell">
    <header class="site-header">
      <a class="brand" href="./" aria-label="Lucky Picker 首页"><span class="brand-mark"><AppIcon name="sparkle" :size="25"/></span><span>lucky<span class="brand-light">picker</span><span class="brand-dot">.</span></span></a>
      <span class="header-note">把选择交给随机，把惊喜留给生活</span>
      <span class="local-badge"><span></span> 纯粹随机 · 无需登录</span>
      <LocalDataSettings/>
    </header>
    <main>
      <section class="hero">
        <div class="hero-copy"><div class="eyebrow"><span></span> A LITTLE CHANCE, A LITTLE MAGIC</div><h1>给今天，<span>一点好运气。</span><span class="title-spark">✳</span></h1><p>不必纠结选哪一个。轻轻一点，让随机为你带来小小的惊喜。</p></div>
        <div class="hero-art" aria-hidden="true"><span class="art-orbit orbit-one"></span><span class="art-orbit orbit-two"></span><span class="art-star star-one">✧</span><span class="art-star star-two">✳</span><div class="art-ball art-ball-blue">08</div><div class="art-ball art-ball-red">06</div><span class="art-caption">GOOD THINGS ARE ON THE WAY</span></div>
      </section>
      <nav class="mode-tabs" aria-label="选择功能"><button :class="{active:mode==='lottery'}" :aria-pressed="mode==='lottery'" @click="mode='lottery'"><AppIcon name="ticket"/>幸运选号<span class="tab-en">LOTTERY</span></button><button :class="{active:mode==='stock'}" :aria-pressed="mode==='stock'" @click="mode='stock'"><AppIcon name="chart"/>幸运选股<span class="tab-en">STOCKS</span><span class="new-label">试试手气</span></button></nav>
      <div class="workspace">
        <div class="main-column">
          <section v-show="mode==='lottery'" class="picker-card" aria-label="幸运选号">
            <nav class="observation-nav" aria-label="选号与观察"><button :class="{active:lotteryMode==='pick'}" :aria-pressed="lotteryMode==='pick'" @click="lotteryMode='pick'">幸运选号</button><button :class="{active:lotteryMode==='watch'}" :aria-pressed="lotteryMode==='watch'" @click="lotteryMode='watch'">我的观察 <span v-if="lotteryObservationCount" class="count">{{lotteryObservationCount}}</span></button></nav>
            <div v-show="lotteryMode==='pick'">
            <div class="card-kicker"><span>01 / 选择彩种</span><span>今天的好运，由你开启</span></div>
            <div class="lottery-tabs" aria-label="选择彩种"><button v-for="l in lotteries" :key="l.id" :class="{selected:selected===l.id}" :aria-pressed="selected===l.id" @click="selectLottery(l.id)"><span class="lottery-symbol">{{l.issuer==='中国福利彩票'?'福':'体'}}</span><span>{{l.name}}<small>{{l.issuer}}</small></span><span v-if="selected===l.id" class="selected-dot"></span></button></div>
            <div class="rule-strip"><AppIcon name="info" :size="16"/><span>{{lottery.description}}</span><a :href="lottery.ruleUrl" target="_blank" rel="noopener noreferrer" aria-label="查看当前彩种官方规则">规则<AppIcon name="chevron" :size="12"/></a></div>
            <section class="lottery-intro" aria-label="彩种介绍">
              <div class="intro-heading"><h3>{{lottery.name}}小介绍</h3><a :href="lottery.scheduleUrl" target="_blank" rel="noopener noreferrer">开奖时间来源 ↗</a></div>
              <dl><div><dt>开奖时间</dt><dd>{{lottery.drawSchedule}} <span>（北京时间）</span></dd></div><div><dt>开奖规则</dt><dd>{{lottery.drawRule}}</dd></div></dl>
              <p>休市及临时调整以官方公告为准；完整玩法与奖级见上方官方规则。</p>
            </section>
            <div class="generate-area"><div><h2>下一组，会是你的幸运数字吗？</h2><p>每一次随机，都是全新的可能。</p></div><div class="generate-buttons"><button class="button button-primary" @click="generate(1)"><AppIcon name="sparkle" :size="19"/>生成 1 组<AppIcon name="arrow" :size="18"/></button><button class="button button-secondary" @click="generate(10)"><AppIcon name="shuffle" :size="18"/>生成 10 组</button></div></div>
            <div class="results-header"><h3>你的幸运号码 <span v-if="tickets.length" class="count">{{tickets.length}} 组</span></h3><div v-if="tickets.length" class="result-tools"><button class="text-button" @click="observeTickets(tickets)">＋ 全部加入观察</button><button class="text-button" @click="copy(allTickets())"><AppIcon name="copy" :size="15"/>复制全部</button></div><span v-else class="result-hint">等待一点好运降临</span></div>
            <div v-if="!tickets.length" class="empty-result"><div class="placeholder-balls" aria-hidden="true"><span v-for="n in lottery.primaryCount" :key="n">?</span><i v-if="lottery.secondaryCount">+</i><span v-for="n in lottery.secondaryCount" :key="'b'+n" class="placeholder-blue">?</span></div><p>点击上方按钮，揭晓你的专属号码</p></div>
            <TicketList v-else :key="selected" :tickets="tickets" :lottery-id="selected" @copy="copy" @replace="regenerate" @observe="observeTickets([tickets[$event]])"/>
            <div class="card-footnote"><span><AppIcon name="shield" :size="14"/>独立随机生成</span><span>{{lottery.mode==='combination'?'区内不重复 · 自动排序':'按位生成 · 数字可重复'}}</span></div>
            </div>
            <LotteryObservations ref="lotteryObservations" :active="mode==='lottery' && lotteryMode==='watch'" v-show="lotteryMode==='watch'" @notice="notify" @change="lotteryObservationCount=$event"/>
          </section>
          <section v-show="mode==='stock'" class="picker-card stock-card" aria-label="幸运选股">
            <div class="card-kicker"><span>02 / 遇见一只股票</span><span>给探索一个随机的起点</span></div>
            <nav class="stock-pool-tabs" aria-label="选择股票池"><button :class="{active:stockMode==='all'}" :aria-pressed="stockMode==='all'" @click="stockMode='all'">全市场随机</button><button :class="{active:stockMode==='hot'}" :aria-pressed="stockMode==='hot'" @click="stockMode='hot'">热门股盲选<span>HOT</span></button><button :class="{active:stockMode==='watch'}" :aria-pressed="stockMode==='watch'" @click="stockMode='watch'">我的观察 <small v-if="stockObservationCount" class="count">{{stockObservationCount}}</small></button></nav>
            <HotStockPicker :active="mode==='stock' && stockMode==='hot'" v-show="stockMode==='hot'" @copy="copy" @picked="remember('热门股盲选',$event)" :is-observed="isStockObserved" @observe="observeStock($event,'hot')" @notice="notify"/>
            <div v-show="stockMode==='all'">
            <div class="stock-intro"><span class="stock-icon"><AppIcon name="chart" :size="28"/></span><div><h2>下一站，遇见哪家公司？</h2><p>从 {{stocks.length.toLocaleString()}} 只沪深股票中，随机抽取一只。</p></div></div>
            <div class="stock-scope"><span class="scope-dot"></span>东方财富股票池<span>沪市 / 深市 / 创业板 / 科创板</span></div>
            <div v-if="!stock" class="stock-empty"><div class="stock-code-placeholder">------</div><p>把好奇心交给随机</p><span>点击下方按钮，发现你的幸运股票</span></div>
            <div v-else :key="generation" class="stock-result"><span class="stock-market">{{stock.market}}</span><p class="stock-code">{{stock.code}}</p><h3>{{stock.name}}</h3><button class="text-button" @click="copy(`${stock.code} ${stock.name} · ${stock.market}`)"><AppIcon name="copy" :size="15"/>复制股票信息</button><div class="stock-observe-action"><button class="button button-secondary" :disabled="isStockObserved(stock.code)" @click="observeStock(stock,'all')">{{isStockObserved(stock.code)?'已加入观察':'＋ 加入观察'}}</button></div></div>
            <button class="button button-primary stock-draw" @click="drawStock()"><AppIcon name="shuffle"/>{{stock?'再抽一只':'随机选一只'}}<AppIcon name="arrow" :size="18"/></button>
            <div class="stock-meta"><span>数据日期：{{stockPoolUpdatedAt}}</span><button class="text-button" :aria-expanded="sourceOpen" @click="sourceOpen=!sourceOpen">{{sourceOpen?'收起来源':'范围与来源'}}<AppIcon name="chevron" :size="12"/></button></div>
            <div v-if="sourceOpen" class="source-details"><p>{{stockPoolCoverage}}，共 {{stocks.length.toLocaleString()}} 只。保留接口返回的 ST、*ST 及状态未注明的股票，不根据交易状态筛选；不提供实时行情。</p><p>最近抓取：{{new Date(stockPoolFetchedAt).toLocaleString('zh-CN',{hour12:false})}}。</p><a v-for="source in stockSources" :key="source.url" :href="source.url" target="_blank" rel="noopener noreferrer">{{source.title}} ↗</a></div>
            </div>
            <StockObservations ref="stockObservations" :active="mode==='stock' && stockMode==='watch'" v-show="stockMode==='watch'" @notice="notify" @change="stockObservationCount=$event"/>
          </section>
          <div class="gentle-note"><AppIcon name="heart" :size="17"/><p>{{mode==='lottery'?'号码有随机，生活有热爱。理性参与，让好运保持轻盈。':'随机只是探索的起点。保持好奇，也保持自己的判断。'}}</p></div>
        </div>
        <aside class="side-column"><div class="good-luck-card"><div class="good-luck-top"><span>今日幸运签</span><AppIcon name="sparkle" :size="17"/></div><p>好事，<br/>正在发生。</p><div class="good-luck-bottom"><span>愿每一份期待，都有回响</span><span class="mini-spark">✳</span></div></div><HistoryList :entries="history" @copy="copy" @clear="clearDialog?.showModal()"/></aside>
      </div>
      <p v-if="storageWarning" class="storage-warning" role="status">{{storageWarning}}</p>
      <section v-if="manualCopy" class="manual-copy" aria-label="手动复制"><div><h2>请选中文本，手动复制</h2><button class="icon-button" aria-label="关闭手动复制" @click="manualCopy=''"><AppIcon name="close"/></button></div><textarea :value="manualCopy" readonly aria-label="待复制文本" @focus="($event.target as HTMLTextAreaElement).select()"></textarea></section>
    </main>
    <footer class="site-footer"><div class="footer-brand"><AppIcon name="sparkle" :size="16"/>lucky picker<span>让选择，轻松一点。</span></div><p>随机选号不提高中奖概率 · 随机选股仅供娱乐</p><span class="footer-end">MADE FOR LITTLE POSSIBILITIES</span></footer>
    <div class="toast" :class="{visible:notice}" role="status" aria-live="polite"><AppIcon name="info" :size="17"/>{{notice}}</div>
    <dialog ref="clearDialog" aria-labelledby="clear-title" class="confirm-dialog" @click="($event.target===$event.currentTarget) && clearDialog?.close()"><section><h2 id="clear-title">清空最近记录？</h2><p>将移除本机数据库中的全部生成记录，观察列表不受影响。</p><div class="dialog-actions"><button class="button button-secondary" autofocus @click="clearDialog?.close()">取消</button><button class="button button-primary" @click="clearHistory">确认清空</button></div></section></dialog>
  </div>
</template>
