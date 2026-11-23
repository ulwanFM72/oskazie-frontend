import { createApp } from 'vue'
import { createPinia } from 'pinia'

import '@fontsource-variable/inter'
import 'bootstrap/dist/css/bootstrap.min.css'
import 'bootstrap-icons/font/bootstrap-icons.css'
import '@/assets/main.css'
import '@/assets/ui.css'

import App from './App.vue'
import router from './router'
import { useAuthStore } from '@/stores/auth'
import { setUnauthorizedHandler } from '@/services/http'

const app = createApp(App)
app.use(createPinia())
app.use(router)

// Token ditolak server (kedaluwarsa/dicabut): bersihkan sesi dan kembali ke halaman login.
setUnauthorizedHandler(() => {
  const auth = useAuthStore()
  const wasAdmin = auth.role === 'admin'
  auth.clear()
  router.replace({ name: wasAdmin ? 'admin-login' : 'voter-login', query: { expired: '1' } })
})

app.mount('#app')
