<script setup>
import { computed, onMounted, ref } from 'vue'
import ConfirmDialog from '@/components/ConfirmDialog.vue'
import EmptyState from '@/components/EmptyState.vue'
import ErrorAlert from '@/components/ErrorAlert.vue'
import LoadingState from '@/components/LoadingState.vue'
import PageHeader from '@/components/PageHeader.vue'
import ResultsReport from '@/components/ResultsReport.vue'
import StatusBadge from '@/components/StatusBadge.vue'
import TurnoutReport from '@/components/TurnoutReport.vue'
import { formatWibDateTime } from '@/composables/useDateTime'
import { useToast } from '@/composables/useToast'
import { adminService } from '@/services/adminService'

const toast = useToast()

const loading = ref(true)
const error = ref('')
const election = ref(null)
const turnout = ref(null)
const report = ref(null) // hasil lengkap, hanya setelah finalisasi

const finalizeOpen = ref(false)
const publishOpen = ref(false)
const working = ref(false)

async function load() {
  loading.value = true
  error.value = ''
  report.value = null
  try {
    election.value = await adminService.currentElection()
    if (election.value) {
      if (election.value.status === 'final') {
        report.value = await adminService.results(election.value.id)
        turnout.value = report.value.turnout
      } else {
        turnout.value = (await adminService.turnout(election.value.id)).turnout
      }
    }
  } catch (e) {
    error.value = e.message
  } finally {
    loading.value = false
  }
}
onMounted(load)

const status = computed(() => election.value?.status)
const canFinalize = computed(() => status.value === 'selesai')
const finalizeHint = computed(
  () =>
    ({
      belum_dimulai: 'Pemilihan belum dimulai.',
      berlangsung: 'Pemilihan masih berlangsung. Finalisasi baru bisa dilakukan setelah waktu berakhir.',
    })[status.value] ?? '',
)

async function finalize() {
  working.value = true
  try {
    await adminService.finalizeElection(election.value.id)
    finalizeOpen.value = false
    toast.success('Pemilihan difinalisasi. Golput dihitung dan data dikunci.')
    await load()
  } catch (e) {
    finalizeOpen.value = false
    toast.error(e.message)
    await load()
  } finally {
    working.value = false
  }
}

async function publish() {
  working.value = true
  try {
    await adminService.publishElection(election.value.id)
    publishOpen.value = false
    toast.success('Hasil dipublikasikan.')
    await load()
  } catch (e) {
    publishOpen.value = false
    toast.error(e.message)
  } finally {
    working.value = false
  }
}
</script>

<template>
  <PageHeader title="Hasil dan Laporan" subtitle="Laporan partisipasi, golput, finalisasi, dan publikasi hasil." />

  <LoadingState v-if="loading" />
  <ErrorAlert v-else-if="error" :message="error" @retry="load" />
  <EmptyState v-else-if="!election" icon="bi-calendar-plus" title="Belum ada pemilihan" text="Buat pemilihan di menu Periode Pemilihan." />

  <div v-else class="d-grid gap-4">
    <!-- Tindakan -->
    <div class="card">
      <div class="card-body">
        <div class="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
          <div>
            <div class="fw-semibold">{{ election.name }}</div>
            <small class="text-muted">Berakhir {{ formatWibDateTime(election.end_at) }}</small>
          </div>
          <StatusBadge :status="status" />
        </div>

        <div class="d-flex flex-wrap gap-2 align-items-center">
          <button type="button" class="btn btn-danger" :disabled="!canFinalize" @click="finalizeOpen = true">
            <i class="bi bi-lock me-1"></i>Finalisasi
          </button>
          <button type="button" class="btn btn-primary" :disabled="status !== 'final' || !!election.results_published_at" @click="publishOpen = true">
            <i class="bi bi-megaphone me-1"></i>Publikasikan hasil
          </button>
          <RouterLink v-if="election.results_published_at" :to="{ name: 'public-results' }" class="btn btn-outline-primary">
            <i class="bi bi-box-arrow-up-right me-1"></i>Lihat halaman publik
          </RouterLink>
        </div>
        <p v-if="finalizeHint" class="text-muted small mt-3 mb-0">
          {{ finalizeHint }}
          <RouterLink v-if="status === 'berlangsung'" :to="{ name: 'admin-election' }">Akhiri lebih awal di Periode Pemilihan.</RouterLink>
        </p>
        <p v-else-if="status === 'final' && election.results_published_at" class="text-success small mt-3 mb-0">
          <i class="bi bi-check-circle me-1"></i>Hasil dipublikasikan {{ formatWibDateTime(election.results_published_at) }}.
        </p>
      </div>
    </div>

    <!-- Laporan -->
    <ResultsReport v-if="report" :data="report" />
    <template v-else-if="turnout">
      <div class="alert alert-info mb-0">
        <i class="bi bi-eye-slash me-1"></i>Suara per pasangan calon baru dapat dilihat setelah finalisasi. Angka golput di bawah masih berupa proyeksi.
      </div>
      <TurnoutReport :turnout="turnout" projected />
    </template>
  </div>

  <ConfirmDialog
    v-model="finalizeOpen"
    title="Finalisasi pemilihan?"
    confirm-text="Ya, finalisasi"
    variant="danger"
    :loading="working"
    @confirm="finalize"
  >
    <p>Tindakan ini <strong>tidak dapat dibatalkan</strong>. Sistem akan:</p>
    <ul class="mb-0">
      <li>menghitung golput otomatis (terdaftar dikurangi sudah memilih),</li>
      <li>mengunci kehadiran, jadwal, dan data paslon,</li>
      <li>menampilkan perolehan suara kepada admin.</li>
    </ul>
  </ConfirmDialog>

  <ConfirmDialog
    v-model="publishOpen"
    title="Publikasikan hasil?"
    message="Hasil akan tampil untuk semua orang di halaman publik. Golput hanya ditampilkan sebagai angka agregat tanpa nama."
    confirm-text="Ya, publikasikan"
    :loading="working"
    @confirm="publish"
  />
</template>
