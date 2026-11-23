// Sesi disimpan di sessionStorage: hilang saat tab ditutup (aman untuk komputer bilik bersama).
const KEY = 'oskazie.auth'

export function readSession() {
  try {
    const raw = sessionStorage.getItem(KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function writeSession(session) {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(session))
  } catch {
    /* penyimpanan tidak tersedia: sesi hanya hidup di memori */
  }
}

export function clearSession() {
  try {
    sessionStorage.removeItem(KEY)
  } catch {
    /* abaikan */
  }
}

export function getToken() {
  return readSession()?.token ?? null
}
