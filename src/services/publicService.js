import http from './http'

export const publicService = {
  electionStatus: () => http.get('/election/status').then((r) => r.data.data),
  announcements: () => http.get('/announcements').then((r) => r.data.data),
  results: () => http.get('/results').then((r) => r.data.data),
}
