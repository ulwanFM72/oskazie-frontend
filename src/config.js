// Alamat API: dari VITE_API_BASE_URL bila diisi, jika tidak memakai host halaman ini pada port 8000.
const fromEnv = (import.meta.env.VITE_API_BASE_URL || '').trim().replace(/\/+$/, '')

export const API_BASE_URL = fromEnv || `${window.location.protocol}//${window.location.hostname}:8000/api`
export const APP_NAME = 'OSKAZIE'
export const SCHOOL_NAME = 'SMKN 1 CIJATI'
export const DISPLAY_TIME_ZONE = 'Asia/Jakarta'
