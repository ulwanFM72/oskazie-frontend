import { onBeforeUnmount, onMounted } from 'vue'

/** Jalankan fn berkala selama komponen tampil dan tab terlihat. */
export function usePolling(fn, intervalMs) {
  let timer = null
  onMounted(() => {
    timer = setInterval(() => {
      if (!document.hidden) fn()
    }, intervalMs)
  })
  onBeforeUnmount(() => clearInterval(timer))
}
