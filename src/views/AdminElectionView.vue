<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import BaseModal from '@/components/BaseModal.vue'
import ErrorAlert from '@/components/ErrorAlert.vue'
import LoadingState from '@/components/LoadingState.vue'
import PageHeader from '@/components/PageHeader.vue'
import StatusBadge from '@/components/StatusBadge.vue'
import { formatWibDateTime, isoToWibInput, wibInputToIso } from '@/composables/useDateTime'
import { usePolling } from '@/composables/usePolling'
import { useToast } from '@/composables/useToast'
import { SCHOOL_NAME } from '@/config'
import { adminService } from '@/services/adminService'

const toast = useToast()

const loading = ref(true)
const error = ref('')
const election = ref(null)

async function load({ silent = false } = {}) {
  if (!silent) loading.value = true
  try {
    election.value = await adminService.currentElection()
    error.value = ''
  } catch (e) {
    error.value = e.message
  } finally {
    loading.value = false
  }
}
onMounted(() => load())
usePolling(() => load({ silent: true }), 15000)

const needsNew = computed(() => !election.value || election.value.status === 'final')

const nextStep = computed(
  () =>
    ({
      belum_dimulai: 'Pastikan data pemilih dan pasangan calon sudah lengkap sebelum pemilihan dibuka.',
      berlangsung: 'Pantau partisipasi di Dashboard dan catat kehadiran di menu Kehadiran. Dalam kondisi khusus, pemilihan dapat diakhiri lebih awal.',
      selesai: 'Waktu habis. Lanjutkan ke menu Hasil untuk melakukan finalisasi.',
      final: 'Pemilihan telah final. Publikasikan hasil lewat menu Hasil.',
    })[election.value?.status] ?? '',
)

// ---------- Buat pemilihan ----------
const createForm = reactive({ name: `Pemilihan Ketua dan Wakil Ketua OSIS ${SCHOOL_NAME} ${new Date().getFullYear()}`, start: '', end: '' })
const createError = ref('')
const creating = ref(false)

async function createElection() {
  createError.value = ''
  if (!createForm.name.trim() || !createForm.start || !createForm.end) {
    createError.value = 'Nama, waktu mulai, dan waktu berakhir wajib diisi.'
    return
  }
  if (createForm.end <= createForm.start) {
    createError.value = 'Waktu berakhir harus setelah waktu mulai.'
    return
  }
  creating.value = true
  try {
    await adminService.createElection({
      name: createForm.name.trim(),
      start_at: wibInputToIso(createForm.start),
      end_at: wibInputToIso(createForm.end),
    })
    toast.success('Pemilihan dibuat. Daftar pemilih tetap diambil dari pemilih aktif.')
    createForm.start = ''
    createForm.end = ''
    await load()
  } catch (e) {
    createError.value = e.firstError?.('end_at') ?? e.firstError?.('start_at') ?? e.message
  } finally {
    creating.value = false
  }
}

// ---------- Ubah jadwal ----------
const editOpen = ref(false)
const editForm = reactive({ name: '', start: '', end: '' })
const editError = ref('')
const saving = ref(false)

function openEdit() {
  editForm.name = election.value.name
  editForm.start = isoToWibInput(election.value.start_at)
  editForm.end = isoToWibInput(election.value.end_at)
  editError.value = ''
  editOpen.value = true
}

async function saveEdit() {
  editError.value = ''
  if (!editForm.name.trim() || !editForm.start || !editForm.end) {
    editError.value = 'Semua kolom wajib diisi.'
    return
  }
  if (editForm.end <= editForm.start) {
    editError.value = 'Waktu berakhir harus setelah waktu mulai.'
    return
  }
  saving.value = true
  try {
    await adminService.updateElection(election.value.id, {
      name: editForm.name.trim(),
      start_at: wibInputToIso(editForm.start),
      end_at: wibInputToIso(editForm.end),
    })
    editOpen.value = false
    toast.success('Jadwal diperbarui.')
    await load()
  } catch (e) {
    editError.value = e.message
  } finally {
    saving.value = false
  }
}

// ---------- Akhiri / percepat ----------
const endOpen = ref(false)
const endForm = reactive({ mode: 'now', end: '', reason: '' })
const endError = ref('')
const ending = ref(false)

function openEnd() {
  endForm.mode = 'now'
  endForm.end = ''
  endForm.reason = ''
  endError.value = ''
  endOpen.value = true
}

