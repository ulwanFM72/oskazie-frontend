import axios from 'axios'
import { API_BASE_URL } from '@/config'
import { getToken } from './tokenStorage'

/** Error API yang sudah dinormalisasi: pesan siap tampil, kode bisnis, dan error per field (422). */
export class ApiError extends Error {
  constructor(message, { status = 0, code = 'error', errors = null } = {}) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.errors = errors
  }

  firstError(field) {
    return this.errors?.[field]?.[0] ?? null
  }
}

let unauthorizedHandler = null
export function setUnauthorizedHandler(handler) {
  unauthorizedHandler = handler
}

const http = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: { Accept: 'application/json' },
})

http.interceptors.request.use((config) => {
  const token = getToken()
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

http.interceptors.response.use(
  (response) => response,
  (error) => {
    if (!error.response) {
      return Promise.reject(
        new ApiError('Tidak dapat terhubung ke server. Periksa jaringan atau hubungi panitia.', {
          status: 0,
          code: 'network',
        }),
      )
    }

    const { status, data } = error.response

    // 401 saat sudah punya token = sesi tidak berlaku lagi. (Gagal login tidak membawa token.)
    if (status === 401 && getToken() && unauthorizedHandler) unauthorizedHandler()

    let message = data?.message
    if (status === 429) message = 'Terlalu banyak percobaan. Tunggu sebentar lalu coba lagi.'
    if (status >= 500) message = 'Terjadi kesalahan pada server. Coba lagi atau hubungi panitia.'
    if (!message) message = 'Permintaan gagal diproses.'

    return Promise.reject(
      new ApiError(message, { status, code: data?.code ?? 'error', errors: data?.errors ?? null }),
    )
  },
)

export default http
