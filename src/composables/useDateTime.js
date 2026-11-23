import { DISPLAY_TIME_ZONE } from '@/config'

// Server menyimpan dan mengirim UTC (ISO 8601). UI selalu menampilkan WIB (Asia/Jakarta, tanpa DST = UTC+7).

/** "2026-11-21T07:36:34+00:00" -> "21 Nov 2026 14.36 WIB" */
export function formatWibDateTime(iso) {
  if (!iso) return '-'
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return '-'
  const text = new Intl.DateTimeFormat('id-ID', {
    timeZone: DISPLAY_TIME_ZONE,
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date)
  return `${text} WIB`
}

/** Nilai <input type="datetime-local"> (dianggap WIB) -> ISO 8601 dengan zona untuk dikirim ke API. */
export function wibInputToIso(value) {
  if (!value) return null
  const withSeconds = value.length === 16 ? `${value}:00` : value
  return `${withSeconds}+07:00`
}

/** ISO 8601 dari API -> nilai <input type="datetime-local"> dalam WIB ("YYYY-MM-DDTHH:mm"). */
export function isoToWibInput(iso) {
  if (!iso) return ''
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  const text = new Intl.DateTimeFormat('sv-SE', {
    timeZone: DISPLAY_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(date)
  return text.replace(' ', 'T')
}

/** Milidetik -> "02:15:09" atau "1 hari 02:15:09". */
export function formatDuration(ms) {
  const total = Math.max(0, Math.floor(ms / 1000))
  const days = Math.floor(total / 86400)
  const hours = Math.floor((total % 86400) / 3600)
  const minutes = Math.floor((total % 3600) / 60)
  const seconds = total % 60
  const pad = (n) => String(n).padStart(2, '0')
  return `${days > 0 ? `${days} hari ` : ''}${pad(hours)}:${pad(minutes)}:${pad(seconds)}`
}
