<script setup lang="ts">
import { usePoStore } from '~/stores/po'

definePageMeta({ title: 'Pesanan Hari Ini' })

const poStore = usePoStore()
onMounted(() => { poStore.ensureLoaded() })

const greeting = (() => {
  const h = new Date().getHours()
  if (h < 11) return 'Selamat pagi'
  if (h < 15) return 'Selamat siang'
  if (h < 18) return 'Selamat sore'
  return 'Selamat malam'
})()
</script>

<template>
  <div class="slide-up space-y-4">
    <div class="rounded-2xl border p-4" style="background: var(--color-blue-50); border-color: var(--color-blue-100);">
      <div class="text-xs font-semibold" style="color: var(--color-ink-500);">{{ greeting }},</div>
      <div class="font-display text-xl font-semibold" style="color: var(--color-ink-900);">Mau pesen apa hari ini? 🧾</div>
      <div class="mt-1.5 text-xs font-semibold" style="color: var(--color-ink-500);">Catat pesanan pelanggan, StokCeria urus sisanya.</div>
    </div>

    <ClientOnly>
      <POManager />
      <template #fallback>
        <div class="rounded-2xl border p-4 text-center" style="background: var(--color-cream-100); border-color: var(--color-cream-200);">
          <div class="text-sm font-semibold" style="color: var(--color-ink-500);">Memuat...</div>
        </div>
      </template>
    </ClientOnly>
  </div>
</template>
