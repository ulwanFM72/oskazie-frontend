<script setup>
import BaseModal from './BaseModal.vue'

defineProps({
  modelValue: { type: Boolean, default: false },
  title: { type: String, required: true },
  message: { type: String, default: '' },
  confirmText: { type: String, default: 'Ya, lanjutkan' },
  cancelText: { type: String, default: 'Batal' },
  variant: { type: String, default: 'primary' }, // primary | danger
  loading: { type: Boolean, default: false },
})
const emit = defineEmits(['update:modelValue', 'confirm'])
</script>

<template>
  <BaseModal :model-value="modelValue" :title="title" size="sm" :persistent="loading" @update:model-value="emit('update:modelValue', $event)">
    <p v-if="message" class="mb-0">{{ message }}</p>
    <slot />
    <template #footer>
      <button type="button" class="btn btn-light" :disabled="loading" @click="emit('update:modelValue', false)">{{ cancelText }}</button>
      <button type="button" class="btn" :class="variant === 'danger' ? 'btn-danger' : 'btn-primary'" :disabled="loading" @click="emit('confirm')">
        <span v-if="loading" class="spinner-border spinner-border-sm me-2" aria-hidden="true"></span>
        {{ confirmText }}
      </button>
    </template>
  </BaseModal>
</template>
