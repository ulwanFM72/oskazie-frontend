<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import CandidateCard from '@/components/CandidateCard.vue'
import CandidateDetailModal from '@/components/CandidateDetailModal.vue'
import ConfirmDialog from '@/components/ConfirmDialog.vue'
import EmptyState from '@/components/EmptyState.vue'
import ErrorAlert from '@/components/ErrorAlert.vue'
import LoadingState from '@/components/LoadingState.vue'
import { formatDuration } from '@/composables/useDateTime'
import { useElectionStatus } from '@/composables/useElectionStatus'
import { useIdleTimer } from '@/composables/useIdleTimer'
import { useToast } from '@/composables/useToast'
import { voterService } from '@/services/voterService'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
const router = useRouter()
const toast = useToast()

const { liveStatus, remainingMs } = useElectionStatus({ pollMs: 20000 })

// Tombol pilih tampil selama belum terbukti di luar jadwal (status null = belum termuat). Backend tetap memvalidasi.
const canVote = computed(() => !['belum_dimulai', 'selesai', 'final'].includes(liveStatus.value))

const loading = ref(true)
const error = ref('')
const candidates = ref([])

const selected = ref(null)
const confirmOpen = ref(false)
const submitting = ref(false)

const detail = ref(null)
const detailOpen = ref(false)

const leaveOpen = ref(false)

const done = ref(false)
const redirectIn = ref(10)
let redirectTimer = null

async function endSession(query) {
  await auth.logout()
  router.replace({ name: 'voter-login', query })
}

const { remaining: idleRemaining, reset: resetIdle, stop: stopIdle } = useIdleTimer({
  idleSeconds: 150,
  warnSeconds: 30,
  onTimeout: () => endSession({ idle: '1' }),
})

async function load() {
  loading.value = true
  error.value = ''
  try {
    const data = await voterService.candidates()
    candidates.value = data.candidates
  } catch (e) {
    error.value = e.message
    if (e.code === 'election_closed') {
      toast.error(e.message)
      await endSession()
    }
  } finally {
    loading.value = false
  }
}

function openDetail(candidate) {
  detail.value = candidate
  detailOpen.value = true
}

function choose(candidate) {
  detailOpen.value = false
  selected.value = candidate
  confirmOpen.value = true
}

function startRedirectCountdown() {
  redirectTimer = setInterval(() => {
    redirectIn.value -= 1
    if (redirectIn.value <= 0) backToStart()
  }, 1000)
}

function backToStart() {
  clearInterval(redirectTimer)
  router.replace({ name: 'voter-login' })
}

async function confirmVote() {
  if (!selected.value || submitting.value) return
  submitting.value = true
  try {
    await voterService.vote(selected.value.id)
    stopIdle()
    auth.clear() // server sudah mencabut token; bersihkan sesi di klien
    confirmOpen.value = false
    done.value = true
    startRedirectCountdown()
  } catch (e) {
    if (e.code === 'already_voted' || e.code === 'election_closed' || e.code === 'not_registered') {
      confirmOpen.value = false
      toast.error(e.message)
      await endSession()
    } else if (e.code === 'invalid_candidate') {
      confirmOpen.value = false
      toast.error(e.message)
      await load()
    } else if (e.status === 0) {
      // Jaringan putus: suara belum tentu gagal. Jangan kirim ulang tanpa pemberitahuan.
      toast.error('Koneksi terputus. Periksa jaringan lalu coba lagi. Jika ragu, tanyakan ke panitia.')
    } else if (e.status !== 401) {
      toast.error(e.message)
    }
  } finally {
    submitting.value = false
  }
}

onMounted(load)
onBeforeUnmount(() => clearInterval(redirectTimer))
</script>

