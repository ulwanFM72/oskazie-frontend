import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

import AdminLayout from '@/layouts/AdminLayout.vue'
import PublicLayout from '@/layouts/PublicLayout.vue'

const routes = [
  {
    path: '/',
    component: PublicLayout,
    children: [
      {
        path: '',
        name: 'voter-login',
        component: () => import('@/views/VoterLoginView.vue'),
        meta: { title: 'Masuk Pemilih', guestOnly: true },
      },
      {
        path: 'vote',
        name: 'vote',
        component: () => import('@/views/VoteView.vue'),
        meta: { title: 'Bilik Suara', role: 'voter' },
      },
      {
        path: 'hasil',
        name: 'public-results',
        component: () => import('@/views/PublicResultsView.vue'),
        meta: { title: 'Hasil Pemilihan' },
      },
      {
        path: 'admin/login',
        name: 'admin-login',
        component: () => import('@/views/AdminLoginView.vue'),
        meta: { title: 'Masuk Administrator', guestOnly: true },
      },
    ],
  },
  {
    path: '/admin',
    component: AdminLayout,
    meta: { role: 'admin' },
    redirect: { name: 'admin-dashboard' },
    children: [
      { path: 'dashboard', name: 'admin-dashboard', component: () => import('@/views/AdminDashboardView.vue'), meta: { title: 'Dashboard' } },
      { path: 'voters', name: 'admin-voters', component: () => import('@/views/AdminVotersView.vue'), meta: { title: 'Data Pemilih' } },
      { path: 'candidates', name: 'admin-candidates', component: () => import('@/views/AdminCandidatesView.vue'), meta: { title: 'Paslon' } },
      { path: 'election', name: 'admin-election', component: () => import('@/views/AdminElectionView.vue'), meta: { title: 'Periode Pemilihan' } },
      { path: 'attendance', name: 'admin-attendance', component: () => import('@/views/AdminAttendanceView.vue'), meta: { title: 'Kehadiran' } },
      { path: 'non-voters', name: 'admin-non-voters', component: () => import('@/views/AdminNonVotersView.vue'), meta: { title: 'Daftar Belum Memilih' } },
      { path: 'results', name: 'admin-results', component: () => import('@/views/AdminResultsView.vue'), meta: { title: 'Hasil dan Laporan' } },
      { path: 'announcements', name: 'admin-announcements', component: () => import('@/views/AdminAnnouncementsView.vue'), meta: { title: 'Pengumuman' } },
      { path: 'audit-logs', name: 'admin-audit', component: () => import('@/views/AdminAuditLogView.vue'), meta: { title: 'Audit Log' } },
    ],
  },
  {
    path: '/:pathMatch(.*)*',
    component: PublicLayout,
    children: [
      { path: '', name: 'not-found', component: () => import('@/views/NotFoundView.vue'), meta: { title: 'Tidak ditemukan' } },
    ],
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior: () => ({ top: 0 }),
})

router.beforeEach((to) => {
  const auth = useAuthStore()
  const requiredRole = to.matched.find((r) => r.meta.role)?.meta.role

  if (requiredRole && auth.role !== requiredRole) {
    return requiredRole === 'admin'
      ? { name: 'admin-login', query: { redirect: to.fullPath } }
      : { name: 'voter-login' }
  }

  if (to.meta.guestOnly && auth.isAuthenticated) {
    return { name: auth.role === 'admin' ? 'admin-dashboard' : 'vote' }
  }
})

router.afterEach((to) => {
  document.title = to.meta.title ? `${to.meta.title} · OSKAZIE` : 'OSKAZIE'
})

export default router
