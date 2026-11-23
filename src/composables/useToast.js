import { reactive } from 'vue'

// State global sederhana: satu daftar toast untuk seluruh aplikasi.
const toasts = reactive([])
let sequence = 0

function remove(id) {
  const index = toasts.findIndex((t) => t.id === id)
  if (index !== -1) toasts.splice(index, 1)
}

function push(type, message, timeout) {
  const id = ++sequence
  toasts.push({ id, type, message })
  if (timeout) setTimeout(() => remove(id), timeout)
  return id
}

export function useToast() {
  return {
    toasts,
    remove,
    success: (message) => push('success', message, 4500),
    info: (message) => push('info', message, 4500),
    warning: (message) => push('warning', message, 6000),
    error: (message) => push('danger', message, 7000),
  }
}
