<script setup>
defineProps({
  icon: { type: String, default: 'bi-inbox' },
  title: { type: String, required: true },
  text: { type: String, default: '' },
})
</script>

<template>
  <div class="osk-empty py-5">
    <i class="bi" :class="icon"></i>
    <div class="fw-semibold text-body">{{ title }}</div>
    <div v-if="text" class="small">{{ text }}</div>
    <div class="mt-2"><slot /></div>
  </div>
</template>
