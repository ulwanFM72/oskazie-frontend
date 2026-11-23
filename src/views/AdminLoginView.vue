<script setup>
import { reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
const route = useRoute()
const router = useRouter()

const form = reactive({ username: '', password: '' })
const loading = ref(false)
const error = ref('')

// Hanya izinkan redirect ke dalam /admin (cegah open redirect).
function safeRedirect() {
  const target = String(route.query.redirect ?? '')
  return target.startsWith('/admin') && !target.startsWith('//') ? target : { name: 'admin-dashboard' }
}

async function submit() {
  error.value = ''
  if (!form.username.trim() || !form.password) {
    error.value = 'Username dan password wajib diisi.'
    return
  }

  loading.value = true
  try {
    await auth.loginAdmin(form.username.trim(), form.password)
    router.replace(safeRedirect())
  } catch (e) {
    error.value = e.message
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="osk-card-narrow">
    <div class="card">
      <div class="card-body p-4">
        <h1 class="h4 mb-1">Masuk Administrator</h1>
        <p class="text-muted small mb-4">Khusus pengelola pemilihan.</p>

        <div v-if="route.query.expired" class="alert alert-warning small" role="alert">
          Sesi Anda berakhir. Silakan masuk lagi.
        </div>
        <div v-if="error" class="alert alert-danger small" role="alert">{{ error }}</div>

        <form novalidate @submit.prevent="submit">
          <div class="mb-3">
            <label for="username" class="form-label">Username</label>
            <input id="username" v-model="form.username" class="form-control" autocomplete="username" autofocus />
          </div>
          <div class="mb-4">
            <label for="password" class="form-label">Password</label>
            <input id="password" v-model="form.password" type="password" class="form-control" autocomplete="current-password" />
          </div>
          <button type="submit" class="btn btn-primary w-100" :disabled="loading">
            <span v-if="loading" class="spinner-border spinner-border-sm me-2" aria-hidden="true"></span>
            Masuk
          </button>
        </form>
      </div>
    </div>
  </div>
</template>
