<script setup>
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import BaseModal from '@/components/BaseModal.vue'
import ConfirmDialog from '@/components/ConfirmDialog.vue'
import EmptyState from '@/components/EmptyState.vue'
import ErrorAlert from '@/components/ErrorAlert.vue'
import LoadingState from '@/components/LoadingState.vue'
import PageHeader from '@/components/PageHeader.vue'
import Pagination from '@/components/Pagination.vue'
import { debounce } from '@/composables/useDebounce'
import { useToast } from '@/composables/useToast'
import { adminService } from '@/services/adminService'
import { pageMeta } from '@/utils/pagination'

const toast = useToast()

// ---------- Daftar ----------
const loading = ref(true)
const error = ref('')
const rows = ref([])
const summary = ref({ siswa: 0, guru: 0 })
const meta = ref(null)
const page = ref(1)
const filters = reactive({ search: '', type: '', is_active: '' })

async function load() {
  loading.value = true
  error.value = ''
  try {
    const r = await adminService.voters({
      search: filters.search.trim(),
      type: filters.type,
      is_active: filters.is_active,
      page: page.value,
      per_page: 25,
    })
    rows.value = r.data
    summary.value = r.summary
    meta.value = pageMeta(r)
  } catch (e) {
    error.value = e.message
  } finally {
    loading.value = false
  }
}

const reload = () => {
  page.value = 1
  load()
}
const onSearch = debounce(reload, 350)
watch(() => [filters.type, filters.is_active], reload)
onMounted(load)
onBeforeUnmount(() => onSearch.cancel())

// ---------- Tambah / ubah ----------
const formOpen = ref(false)
const editing = ref(null)
const form = reactive({ type: 'siswa', name: '', nis: '', class_name: '', unit: '', login_key: '', is_active: true })
const apiError = ref(null)
const clientError = ref('')
const saving = ref(false)
const fieldError = (field) => apiError.value?.firstError?.(field) ?? null

function openCreate() {
  editing.value = null
  Object.assign(form, { type: 'siswa', name: '', nis: '', class_name: '', unit: '', login_key: '', is_active: true })
  apiError.value = null
  clientError.value = ''
  formOpen.value = true
}

function openEdit(voter) {
  editing.value = voter
  Object.assign(form, {
    type: voter.type,
    name: voter.name,
    nis: '',
    class_name: voter.class_name ?? '',
    unit: voter.unit ?? '',
    login_key: '',
    is_active: voter.is_active,
  })
  apiError.value = null
  clientError.value = ''
  formOpen.value = true
}

function validateForm(nis) {
  if (!form.name.trim()) return 'Nama wajib diisi.'
  if (form.type === 'siswa') {
    if (!editing.value && !/^\d{5,15}$/.test(nis)) return 'NIS harus berupa angka 5 sampai 15 digit.'
    if (editing.value && nis && !/^\d{5,15}$/.test(nis)) return 'NIS harus berupa angka 5 sampai 15 digit.'
    if (!form.class_name.trim()) return 'Kelas wajib diisi.'
  } else if (!form.unit.trim()) {
    return 'Unit wajib diisi.'
  }
  return ''
}

async function save() {
  apiError.value = null
  const nis = form.nis.replace(/\s+/g, '')
  clientError.value = validateForm(nis)
  if (clientError.value) return

  const payload = { name: form.name.trim() }
  if (form.type === 'siswa') {
    payload.class_name = form.class_name.trim()
    if (nis) payload.nis = nis
  } else {
    payload.unit = form.unit.trim()
    if (form.login_key.trim()) payload.login_key = form.login_key.trim()
  }

  saving.value = true
  try {
    if (editing.value) {
      await adminService.updateVoter(editing.value.id, { ...payload, is_active: form.is_active })
      toast.success('Data pemilih diperbarui.')
    } else {
      const created = await adminService.createVoter({ type: form.type, ...payload })
      toast.success(created.added_to_election ? 'Pemilih ditambahkan dan ikut pemilihan yang berjalan.' : 'Pemilih ditambahkan.')
    }
    formOpen.value = false
    await load()
  } catch (e) {
    apiError.value = e
  } finally {
    saving.value = false
  }
}

