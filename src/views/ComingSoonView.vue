<script setup>
import { useRoute } from 'vue-router'

// Penampung untuk halaman yang dibangun pada Tahap 6. Judul diambil dari meta rute.
const route = useRoute()
</script>

<template>
  <div class="osk-empty py-5">
    <i class="bi bi-tools"></i>
    <h1 class="h5 mt-2 mb-1">{{ route.meta.title }}</h1>
    <p class="text-muted mb-0">Halaman ini dibuat pada Tahap 6.</p>
  </div>
</template>
