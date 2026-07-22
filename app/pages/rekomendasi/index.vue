<script setup lang="ts">
import { usePoStore } from '~/stores/po'
const poStore = usePoStore()
await poStore.ensureLoaded()
const active = poStore.getActiveOrders()
if (active.length > 0) {
  await navigateTo(`/rekomendasi/${active[0].id}`)
} else {
  await navigateTo('/')
}
</script>

<template>
  <div class="py-16 text-center font-semibold" style="color: var(--color-ink-500);">Mengarahkan...</div>
</template>
