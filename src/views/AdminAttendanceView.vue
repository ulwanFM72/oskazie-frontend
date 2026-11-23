<script setup>
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import BaseModal from '@/components/BaseModal.vue'
import EmptyState from '@/components/EmptyState.vue'
import ErrorAlert from '@/components/ErrorAlert.vue'
import LoadingState from '@/components/LoadingState.vue'
import PageHeader from '@/components/PageHeader.vue'
import Pagination from '@/components/Pagination.vue'
import StatCard from '@/components/StatCard.vue'
import { ABSENCE_REASONS, ATTENDANCE_STATUS } from '@/constants'
import { debounce } from '@/composables/useDebounce'
import { useToast } from '@/composables/useToast'
import { adminService } from '@/services/adminService'
import { pageMeta } from '@/utils/pagination'

const toast = useToast()

const loading = ref(true)
const error = ref('')
const election = ref(null)
const classes = ref([])
const units = ref([])

const rows = ref([])
const summary = ref({ hadir: 0, tidak_hadir: 0, belum_dicatat: 0 })
const meta = ref(null)
const page = ref(1)
const filters = reactive({ search: '', class_name: '', unit: '', attendance_status: '' })
const busyId = ref(null)

const locked = computed(() => election.value?.status === 'final')
const badge = { hadir: 'text-bg-success', tidak_hadir: 'text-bg-danger', belum_dicatat: 'text-bg-secondary' }

