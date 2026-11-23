<script setup>
import { computed } from 'vue'
import { formatWibDateTime } from '@/composables/useDateTime'
import TurnoutReport from './TurnoutReport.vue'

// Bentuk data sama untuk halaman publik dan halaman admin: { election, turnout, results }.
const props = defineProps({ data: { type: Object, required: true } })

const results = computed(() => props.data.results)
const candidates = computed(() =>
  results.value.candidates.map((c) => ({ ...c, highlight: c.rank === 1 && results.value.total_votes > 0 })),
)
</script>

<template>
  <div class="d-grid gap-4">
    <section class="card">
      <div class="card-body">
        <h2 class="h5">{{ data.election.name }}</h2>
        <p class="text-muted small mb-0">
          Pemilihan {{ formatWibDateTime(data.election.start_at) }} sampai {{ formatWibDateTime(data.election.end_at) }}.
          Hasil sah berapa pun tingkat partisipasinya.
        </p>
      </div>
    </section>

    <section class="card">
      <div class="card-body">
        <h2 class="h5 mb-3">Perolehan suara</h2>
        <div class="d-grid gap-3">
          <div v-for="c in candidates" :key="c.candidate_id" class="osk-result-row" :class="{ 'is-top': c.highlight }">
            <span class="osk-rank">{{ c.rank }}</span>
            <div class="flex-grow-1">
              <div class="d-flex justify-content-between flex-wrap gap-2">
                <div>
                  <span class="badge text-bg-primary me-2">No. {{ c.number_order }}</span>
                  <span class="fw-bold">{{ c.chairman_name }}</span>
                  <span class="text-muted"> &amp; {{ c.vice_name }}</span>
                </div>
                <div class="text-nowrap"><strong>{{ c.votes }}</strong> suara <small class="text-muted">({{ c.percent }}%)</small></div>
              </div>
              <div class="osk-bar-track mt-2" role="presentation">
                <div class="osk-bar-fill" :class="{ 'is-top': c.highlight }" :style="{ width: `${Math.min(100, c.percent)}%` }"></div>
              </div>
            </div>
          </div>
        </div>
        <p class="text-muted small mt-3 mb-0">Total suara masuk: <strong>{{ results.total_votes }}</strong></p>
      </div>
    </section>

    <TurnoutReport v-if="data.turnout" :turnout="data.turnout" />
  </div>
</template>
