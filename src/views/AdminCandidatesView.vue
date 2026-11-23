<script setup>
import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import BaseModal from '@/components/BaseModal.vue'
import CandidateCard from '@/components/CandidateCard.vue'
import CandidateDetailModal from '@/components/CandidateDetailModal.vue'
import ConfirmDialog from '@/components/ConfirmDialog.vue'
import EmptyState from '@/components/EmptyState.vue'
import ErrorAlert from '@/components/ErrorAlert.vue'
import LoadingState from '@/components/LoadingState.vue'
import PageHeader from '@/components/PageHeader.vue'
import { useToast } from '@/composables/useToast'
import { adminService } from '@/services/adminService'

const toast = useToast()

const loading = ref(true)
const error = ref('')
const election = ref(null)
const candidates = ref([])

async function load() {
  loading.value = true
  error.value = ''
  try {
    election.value = await adminService.currentElection()
    candidates.value = election.value ? await adminService.candidates() : []
  } catch (e) {
    error.value = e.message
  } finally {
    loading.value = false
  }
}
onMounted(load)

// Aturan server: tambah/hapus hanya sebelum mulai; koreksi teks dan foto sampai finalisasi.
const canAdd = computed(() => election.value?.status === 'belum_dimulai')
const canEdit = computed(() => !!election.value && election.value.status !== 'final')
const lockHint = computed(() => {
  const status = election.value?.status
  if (status === 'belum_dimulai') return ''
  if (status === 'final') return 'Pemilihan sudah final. Data paslon terkunci.'
  return 'Pemilihan sudah dimulai: paslon tidak dapat ditambah, dihapus, atau diganti nomornya. Teks dan foto masih bisa dikoreksi.'
})

// ---------- Detail ----------
const detail = ref(null)
const detailOpen = ref(false)
function openDetail(candidate) {
  detail.value = candidate
  detailOpen.value = true
}

// ---------- Form ----------
const TEXT_INPUTS = [
  { key: 'chairman_name', label: 'Nama ketua', max: 150 },
  { key: 'chairman_class', label: 'Kelas ketua', max: 30 },
  { key: 'vice_name', label: 'Nama wakil ketua', max: 150 },
  { key: 'vice_class', label: 'Kelas wakil ketua', max: 30 },
]
const TEXT_AREAS = [
  { key: 'vision', label: 'Visi' },
  { key: 'mission', label: 'Misi' },
  { key: 'work_program', label: 'Program kerja' },
  { key: 'profile', label: 'Profil singkat' },
]
const EMPTY = {
  number_order: '', chairman_name: '', chairman_class: '', vice_name: '', vice_class: '',
  vision: '', mission: '', work_program: '', profile: '', remove_photo: false,
}

const formOpen = ref(false)
const editing = ref(null)
const form = reactive({ ...EMPTY })
const photoFile = ref(null)
const photoPreview = ref('')
const apiError = ref(null)
const clientError = ref('')
const saving = ref(false)
const fieldError = (field) => apiError.value?.firstError?.(field) ?? null

function setPreview(url) {
  if (photoPreview.value) URL.revokeObjectURL(photoPreview.value)
  photoPreview.value = url
}
onBeforeUnmount(() => setPreview(''))

function resetForm() {
  Object.assign(form, EMPTY)
  photoFile.value = null
  setPreview('')
  apiError.value = null
  clientError.value = ''
}

function openCreate() {
  resetForm()
  editing.value = null
  const used = candidates.value.map((c) => c.number_order)
  form.number_order = used.length ? Math.max(...used) + 1 : 1
  formOpen.value = true
}

function openEdit(candidate) {
  resetForm()
  editing.value = candidate
  Object.assign(form, {
    number_order: candidate.number_order,
    chairman_name: candidate.chairman_name,
    chairman_class: candidate.chairman_class,
    vice_name: candidate.vice_name,
    vice_class: candidate.vice_class,
    vision: candidate.vision ?? '',
    mission: candidate.mission ?? '',
    work_program: candidate.work_program ?? '',
    profile: candidate.profile ?? '',
  })
  formOpen.value = true
}

function onPhoto(event) {
  clientError.value = ''
  const file = event.target.files?.[0] ?? null
  if (!file) {
    photoFile.value = null
    setPreview('')
    return
  }
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
    clientError.value = 'Foto harus berformat JPG, PNG, atau WebP.'
    event.target.value = ''
    return
  }
  if (file.size > 2 * 1024 * 1024) {
    clientError.value = 'Ukuran foto maksimal 2 MB.'
    event.target.value = ''
    return
  }
  photoFile.value = file
  setPreview(URL.createObjectURL(file))
}

function validateForm() {
  const n = Number(form.number_order)
  if (!Number.isInteger(n) || n < 1 || n > 99) return 'Nomor urut harus angka 1 sampai 99.'
  for (const f of TEXT_INPUTS) {
    if (!String(form[f.key]).trim()) return `${f.label} wajib diisi.`
  }
  return ''
}

function buildFormData() {
  const fd = new FormData()
  fd.append('number_order', String(form.number_order))
  for (const key of ['chairman_name', 'chairman_class', 'vice_name', 'vice_class', 'vision', 'mission', 'work_program', 'profile']) {
    fd.append(key, String(form[key] ?? '').trim())
  }
  if (photoFile.value) fd.append('photo', photoFile.value)
  else if (editing.value && form.remove_photo) fd.append('remove_photo', '1')
  return fd
}

