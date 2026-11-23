<script setup>
import { onMounted, ref } from 'vue'
import EmptyState from '@/components/EmptyState.vue'
import ErrorAlert from '@/components/ErrorAlert.vue'
import LoadingState from '@/components/LoadingState.vue'
import PageHeader from '@/components/PageHeader.vue'
import ResultsReport from '@/components/ResultsReport.vue'
import { publicService } from '@/services/publicService'

const loading = ref(true)
const error = ref('')
const notPublished = ref(false)
const data = ref(null)

async function load() {
  loading.value = true
  error.value = ''
  notPublished.value = false
  try {
    data.value = await publicService.results()
  } catch (e) {
    if (e.code === 'results_not_published') notPublished.value = true
    else error.value = e.message
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>

<template>
  <div class="osk-wide">
    <PageHeader title="Hasil Pemilihan" subtitle="Hasil resmi pemilihan Ketua dan Wakil Ketua OSIS.">
      <template #actions>
        <RouterLink :to="{ name: 'voter-login' }" class="btn btn-outline-primary btn-sm"><i class="bi bi-arrow-left me-1"></i>Halaman awal</RouterLink>
      </template>
    </PageHeader>

    <LoadingState v-if="loading" text="Memuat hasil..." />
    <ErrorAlert v-else-if="error" :message="error" @retry="load" />
    <EmptyState v-else-if="notPublished" icon="bi-hourglass-split" title="Hasil belum dipublikasikan" text="Hasil akan tampil di sini setelah panitia mempublikasikannya." />
    <ResultsReport v-else-if="data" :data="data" />
  </div>
</template>
