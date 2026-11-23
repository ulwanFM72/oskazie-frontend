<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import BaseModal from '@/components/BaseModal.vue'
import ConfirmDialog from '@/components/ConfirmDialog.vue'
import EmptyState from '@/components/EmptyState.vue'
import ErrorAlert from '@/components/ErrorAlert.vue'
import LoadingState from '@/components/LoadingState.vue'
import PageHeader from '@/components/PageHeader.vue'
import { formatWibDateTime } from '@/composables/useDateTime'
import { useToast } from '@/composables/useToast'
import { adminService } from '@/services/adminService'

const toast = useToast()

const loading = ref(true)
const error = ref('')
const items = ref([])

async function load() {
  loading.value = true
  error.value = ''
  try {
    items.value = await adminService.announcements()
  } catch (e) {
    error.value = e.message
  } finally {
    loading.value = false
  }
}
onMounted(load)

const formOpen = ref(false)
const editing = ref(null)
const form = reactive({ title: '', body: '', is_published: false })
const formError = ref('')
const saving = ref(false)

function openCreate() {
  editing.value = null
  Object.assign(form, { title: '', body: '', is_published: false })
  formError.value = ''
  formOpen.value = true
}

function openEdit(item) {
  editing.value = item
  Object.assign(form, { title: item.title, body: item.body, is_published: item.is_published })
  formError.value = ''
  formOpen.value = true
}

async function save() {
  formError.value = ''
  if (!form.title.trim() || !form.body.trim()) {
    formError.value = 'Judul dan isi pengumuman wajib diisi.'
    return
  }
  saving.value = true
  try {
    const payload = { title: form.title.trim(), body: form.body.trim(), is_published: form.is_published }
    if (editing.value) await adminService.updateAnnouncement(editing.value.id, payload)
    else await adminService.createAnnouncement(payload)
    formOpen.value = false
    toast.success('Pengumuman disimpan.')
    await load()
  } catch (e) {
    formError.value = e.message
  } finally {
    saving.value = false
  }
}

async function togglePublish(item) {
  try {
    await adminService.updateAnnouncement(item.id, { is_published: !item.is_published })
    toast.success(item.is_published ? 'Pengumuman disembunyikan.' : 'Pengumuman diterbitkan.')
    await load()
  } catch (e) {
    toast.error(e.message)
  }
}

const deleting = ref(null)
const deleteOpen = ref(false)
const removing = ref(false)
const deleteMessage = computed(() => (deleting.value ? `Pengumuman ${deleting.value.title} akan dihapus permanen.` : ''))

function askDelete(item) {
  deleting.value = item
  deleteOpen.value = true
}

async function remove() {
  removing.value = true
  try {
    await adminService.deleteAnnouncement(deleting.value.id)
    deleteOpen.value = false
    toast.success('Pengumuman dihapus.')
    await load()
  } catch (e) {
    toast.error(e.message)
  } finally {
    removing.value = false
  }
}
</script>

<template>
  <PageHeader title="Pengumuman" subtitle="Informasi jadwal dan tata cara yang tampil di halaman awal pemilih.">
    <template #actions>
      <button type="button" class="btn btn-primary" @click="openCreate"><i class="bi bi-plus-lg me-1"></i>Tambah pengumuman</button>
    </template>
  </PageHeader>

  <LoadingState v-if="loading" />
  <ErrorAlert v-else-if="error" :message="error" @retry="load" />
  <EmptyState v-else-if="!items.length" icon="bi-megaphone" title="Belum ada pengumuman" text="Tambahkan pengumuman untuk pemilih." />

  <div v-else class="d-grid gap-3">
    <div v-for="item in items" :key="item.id" class="card">
      <div class="card-body">
        <div class="d-flex flex-wrap justify-content-between align-items-start gap-2">
          <div>
            <h2 class="h6 mb-1">{{ item.title }}</h2>
            <small class="text-muted">
              <span class="badge me-2" :class="item.is_published ? 'text-bg-success' : 'text-bg-secondary'">{{ item.is_published ? 'Diterbitkan' : 'Draf' }}</span>
              <template v-if="item.published_at">Pertama terbit {{ formatWibDateTime(item.published_at) }}</template>
            </small>
          </div>
          <div class="d-flex gap-2">
            <button type="button" class="btn btn-sm btn-outline-secondary" @click="togglePublish(item)">{{ item.is_published ? 'Sembunyikan' : 'Terbitkan' }}</button>
            <button type="button" class="btn btn-sm btn-outline-primary" @click="openEdit(item)"><i class="bi bi-pencil"></i><span class="visually-hidden">Ubah</span></button>
            <button type="button" class="btn btn-sm btn-outline-danger" @click="askDelete(item)"><i class="bi bi-trash"></i><span class="visually-hidden">Hapus</span></button>
          </div>
        </div>
        <p class="osk-prewrap mt-3 mb-0">{{ item.body }}</p>
      </div>
    </div>
  </div>

  <BaseModal v-model="formOpen" :title="editing ? 'Ubah pengumuman' : 'Tambah pengumuman'" size="lg" :persistent="saving">
    <div v-if="formError" class="alert alert-danger small">{{ formError }}</div>
    <div class="mb-3"><label for="a-title" class="form-label">Judul</label><input id="a-title" v-model="form.title" class="form-control" maxlength="200" /></div>
    <div class="mb-3"><label for="a-body" class="form-label">Isi</label><textarea id="a-body" v-model="form.body" class="form-control" rows="6" maxlength="10000"></textarea></div>
    <div class="form-check"><input id="a-pub" v-model="form.is_published" type="checkbox" class="form-check-input" /><label for="a-pub" class="form-check-label">Terbitkan di halaman awal pemilih</label></div>
    <template #footer>
      <button type="button" class="btn btn-light" :disabled="saving" @click="formOpen = false">Batal</button>
      <button type="button" class="btn btn-primary" :disabled="saving" @click="save"><span v-if="saving" class="spinner-border spinner-border-sm me-2" aria-hidden="true"></span>Simpan</button>
    </template>
  </BaseModal>

  <ConfirmDialog v-model="deleteOpen" title="Hapus pengumuman?" :message="deleteMessage" confirm-text="Ya, hapus" variant="danger" :loading="removing" @confirm="remove" />
</template>
