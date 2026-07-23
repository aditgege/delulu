<script setup lang="ts">
import { usePackageStore } from '~/stores/packages'
import { usePoStore } from '~/stores/po'

definePageMeta({ title: 'Detail Pre-Order' })

const route = useRoute()
const poId = computed(() => route.params.id as string)
const loading = ref(true)

onMounted(async () => {
  await Promise.all([
    usePackageStore().ensureLoaded(),
    usePoStore().ensureLoaded(),
  ])
  loading.value = false
})
</script>

<template>
  <div class="slide-up">
    <div v-if="loading" class="space-y-3">
      <div class="animate-pulse rounded-2xl border p-4 space-y-3" style="border-color: var(--color-blue-100);">
        <div class="h-4 w-32 rounded-lg" style="background: var(--color-blue-100);" />
        <div class="h-10 w-full rounded-xl" style="background: var(--color-blue-100);" />
        <div v-for="i in 3" :key="i" class="h-20 rounded-2xl" style="background: var(--color-cream-100);" />
      </div>
    </div>
    <POManagerPOS v-else-if="poId" :po-id="poId" />
    <div v-else class="py-16 text-center text-sm font-semibold" style="color: var(--color-ink-500);">PO tidak ditemukan</div>
  </div>
</template>