async function saveEnd() {
  endError.value = ''
  const reason = endForm.reason.trim()
  if (reason.length < 5) {
    endError.value = 'Alasan wajib diisi (minimal 5 karakter).'
    return
  }

  let endAt = null
  if (endForm.mode === 'schedule') {
    if (!endForm.end) {
      endError.value = 'Waktu berakhir baru wajib diisi.'
      return
    }
    endAt = wibInputToIso(endForm.end)
    const target = new Date(endAt).getTime()
    if (target <= Date.now()) {
      endError.value = 'Waktu baru harus di masa depan. Untuk berhenti sekarang pilih "Akhiri sekarang".'
      return
    }
    if (target >= Date.parse(election.value.end_at)) {
      endError.value = 'Waktu baru harus lebih awal dari waktu berakhir saat ini.'
      return
    }
  }

  ending.value = true
  try {
    await adminService.endElection(election.value.id, { reason, ...(endAt ? { end_at: endAt } : {}) })
    endOpen.value = false
    toast.success(endAt ? 'Waktu berakhir dipercepat.' : 'Pemilihan diakhiri. Finalisasi dapat dilakukan di menu Hasil.')
    await load()
  } catch (e) {
    endError.value = e.firstError?.('reason') ?? e.firstError?.('end_at') ?? e.message
  } finally {
    ending.value = false
  }
}

// ---------- Hapus pemilihan ----------
const deleteOpen = ref(false)
const deleteConfirm = ref('')
const deleteError = ref('')
const deleting = ref(false)

function openDelete() {
  deleteConfirm.value = ''
  deleteError.value = ''
  deleteOpen.value = true
}

async function removeElection() {
  deleteError.value = ''
  if (deleteConfirm.value !== 'HAPUS') {
    deleteError.value = 'Ketik HAPUS (huruf kapital) untuk mengonfirmasi.'
    return
  }
  deleting.value = true
  try {
    await adminService.deleteElection(election.value.id, { confirm: deleteConfirm.value })
    deleteOpen.value = false
    toast.success('Pemilihan dan seluruh datanya dihapus. Anda dapat membuat pemilihan baru.')
    await load()
  } catch (e) {
    deleteError.value = e.firstError?.('confirm') ?? e.message
  } finally {
    deleting.value = false
  }
}

// ---------- Perpanjang ----------
const extendOpen = ref(false)
const extendEnd = ref('')
const extendError = ref('')
const extending = ref(false)

function openExtend() {
  extendEnd.value = isoToWibInput(election.value.end_at)
  extendError.value = ''
  extendOpen.value = true
}

async function saveExtend() {
  extendError.value = ''
  if (!extendEnd.value) {
    extendError.value = 'Waktu berakhir baru wajib diisi.'
    return
  }
  if (extendEnd.value <= isoToWibInput(election.value.end_at)) {
    extendError.value = 'Waktu baru harus lebih akhir dari waktu berakhir saat ini.'
    return
  }
  extending.value = true
  try {
    await adminService.extendElection(election.value.id, wibInputToIso(extendEnd.value))
    extendOpen.value = false
    toast.success('Waktu pemilihan diperpanjang.')
    await load()
  } catch (e) {
    extendError.value = e.message
  } finally {
    extending.value = false
  }
}
</script>

