<script setup>
import { computed } from 'vue'
import { ELECTION_STATUS } from '@/constants'

const props = defineProps({ status: { type: String, default: null } })
const info = computed(() => ELECTION_STATUS[props.status] ?? { label: '-', badge: 'text-bg-light' })
</script>

<template>
  <span class="badge rounded-pill" :class="info.badge">{{ info.label }}</span>
</template>
