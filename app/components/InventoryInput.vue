<script setup lang="ts">
import { useInventoryStore } from '~/stores/inventory'
import { usePackageStore } from '~/stores/packages'

const invStore = useInventoryStore()
const pkgStore = usePackageStore()
const skus = computed(() => pkgStore.getAllSkus())
const isOpen = ref(false)

const emojiMap: Record<string, string> = {
  'siomay-ayam': '🥟', 'siomay-udang': '🍤', 'siomay-kepiting': '🦀',
  'siomay-seafood': '🦐', 'siomay-nori': '🌿', 'siomay-mozzarella': '🧀',
  'siomay-mercon': '🌶️', 'gyoza-ayam': '🥟', 'gyoza-ayam-udang': '🥟',
  'bakpao-ayam': '🥟', 'bakpao-susu': '🥛', 'bakpao-cokelat': '🍫',
  'shisitkau': '🥢', 'lumpia-tahu-ayam': '🌯', 'lumpia-tahu-udang': '🥟',
  'angsio': '🍲', 'hakau': '🥟',
  'ayam-bola-keju': '🧀', 'pangsit-ayam': '🥟', 'pangsit-udang': '🥟',
  'ekado': '🥟', 'kumis-naga': '🐉', 'kuotie': '🥟', 'wonton': '🥟',
  'cakue-goreng-udang': '🦐', 'lumpia-goreng-ayam': '🌯', 'lumpia-goreng-udang': '🌯',
  'lumpia-goreng-keju': '🧀', 'gohyong': '🥟',
  'pangsit-ayam-rebus': '🥟',
  'chicken-drumstick': '🍗', 'kani-roll': '🦀', 'egg-chicken-roll': '🥚',
  'kaki-naga': '🐉', 'chicken-katsu': '🍗',
}

	function inc(id: string) { invStore.setStock(id, invStore.getStock(id) + 10) }
	function dec(id: string) { invStore.setStock(id, invStore.getStock(id) - 10) }
	function onInput(id: string, e: Event) {
	  const val = parseInt((e.target as HTMLInputElement).value, 10)
	  invStore.setStock(id, isNaN(val) ? 0 : val)
	}
</script>

<template>
  <div class="rounded-2xl border" style="border-color: var(--color-blue-100);">
    <button
      class="flex w-full items-center gap-2 px-4 py-3 text-sm font-bold transition-colors"
      style="color: var(--color-ink-700);"
      @click="isOpen = !isOpen"
    >
      📦 Atur Stok Awal <span class="text-xs font-semibold" style="color: var(--color-ink-500);">(opsional)</span>
      <span class="ml-auto transition-transform" :class="isOpen ? 'rotate-180' : ''">▾</span>
    </button>

    <div v-if="isOpen" class="border-t px-4 pb-3 pt-2" style="border-color: var(--color-blue-100);">
      <div class="mb-2 text-xs font-semibold" style="color: var(--color-ink-500);">Sisa produksi kemarin? Masukin biar dikurangi dari pembelian.</div>

      <div class="space-y-1">
        <div
          v-for="sku in skus"
          :key="sku.id"
          class="flex items-center gap-2.5 border-b py-2.5"
          style="border-color: var(--color-blue-100);"
        >
          <span class="text-lg">{{ emojiMap[sku.id] || '📦' }}</span>
          <span class="flex-1 text-xs font-semibold" style="color: var(--color-ink-700);">{{ sku.name }}</span>
          <div class="flex items-center gap-1">
            <button
              class="flex h-6 w-6 items-center justify-center rounded-lg border text-xs font-bold transition-colors active:scale-90"
              style="border-color: var(--color-blue-200); background: white; color: var(--color-blue-600);"
              @click="dec(sku.id)"
            >−</button>
            <input
              type="number"
              :value="invStore.getStock(sku.id)"
              inputmode="numeric"
              class="w-9 text-center font-display text-sm font-semibold outline-none"
              :class="{ 'text-red-500': invStore.getStock(sku.id) < 0 }"
              :style="{ background: 'transparent' }"
              @input="onInput(sku.id, $event)"
            />
            <button
              class="flex h-6 w-6 items-center justify-center rounded-lg border text-xs font-bold text-white transition-colors active:scale-90"
              style="background: var(--color-blue-500); border-color: var(--color-blue-500);"
              @click="inc(sku.id)"
            >+</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
