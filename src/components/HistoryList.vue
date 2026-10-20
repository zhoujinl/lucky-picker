<script setup lang="ts">
import {ref} from 'vue'
import type {HistoryEntry} from '../lib/history'
import AppIcon from './AppIcon.vue'
defineProps<{entries:HistoryEntry[]}>()
defineEmits<{copy:[text:string];clear:[]}>()
const expanded=ref<string|null>(null)
function date(iso:string){return new Intl.DateTimeFormat('zh-CN',{month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hour12:false}).format(new Date(iso))}
</script>
<template>
  <section class="history-section" aria-labelledby="history-heading">
    <div class="section-heading"><h2 id="history-heading"><AppIcon name="clock" :size="18"/>最近记录 <span class="count">{{entries.length}}</span></h2><button v-if="entries.length" class="text-button" @click="$emit('clear')">清空记录</button></div>
    <div v-if="!entries.length" class="history-empty"><AppIcon name="clock" :size="26"/><p>好运，从第一次点击开始</p><span>生成的号码会自动保存在这里</span></div>
    <div v-else class="history-list">
      <article v-for="entry in entries" :key="entry.id" class="history-entry">
        <button class="history-summary" :aria-expanded="expanded===entry.id" @click="expanded=expanded===entry.id?null:entry.id">
          <span class="history-type"><AppIcon :name="entry.label==='幸运选股'?'chart':'ticket'" :size="17"/></span>
          <span class="history-info"><strong>{{entry.label}} <span>{{entry.lines.length}} 组</span></strong><span>{{date(entry.createdAt)}}</span></span>
          <AppIcon name="chevron" :size="15"/>
        </button>
        <div v-if="expanded===entry.id" class="history-detail"><p v-for="(line,i) in entry.lines" :key="i">{{line}}</p><button class="text-button" @click="$emit('copy',entry.label+'\n'+entry.lines.join('\n'))"><AppIcon name="copy" :size="14"/>复制记录</button></div>
      </article>
    </div>
    <p class="storage-note"><AppIcon name="shield" :size="13"/>仅保存在当前浏览器，最多 50 条</p>
  </section>
</template>
