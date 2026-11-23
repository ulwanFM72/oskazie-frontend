<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import StatusBadge from '@/components/StatusBadge.vue'
import { formatDuration, formatWibDateTime } from '@/composables/useDateTime'
import { useElectionStatus } from '@/composables/useElectionStatus'
import { publicService } from '@/services/publicService'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
const route = useRoute()
const router = useRouter()

const { election, loading, error, liveStatus, remainingMs, untilStartMs, reload } = useElectionStatus()

const type = ref('siswa') // 'siswa' | 'guru'
const identifier = ref('')
const submitting = ref(false)
const formError = ref('')
const announcements = ref([])

const canLogin = computed(() => liveStatus.value === 'berlangsung')
const resultsPublished = computed(() => !!election.value?.results_published_at)

const label = computed(() => (type.value === 'siswa' ? 'NIS' : 'Nama lengkap'))
const placeholder = computed(() => (type.value === 'siswa' ? 'Masukkan NIS Anda' : 'Tulis nama lengkap sesuai daftar'))

function switchType(next) {
  type.value = next
  identifier.value = ''
  formError.value = ''
}

function validate() {
  const value = identifier.value.trim()
  if (!value) return type.value === 'siswa' ? 'NIS wajib diisi.' : 'Nama lengkap wajib diisi.'
  if (type.value === 'siswa' && !/^\d{5,15}$/.test(value.replace(/\s+/g, ''))) return 'NIS harus berupa angka (5 sampai 15 digit).'
  return ''
}

async function submit() {
  formError.value = validate()
  if (formError.value) return

  submitting.value = true
  try {
    await auth.loginVoter(type.value, identifier.value.trim())
    identifier.value = ''
    router.replace({ name: 'vote' })
  } catch (e) {
    formError.value = e.message
    if (e.code === 'election_not_started' || e.code === 'election_ended') reload({ silent: true })
  } finally {
    submitting.value = false
  }
}

onMounted(async () => {
  try {
    announcements.value = await publicService.announcements()
  } catch {
    announcements.value = [] // pengumuman tidak kritis
  }
})
</script>

