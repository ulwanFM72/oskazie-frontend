<script setup>
import BaseModal from './BaseModal.vue'

defineProps({
  modelValue: { type: Boolean, default: false },
  candidate: { type: Object, default: null },
  canChoose: { type: Boolean, default: false },
})
const emit = defineEmits(['update:modelValue', 'choose'])
</script>

<template>
  <BaseModal
    :model-value="modelValue"
    size="lg"
    :title="candidate ? `Pasangan Calon Nomor ${candidate.number_order}` : ''"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <template v-if="candidate">
      <div class="row g-3 mb-3">
        <div class="col-sm-6">
          <div class="text-muted small">Ketua</div>
          <div class="fw-bold">{{ candidate.chairman_name }}</div>
          <div class="text-muted small">{{ candidate.chairman_class }}</div>
        </div>
        <div class="col-sm-6">
          <div class="text-muted small">Wakil Ketua</div>
          <div class="fw-bold">{{ candidate.vice_name }}</div>
          <div class="text-muted small">{{ candidate.vice_class }}</div>
        </div>
      </div>
      <template v-for="section in [['Visi', candidate.vision], ['Misi', candidate.mission], ['Program kerja', candidate.work_program], ['Profil', candidate.profile]]" :key="section[0]">
        <div v-if="section[1]" class="mb-3">
          <h3 class="h6 text-primary">{{ section[0] }}</h3>
          <div class="osk-prewrap">{{ section[1] }}</div>
        </div>
      </template>
    </template>
    <template #footer>
      <button type="button" class="btn btn-light" @click="emit('update:modelValue', false)">Tutup</button>
      <button v-if="canChoose" type="button" class="btn btn-primary" @click="emit('choose', candidate)">Pilih nomor ini</button>
    </template>
  </BaseModal>
</template>