// ---------- Hapus ----------
const deleting = ref(null)
const deleteOpen = ref(false)
const removing = ref(false)
const deleteMessage = computed(() => (deleting.value ? `${deleting.value.name} akan dihapus. Pemilih yang sudah masuk daftar pemilih tetap tidak dapat dihapus, hanya dinonaktifkan.` : ''))

function askDelete(voter) {
  deleting.value = voter
  deleteOpen.value = true
}

async function remove() {
  removing.value = true
  try {
    await adminService.deleteVoter(deleting.value.id)
    deleteOpen.value = false
    toast.success('Pemilih dihapus.')
    await load()
  } catch (e) {
    deleteOpen.value = false
    toast.error(e.message)
  } finally {
    removing.value = false
  }
}

// ---------- Impor CSV ----------
const importOpen = ref(false)
const importType = ref('siswa')
const importFile = ref(null)
const importing = ref(false)
const checked = ref(null) // hasil pemeriksaan (dry run) yang lolos
const importProblem = ref(null) // { message, errors, error_count, total }

function openImport() {
  importType.value = 'siswa'
  importFile.value = null
  checked.value = null
  importProblem.value = null
  importOpen.value = true
}

function onFile(event) {
  importFile.value = event.target.files?.[0] ?? null
  checked.value = null
  importProblem.value = null
}

async function runImport(dryRun) {
  if (!importFile.value) {
    importProblem.value = { message: 'Pilih file CSV terlebih dahulu.', errors: [] }
    return
  }
  const fd = new FormData()
  fd.append('type', importType.value)
  fd.append('file', importFile.value)
  fd.append('dry_run', dryRun ? '1' : '0')

  importing.value = true
  importProblem.value = null
  try {
    const result = await adminService.importVoters(fd)
    if (dryRun) {
      checked.value = result
    } else {
      toast.success(`${result.imported} pemilih diimpor.`)
      importOpen.value = false
      await load()
    }
  } catch (e) {
    checked.value = null
    importProblem.value = {
      message: e.message,
      errors: Array.isArray(e.errors) ? e.errors : [],
      error_count: e.errors?.length ?? 0,
    }
  } finally {
    importing.value = false
  }
}
</script>

