<script setup lang="ts">
defineProps<{
  grandTotalCost: number
  totalWaste: number
}>()
function fmtRp(n: number) { return 'Rp ' + (n || 0).toLocaleString('id-ID') }
</script>

<template>
  <div class="rounded-2xl border bg-white p-4" style="border-color: var(--color-blue-100); box-shadow: 0 4px 20px rgba(46, 139, 192, 0.08);">
    <div class="flex items-center justify-between border-b py-2" style="border-color: var(--color-blue-100);">
      <span class="text-xs font-bold" style="color: var(--color-ink-700);">Total Modal Supplier</span>
      <span class="font-display text-lg font-bold" style="color: var(--color-blue-700);">{{ fmtRp(grandTotalCost) }}</span>
    </div>
    <div class="flex items-center justify-between pt-2">
      <span class="text-xs font-semibold" style="color: var(--color-ink-500);">Total Sisa Stok</span>
      <span class="font-display text-sm font-semibold" style="color: var(--color-ink-700);">{{ totalWaste }} pcs</span>
    </div>
  </div>
</template>
