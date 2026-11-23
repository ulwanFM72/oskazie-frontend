<script setup>
import { onMounted, reactive, ref, watch } from 'vue'
import EmptyState from '@/components/EmptyState.vue'
import ErrorAlert from '@/components/ErrorAlert.vue'
import LoadingState from '@/components/LoadingState.vue'
import PageHeader from '@/components/PageHeader.vue'
import Pagination from '@/components/Pagination.vue'
import { debounce } from '@/composables/useDebounce'
import { formatWibDateTime, wibInputToIso } from '@/composables/useDateTime'
import { adminService } from '@/services/adminService'
import { pageMeta } from '@/utils/pagination'

const loading = ref(true)
const error = ref('')
const rows = ref([])
const meta = ref(null)
const page = ref(1)
const filters = reactive({ action: '', entity_type: '', from: '', to: '' })
const open = ref(new Set())

async function load() {
  loading.value = true
  error.value = ''
  try {
    const r = await adminService.auditLogs({
      action: filters.action.trim(),
      entity_type: filters.entity_type,
      from: wibInputToIso(filters.from),
      to: wibInputToIso(filters.to),
      page: page.value,
      per_page: 25,
    })
    rows.value = r.data
    meta.value = pageMeta(r)
    open.value = new Set()
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
const onAction = debounce(reload, 400)
watch(() => [filters.entity_type, filters.from, filters.to], reload)
onMounted(load)

function toggle(id) {
  const next = new Set(open.value)
  next.has(id) ? next.delete(id) : next.add(id)
  open.value = next
}

const json = (value) => JSON.stringify(value, null, 2)
</script>

<template>
  <PageHeader title="Audit Log" subtitle="Riwayat tindakan admin dan sistem. Hanya dapat dibaca." />

  <div class="card mb-3">
    <div class="card-body">
      <div class="row g-3">
        <div class="col-md-3">
          <label for="f-action" class="form-label small">Aksi (awalan)</label>
          <input id="f-action" v-model="filters.action" class="form-control" placeholder="mis. election, voter" @input="onAction" />
        </div>
        <div class="col-md-3">
          <label for="f-entity" class="form-label small">Jenis data</label>
          <select id="f-entity" v-model="filters.entity_type" class="form-select">
            <option value="">Semua</option>
            <option value="election">Pemilihan</option>
            <option value="voter">Pemilih</option>
            <option value="candidate">Paslon</option>
            <option value="election_voter">Kehadiran</option>
            <option value="announcement">Pengumuman</option>
            <option value="user">Admin</option>
          </select>
        </div>
        <div class="col-md-3"><label for="f-from" class="form-label small">Dari (WIB)</label><input id="f-from" v-model="filters.from" type="datetime-local" class="form-control" /></div>
        <div class="col-md-3"><label for="f-to" class="form-label small">Sampai (WIB)</label><input id="f-to" v-model="filters.to" type="datetime-local" class="form-control" /></div>
      </div>
    </div>
  </div>

  <LoadingState v-if="loading" />
  <ErrorAlert v-else-if="error" :message="error" @retry="load" />
  <EmptyState v-else-if="!rows.length" icon="bi-journal-text" title="Tidak ada catatan" text="Ubah filter atau lakukan tindakan terlebih dahulu." />

  <div v-else class="card">
    <div class="table-responsive">
      <table class="table table-hover align-middle mb-0">
        <thead><tr><th>Waktu</th><th>Pelaku</th><th>Aksi</th><th>Data</th><th>IP</th><th></th></tr></thead>
        <tbody>
          <template v-for="r in rows" :key="r.id">
            <tr>
              <td class="text-nowrap">{{ formatWibDateTime(r.created_at) }}</td>
              <td>{{ r.actor }}</td>
              <td><code>{{ r.action }}</code></td>
              <td>{{ r.entity_type ?? '-' }}<span v-if="r.entity_id"> #{{ r.entity_id }}</span></td>
              <td class="text-muted small">{{ r.ip_address ?? '-' }}</td>
              <td class="text-end">
                <button v-if="r.old_value || r.new_value" type="button" class="btn btn-sm btn-outline-secondary" @click="toggle(r.id)">{{ open.has(r.id) ? 'Tutup' : 'Detail' }}</button>
              </td>
            </tr>
            <tr v-if="open.has(r.id)">
              <td colspan="6" class="bg-body-tertiary">
                <div class="row g-3">
                  <div v-if="r.old_value" class="col-md-6"><div class="small text-muted mb-1">Sebelum</div><pre class="osk-pre">{{ json(r.old_value) }}</pre></div>
                  <div v-if="r.new_value" class="col-md-6"><div class="small text-muted mb-1">Sesudah</div><pre class="osk-pre">{{ json(r.new_value) }}</pre></div>
                </div>
              </td>
            </tr>
          </template>
        </tbody>
      </table>
    </div>
  </div>
  <Pagination :meta="meta" @change="(p) => { page = p; load() }" />
</template>