<template>
  <PageHeader title="Data Pemilih" :subtitle="`Siswa aktif: ${summary.siswa} · Guru dan staf aktif: ${summary.guru}`">
    <template #actions>
      <button type="button" class="btn btn-outline-primary" @click="openImport"><i class="bi bi-upload me-1"></i>Impor CSV</button>
      <button type="button" class="btn btn-primary" @click="openCreate"><i class="bi bi-plus-lg me-1"></i>Tambah pemilih</button>
    </template>
  </PageHeader>

  <div class="card mb-3">
    <div class="card-body">
      <div class="row g-3">
        <div class="col-md-6">
          <label for="v-search" class="form-label small">Cari nama</label>
          <input id="v-search" v-model="filters.search" class="form-control" placeholder="Ketik nama pemilih" @input="onSearch" />
        </div>
        <div class="col-md-3">
          <label for="v-type" class="form-label small">Jenis</label>
          <select id="v-type" v-model="filters.type" class="form-select"><option value="">Semua</option><option value="siswa">Siswa</option><option value="guru">Guru dan staf</option></select>
        </div>
        <div class="col-md-3">
          <label for="v-active" class="form-label small">Status</label>
          <select id="v-active" v-model="filters.is_active" class="form-select"><option value="">Semua</option><option value="1">Aktif</option><option value="0">Nonaktif</option></select>
        </div>
      </div>
    </div>
  </div>

  <LoadingState v-if="loading" />
  <ErrorAlert v-else-if="error" :message="error" @retry="load" />
  <EmptyState v-else-if="!rows.length" icon="bi-people" title="Tidak ada pemilih" text="Tambahkan pemilih atau impor dari file CSV." />

  <div v-else class="card">
    <div class="table-responsive">
      <table class="table table-hover align-middle mb-0">
        <thead><tr><th>Nama</th><th>Jenis</th><th>Kelas / Unit</th><th>Status</th><th class="text-end">Aksi</th></tr></thead>
        <tbody>
          <tr v-for="v in rows" :key="v.id">
            <td class="fw-semibold">{{ v.name }}</td>
            <td>{{ v.type === 'siswa' ? 'Siswa' : 'Guru/Staf' }}</td>
            <td>{{ v.class_name ?? v.unit ?? '-' }}</td>
            <td><span class="badge" :class="v.is_active ? 'text-bg-success' : 'text-bg-secondary'">{{ v.is_active ? 'Aktif' : 'Nonaktif' }}</span></td>
            <td class="text-end text-nowrap">
              <button type="button" class="btn btn-sm btn-outline-primary me-1" @click="openEdit(v)"><i class="bi bi-pencil"></i><span class="visually-hidden">Ubah {{ v.name }}</span></button>
              <button type="button" class="btn btn-sm btn-outline-danger" @click="askDelete(v)"><i class="bi bi-trash"></i><span class="visually-hidden">Hapus {{ v.name }}</span></button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
  <Pagination :meta="meta" @change="(p) => { page = p; load() }" />

  <!-- Tambah / ubah -->
  <BaseModal v-model="formOpen" :title="editing ? 'Ubah pemilih' : 'Tambah pemilih'" :persistent="saving">
    <div v-if="clientError || (apiError && !apiError.errors)" class="alert alert-danger small" role="alert">{{ clientError || apiError.message }}</div>

    <div v-if="!editing" class="mb-3">
      <label for="f-type" class="form-label">Jenis pemilih</label>
      <select id="f-type" v-model="form.type" class="form-select"><option value="siswa">Siswa</option><option value="guru">Guru atau staf</option></select>
    </div>
    <div class="mb-3">
      <label for="f-name" class="form-label">Nama lengkap</label>
      <input id="f-name" v-model="form.name" class="form-control" :class="{ 'is-invalid': fieldError('name') }" maxlength="150" />
      <div class="invalid-feedback">{{ fieldError('name') }}</div>
    </div>

    <template v-if="form.type === 'siswa'">
      <div class="mb-3">
        <label for="f-nis" class="form-label">NIS</label>
        <input id="f-nis" v-model="form.nis" class="form-control" :class="{ 'is-invalid': fieldError('nis') }" inputmode="numeric" autocomplete="off" :placeholder="editing ? 'Kosongkan jika tidak diubah' : 'Angka NIS'" />
        <div class="invalid-feedback">{{ fieldError('nis') }}</div>
        <div class="form-text">NIS tidak disimpan, hanya hash-nya, jadi tidak dapat ditampilkan kembali.</div>
      </div>
      <div class="mb-3">
        <label for="f-class" class="form-label">Kelas</label>
        <input id="f-class" v-model="form.class_name" class="form-control" :class="{ 'is-invalid': fieldError('class_name') }" maxlength="30" />
        <div class="invalid-feedback">{{ fieldError('class_name') }}</div>
      </div>
    </template>
    <template v-else>
      <div class="mb-3">
        <label for="f-unit" class="form-label">Unit</label>
        <input id="f-unit" v-model="form.unit" class="form-control" :class="{ 'is-invalid': fieldError('unit') }" maxlength="60" placeholder="Guru, TU, Kepala Sekolah" />
        <div class="invalid-feedback">{{ fieldError('unit') }}</div>
      </div>
      <div class="mb-3">
        <label for="f-key" class="form-label">Kunci login (opsional)</label>
        <input id="f-key" v-model="form.login_key" class="form-control" :class="{ 'is-invalid': fieldError('login_key') }" maxlength="150" :placeholder="editing ? 'Kosongkan jika tidak diubah' : 'Kosongkan untuk memakai nama lengkap'" />
        <div class="invalid-feedback">{{ fieldError('login_key') }}</div>
        <div class="form-text">Teks yang diketik guru saat login. Huruf besar/kecil dan tanda baca diabaikan.</div>
      </div>
    </template>

    <div v-if="editing" class="form-check">
      <input id="f-active" v-model="form.is_active" type="checkbox" class="form-check-input" />
      <label for="f-active" class="form-check-label">Aktif</label>
    </div>

    <template #footer>
      <button type="button" class="btn btn-light" :disabled="saving" @click="formOpen = false">Batal</button>
      <button type="button" class="btn btn-primary" :disabled="saving" @click="save"><span v-if="saving" class="spinner-border spinner-border-sm me-2" aria-hidden="true"></span>Simpan</button>
    </template>
  </BaseModal>

  <!-- Impor -->
  <BaseModal v-model="importOpen" title="Impor pemilih dari CSV" size="lg" :persistent="importing">
    <div class="alert alert-info small">
      <strong>Format:</strong> siswa <code>nama,nis,kelas</code> &middot; guru <code>nama,unit</code> (kolom <code>login_key</code> opsional). Di Excel, <strong>format kolom NIS sebagai Teks</strong> sebelum menyimpan sebagai CSV, karena Excel merusak angka 16 digit.
      Jika ada satu baris yang salah, tidak ada yang diimpor.
    </div>
    <div class="row g-3 mb-3">
      <div class="col-md-4">
        <label for="i-type" class="form-label">Jenis</label>
        <select id="i-type" v-model="importType" class="form-select" @change="checked = null; importProblem = null"><option value="siswa">Siswa</option><option value="guru">Guru dan staf</option></select>
      </div>
      <div class="col-md-8">
        <label for="i-file" class="form-label">File CSV</label>
        <input id="i-file" type="file" accept=".csv,text/csv,text/plain" class="form-control" @change="onFile" />
      </div>
    </div>

    <div v-if="checked" class="alert alert-success small"><i class="bi bi-check-circle me-1"></i>File lolos pemeriksaan: <strong>{{ checked.valid }}</strong> dari {{ checked.total }} baris siap diimpor.</div>

    <div v-if="importProblem" class="alert alert-danger small" role="alert">
      <div class="fw-semibold">{{ importProblem.message }}</div>
      <div v-if="importProblem.errors.length" class="osk-scroll mt-2" style="max-height: 240px">
        <table class="table table-sm mb-0">
          <thead><tr><th style="width: 80px">Baris</th><th>Masalah</th></tr></thead>
          <tbody><tr v-for="(err, i) in importProblem.errors" :key="i"><td>{{ err.line }}</td><td>{{ err.message }}</td></tr></tbody>
        </table>
      </div>
      <div v-if="importProblem.errors.length >= 100" class="mt-2">Hanya 100 masalah pertama yang ditampilkan.</div>
    </div>

    <template #footer>
      <button type="button" class="btn btn-light" :disabled="importing" @click="importOpen = false">Tutup</button>
      <button type="button" class="btn btn-outline-primary" :disabled="importing || !importFile" @click="runImport(true)">
        <span v-if="importing" class="spinner-border spinner-border-sm me-2" aria-hidden="true"></span>Periksa file
      </button>
      <button type="button" class="btn btn-primary" :disabled="importing || !checked" @click="runImport(false)">Impor sekarang</button>
    </template>
  </BaseModal>

  <ConfirmDialog v-model="deleteOpen" title="Hapus pemilih?" :message="deleteMessage" confirm-text="Ya, hapus" variant="danger" :loading="removing" @confirm="remove" />
</template>
