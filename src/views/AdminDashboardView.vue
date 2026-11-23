<script setup>
import { computed, onMounted, ref } from 'vue'
import BarList from '@/components/BarList.vue'
import DonutChart from '@/components/DonutChart.vue'
import EmptyState from '@/components/EmptyState.vue'
import ErrorAlert from '@/components/ErrorAlert.vue'
import LoadingState from '@/components/LoadingState.vue'
import PageHeader from '@/components/PageHeader.vue'
import StatCard from '@/components/StatCard.vue'
import StatusBadge from '@/components/StatusBadge.vue'
import { formatWibDateTime } from '@/composables/useDateTime'
import { usePolling } from '@/composables/usePolling'
import { adminService } from '@/services/adminService'

const loading = ref(true)
const error = ref('')
const data = ref(null)
const updatedAt = ref(null)

async function load({ silent = false } = {}) {
  if (!silent) loading.value = true
  try {
    data.value = await adminService.dashboard()
    updatedAt.value = new Date().toISOString()
    error.value = ''
  } catch (e) {
    error.value = e.message
  } finally {
    loading.value = false
  }
}

onMounted(() => load())
usePolling(() => load({ silent: true }), 15000)

const bars = (rows) => rows.map((r) => ({ label: r.name, value: `${r.voted}/${r.registered}`, percent: r.percent }))

const donut = computed(() => [
  { label: 'Sudah memilih', value: data.value.totals.voted, color: 'var(--osk-primary)' },
  { label: data.value.is_final ? 'Golput' : 'Belum memilih', value: data.value.totals.not_voted, color: 'var(--osk-border)' },
])
</script>

<template>
  <PageHeader title="Dashboard" subtitle="Ringkasan partisipasi pemilihan.">
    <template #actions>
      <button type="button" class="btn btn-outline-primary btn-sm" @click="load()"><i class="bi bi-arrow-clockwise me-1"></i>Muat ulang</button>
    </template>
  </PageHeader>

  <LoadingState v-if="loading" />
  <ErrorAlert v-else-if="error && !data" :message="error" @retry="load()" />
  <EmptyState v-else-if="!data" icon="bi-calendar-plus" title="Belum ada pemilihan" text="Buat pemilihan terlebih dahulu di menu Periode Pemilihan.">
    <RouterLink :to="{ name: 'admin-election' }" class="btn btn-primary btn-sm">Buat pemilihan</RouterLink>
  </EmptyState>

  <div v-else class="d-grid gap-4">
    <div v-if="error" class="alert alert-warning small mb-0">Gagal memperbarui data: {{ error }}</div>

    <div class="card">
      <div class="card-body d-flex flex-wrap align-items-center justify-content-between gap-2">
        <div>
          <div class="fw-semibold">{{ data.election.name }}</div>
          <small class="text-muted">{{ formatWibDateTime(data.election.start_at) }} &ndash; {{ formatWibDateTime(data.election.end_at) }}</small>
        </div>
        <StatusBadge :status="data.election.status" />
      </div>
    </div>

    <div class="row g-3">
      <div class="col-6 col-xl-3"><StatCard icon="bi-people" label="Total pemilih" :value="data.totals.registered" /></div>
      <div class="col-6 col-xl-3"><StatCard icon="bi-check2-circle" tone="success" label="Sudah memilih" :value="data.totals.voted" :hint="`${data.totals.turnout_percent}% partisipasi`" /></div>
      <div class="col-6 col-xl-3"><StatCard icon="bi-hourglass-split" tone="warning" :label="data.is_final ? 'Golput' : 'Belum memilih'" :value="data.totals.not_voted" /></div>
      <div class="col-6 col-xl-3"><StatCard icon="bi-person-badge" tone="muted" label="Pasangan calon" :value="data.candidates_count" /></div>
    </div>

    <div class="row g-4">
      <div class="col-lg-5">
        <div class="card h-100">
          <div class="card-body d-flex flex-column align-items-center gap-3">
            <h2 class="h6 align-self-start mb-0">Partisipasi</h2>
            <DonutChart :segments="donut" :size="170">
              <div class="h3 mb-0">{{ data.totals.turnout_percent }}%</div>
              <small class="text-muted">memilih</small>
            </DonutChart>
          </div>
        </div>
      </div>
      <div class="col-lg-7">
        <div class="card h-100">
          <div class="card-body">
            <div class="d-flex justify-content-between align-items-center mb-3">
              <h2 class="h6 mb-0">Ringkasan kehadiran</h2>
              <RouterLink :to="{ name: 'admin-attendance' }" class="small">Kelola kehadiran</RouterLink>
            </div>
            <div class="row g-3">
              <div class="col-4"><div class="osk-mini"><small>Hadir</small><strong>{{ data.attendance.hadir }}</strong></div></div>
              <div class="col-4"><div class="osk-mini"><small>Tidak hadir</small><strong>{{ data.attendance.tidak_hadir }}</strong></div></div>
              <div class="col-4"><div class="osk-mini"><small>Belum dicatat</small><strong>{{ data.attendance.belum_dicatat }}</strong></div></div>
            </div>
            <p class="text-muted small mt-3 mb-0">Pemilih yang berhasil memilih otomatis tercatat hadir.</p>
          </div>
        </div>
      </div>
    </div>

    <div class="row g-4">
      <div class="col-lg-6">
        <div class="card h-100">
          <div class="card-body">
            <h2 class="h6 mb-3">Partisipasi per kelas</h2>
            <div v-if="data.by_class.length" class="osk-scroll"><BarList :items="bars(data.by_class)" /></div>
            <div v-else class="text-muted small">Belum ada data siswa.</div>
          </div>
        </div>
      </div>
      <div class="col-lg-6">
        <div class="card h-100">
          <div class="card-body">
            <h2 class="h6 mb-3">Partisipasi guru dan staf</h2>
            <div v-if="data.by_unit.length" class="osk-scroll"><BarList :items="bars(data.by_unit)" /></div>
            <div v-else class="text-muted small">Belum ada data guru atau staf.</div>
          </div>
        </div>
      </div>
    </div>

    <small class="text-muted">Diperbarui otomatis setiap 15 detik. Terakhir: {{ formatWibDateTime(updatedAt) }}</small>
  </div>
</template>