<template>
  <div class="osk-login">
    <div class="row g-4 align-items-center">
      <!-- Sisi kiri: sapaan dan status -->
      <div class="col-lg-6">
        <span class="badge rounded-pill osk-pill mb-3"><i class="bi bi-shield-check me-1"></i>Satu pemilih, satu suara</span>
        <h1 class="osk-hero-title">Suaramu menentukan masa depan OSIS.</h1>
        <p class="lead text-muted">
          Pilih Ketua dan Wakil Ketua OSIS SMKN 1 CIJATI. Pilihanmu dirahasiakan dan tidak dapat diubah setelah dikirim.
        </p>

        <div class="card osk-status-card">
          <div class="card-body">
            <div v-if="loading" class="text-muted"><span class="spinner-border spinner-border-sm me-2" aria-hidden="true"></span>Memeriksa status pemilihan...</div>

            <div v-else-if="error" class="d-flex align-items-center gap-2 text-danger">
              <i class="bi bi-wifi-off"></i><span class="flex-grow-1">{{ error }}</span>
              <button type="button" class="btn btn-sm btn-outline-danger" @click="reload()">Coba lagi</button>
            </div>

            <div v-else-if="!election" class="text-muted"><i class="bi bi-calendar-x me-2"></i>Belum ada pemilihan yang dijadwalkan.</div>

            <template v-else>
              <div class="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-2">
                <span class="fw-semibold">{{ election.name }}</span>
                <StatusBadge :status="liveStatus" />
              </div>
              <div v-if="liveStatus === 'belum_dimulai'" class="small">
                Dibuka {{ formatWibDateTime(election.start_at) }}. Dimulai dalam <strong class="osk-mono">{{ formatDuration(untilStartMs) }}</strong>
              </div>
              <div v-else-if="liveStatus === 'berlangsung'" class="small">
                Sisa waktu <strong class="osk-mono">{{ formatDuration(remainingMs) }}</strong> (berakhir {{ formatWibDateTime(election.end_at) }})
              </div>
              <div v-else class="small">
                Pemilihan telah berakhir.
                <RouterLink v-if="resultsPublished" :to="{ name: 'public-results' }">Lihat hasil pemilihan</RouterLink>
              </div>
            </template>
          </div>
        </div>
      </div>

      <!-- Sisi kanan: formulir login -->
      <div class="col-lg-6">
        <div class="card">
          <div class="card-body p-4">
            <h2 class="h4 mb-1">Masuk ke bilik suara</h2>
            <p class="text-muted small mb-4">Pilih jenis pemilih, lalu masukkan data Anda.</p>

            <div v-if="route.query.expired" class="alert alert-warning small" role="alert">
              Sesi Anda berakhir. Silakan masuk lagi. Jika Anda baru saja menekan tombol kirim suara dan tidak melihat tanda sukses, minta panitia memeriksa apakah suara Anda tercatat.
            </div>
            <div v-else-if="route.query.idle" class="alert alert-info small" role="alert">
              Anda keluar otomatis karena tidak ada aktivitas. Silakan masuk lagi.
            </div>

            <div class="btn-group w-100 mb-4" role="group" aria-label="Jenis pemilih">
              <button type="button" class="btn" :class="type === 'siswa' ? 'btn-primary' : 'btn-outline-primary'" @click="switchType('siswa')">
                <i class="bi bi-mortarboard me-1"></i>Siswa
              </button>
              <button type="button" class="btn" :class="type === 'guru' ? 'btn-primary' : 'btn-outline-primary'" @click="switchType('guru')">
                <i class="bi bi-person-workspace me-1"></i>Guru &amp; Staf
              </button>
            </div>

            <form novalidate @submit.prevent="submit">
              <div class="mb-3">
                <label for="identifier" class="form-label fw-semibold">{{ label }}</label>
                <input
                  id="identifier"
                  v-model="identifier"
                  class="form-control form-control-lg"
                  :class="{ 'is-invalid': formError }"
                  :placeholder="placeholder"
                  :inputmode="type === 'siswa' ? 'numeric' : 'text'"
                  autocomplete="off"
                  autocapitalize="off"
                  spellcheck="false"
                  :disabled="!canLogin || submitting"
                />
                <div class="invalid-feedback d-block" aria-live="polite">{{ formError }}</div>
                <div v-if="type === 'siswa'" class="form-text">Lupa NIS? Tanyakan ke panitia.</div>
                <div v-if="type === 'guru'" class="form-text">Tulis sesuai nama pada daftar pemilih. Huruf besar/kecil dan tanda baca tidak berpengaruh.</div>
              </div>

              <button type="submit" class="btn btn-primary btn-lg w-100" :disabled="!canLogin || submitting">
                <span v-if="submitting" class="spinner-border spinner-border-sm me-2" aria-hidden="true"></span>
                Masuk
              </button>
              <p v-if="!loading && !canLogin && election" class="text-muted small text-center mt-3 mb-0">
                Masuk hanya dapat dilakukan saat pemilihan berlangsung.
              </p>
            </form>
          </div>
        </div>
      </div>
    </div>

    <!-- Pengumuman -->
    <section v-if="announcements.length" class="mt-5">
      <h2 class="h5 mb-3"><i class="bi bi-megaphone me-2 text-primary"></i>Pengumuman</h2>
      <div class="d-grid gap-2">
        <details v-for="a in announcements" :key="a.id" class="card osk-announcement">
          <summary class="card-body py-3">
            <span class="fw-semibold">{{ a.title }}</span>
            <small class="text-muted ms-2">{{ formatWibDateTime(a.published_at) }}</small>
          </summary>
          <div class="card-body pt-0 osk-prewrap">{{ a.body }}</div>
        </details>
      </div>
    </section>
  </div>
</template>
