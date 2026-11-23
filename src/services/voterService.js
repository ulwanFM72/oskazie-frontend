import http from './http'

export const voterService = {
  candidates: () => http.get('/voter/candidates').then((r) => r.data.data),
  vote: (candidateId) => http.post('/voter/vote', { candidate_id: candidateId }).then((r) => r.data),
}
