<script setup lang="ts">
import { usePurchaseOptimizer } from '~/composables/usePurchaseOptimizer'
import { useOrderStore } from '~/stores/orders'
import { usePackageStore } from '~/stores/packages'
import { useInventoryStore } from '~/stores/inventory'

definePageMeta({ title: 'Rekomendasi Pembelian' })

const { result, loading, error, compute } = usePurchaseOptimizer()
const orderStore = useOrderStore()

onMounted(async () => {
  await Promise.all([
    usePackageStore().ensureLoaded(),
    useInventoryStore().ensureLoaded(),
  ])
  compute()
})

function fmtRp(n: number) { return 'Rp ' + (n || 0).toLocaleString('id-ID') }

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

const activeOrderCount = computed(() => orderStore.getOrderLines().filter(l => l.qty > 0).length)

function mixSummary() {
  const m = result.value?.mixRecommendation
  if (!m || m.mixes.length === 0) return ''
  return m.mixes.map(mx => `${mx.qty} ${mx.name}`).join(', ')
}
function individualSummary() {
  return result.value?.individualRecommendations?.map(r => {
    if (r.chosenPack.mediumPacks > 0 && r.chosenPack.largePacks > 0)
      return `${r.chosenPack.mediumPacks} ${r.skuName} Medium + ${r.chosenPack.largePacks} Large`
    if (r.chosenPack.mediumPacks > 0)
      return `${r.chosenPack.mediumPacks} ${r.skuName} Medium`
    return `${r.chosenPack.largePacks} ${r.skuName} Large`
  })?.join(', ') || ''
}
</script>