async function loadRows({ silent = false } = {}) {
  if (!election.value) return
  if (!silent) loading.value = true
  try {
    const r = await adminService.electionVoters(election.value.id, { ...filters, search: filters.search.trim(), page: page.value, per_page: 50 })
    rows.value = r.data
    summary.value = r.summary
    meta.value = pageMeta(r)
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
onBeforeUnmount(() => onSearch.cancel())

async function mark(row, status, extra = {}) {
  busyId.value = row.id
  try {
    await adminService.setAttendance(row.id, { status, ...extra })
    toast.success(`${row.voter_name}: ${ATTENDANCE_STATUS[status].toLowerCase()}.`)
    await loadRows({ silent: true })
  } catch (e) {
    toast.error(e.message)
    await loadRows({ silent: true })
  } finally {
    busyId.value = null
  }
}

// ---------- Alasan tidak hadir ----------
const reasonOpen = ref(false)
const reasonRow = ref(null)
const reasonForm = reactive({ reason: 'sakit', note: '' })
const reasonError = ref('')

function askReason(row) {
  reasonRow.value = row
  reasonForm.reason = row.absence_reason ?? 'sakit'
  reasonForm.note = row.absence_note ?? ''
  reasonError.value = ''
  reasonOpen.value = true
}

async function confirmReason() {
  if (!reasonForm.reason) {
    reasonError.value = 'Pilih alasan ketidakhadiran.'
    return
  }
  const row = reasonRow.value
  reasonOpen.value = false
  await mark(row, 'tidak_hadir', { absence_reason: reasonForm.reason, absence_note: reasonForm.note.trim() || null })
}
</script>

<template>
  <PageHeader title="Kehadiran" subtitle="Catat kehadiran pemilih. Pemilih yang sudah memilih otomatis tercatat hadir." />

  <LoadingState v-if="loading" />
  <ErrorAlert v-else-if="error && !rows.length" :message="error" @retry="init" />
  <EmptyState v-else-if="!election" icon="bi-calendar-plus" title="Belum ada pemilihan" text="Buat pemilihan terlebih dahulu di menu Periode Pemilihan.">
    <RouterLink :to="{ name: 'admin-election' }" class="btn btn-primary btn-sm">Buat pemilihan</RouterLink>
  </EmptyState>

  <template v-else>
    <div v-if="locked" class="alert alert-warning small"><i class="bi bi-lock me-1"></i>Pemilihan sudah final. Kehadiran tidak dapat diubah.</div>

    <div class="row g-3 mb-3">
      <div class="col-4"><StatCard icon="bi-person-check" tone="success" label="Hadir" :value="summary.hadir" /></div>
      <div class="col-4"><StatCard icon="bi-person-x" tone="warning" label="Tidak hadir" :value="summary.tidak_hadir" /></div>
      <div class="col-4"><StatCard icon="bi-person-dash" tone="muted" label="Belum dicatat" :value="summary.belum_dicatat" /></div>
    </div>

    <div class="card mb-3">
      <div class="card-body">
        <div class="row g-3">
          <div class="col-md-4"><label for="a-search" class="form-label small">Cari nama</label><input id="a-search" v-model="filters.search" class="form-control" placeholder="Ketik nama" @input="onSearch" /></div>
          <div class="col-md-3">
            <label for="a-class" class="form-label small">Kelas</label>
            <select id="a-class" v-model="filters.class_name" class="form-select"><option value="">Semua</option><option v-for="c in classes" :key="c" :value="c">{{ c }}</option></select>
          </div>
          <div class="col-md-2">
            <label for="a-unit" class="form-label small">Unit</label>
            <select id="a-unit" v-model="filters.unit" class="form-select"><option value="">Semua</option><option v-for="u in units" :key="u" :value="u">{{ u }}</option></select>
          </div>
          <div class="col-md-3">
            <label for="a-status" class="form-label small">Status</label>
            <select id="a-status" v-model="filters.attendance_status" class="form-select"><option value="">Semua</option><option v-for="(label, key) in ATTENDANCE_STATUS" :key="key" :value="key">{{ label }}</option></select>
          </div>
        </div>
      </div>
    </div>

    <EmptyState v-if="!rows.length" icon="bi-people" title="Tidak ada data" text="Ubah filter pencarian." />
    <div v-else class="card">
      <div class="table-responsive">
        <table class="table table-hover align-middle mb-0">
          <thead><tr><th>Nama</th><th>Kelas / Unit</th><th>Kehadiran</th><th>Memilih</th><th class="text-end">Catat</th></tr></thead>
          <tbody>
            <tr v-for="r in rows" :key="r.id">
              <td class="fw-semibold">{{ r.voter_name }}</td>
              <td>{{ r.class_name ?? r.unit ?? '-' }}</td>
              <td>
                <span class="badge" :class="badge[r.attendance_status]">{{ ATTENDANCE_STATUS[r.attendance_status] }}</span>
                <div v-if="r.absence_reason" class="small text-muted">{{ ABSENCE_REASONS[r.absence_reason] }}</div>
              </td>
              <td><i v-if="r.has_voted" class="bi bi-check-circle-fill text-success" title="Sudah memilih"></i><i v-else class="bi bi-dash text-muted"></i></td>
              <td class="text-end text-nowrap">
                <span v-if="r.has_voted" class="small text-muted">Sudah memilih</span>
                <div v-else class="btn-group btn-group-sm" role="group" :aria-label="`Catat kehadiran ${r.voter_name}`">
                  <button type="button" class="btn btn-outline-success" :disabled="locked || busyId === r.id || r.attendance_status === 'hadir'" @click="mark(r, 'hadir')">Hadir</button>
                  <button type="button" class="btn btn-outline-danger" :disabled="locked || busyId === r.id" @click="askReason(r)">Tidak hadir</button>
                  <button type="button" class="btn btn-outline-secondary" :disabled="locked || busyId === r.id || r.attendance_status === 'belum_dicatat'" title="Kembalikan ke belum dicatat" @click="mark(r, 'belum_dicatat')"><i class="bi bi-arrow-counterclockwise"></i><span class="visually-hidden">Reset</span></button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
    <Pagination :meta="meta" @change="(p) => { page = p; loadRows({ silent: true }) }" />
  </template>

  <BaseModal v-model="reasonOpen" size="sm" title="Alasan tidak hadir">
    <p v-if="reasonRow" class="fw-semibold mb-3">{{ reasonRow.voter_name }}</p>
    <div v-if="reasonError" class="alert alert-danger small">{{ reasonError }}</div>
    <div class="mb-3">
      <label for="r-reason" class="form-label">Alasan</label>
      <select id="r-reason" v-model="reasonForm.reason" class="form-select"><option v-for="(label, key) in ABSENCE_REASONS" :key="key" :value="key">{{ label }}</option></select>
    </div>
    <div>
      <label for="r-note" class="form-label">Catatan <small class="text-muted">(opsional)</small></label>
      <textarea id="r-note" v-model="reasonForm.note" class="form-control" rows="2" maxlength="500"></textarea>
    </div>
    <template #footer>
      <button type="button" class="btn btn-light" @click="reasonOpen = false">Batal</button>
      <button type="button" class="btn btn-primary" @click="confirmReason">Simpan</button>
    </template>
  </BaseModal>
</template>
