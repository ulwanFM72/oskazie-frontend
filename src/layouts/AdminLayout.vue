<script setup>
import { ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AdminSidebar from '@/components/AdminSidebar.vue'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
const route = useRoute()
const router = useRouter()
const sidebarOpen = ref(false)

watch(() => route.fullPath, () => {
  sidebarOpen.value = false
})

async function logout() {
  await auth.logout()
  router.replace({ name: 'admin-login' })
}
</script>

<template>
  <div class="osk-admin">
    <AdminSidebar :open="sidebarOpen" @close="sidebarOpen = false" />
    <div v-if="sidebarOpen" class="osk-backdrop" @click="sidebarOpen = false"></div>

    <div class="osk-admin-main">
      <header class="osk-topbar">
        <button type="button" class="btn btn-light d-lg-none" aria-label="Buka menu" @click="sidebarOpen = true">
          <i class="bi bi-list fs-5"></i>
        </button>
        <div class="ms-auto d-flex align-items-center gap-3">
          <div class="text-end d-none d-sm-block">
            <div class="fw-semibold small">{{ auth.user?.name }}</div>
            <div class="text-muted small">Administrator</div>
          </div>
          <button type="button" class="btn btn-outline-primary btn-sm" @click="logout">
            <i class="bi bi-box-arrow-right me-1"></i>Keluar
          </button>
        </div>
      </header>

      <main class="osk-admin-content">
        <RouterView />
      </main>
    </div>
  </div>
</template>
