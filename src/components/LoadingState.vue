<script setup>
defineProps({ text: { type: String, default: 'Memuat data...' } })
</script>

<template>
  <div class="osk-empty py-5" role="status">
    <div class="spinner-border text-primary" aria-hidden="true"></div>
    <div class="mt-2">{{ text }}</div>
  </div>
</template>
