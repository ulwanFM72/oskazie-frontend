<script setup>
import { APP_NAME, SCHOOL_NAME } from '@/config';
import logoOsis from '@/assets/logo-osis.png';
</script>

<template>
  <div class="osk-public">
    <header class="osk-public-header">
      <img :src="logoOsis" class="osk-logo" alt="Logo OSIS" />
      <div>
        <div class="fw-bold lh-1">{{ APP_NAME }}</div>
        <small class="text-muted">Pemilihan Ketua &amp; Wakil Ketua OSIS {{ SCHOOL_NAME }}</small>
      </div>
    </header>

    <main class="osk-public-main">
      <RouterView />
    </main>

    <footer class="osk-public-footer">
      <small class="text-muted">&copy; OSIS {{ SCHOOL_NAME }}</small>
    </footer>
  </div>
</template>
