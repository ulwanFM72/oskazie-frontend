<script setup>
import { APP_NAME, SCHOOL_NAME } from '@/config';
import logoOsis from '@/assets/logo-osis.png';

defineProps({ open: { type: Boolean, default: false } });
defineEmits(['close']);

const items = [
  { to: 'admin-dashboard', icon: 'bi-speedometer2', label: 'Dashboard' },
  { to: 'admin-voters', icon: 'bi-people', label: 'Data Pemilih' },
  { to: 'admin-candidates', icon: 'bi-person-badge', label: 'Paslon' },
  { to: 'admin-election', icon: 'bi-calendar-event', label: 'Periode Pemilihan' },
  { to: 'admin-attendance', icon: 'bi-clipboard-check', label: 'Kehadiran' },
  { to: 'admin-non-voters', icon: 'bi-person-x', label: 'Daftar Belum Memilih' },
  { to: 'admin-results', icon: 'bi-bar-chart-line', label: 'Hasil' },
  { to: 'admin-announcements', icon: 'bi-megaphone', label: 'Pengumuman' },
  { to: 'admin-audit', icon: 'bi-journal-text', label: 'Audit Log' },
];
</script>

<template>
  <aside class="osk-sidebar" :class="{ 'is-open': open }" aria-label="Menu admin">
    <div class="osk-sidebar-brand">
      <img :src="logoOsis" class="osk-logo" alt="Logo OSIS" />
      <div>
        <div class="fw-bold lh-1">{{ APP_NAME }}</div>
        <small class="opacity-75">{{ SCHOOL_NAME }}</small>
      </div>
      <button type="button" class="btn-close btn-close-white ms-auto d-lg-none" aria-label="Tutup menu" @click="$emit('close')"></button>
    </div>

    <nav class="osk-nav">
      <RouterLink v-for="item in items" :key="item.to" :to="{ name: item.to }" class="osk-nav-link">
        <i class="bi" :class="item.icon"></i>
        <span>{{ item.label }}</span>
      </RouterLink>
    </nav>
  </aside>
</template>
