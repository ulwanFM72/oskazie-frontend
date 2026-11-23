<script setup>
import { nextTick, onBeforeUnmount, ref, watch } from 'vue'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  title: { type: String, default: '' },
  size: { type: String, default: 'md' }, // sm | md | lg
  persistent: { type: Boolean, default: false }, // tidak menutup lewat klik latar / ESC / tombol X
})
const emit = defineEmits(['update:modelValue'])

const dialog = ref(null)
let previouslyFocused = null

function close() {
  if (!props.persistent) emit('update:modelValue', false)
}

function onKey(event) {
  if (event.key === 'Escape') close()
}

function release() {
  document.body.classList.remove('osk-modal-open')
  document.removeEventListener('keydown', onKey)
}

watch(
  () => props.modelValue,
  async (open) => {
    if (open) {
      previouslyFocused = document.activeElement
      document.body.classList.add('osk-modal-open')
      document.addEventListener('keydown', onKey)
      await nextTick()
      dialog.value?.focus()
    } else {
      release()
      previouslyFocused?.focus?.()
    }
  },
)

onBeforeUnmount(release)
</script>

<template>
  <Teleport to="body">
    <Transition name="osk-fade">
      <div v-if="modelValue" class="osk-modal-backdrop" @mousedown.self="close">
        <div ref="dialog" class="osk-modal" :class="`osk-modal-${size}`" role="dialog" aria-modal="true" :aria-label="title" tabindex="-1">
          <div class="osk-modal-header">
            <h2 class="h5 mb-0">{{ title }}</h2>
            <button v-if="!persistent" type="button" class="btn-close" aria-label="Tutup" @click="close"></button>
          </div>
          <div class="osk-modal-body"><slot /></div>
          <div v-if="$slots.footer" class="osk-modal-footer"><slot name="footer" /></div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