<template>
  <PageHeader title="Periode Pemilihan" subtitle="Atur jadwal, perpanjang waktu, dan pantau status pemilihan." />

  <LoadingState v-if="loading" />
  <ErrorAlert v-else-if="error && !election" :message="error" @retry="load()" />

  <div v-else class="d-grid gap-4">
    <!-- Pemilihan saat ini -->
    <div v-if="election" class="card">
      <div class="card-body">
        <div class="d-flex flex-wrap justify-content-between align-items-start gap-2 mb-3">
          <h2 class="h5 mb-0">{{ election.name }}</h2>
          <StatusBadge :status="election.status" />
        </div>
        <dl class="osk-dl mb-3">
          <dt>Mulai</dt><dd>{{ formatWibDateTime(election.start_at) }}</dd>
          <dt>Berakhir</dt><dd>{{ formatWibDateTime(election.end_at) }}</dd>
          <dt>Pemilih terdaftar</dt><dd>{{ election.registered }}</dd>
          <dt>Sudah memilih</dt><dd>{{ election.voted }}</dd>
          <dt>Difinalisasi</dt><dd>{{ election.finalized_at ? formatWibDateTime(election.finalized_at) : 'Belum' }}</dd>
          <dt>Hasil dipublikasikan</dt><dd>{{ election.results_published_at ? formatWibDateTime(election.results_published_at) : 'Belum' }}</dd>
        </dl>
        <div class="alert alert-info small mb-3"><i class="bi bi-info-circle me-1"></i>{{ nextStep }}</div>
        <div class="d-flex flex-wrap gap-2">
          <button v-if="election.status === 'belum_dimulai'" type="button" class="btn btn-outline-primary" @click="openEdit">
            <i class="bi bi-pencil me-1"></i>Ubah jadwal
          </button>
          <button v-if="election.status !== 'final'" type="button" class="btn btn-primary" @click="openExtend">
            <i class="bi bi-clock-history me-1"></i>Perpanjang waktu
          </button>
          <button v-if="election.status === 'berlangsung'" type="button" class="btn btn-outline-danger" @click="openEnd">
            <i class="bi bi-stop-circle me-1"></i>Akhiri lebih awal
          </button>
          <button v-if="election.status !== 'berlangsung'" type="button" class="btn btn-outline-danger" @click="openDelete">
            <i class="bi bi-trash me-1"></i>Hapus pemilihan
          </button>
          <RouterLink :to="{ name: 'admin-results' }" class="btn btn-outline-secondary"><i class="bi bi-bar-chart-line me-1"></i>Hasil dan finalisasi</RouterLink>
        </div>
        <p class="text-muted small mt-3 mb-0">Jadwal hanya dapat diubah sebelum pemilihan dimulai. Setelah itu gunakan perpanjangan. Waktu ditampilkan dalam WIB.</p>
      </div>
    </div>

    <!-- Buat pemilihan baru -->
    <div v-if="needsNew" class="card">
      <div class="card-body">
        <h2 class="h5">Buat pemilihan baru</h2>
        <p class="text-muted small">Daftar pemilih tetap diambil dari seluruh pemilih aktif pada saat pemilihan dibuat. Pastikan data pemilih sudah lengkap.</p>
        <div v-if="createError" class="alert alert-danger small" role="alert">{{ createError }}</div>
        <form class="row g-3" novalidate @submit.prevent="createElection">
          <div class="col-12">
            <label for="c-name" class="form-label">Nama pemilihan</label>
            <input id="c-name" v-model="createForm.name" class="form-control" maxlength="150" />
          </div>
          <div class="col-md-6">
            <label for="c-start" class="form-label">Mulai (WIB)</label>
            <input id="c-start" v-model="createForm.start" type="datetime-local" class="form-control" />
          </div>
          <div class="col-md-6">
            <label for="c-end" class="form-label">Berakhir (WIB)</label>
            <input id="c-end" v-model="createForm.end" type="datetime-local" class="form-control" />
          </div>
          <div class="col-12">
            <button type="submit" class="btn btn-primary" :disabled="creating">
              <span v-if="creating" class="spinner-border spinner-border-sm me-2" aria-hidden="true"></span>Buat pemilihan
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>

  <!-- Ubah jadwal -->
  <BaseModal v-model="editOpen" title="Ubah jadwal pemilihan" :persistent="saving">
    <div v-if="editError" class="alert alert-danger small">{{ editError }}</div>
    <div class="mb-3"><label for="e-name" class="form-label">Nama pemilihan</label><input id="e-name" v-model="editForm.name" class="form-control" maxlength="150" /></div>
    <div class="mb-3"><label for="e-start" class="form-label">Mulai (WIB)</label><input id="e-start" v-model="editForm.start" type="datetime-local" class="form-control" /></div>
    <div><label for="e-end" class="form-label">Berakhir (WIB)</label><input id="e-end" v-model="editForm.end" type="datetime-local" class="form-control" /></div>
    <template #footer>
      <button type="button" class="btn btn-light" :disabled="saving" @click="editOpen = false">Batal</button>
      <button type="button" class="btn btn-primary" :disabled="saving" @click="saveEdit">
        <span v-if="saving" class="spinner-border spinner-border-sm me-2" aria-hidden="true"></span>Simpan
      </button>
    </template>
  </BaseModal>

  <!-- Perpanjang -->
  <BaseModal v-model="extendOpen" title="Perpanjang waktu pemilihan" size="sm" :persistent="extending">
    <div v-if="extendError" class="alert alert-danger small">{{ extendError }}</div>
    <p class="small text-muted">Waktu berakhir saat ini: <strong>{{ election ? formatWibDateTime(election.end_at) : '' }}</strong>. Golput dihitung ulang saat finalisasi mengikuti waktu terbaru.</p>
    <label for="x-end" class="form-label">Berakhir baru (WIB)</label>
    <input id="x-end" v-model="extendEnd" type="datetime-local" class="form-control" />
    <template #footer>
      <button type="button" class="btn btn-light" :disabled="extending" @click="extendOpen = false">Batal</button>
      <button type="button" class="btn btn-primary" :disabled="extending" @click="saveExtend">
        <span v-if="extending" class="spinner-border spinner-border-sm me-2" aria-hidden="true"></span>Perpanjang
      </button>
    </template>
  </BaseModal>

  <!-- Akhiri / percepat -->
  <BaseModal v-model="endOpen" title="Akhiri pemilihan lebih awal" :persistent="ending">
    <div v-if="endError" class="alert alert-danger small" role="alert">{{ endError }}</div>
    <div class="alert alert-warning small">
      Pemilih yang belum memilih tidak dapat memilih lagi setelah waktu berakhir. Tindakan ini tercatat di audit log beserta alasannya.
      Selama belum difinalisasi, waktu masih dapat diperpanjang kembali.
    </div>

    <div class="mb-3">
      <div class="form-check">
        <input id="end-now" v-model="endForm.mode" type="radio" value="now" class="form-check-input" />
        <label for="end-now" class="form-check-label">Akhiri sekarang</label>
      </div>
      <div class="form-check">
        <input id="end-schedule" v-model="endForm.mode" type="radio" value="schedule" class="form-check-input" />
        <label for="end-schedule" class="form-check-label">Percepat ke waktu tertentu</label>
      </div>
    </div>

    <div v-if="endForm.mode === 'schedule'" class="mb-3">
      <label for="end-time" class="form-label">Berakhir pada (WIB)</label>
      <input id="end-time" v-model="endForm.end" type="datetime-local" class="form-control" />
      <div class="form-text">Saat ini dijadwalkan berakhir {{ election ? formatWibDateTime(election.end_at) : '' }}.</div>
    </div>

    <div>
      <label for="end-reason" class="form-label">Alasan <span class="text-danger">*</span></label>
      <textarea id="end-reason" v-model="endForm.reason" class="form-control" rows="3" maxlength="500" placeholder="Contoh: seluruh pemilih sudah memilih / gangguan teknis"></textarea>
    </div>

    <template #footer>
      <button type="button" class="btn btn-light" :disabled="ending" @click="endOpen = false">Batal</button>
      <button type="button" class="btn btn-danger" :disabled="ending" @click="saveEnd">
        <span v-if="ending" class="spinner-border spinner-border-sm me-2" aria-hidden="true"></span>{{ endForm.mode === 'now' ? 'Akhiri sekarang' : 'Percepat' }}
      </button>
    </template>
  </BaseModal>

  <!-- Hapus pemilihan -->
  <BaseModal v-model="deleteOpen" title="Hapus pemilihan" :persistent="deleting">
    <div v-if="deleteError" class="alert alert-danger small" role="alert">{{ deleteError }}</div>
    <div class="alert alert-danger small">
      <strong>Tindakan ini permanen dan tidak dapat dibatalkan.</strong> Yang dihapus: seluruh suara,
      catatan siapa yang sudah memilih, daftar pemilih tetap ({{ election?.registered ?? 0 }} pemilih,
      {{ election?.voted ?? 0 }} sudah memilih), pasangan calon beserta fotonya, dan periode pemilihan
      <em>{{ election?.name }}</em>. Hasil yang sudah dipublikasikan juga ikut hilang.
    </div>
    <p class="small text-muted">
      Data pemilih (siswa, guru), akun admin, dan audit log tidak ikut terhapus. Penghapusan ini dicatat di audit log.
    </p>
    <label for="del-confirm" class="form-label">Ketik <strong>HAPUS</strong> untuk melanjutkan</label>
    <input id="del-confirm" v-model="deleteConfirm" class="form-control" autocomplete="off" placeholder="HAPUS" @keyup.enter="removeElection" />

    <template #footer>
      <button type="button" class="btn btn-light" :disabled="deleting" @click="deleteOpen = false">Batal</button>
      <button type="button" class="btn btn-danger" :disabled="deleting || deleteConfirm !== 'HAPUS'" @click="removeElection">
        <span v-if="deleting" class="spinner-border spinner-border-sm me-2" aria-hidden="true"></span>Hapus permanen
      </button>
    </template>
  </BaseModal>
</template>
