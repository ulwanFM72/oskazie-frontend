<script setup>
defineProps({
  icon: { type: String, default: 'bi-graph-up' },
  label: { type: String, required: true },
  value: { type: [String, Number], required: true },
  hint: { type: String, default: '' },
  tone: { type: String, default: 'primary' }, // primary | success | warning | muted
})
</script>

<template>
  <div class="card osk-stat h-100">
    <div class="card-body d-flex align-items-center gap-3">
      <span class="osk-stat-icon" :class="`tone-${tone}`"><i class="bi" :class="icon"></i></span>
      <div class="min-w-0">
        <div class="text-muted small">{{ label }}</div>
        <div class="osk-stat-value">{{ value }}</div>
        <div v-if="hint" class="text-muted small">{{ hint }}</div>
      </div>
    </div>
  </div>
</template>