async function save() {
  apiError.value = null
  clientError.value = validateForm()
  if (clientError.value) return

  saving.value = true
  try {
    const fd = buildFormData()
    if (editing.value) await adminService.updateCandidate(editing.value.id, fd)
    else await adminService.createCandidate(fd)
    formOpen.value = false
    toast.success('Pasangan calon disimpan.')
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
const deleteMessage = computed(() => (deleting.value ? `Pasangan calon nomor ${deleting.value.number_order} akan dihapus.` : ''))

function askDelete(candidate) {
  deleting.value = candidate
  deleteOpen.value = true
}

async function remove() {
  removing.value = true
  try {
    await adminService.deleteCandidate(deleting.value.id)
    deleteOpen.value = false
    toast.success('Pasangan calon dihapus.')
    await load()
  } catch (e) {
    deleteOpen.value = false
    toast.error(e.message)
  } finally {
    removing.value = false
  }
}
</script>

<template>
  <PageHeader title="Pasangan Calon" subtitle="Kelola data paslon yang tampil di bilik suara.">
    <template #actions>
      <button type="button" class="btn btn-primary" :disabled="!canAdd" @click="openCreate"><i class="bi bi-plus-lg me-1"></i>Tambah paslon</button>
    </template>
  </PageHeader>

  <LoadingState v-if="loading" />
  <ErrorAlert v-else-if="error" :message="error" @retry="load" />
  <EmptyState v-else-if="!election" icon="bi-calendar-plus" title="Belum ada pemilihan" text="Buat pemilihan terlebih dahulu di menu Periode Pemilihan.">
    <RouterLink :to="{ name: 'admin-election' }" class="btn btn-primary btn-sm">Buat pemilihan</RouterLink>
  </EmptyState>

  <template v-else>
    <div v-if="lockHint" class="alert alert-warning small"><i class="bi bi-lock me-1"></i>{{ lockHint }}</div>

    <EmptyState v-if="!candidates.length" icon="bi-person-badge" title="Belum ada pasangan calon" text="Tambahkan paslon sebelum pemilihan dimulai." />
    <div v-else class="row g-4">
      <div v-for="c in candidates" :key="c.id" class="col-12 col-md-6 col-xl-4">
        <CandidateCard :candidate="c" :selectable="false" @detail="openDetail">
          <template #actions>
            <div class="d-flex gap-2">
              <button type="button" class="btn btn-outline-secondary flex-fill" :disabled="!canEdit" @click="openEdit(c)"><i class="bi bi-pencil me-1"></i>Ubah</button>
              <button type="button" class="btn btn-outline-danger flex-fill" :disabled="!canAdd" @click="askDelete(c)"><i class="bi bi-trash me-1"></i>Hapus</button>
            </div>
          </template>
        </CandidateCard>
      </div>
    </div>
  </template>

  <CandidateDetailModal v-model="detailOpen" :candidate="detail" />

  <BaseModal v-model="formOpen" :title="editing ? 'Ubah pasangan calon' : 'Tambah pasangan calon'" size="lg" :persistent="saving">
    <div v-if="clientError || (apiError && !apiError.errors)" class="alert alert-danger small" role="alert">{{ clientError || apiError.message }}</div>

    <div class="row g-3">
      <div class="col-md-4">
        <label for="c-number" class="form-label">Nomor urut</label>
        <input id="c-number" v-model="form.number_order" type="number" min="1" max="99" class="form-control" :class="{ 'is-invalid': fieldError('number_order') }" :disabled="!!editing && !canAdd" />
        <div class="invalid-feedback">{{ fieldError('number_order') }}</div>
      </div>
      <div v-for="f in TEXT_INPUTS" :key="f.key" class="col-md-6">
        <label :for="`c-${f.key}`" class="form-label">{{ f.label }}</label>
        <input :id="`c-${f.key}`" v-model="form[f.key]" class="form-control" :class="{ 'is-invalid': fieldError(f.key) }" :maxlength="f.max" />
        <div class="invalid-feedback">{{ fieldError(f.key) }}</div>
      </div>
      <div v-for="f in TEXT_AREAS" :key="f.key" class="col-12">
        <label :for="`c-${f.key}`" class="form-label">{{ f.label }} <small class="text-muted">(opsional)</small></label>
        <textarea :id="`c-${f.key}`" v-model="form[f.key]" class="form-control" rows="3" maxlength="5000"></textarea>
      </div>
      <div class="col-12">
        <label for="c-photo" class="form-label">Foto <small class="text-muted">(JPG, PNG, WebP, maks 2 MB)</small></label>
        <input id="c-photo" type="file" accept="image/jpeg,image/png,image/webp" class="form-control" :class="{ 'is-invalid': fieldError('photo') }" @change="onPhoto" />
        <div class="invalid-feedback">{{ fieldError('photo') }}</div>
        <div class="mt-2 d-flex align-items-center gap-3">
          <img v-if="photoPreview" :src="photoPreview" alt="Pratinjau foto baru" class="osk-photo-preview" />
          <img v-else-if="editing?.photo_url && !form.remove_photo" :src="editing.photo_url" alt="Foto saat ini" class="osk-photo-preview" />
          <div v-if="editing?.photo_url && !photoPreview" class="form-check">
            <input id="c-remove" v-model="form.remove_photo" type="checkbox" class="form-check-input" />
            <label for="c-remove" class="form-check-label">Hapus foto saat ini</label>
          </div>
        </div>
      </div>
    </div>

    <template #footer>
      <button type="button" class="btn btn-light" :disabled="saving" @click="formOpen = false">Batal</button>
      <button type="button" class="btn btn-primary" :disabled="saving" @click="save"><span v-if="saving" class="spinner-border spinner-border-sm me-2" aria-hidden="true"></span>Simpan</button>
    </template>
  </BaseModal>

  <ConfirmDialog v-model="deleteOpen" title="Hapus pasangan calon?" :message="deleteMessage" confirm-text="Ya, hapus" variant="danger" :loading="removing" @confirm="remove" />
</template>
