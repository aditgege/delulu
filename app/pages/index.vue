<script setup lang="ts">
import { useOrderStore } from '~/stores/orders'
import { useInventoryStore } from '~/stores/inventory'
import { usePackageStore } from '~/stores/packages'

definePageMeta({ title: 'Pesanan Hari Ini' })

const orderStore = useOrderStore()
const invStore = useInventoryStore()
const pkgStore = usePackageStore()

const greeting = (() => {
  const h = new Date().getHours()
  if (h < 11) return 'Selamat pagi'
  if (h < 15) return 'Selamat siang'
  if (h < 18) return 'Selamat sore'
  return 'Selamat malam'
})()

const totalStock = computed(() => invStore.getAllEntries().reduce((s, e) => s + e.qtyOnHand, 0))
const hasOrders = computed(() => orderStore.hasOrders())

function goToResults() { if (hasOrders.value) navigateTo('/rekomendasi') }
</script>

<template>
  <div class="slide-up space-y-4">
    <div class="rounded-2xl border p-4" style="background: var(--color-blue-50); border-color: var(--color-blue-100);">
      <div class="text-xs font-semibold" style="color: var(--color-ink-500);">{{ greeting }},</div>
      <div class="font-display text-xl font-semibold" style="color: var(--color-ink-900);">Mau pesen apa hari ini? 🌸</div>
      <div class="mt-1.5 text-xs font-semibold" style="color: var(--color-ink-500);">Masukkan jumlah paket, StokCeria hitung kebutuhan supplier-nya.</div>
    </div>

    <div class="flex items-center gap-2.5">
      <div class="flex h-8 w-8 items-center justify-center rounded-xl text-sm" style="background: var(--color-cream-200);">📋</div>
      <span class="font-display text-base font-semibold" style="color: var(--color-ink-900);">Paket Hari Ini</span>
      <span
        v-if="orderStore.getTotalPackages() > 0"
        class="ml-auto rounded-full px-2.5 py-0.5 text-xs font-bold"
        style="background: var(--color-blue-100); color: var(--color-blue-700);"
      >{{ orderStore.getTotalPackages() }} pcs</span>
    </div>

    <OrderForm />

    <div
      v-if="totalStock === 0"
      class="rounded-2xl border p-3.5"
      style="background: var(--color-cream-100); border-color: var(--color-cream-200);"
    >
      <div class="flex items-start gap-2.5">
        <span class="text-xl">💡</span>
        <div>
          <div class="text-sm font-bold" style="color: var(--color-ink-900);">Belum ada stok tercatat</div>
          <div class="mt-0.5 text-xs font-semibold" style="color: var(--color-ink-500);">Buka "Atur Stok Awal" di bawah kalau masih ada sisa produksi kemarin.</div>
        </div>
      </div>
    </div>

    <InventoryInput />

    <div class="pt-2">
      <button
        class="w-full rounded-2xl py-4 font-display text-base font-semibold text-white shadow-lg transition-transform active:scale-[0.98] disabled:opacity-50"
        :disabled="!hasOrders"
        style="background: linear-gradient(135deg, var(--color-blue-400), var(--color-blue-600)); box-shadow: 0 8px 24px rgba(46, 139, 192, 0.35);"
        @click="goToResults"
      >🧮 Hitung Kebutuhan</button>
    </div>
  </div>
</template>
