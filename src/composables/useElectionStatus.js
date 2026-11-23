import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { publicService } from '@/services/publicService'

/**
 * Status pemilihan dengan polling dan jam yang disinkronkan ke server.
 * Status "hidup" dihitung dari jam server, jadi tombol/penghitung mundur tepat waktu
 * walaupun jam komputer bilik tidak akurat.
 */
export function useElectionStatus({ pollMs = 30000 } = {}) {
  const election = ref(null)
  const loading = ref(true)
  const error = ref('')
  const offsetMs = ref(0)
  const tick = ref(Date.now())
  let pollTimer = null
  let clockTimer = null

  async function load({ silent = false } = {}) {
    if (!silent) loading.value = true
    try {
      const data = await publicService.electionStatus()
      election.value = data
      if (data?.server_time) offsetMs.value = new Date(data.server_time).getTime() - Date.now()
      error.value = ''
    } catch (e) {
      error.value = e.message
    } finally {
      loading.value = false
    }
  }

  const nowMs = computed(() => tick.value + offsetMs.value)

  const liveStatus = computed(() => {
    const e = election.value
    if (!e) return null
    if (e.finalized_at) return 'final'
    if (nowMs.value < Date.parse(e.start_at)) return 'belum_dimulai'
    if (nowMs.value < Date.parse(e.end_at)) return 'berlangsung'
    return 'selesai'
  })

  const remainingMs = computed(() => (election.value ? Math.max(0, Date.parse(election.value.end_at) - nowMs.value) : 0))
  const untilStartMs = computed(() => (election.value ? Math.max(0, Date.parse(election.value.start_at) - nowMs.value) : 0))

  onMounted(() => {
    load()
    pollTimer = setInterval(() => load({ silent: true }), pollMs)
    clockTimer = setInterval(() => {
      tick.value = Date.now()
    }, 1000)
  })

  onBeforeUnmount(() => {
    clearInterval(pollTimer)
    clearInterval(clockTimer)
  })

  return { election, loading, error, liveStatus, remainingMs, untilStartMs, reload: load }
}
