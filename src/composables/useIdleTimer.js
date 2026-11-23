import { onBeforeUnmount, onMounted, ref } from 'vue'

/**
 * Keluar otomatis bila tidak ada aktivitas (mencegah sesi pemilih tertinggal di bilik).
 * `remaining` berisi sisa detik saat peringatan tampil, atau null bila belum waktunya.
 */
export function useIdleTimer({ idleSeconds = 150, warnSeconds = 30, onTimeout }) {
  const remaining = ref(null)
  let lastActivity = Date.now()
  let timer = null
  const events = ['pointerdown', 'keydown', 'touchstart', 'mousemove']

  function reset() {
    lastActivity = Date.now()
    remaining.value = null
  }

  function check() {
    const idle = (Date.now() - lastActivity) / 1000
    if (idle >= idleSeconds) {
      stop()
      onTimeout()
      return
    }
    remaining.value = idle >= idleSeconds - warnSeconds ? Math.ceil(idleSeconds - idle) : null
  }

  function stop() {
    clearInterval(timer)
    timer = null
    events.forEach((e) => window.removeEventListener(e, reset))
    remaining.value = null
  }

  onMounted(() => {
    reset()
    events.forEach((e) => window.addEventListener(e, reset, { passive: true }))
    timer = setInterval(check, 1000)
  })
  onBeforeUnmount(stop)

  return { remaining, reset, stop }
}
