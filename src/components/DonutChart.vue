<script setup>
import { computed } from 'vue'

// Grafik cincin murni CSS (conic-gradient), tanpa pustaka grafik.
const props = defineProps({
  segments: { type: Array, required: true }, // [{ label, value, color }]
  size: { type: Number, default: 180 },
})

const total = computed(() => props.segments.reduce((sum, s) => sum + s.value, 0))

const background = computed(() => {
  if (total.value === 0) return 'var(--osk-border)'
  let start = 0
  const stops = props.segments
    .filter((s) => s.value > 0)
    .map((s) => {
      const end = start + (s.value / total.value) * 100
      const stop = `${s.color} ${start}% ${end}%`
      start = end
      return stop
    })
  return `conic-gradient(${stops.join(', ')})`
})
</script>

<template>
  <div class="osk-donut" :style="{ '--size': `${size}px`, background }" role="img" :aria-label="segments.map((s) => `${s.label}: ${s.value}`).join(', ')">
    <div class="osk-donut-center"><slot /></div>
  </div>
</template>
