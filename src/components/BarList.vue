<script setup>
// Daftar batang horizontal murni CSS.
defineProps({
  items: { type: Array, required: true }, // [{ label, value, percent, sub?, highlight? }]
})
</script>

<template>
  <ul class="osk-bars list-unstyled mb-0">
    <li v-for="item in items" :key="item.label">
      <div class="d-flex justify-content-between align-items-baseline gap-2 mb-1">
        <span class="fw-semibold">{{ item.label }}<small v-if="item.sub" class="text-muted fw-normal ms-2">{{ item.sub }}</small></span>
        <span class="text-nowrap"><strong>{{ item.value }}</strong> <small class="text-muted">({{ item.percent }}%)</small></span>
      </div>
      <div class="osk-bar-track" role="presentation">
        <div class="osk-bar-fill" :class="{ 'is-top': item.highlight }" :style="{ width: `${Math.min(100, item.percent)}%` }"></div>
      </div>
    </li>
  </ul>
</template>
