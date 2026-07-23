<script setup lang="ts">
import { useInventoryStore } from '~/stores/inventory'
import { usePackageStore } from '~/stores/packages'

definePageMeta({ title: 'Update Stok' })

const invStore = useInventoryStore()
const pkgStore = usePackageStore()

onMounted(async () => {
  await Promise.all([
    pkgStore.ensureLoaded(),
    invStore.ensureLoaded(),
  ])
})
</script>

<template>
  <div class="slide-up space-y-4">
    <div class="flex items-center gap-2">
      <button class="rounded-xl px-3 py-2 text-xs font-bold text-white active:scale-90" style="background: var(--color-blue-500);" @click="navigateTo('/')">← Kembali</button>
      <span class="text-xs font-semibold" style="color: var(--color-ink-500);">/ 📦 Update Stok</span>
    </div>

    <div class="rounded-2xl border p-3.5" style="background: linear-gradient(135deg, #059669, #047857); color: white; border: none;">
      <div class="flex items-center gap-2 mb-1">
        <span class="text-lg">📦</span>
        <span class="font-display text-sm font-bold opacity-90">Update Stok Inventory</span>
      </div>
      <div class="text-xs font-semibold opacity-75">Cek freezer, isi stok terkini sebelum kalkulasi belanja.</div>
    </div>

    <ClientOnly>
      <InventoryInput />
    </ClientOnly>

    <button class="w-full rounded-2xl py-4 font-display text-base font-semibold text-white shadow-lg transition-transform active:scale-[0.98]"
      style="background: linear-gradient(135deg, var(--color-blue-400), var(--color-blue-600)); box-shadow: 0 8px 24px rgba(46, 139, 192, 0.35);"
      @click="navigateTo('/')">✓ Selesai, Kembali ke Dashboard</button>
  </div>
</template>