<template>
  <div class="slide-up space-y-4">
    <div v-if="loading" class="py-16 text-center font-semibold" style="color: var(--color-ink-500);">Menghitung...</div>

    <div v-else-if="error" class="space-y-4 py-8 text-center">
      <div class="text-sm font-semibold" style="color: #D44B4B;">{{ error }}</div>
      <button class="cta outline" @click="navigateTo('/')">Kembali ke Pesanan</button>
    </div>

    <template v-else-if="result">
      <!-- Hero -->
      <div class="hero-card pop">
        <div class="text-2xl mb-1">🛒</div>
        <div class="font-display text-lg font-semibold">Belanja ke supplier</div>
        <div class="font-display text-3xl font-bold mt-1">{{ fmtRp(result.grandTotalCost) }}</div>
        <div class="mt-1.5 text-xs font-medium opacity-90">
          {{ (result.mixRecommendation?.mixes.length || 0) + result.individualRecommendations.length }} item · {{ activeOrderCount }} jenis paket
        </div>
      </div>

      <!-- Summary -->
      <div class="rounded-2xl border p-3.5" style="background: var(--color-cream-100); border-color: var(--color-cream-200);">
        <div class="flex items-start gap-2.5">
          <span class="text-xl">📝</span>
          <div class="text-xs font-semibold leading-relaxed" style="color: var(--color-ink-900);">
            <template v-if="result.mixRecommendation && result.mixRecommendation.mixes.length > 0">
              Beli <b>{{ mixSummary() }}</b>.
            </template>
            <span v-if="result.individualRecommendations.length > 0">
              <template v-if="result.mixRecommendation && result.mixRecommendation.mixes.length > 0"> Lalu tambah </template>
              {{ individualSummary() }}.
            </span>
          </div>
        </div>
      </div>

      <!-- SKU needs -->
      <div class="flex items-center gap-2.5">
        <div class="flex h-8 w-8 items-center justify-center rounded-xl text-sm" style="background: var(--color-blue-100);">🧮</div>
        <span class="font-display text-base font-semibold" style="color: var(--color-ink-900);">Kebutuhan Variant</span>
        <span class="ml-auto rounded-full px-2 py-0.5 text-xs font-bold" style="background: var(--color-blue-100); color: var(--color-blue-700);">
          {{ result.needs.filter(n => n.grossNeed > 0).length }}
        </span>
      </div>
      <div class="rounded-2xl border bg-white px-4 py-2" style="border-color: var(--color-blue-100);">
        <SkuBreakdownTable :needs="result.needs.filter(n => n.grossNeed > 0)" />
      </div>

      <!-- Mix Paket recommendation -->
      <template v-if="result.mixRecommendation && result.mixRecommendation.mixes.length > 0">
        <div class="flex items-center gap-2.5">
          <div class="flex h-8 w-8 items-center justify-center rounded-xl text-sm" style="background: var(--color-cream-200);">🛍️</div>
          <span class="font-display text-base font-semibold" style="color: var(--color-ink-900);">Beli Mix Paket</span>
          <span class="ml-auto rounded-full px-2 py-0.5 text-xs font-bold" style="background: var(--color-blue-100); color: var(--color-blue-700);">
            {{ result.mixRecommendation.mixes.length }} jenis
          </span>
        </div>

        <div class="space-y-2">
          <div
            v-for="mx in result.mixRecommendation.mixes"
            :key="mx.mixId"
            class="flex items-center gap-3 rounded-2xl border bg-white p-3.5"
            style="border-color: var(--color-blue-100); box-shadow: 0 4px 20px rgba(46, 139, 192, 0.08);"
          >
            <div
              class="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-lg"
              :style="{ background: mx.mixId === 'mix-c' ? 'var(--color-pink-100)' : 'var(--color-cream-100)' }"
            >{{ mx.mixId === 'mix-c' ? '🍟' : '🥟' }}</div>
            <div class="min-w-0 flex-1">
              <div class="font-display text-sm font-semibold" style="color: var(--color-ink-900);">{{ mx.name }}</div>
              <div class="mt-0.5 text-xs font-semibold" style="color: var(--color-ink-500);">{{ mx.qty }} paket × Rp{{ (mx.price / 1000).toFixed(0) }}K</div>
            </div>
            <div class="font-display text-base font-semibold shrink-0" style="color: var(--color-blue-700);">
              {{ fmtRp(mx.qty * mx.price) }}
            </div>
          </div>
        </div>

        <!-- Waste per SKU detail + bonus packages -->
        <div
          class="rounded-2xl border p-3.5"
          style="background: var(--color-blue-50); border-color: var(--color-blue-100);"
        >
          <div class="mb-2 font-display text-xs font-semibold" style="color: var(--color-ink-700);">Sisa stok dari Mix</div>
          <div class="flex flex-wrap gap-1.5 mb-3">
            <span
              v-for="det in result.mixRecommendation.skuDetails"
              :key="det.skuId"
              class="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-bold"
              :style="{
                background: det.waste > 0 ? 'var(--color-cream-100)' : 'var(--color-green-100)',
                color: det.waste > 0 ? '#8B5E0E' : 'var(--color-green-700)',
              }"
            >
              {{ det.waste > 0 ? `${det.waste} ${det.skuName}` : '✓ ' + det.skuName }}
            </span>
          </div>

          <!-- Bonus packages from waste -->
          <div
            v-if="result.mixRecommendation.wasteBonus && result.mixRecommendation.wasteBonus.totalPackages > 0"
            class="rounded-xl border p-3"
            style="background: var(--color-green-100); border-color: #B5E0C2;"
          >
            <div class="mb-1.5 font-display text-xs font-bold" style="color: var(--color-green-700);">
              🎁 Dari sisa stok, bisa dibuat
            </div>
            <div class="flex flex-wrap items-center gap-2">
              <span
                v-for="(count, pkgId) in result.mixRecommendation.wasteBonus.counts"
                :key="pkgId"
                v-show="count > 0"
                class="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold shadow-sm"
                :style="{
                  background: pkgId === 'paket-halu' ? 'var(--color-blue-100)' : pkgId === 'paket-when-ya' ? 'var(--color-cream-200)' : 'var(--color-pink-100)',
                }"
              >
                <span>{{ pkgId === 'paket-halu' ? '🌟' : pkgId === 'paket-when-ya' ? '✨' : '🌈' }}</span>
                <span>{{ count }} {{ pkgId === 'paket-halu' ? 'Halu' : pkgId === 'paket-when-ya' ? 'When Ya' : 'Solulu' }}</span>
              </span>
            </div>
          </div>
        </div>
      </template>

      <!-- Individual purchases (non-Mix items) -->
      <template v-if="result.individualRecommendations.length > 0">
        <div class="flex items-center gap-2.5">
          <div class="flex h-8 w-8 items-center justify-center rounded-xl text-sm" style="background: var(--color-pink-100);">📦</div>
          <span class="font-display text-base font-semibold" style="color: var(--color-ink-900);">Beli Satuan</span>
          <span class="ml-auto rounded-full px-2 py-0.5 text-xs font-bold" style="background: var(--color-blue-100); color: var(--color-blue-700);">
            {{ result.individualRecommendations.length }} item
          </span>
        </div>

        <div class="space-y-1">
          <div
            v-for="rec in result.individualRecommendations"
            :key="rec.skuId"
            class="flex items-center gap-3 border-b py-2.5 px-2"
            style="border-color: var(--color-blue-100);"
          >
            <span class="text-lg">{{ e(rec.skuId) }}</span>
            <span class="flex-1 text-sm font-semibold" style="color: var(--color-ink-900);">{{ rec.skuName }}</span>
            <div class="text-right shrink-0">
              <div class="font-display text-base font-semibold" style="color: var(--color-blue-700);">{{ fmtRp(rec.chosenPack.totalCost) }}</div>
              <div class="text-[10px] font-semibold" style="color: var(--color-ink-500);">
                {{ rec.chosenPack.totalUnits }} pcs
                <span v-if="rec.chosenPack.waste > 0" style="color: var(--color-orange-500);"> (sisa {{ rec.chosenPack.waste }})</span>
              </div>
            </div>
          </div>
        </div>
      </template>

      <!-- Empty state -->
      <div v-if="!result.mixRecommendation && result.individualRecommendations.length === 0" class="rounded-2xl border p-3.5" style="background: var(--color-green-100); border-color: #B5E0C2;">
        <div class="flex items-start gap-2.5">
          <span class="text-xl">🎉</span>
          <div>
            <div class="text-sm font-bold" style="color: var(--color-green-700);">Tidak perlu belanja!</div>
            <div class="mt-0.5 text-xs font-semibold" style="color: var(--color-green-700);">Stok cukup buat semua pesanan hari ini.</div>
          </div>
        </div>
      </div>

      <!-- Cost Summary -->
      <div class="flex items-center gap-2.5">
        <div class="flex h-8 w-8 items-center justify-center rounded-xl text-sm" style="background: var(--color-pink-100);">💰</div>
        <span class="font-display text-base font-semibold" style="color: var(--color-ink-900);">Biaya</span>
      </div>
      <CostSummary :grand-total-cost="result.grandTotalCost" :total-waste="result.totalWaste" />

      <!-- Action -->
      <div class="pt-2">
        <button
          class="w-full rounded-2xl py-4 font-display text-base font-semibold text-white shadow-lg transition-transform active:scale-[0.98]"
          style="background: linear-gradient(135deg, var(--color-blue-400), var(--color-blue-600)); box-shadow: 0 8px 24px rgba(46, 139, 192, 0.35);"
          @click="navigateTo('/')"
        >↩ Edit Pesanan</button>
      </div>
    </template>

    <!-- No data -->
    <div v-else class="py-16 text-center space-y-4">
      <div class="text-5xl">🌷</div>
      <div class="font-display text-lg font-semibold" style="color: var(--color-ink-700);">Belum ada perhitungan</div>
      <div class="text-xs font-semibold" style="color: var(--color-ink-500);">Isi pesanan dulu ✨</div>
      <button class="cta outline" @click="navigateTo('/')">📋 Isi Pesanan</button>
    </div>
  </div>
</template>
