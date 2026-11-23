<script setup>
defineProps({ message: { type: String, required: true } })
defineEmits(['retry'])
</script>

<template>
  <div class="alert alert-danger d-flex align-items-center gap-3" role="alert">
    <i class="bi bi-exclamation-octagon-fill fs-5"></i>
    <div class="flex-grow-1">{{ message }}</div>
    <button type="button" class="btn btn-sm btn-outline-danger" @click="$emit('retry')">
      <i class="bi bi-arrow-clockwise me-1"></i>Coba lagi
    </button>
  </div>
</template>
