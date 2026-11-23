import http from './http'

const data = (response) => response.data.data
const body = (response) => response.data

// Buang parameter kosong agar tidak ikut terkirim.
const clean = (params = {}) =>
  Object.fromEntries(Object.entries(params).filter(([, v]) => v !== '' && v !== null && v !== undefined))

export const adminService = {
  dashboard: () => http.get('/admin/dashboard').then(data),

  // Pemilihan
  currentElection: () => http.get('/admin/elections/current').then(data),
  createElection: (payload) => http.post('/admin/elections', payload).then(data),
  updateElection: (id, payload) => http.patch(`/admin/elections/${id}`, payload).then(data),
  extendElection: (id, endAt) => http.patch(`/admin/elections/${id}/extend`, { end_at: endAt }).then(data),
  // Akhiri sekarang (tanpa end_at) atau percepat (dengan end_at). payload: { reason, end_at? }
  endElection: (id, payload) => http.patch(`/admin/elections/${id}/end`, payload).then(data),
  finalizeElection: (id) => http.post(`/admin/elections/${id}/finalize`).then(data),
  publishElection: (id) => http.post(`/admin/elections/${id}/publish`).then(data),
  turnout: (id) => http.get(`/admin/elections/${id}/turnout`).then(data),
  results: (id) => http.get(`/admin/elections/${id}/results`).then(data),

  // Kehadiran dan Daftar Belum Memilih
  electionVoters: (id, params) => http.get(`/admin/elections/${id}/voters`, { params: clean(params) }).then(body),
  setAttendance: (electionVoterId, payload) =>
    http.patch(`/admin/election-voters/${electionVoterId}/attendance`, payload).then(data),
  nonVoters: (id, params) => http.get(`/admin/elections/${id}/non-voters`, { params: clean(params) }).then(body),
  exportNonVoters: (id, params) =>
    http.get(`/admin/elections/${id}/non-voters/export`, { params: clean(params), responseType: 'blob' }).then(body),

  // Data pemilih
  voters: (params) => http.get('/admin/voters', { params: clean(params) }).then(body),
  createVoter: (payload) => http.post('/admin/voters', payload).then(data),
  updateVoter: (id, payload) => http.patch(`/admin/voters/${id}`, payload).then(data),
  deleteVoter: (id) => http.delete(`/admin/voters/${id}`),
  importVoters: (formData) => http.post('/admin/voters/import', formData).then(data),

  // Paslon (multipart; ubah memakai POST + _method=PATCH agar PHP membaca berkas)
  candidates: () => http.get('/admin/candidates').then(data),
  createCandidate: (formData) => http.post('/admin/candidates', formData).then(data),
  updateCandidate: (id, formData) => {
    formData.append('_method', 'PATCH')
    return http.post(`/admin/candidates/${id}`, formData).then(data)
  },
  deleteCandidate: (id) => http.delete(`/admin/candidates/${id}`),

  // Pengumuman
  announcements: () => http.get('/admin/announcements').then(data),
  createAnnouncement: (payload) => http.post('/admin/announcements', payload).then(data),
  updateAnnouncement: (id, payload) => http.patch(`/admin/announcements/${id}`, payload).then(data),
  deleteAnnouncement: (id) => http.delete(`/admin/announcements/${id}`),

  // Audit log
  auditLogs: (params) => http.get('/admin/audit-logs', { params: clean(params) }).then(body),
}
