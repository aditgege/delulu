<script setup lang="ts">
defineProps<{
  needs: Array<{ skuId: string; skuName: string; grossNeed: number; stockOnHand: number; netNeed: number }>
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
</script>

<template>
  <div class="space-y-1">
    <div
      v-for="need in needs"
      :key="need.skuId"
      class="flex items-center gap-3 border-b py-2.5"
      style="border-color: var(--color-blue-100);"
    >
      <span class="text-lg shrink-0">{{ e(need.skuId) }}</span>
      <span class="flex-1 text-sm font-semibold min-w-0" style="color: var(--color-ink-900);">{{ need.skuName }}</span>
      <div class="text-right shrink-0">
        <span class="font-display text-lg font-semibold" style="color: var(--color-blue-700);">{{ need.netNeed > 0 ? need.netNeed : '-' }}</span>
        <div v-if="need.grossNeed !== need.netNeed" class="text-[10px] font-semibold" style="color: var(--color-ink-500);">
          butuh {{ need.grossNeed }} · stok {{ need.stockOnHand }}
        </div>
      </div>
    </div>
  </div>
</template>
