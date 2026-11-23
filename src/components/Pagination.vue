<script setup>
import { computed } from 'vue'

const props = defineProps({ meta: { type: Object, default: null } }) // { current_page, last_page, total, from, to }
const emit = defineEmits(['change'])

const pages = computed(() => {
  if (!props.meta) return []
  const { current_page: current, last_page: last } = props.meta
  const list = []
  for (let p = Math.max(1, current - 2); p <= Math.min(last, current + 2); p++) list.push(p)
  return list
})
</script>

<template>
  <div v-if="meta && meta.total > 0" class="d-flex flex-wrap justify-content-between align-items-center gap-2 mt-3">
    <small class="text-muted">Menampilkan {{ meta.from }}&ndash;{{ meta.to }} dari {{ meta.total }}</small>
    <nav v-if="meta.last_page > 1" aria-label="Halaman">
      <ul class="pagination pagination-sm mb-0">
        <li class="page-item" :class="{ disabled: meta.current_page === 1 }">
          <button type="button" class="page-link" aria-label="Sebelumnya" @click="emit('change', meta.current_page - 1)">&laquo;</button>
        </li>
        <li v-for="p in pages" :key="p" class="page-item" :class="{ active: p === meta.current_page }">
          <button type="button" class="page-link" @click="emit('change', p)">{{ p }}</button>
        </li>
        <li class="page-item" :class="{ disabled: meta.current_page === meta.last_page }">
          <button type="button" class="page-link" aria-label="Berikutnya" @click="emit('change', meta.current_page + 1)">&raquo;</button>
        </li>
      </ul>
    </nav>
  </div>
</template>
