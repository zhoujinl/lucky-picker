<script setup lang="ts">
import {formatTicket,type LotteryId,type Ticket} from '../lib/picker'
import AppIcon from './AppIcon.vue'
defineProps<{tickets:Ticket[];lotteryId:LotteryId}>()
defineEmits<{copy:[text:string];replace:[index:number]}>()
const digit=(id:LotteryId)=>id==='pl3'||id==='pl5'
</script>
<template>
  <div class="ticket-list">
    <div v-for="(ticket,index) in tickets" :key="index" class="ticket-row">
      <span class="row-index">{{String(index+1).padStart(2,'0')}}</span>
      <div class="balls" :aria-label="`第 ${index+1} 组：${formatTicket(lotteryId,ticket)}`">
        <span v-for="(n,i) in ticket.primary" :key="`p${i}`" class="ball" :class="{'digit-ball':digit(lotteryId)}">{{digit(lotteryId)?n:String(n).padStart(2,'0')}}</span>
        <span v-if="ticket.secondary.length" class="ball-separator" aria-hidden="true">+</span>
        <span v-for="(n,i) in ticket.secondary" :key="`s${i}`" class="ball ball-blue">{{String(n).padStart(2,'0')}}</span>
      </div>
      <div class="row-actions">
        <button class="icon-button" :aria-label="`重新生成第 ${index+1} 组`" title="重新生成这一组" @click="$emit('replace',index)"><AppIcon name="refresh" :size="17"/></button>
        <button class="icon-button" :aria-label="`复制第 ${index+1} 组`" title="复制这一组" @click="$emit('copy',formatTicket(lotteryId,ticket))"><AppIcon name="copy" :size="17"/></button>
      </div>
    </div>
  </div>
</template>
