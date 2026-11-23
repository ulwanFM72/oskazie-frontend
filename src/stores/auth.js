import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { authService } from '@/services/authService'
import { clearSession, readSession, writeSession } from '@/services/tokenStorage'

export const useAuthStore = defineStore('auth', () => {
  const saved = readSession()
  const token = ref(saved?.token ?? null)
  const role = ref(saved?.role ?? null) // 'admin' | 'voter'
  const user = ref(saved?.user ?? null)

  const isAuthenticated = computed(() => !!token.value)

  function setSession(newToken, newRole, newUser) {
    token.value = newToken
    role.value = newRole
    user.value = newUser
    writeSession({ token: newToken, role: newRole, user: newUser })
  }

  /** Hapus sesi di sisi klien saja (mis. setelah suara tersimpan, token sudah dicabut server). */
  function clear() {
    token.value = null
    role.value = null
    user.value = null
    clearSession()
  }

  async function loginVoter(type, identifier) {
    const data = await authService.voterLogin(type, identifier)
    setSession(data.token, 'voter', data.voter)
    return data
  }

  async function loginAdmin(username, password) {
    const data = await authService.adminLogin(username, password)
    setSession(data.token, 'admin', data.user)
    return data
  }

  async function logout() {
    try {
      if (token.value) await authService.logout()
    } catch {
      /* token mungkin sudah kedaluwarsa; tetap bersihkan sesi lokal */
    }
    clear()
  }

  return { token, role, user, isAuthenticated, loginVoter, loginAdmin, logout, clear }
})