<template>
  <!-- Layar sukses -->
  <div v-if="done" class="osk-booth text-center py-5">
    <div class="osk-success-mark"><i class="bi bi-check-lg"></i></div>
    <h1 class="h2 mt-4">Suara Anda telah tersimpan</h1>
    <p class="lead text-muted">Terima kasih telah berpartisipasi dalam pemilihan OSIS.</p>
    <p class="text-muted">Halaman akan kembali ke awal dalam {{ redirectIn }} detik.</p>
    <button type="button" class="btn btn-primary btn-lg" @click="backToStart">Selesai</button>
  </div>

  <!-- Bilik suara -->
  <div v-else class="osk-booth">
    <div class="d-flex flex-wrap justify-content-between align-items-start gap-3 mb-4">
      <div>
        <h1 class="h3 mb-1">Halo, {{ auth.user?.name }}</h1>
        <p class="text-muted mb-0">
          Pilih satu pasangan calon. Pilihan tidak dapat diubah setelah dikirim.
        </p>
      </div>
      <div class="text-end">
        <div v-if="liveStatus === 'berlangsung'" class="small text-muted">
          Sisa waktu pemilihan <strong class="osk-mono text-body">{{ formatDuration(remainingMs) }}</strong>
        </div>
        <button type="button" class="btn btn-outline-secondary btn-sm mt-2" @click="leaveOpen = true">
          <i class="bi bi-box-arrow-left me-1"></i>Keluar tanpa memilih
        </button>
      </div>
    </div>

    <div v-if="liveStatus === 'selesai' || liveStatus === 'final'" class="alert alert-warning" role="alert">
      Waktu pemilihan telah berakhir. Suara tidak dapat dikirim lagi.
    </div>

    <LoadingState v-if="loading" text="Memuat daftar pasangan calon..." />
    <ErrorAlert v-else-if="error" :message="error" @retry="load" />
    <EmptyState v-else-if="!candidates.length" icon="bi-people" title="Belum ada pasangan calon" text="Hubungi panitia." />

    <div v-else class="row g-4 justify-content-center">
      <div v-for="c in candidates" :key="c.id" class="col-12 col-md-6 col-xl-4">
        <CandidateCard
          :candidate="c"
          :selectable="canVote"
          @detail="openDetail"
          @select="choose"
        />
      </div>
    </div>
  </div>

  <!-- Peringatan tidak aktif -->
  <div v-if="idleRemaining !== null && !done" class="osk-idle-warning" role="alert">
    <i class="bi bi-hourglass-split"></i>
    <span>Anda akan keluar otomatis dalam <strong>{{ idleRemaining }}</strong> detik.</span>
    <button type="button" class="btn btn-sm btn-light" @click="resetIdle">Saya masih di sini</button>
  </div>

  <!-- Detail paslon -->
  <CandidateDetailModal v-model="detailOpen" :candidate="detail" :can-choose="canVote" @choose="choose" />

  <!-- Konfirmasi memilih -->
  <ConfirmDialog
    v-model="confirmOpen"
    title="Konfirmasi pilihan Anda"
    confirm-text="Ya, kirim suara"
    cancel-text="Ganti pilihan"
    :loading="submitting"
    @confirm="confirmVote"
  >
    <div v-if="selected" class="text-center">
      <div class="osk-confirm-number">{{ selected.number_order }}</div>
      <div class="fw-bold">{{ selected.chairman_name }}</div>
      <div class="text-muted">&amp; {{ selected.vice_name }}</div>
      <p class="small text-danger mt-3 mb-0"><i class="bi bi-exclamation-triangle me-1"></i>Pilihan tidak dapat diubah setelah dikirim.</p>
    </div>
  </ConfirmDialog>

  <!-- Keluar tanpa memilih -->
  <ConfirmDialog
    v-model="leaveOpen"
    title="Keluar tanpa memilih?"
    message="Anda belum memilih. Anda dapat masuk lagi selama pemilihan masih berlangsung."
    confirm-text="Ya, keluar"
    @confirm="endSession()"
  />
</template>
