<script setup>
import { useToast } from '@/composables/useToast'

const { toasts, remove } = useToast()

const icons = {
  success: 'bi-check-circle-fill',
  danger: 'bi-exclamation-octagon-fill',
  warning: 'bi-exclamation-triangle-fill',
  info: 'bi-info-circle-fill',
}
</script>

<template>
  <div class="osk-toasts" aria-live="polite">
    <TransitionGroup name="osk-toast">
      <div v-for="t in toasts" :key="t.id" class="osk-toast" :class="`osk-toast-${t.type}`" role="status">
        <i class="bi" :class="icons[t.type]"></i>
        <div class="flex-grow-1">{{ t.message }}</div>
        <button type="button" class="btn-close btn-sm" aria-label="Tutup" @click="remove(t.id)"></button>
      </div>
    </TransitionGroup>
  </div>
</template>
