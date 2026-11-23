<script setup>
import { computed } from 'vue'
import { ABSENCE_REASONS } from '@/constants'
import BarList from './BarList.vue'
import DonutChart from './DonutChart.vue'

const props = defineProps({
  turnout: { type: Object, required: true },
  projected: { type: Boolean, default: false }, // true = belum final, angka masih berjalan
})

const pct = (value, total) => (total > 0 ? Math.round((value / total) * 10000) / 100 : 0)

const golput = computed(() => {
  const t = props.turnout
  return {
    total: t.golput_total,
    notAttending: t.golput.tidak_hadir.total,
    attending: t.golput.hadir.total,
    noRecord: t.golput.tanpa_catatan.total,
    reasons: Object.entries(t.golput.tidak_hadir.reasons)
      .filter(([, count]) => count > 0)
      .map(([key, count]) => ({
        label: ABSENCE_REASONS[key] ?? key,
        value: count,
        percent: pct(count, t.golput.tidak_hadir.total),
      })),
  }
})

const donut = computed(() => [
  { label: 'Memilih', value: props.turnout.voted, color: 'var(--osk-primary)' },
  { label: 'Golput hadir', value: golput.value.attending, color: 'var(--osk-accent)' },
  { label: 'Golput tidak hadir', value: golput.value.notAttending, color: '#94a3b8' },
  { label: 'Golput tanpa catatan', value: golput.value.noRecord, color: '#cbd5e1' },
])

const categories = computed(() => [
  { label: 'Golput tidak hadir', value: golput.value.notAttending, percent: pct(golput.value.notAttending, props.turnout.registered) },
  { label: 'Golput hadir', value: golput.value.attending, percent: pct(golput.value.attending, props.turnout.registered) },
  { label: 'Golput tanpa catatan', value: golput.value.noRecord, percent: pct(golput.value.noRecord, props.turnout.registered) },
])
</script>

<template>
  <section class="card">
    <div class="card-body">
      <div class="d-flex flex-wrap align-items-center gap-2 mb-3">
        <h2 class="h5 mb-0">Partisipasi dan golput</h2>
        <span v-if="projected" class="badge text-bg-warning">Proyeksi, belum final</span>
      </div>
      <div class="row g-4 align-items-center">
        <div class="col-md-5 d-flex flex-column align-items-center gap-3">
          <DonutChart :segments="donut" :size="190">
            <div class="h3 mb-0">{{ turnout.turnout_percent }}%</div>
            <small class="text-muted">partisipasi</small>
          </DonutChart>
          <ul class="osk-legend list-unstyled mb-0 small">
            <li v-for="s in donut" :key="s.label"><i class="osk-dot" :style="{ background: s.color }"></i>{{ s.label }}: <strong>{{ s.value }}</strong></li>
          </ul>
        </div>

        <div class="col-md-7">
          <div class="row g-3 mb-3">
            <div class="col-6"><div class="osk-mini"><small>Pemilih terdaftar</small><strong>{{ turnout.registered }}</strong></div></div>
            <div class="col-6"><div class="osk-mini"><small>Sudah memilih</small><strong>{{ turnout.voted }}</strong></div></div>
            <div class="col-12"><div class="osk-mini"><small>Golput (tidak memilih sampai waktu berakhir)</small><strong>{{ golput.total }}</strong></div></div>
          </div>

          <h3 class="h6">Rincian golput</h3>
          <BarList :items="categories" />

          <template v-if="golput.reasons.length">
            <h3 class="h6 mt-4">Alasan ketidakhadiran</h3>
            <BarList :items="golput.reasons" />
            <p class="text-muted small mt-2 mb-0">Alasan hanya untuk pelaporan dan tidak mengubah fakta bahwa pemilih tidak memilih.</p>
          </template>
        </div>
      </div>
    </div>
  </section>
</template>
