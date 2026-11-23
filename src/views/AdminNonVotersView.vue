<script setup>
import { onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import EmptyState from '@/components/EmptyState.vue'
import ErrorAlert from '@/components/ErrorAlert.vue'
import LoadingState from '@/components/LoadingState.vue'
import PageHeader from '@/components/PageHeader.vue'
import Pagination from '@/components/Pagination.vue'
import { ABSENCE_REASONS, ATTENDANCE_STATUS } from '@/constants'
import { debounce } from '@/composables/useDebounce'
import { formatWibDateTime } from '@/composables/useDateTime'
import { usePolling } from '@/composables/usePolling'
import { useToast } from '@/composables/useToast'
import { adminService } from '@/services/adminService'
import { downloadBlob } from '@/utils/download'
import { pageMeta } from '@/utils/pagination'

const toast = useToast()

const loading = ref(true)
const error = ref('')
const election = ref(null)
const classes = ref([])
const units = ref([])

const rows = ref([])
const meta = ref(null)
const page = ref(1)
const updatedAt = ref(null)
const exporting = ref(false)
const filters = reactive({ search: '', class_name: '', unit: '', attendance_status: '' })

const badge = { hadir: 'text-bg-success', tidak_hadir: 'text-bg-danger', belum_dicatat: 'text-bg-secondary' }
const params = () => ({ ...filters, search: filters.search.trim() })

async function loadRows({ silent = false } = {}) {
  if (!election.value) return
  if (!silent) loading.value = true
  try {
    const r = await adminService.nonVoters(election.value.id, { ...params(), page: page.value, per_page: 50 })
    rows.value = r.data
    meta.value = pageMeta(r)
    updatedAt.value = new Date().toISOString()
    error.value = ''
  } catch (e) {
    error.value = e.message
  } finally {
    loading.value = false
  }
}

async function init() {
  loading.value = true
  error.value = ''
  try {
    election.value = await adminService.currentElection()
    if (!election.value) return
    const dashboard = await adminService.dashboard()
    classes.value = dashboard?.by_class.map((c) => c.name) ?? []
    units.value = dashboard?.by_unit.map((u) => u.name) ?? []
    await loadRows()
  } catch (e) {
    error.value = e.message
  } finally {
    loading.value = false
  }
}

// Filter/halaman diperbarui diam-diam agar kolom pencarian tidak hilang saat memuat.
const reload = () => {
  page.value = 1
  loadRows({ silent: true })
}
const onSearch = debounce(reload, 350)
watch(() => [filters.class_name, filters.unit, filters.attendance_status], reload)
onMounted(init)
usePolling(() => loadRows({ silent: true }), 15000)
onBeforeUnmount(() => onSearch.cancel())

async function exportCsv() {
  exporting.value = true
  try {
    const blob = await adminService.exportNonVoters(election.value.id, params())
    downloadBlob(blob, `belum-memilih-${new Date().toISOString().slice(0, 10)}.csv`)
  } catch (e) {
    toast.error(e.message)
  } finally {
    exporting.value = false
  }
}
</script>

<template>
  <PageHeader title="Daftar Belum Memilih" subtitle="Pemilih terdaftar yang belum menggunakan hak pilih. Diperbarui otomatis.">
    <template #actions>
      <button type="button" class="btn btn-outline-primary" :disabled="exporting || !election" @click="exportCsv">
        <span v-if="exporting" class="spinner-border spinner-border-sm me-2" aria-hidden="true"></span><i v-else class="bi bi-download me-1"></i>Ekspor CSV
      </button>
    </template>
  </PageHeader>

  <LoadingState v-if="loading" />
  <ErrorAlert v-else-if="error && !rows.length" :message="error" @retry="init" />
  <EmptyState v-else-if="!election" icon="bi-calendar-plus" title="Belum ada pemilihan" text="Buat pemilihan terlebih dahulu di menu Periode Pemilihan." />

  <template v-else>
    <div class="card mb-3">
      <div class="card-body">
        <div class="row g-3 align-items-end">
          <div class="col-md-4"><label for="n-search" class="form-label small">Cari nama</label><input id="n-search" v-model="filters.search" class="form-control" placeholder="Ketik nama" @input="onSearch" /></div>
          <div class="col-md-3">
            <label for="n-class" class="form-label small">Kelas</label>
            <select id="n-class" v-model="filters.class_name" class="form-select"><option value="">Semua</option><option v-for="c in classes" :key="c" :value="c">{{ c }}</option></select>
          </div>
          <div class="col-md-2">
            <label for="n-unit" class="form-label small">Unit</label>
            <select id="n-unit" v-model="filters.unit" class="form-select"><option value="">Semua</option><option v-for="u in units" :key="u" :value="u">{{ u }}</option></select>
          </div>
          <div class="col-md-3">
            <label for="n-status" class="form-label small">Kehadiran</label>
            <select id="n-status" v-model="filters.attendance_status" class="form-select"><option value="">Semua</option><option v-for="(label, key) in ATTENDANCE_STATUS" :key="key" :value="key">{{ label }}</option></select>
          </div>
        </div>
      </div>
    </div>

    <div class="d-flex flex-wrap justify-content-between align-items-center mb-2">
      <div><span class="h4 mb-0">{{ meta?.total ?? 0 }}</span> <span class="text-muted">pemilih belum memilih</span></div>
      <small class="text-muted">Pembaruan otomatis 15 detik. Terakhir {{ formatWibDateTime(updatedAt) }}</small>
    </div>

    <EmptyState v-if="!rows.length" icon="bi-emoji-smile" title="Tidak ada yang tersisa" text="Semua pemilih pada filter ini sudah memilih." />
    <div v-else class="card">
      <div class="table-responsive">
        <table class="table table-hover align-middle mb-0">
          <thead><tr><th>Nama</th><th>Jenis</th><th>Kelas / Unit</th><th>Kehadiran</th></tr></thead>
          <tbody>
            <tr v-for="r in rows" :key="r.id">
              <td class="fw-semibold">{{ r.voter_name }}</td>
              <td>{{ r.voter_type === 'siswa' ? 'Siswa' : 'Guru/Staf' }}</td>
              <td>{{ r.class_name ?? r.unit ?? '-' }}</td>
              <td>
                <span class="badge" :class="badge[r.attendance_status]">{{ ATTENDANCE_STATUS[r.attendance_status] }}</span>
                <span v-if="r.absence_reason" class="small text-muted ms-2">{{ ABSENCE_REASONS[r.absence_reason] }}</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
    <Pagination :meta="meta" @change="(p) => { page = p; loadRows({ silent: true }) }" />
  </template>
</template>
