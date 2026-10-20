<script setup lang="ts">
withDefaults(defineProps<{name:string;size?:number}>(),{size:20})
const paths:Record<string,string>={
  sparkle:'M12 3c0 5.5 3.5 9 9 9-5.5 0-9 3.5-9 9 0-5.5-3.5-9-9-9 5.5 0 9-3.5 9-9Z',
  shuffle:'m16 3 4 4-4 4M4 7h3c4 0 6 10 10 10h3m-4-4 4 4-4 4M4 17h3c1.4 0 2.6-1.2 3.7-3M13.3 10C14.4 8.2 15.6 7 17 7h3',
  copy:'M9 8h10v12H9zM15 8V4H5v12h4',
  refresh:'M20 7v5h-5M4 17v-5h5M6.2 7A7 7 0 0 1 18 6l2 3M4 15l2 3a7 7 0 0 0 11.8-1',
  clock:'M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0ZM12 7v5l3 2',
  arrow:'M5 12h14m-5-5 5 5-5 5',
  chart:'M4 4v16h16M7 14l4-4 4 2 5-6',
  ticket:'M3 7h18v4a2 2 0 0 0 0 4v3H3v-3a2 2 0 0 0 0-4V7Zm12 0v3m0 3v5',
  shield:'m12 3 8 3v6c0 4-4 7-8 9-4-2-8-5-8-9V6l8-3Zm-4 9 3 3 5-6',
  info:'M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0ZM12 11v6m0-10v1',
  chevron:'m9 5 7 7-7 7',
  close:'m6 6 12 12M18 6 6 18',
  heart:'M12 20S3 15 3 9a5 5 0 0 1 9-3 5 5 0 0 1 9 3c0 6-9 11-9 11Z',
  check:'m5 12 4 4L19 6',
}
</script>
<template><svg :width="size" :height="size" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path :d="paths[name] || paths.sparkle"/></svg></template>
