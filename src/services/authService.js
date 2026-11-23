import http from './http'

export const authService = {
  /** type: 'siswa' | 'guru'; identifier: NIK (siswa) atau nama lengkap (guru) */
  voterLogin: (type, identifier) =>
    http.post('/auth/voter-login', { type, identifier }).then((r) => r.data.data),

  adminLogin: (username, password) =>
    http.post('/auth/admin-login', { username, password }).then((r) => r.data.data),

  logout: () => http.post('/auth/logout'),

  me: () => http.get('/auth/me').then((r) => r.data.data),
}
