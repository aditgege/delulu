<script setup lang="ts">
import { usePackageStore } from '~/stores/packages'
import { useOrderStore } from '~/stores/orders'

const pkgStore = usePackageStore()
const orderStore = useOrderStore()
const packages = computed(() => pkgStore.getAllPackages())

const emojiMap: Record<string, string> = {
  'paket-halu': '🌟', 'paket-when-ya': '✨', 'paket-solulu': '🌈',
}
const emojiBg: Record<string, string> = {
  'paket-halu': 'var(--color-blue-100)',
  'paket-when-ya': 'var(--color-cream-200)',
  'paket-solulu': 'var(--color-pink-100)',
}

function totalPcsFor(pkgId: string): number {
  const pkg = pkgStore.getPackageById(pkgId)
  if (!pkg) return 0
  return pkg.bom.reduce((s, b) => s + b.qty, 0)
}

function incQty(id: string) { orderStore.setQty(id, (orderStore.getQty(id) || 0) + 1) }
function decQty(id: string) { orderStore.setQty(id, Math.max(0, (orderStore.getQty(id) || 0) - 1)) }
function onQtyInput(pkgId: string, e: Event) {
  const val = parseInt((e.target as HTMLInputElement).value, 10)
  orderStore.setQty(pkgId, isNaN(val) ? 0 : Math.max(0, val))
}
function getQty(id: string) { return orderStore.getQty(id) }
</script>

<template>
  <div class="space-y-2">
    <div
      v-for="pkg in packages"
      :key="pkg.id"
      class="flex items-center gap-3 rounded-2xl border bg-white p-3.5"
      style="border-color: var(--color-blue-100); box-shadow: 0 4px 20px rgba(46, 139, 192, 0.08);"
    >
      <div
        class="flex h-13 w-13 shrink-0 items-center justify-center rounded-2xl text-2xl"
        :style="{ background: emojiBg[pkg.id] || 'var(--color-blue-100)' }"
      >{{ emojiMap[pkg.id] || '📦' }}</div>

      <div class="min-w-0 flex-1">
        <div class="font-display text-base font-semibold" style="color: var(--color-ink-900);">{{ pkg.name }}</div>
        <div class="mt-0.5 text-xs font-semibold" style="color: var(--color-ink-500);">{{ totalPcsFor(pkg.id) }} pcs/paket</div>
        <div v-if="getQty(pkg.id) > 0" class="mt-1 text-xs font-semibold" style="color: var(--color-blue-600);">
          {{ getQty(pkg.id) }} paket · {{ getQty(pkg.id) * totalPcsFor(pkg.id) }} pcs
        </div>
      </div>

      <div
        class="flex shrink-0 items-center gap-1.5 rounded-full px-1 py-1"
        style="background: var(--color-cream-50); border: 1.5px solid var(--color-cream-200);"
      >
        <button
          class="flex h-9 w-9 items-center justify-center rounded-full text-lg font-bold shadow-sm transition-transform active:scale-90"
          :disabled="getQty(pkg.id) <= 0"
          style="background: white; color: var(--color-blue-600); box-shadow: 0 2px 6px rgba(46, 139, 192, 0.12);"
          @click="decQty(pkg.id)"
        >−</button>
        <input
          type="number"
          :value="getQty(pkg.id)"
          min="0"
          inputmode="numeric"
          class="w-8 text-center font-display text-lg font-semibold outline-none"
          style="color: var(--color-ink-900); background: transparent;"
          @input="onQtyInput(pkg.id, $event)"
        />
        <button
          class="flex h-9 w-9 items-center justify-center rounded-full text-lg font-bold text-white shadow-sm transition-transform active:scale-90"
          style="background: linear-gradient(135deg, var(--color-blue-400), var(--color-blue-500));"
          @click="incQty(pkg.id)"
        >+</button>
      </div>
    </div>
  </div>
</template>
