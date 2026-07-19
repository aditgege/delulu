<script setup lang="ts">
import { usePackageStore } from '~/stores/packages'

definePageMeta({ title: 'Kebutuhan & Rekomendasi' })

const pkgStore = usePackageStore()

defineProps<{
  recommendations: Array<{
    skuId: string; skuName: string; netNeed: number
    chosenPack: { mediumPacks: number; largePacks: number; totalUnits: number; waste: number; totalCost: number }
  }>
}>()

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

function e(id: string) { return emojiMap[id] || '📦' }
function packLabel(skuId: string, label: string) { return pkgStore.getSupplierPack(skuId).find(p => p.label === label) }
function fmtRp(n: number) { return 'Rp ' + (n || 0).toLocaleString('id-ID') }
</script>

<template>
  <div class="space-y-2">
    <div
      v-for="rec in recommendations"
      :key="rec.skuId"
      class="flex items-center gap-3 rounded-2xl border bg-white p-3.5"
      style="border-color: var(--color-blue-100); box-shadow: 0 4px 20px rgba(46, 139, 192, 0.08);"
    >
      <div
        class="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-xl"
        style="background: var(--color-cream-100);"
      >{{ e(rec.skuId) }}</div>
      <div class="min-w-0 flex-1">
        <div class="font-display text-sm font-semibold" style="color: var(--color-ink-900);">{{ rec.skuName }}</div>
        <div class="mt-0.5 text-xs font-semibold" style="color: var(--color-ink-500);">
          <span v-if="rec.chosenPack.mediumPacks > 0"><span style="color: var(--color-blue-600);">{{ rec.chosenPack.mediumPacks }} Medium</span> </span>
          <span v-if="rec.chosenPack.largePacks > 0"><span style="color: var(--color-orange-500);">{{ rec.chosenPack.largePacks }} Large</span></span>
          <span class="ml-1">· {{ rec.chosenPack.totalUnits }} pcs</span>
        </div>
        <div v-if="rec.chosenPack.waste > 0" class="mt-0.5">
          <span class="inline-block rounded-md px-1.5 py-0.5 text-[10px] font-bold" style="background: var(--color-orange-100); color: #C56F1B;">
            sisa {{ rec.chosenPack.waste }}
          </span>
        </div>
      </div>
      <div class="text-right shrink-0">
        <div class="font-display text-base font-semibold" style="color: var(--color-blue-700);">{{ fmtRp(rec.chosenPack.totalCost) }}</div>
      </div>
    </div>
  </div>
</template>
