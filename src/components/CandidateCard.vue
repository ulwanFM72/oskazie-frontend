<script setup>
import { ref } from 'vue'

defineProps({
  candidate: { type: Object, required: true },
  selectable: { type: Boolean, default: true },
})
defineEmits(['select', 'detail'])

const imageFailed = ref(false)
</script>

<template>
  <article class="card osk-candidate h-100">
    <div class="osk-candidate-photo">
      <img
        v-if="candidate.photo_url && !imageFailed"
        :src="candidate.photo_url"
        :alt="`Foto pasangan calon nomor ${candidate.number_order}`"
        loading="lazy"
        @error="imageFailed = true"
      />
      <div v-else class="osk-candidate-placeholder" aria-hidden="true">{{ candidate.number_order }}</div>
      <span class="osk-candidate-number" aria-label="Nomor urut">{{ candidate.number_order }}</span>
    </div>

    <div class="card-body d-flex flex-column gap-3">
      <div>
        <div class="text-muted small">Ketua</div>
        <div class="fw-bold">{{ candidate.chairman_name }}</div>
        <div class="text-muted small">{{ candidate.chairman_class }}</div>
      </div>
      <div>
        <div class="text-muted small">Wakil Ketua</div>
        <div class="fw-bold">{{ candidate.vice_name }}</div>
        <div class="text-muted small">{{ candidate.vice_class }}</div>
      </div>
      <p v-if="candidate.vision" class="osk-clamp-3 text-muted small mb-0">{{ candidate.vision }}</p>

      <div class="mt-auto d-grid gap-2">
        <button type="button" class="btn btn-outline-primary" @click="$emit('detail', candidate)">
          <i class="bi bi-card-text me-1"></i>Lihat visi &amp; misi
        </button>
        <button v-if="selectable" type="button" class="btn btn-primary btn-lg" @click="$emit('select', candidate)">
          Pilih Nomor {{ candidate.number_order }}
        </button>
        <slot name="actions" />
      </div>
    </div>
  </article>
</template>
