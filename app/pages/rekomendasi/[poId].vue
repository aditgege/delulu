<script setup lang="ts">
import { usePurchaseOptimizer } from '~/composables/usePurchaseOptimizer'
import { useOrderStore } from '~/stores/orders'
import { usePackageStore } from '~/stores/packages'
import { useInventoryStore } from '~/stores/inventory'
import { usePoStore } from '~/stores/po'

definePageMeta({ title: 'Rekomendasi Pembelian' })

const route = useRoute()
const poId = computed(() => route.params.poId as string)

const { result, loading, error } = usePurchaseOptimizer()
const orderStore = useOrderStore()
const pkgStore = usePackageStore()
const invStore = useInventoryStore()

onMounted(async () => {
  await Promise.all([
    usePackageStore().ensureLoaded(),
    useInventoryStore().ensureLoaded(),
    usePoStore().ensureLoaded(),
    fetchHpp(),
  ])

  // Load data from specific PO
  const poStore = usePoStore()
  const po = poStore.getOrderById(poId.value)
  if (!po) return

  orderStore.clearAll()
  const agg = new Map<string, number>()
  const bkAgg = new Map<string, number>()
  for (const c of po.customers) {
    for (const item of c.items) {
      agg.set(item.packageId, (agg.get(item.packageId) || 0) + item.qty)
    }
    for (const item of c.bakarKukusItems || []) {
      const key = `${item.menuId}::${item.caraMasak}`
      bkAgg.set(key, (bkAgg.get(key) || 0) + item.jumlahPorsi)
    }
  }
  for (const pkg of usePackageStore().getAllPackages()) {
    orderStore.setQty(pkg.id, agg.get(pkg.id) || 0)
  }
  for (const [key, total] of bkAgg) {
    const [menuId, caraMasak] = key.split('::') as [string, 'bakar' | 'kukus']
    orderStore.setBakarKukus(menuId, caraMasak, total)
  }
})

function fmtRp(n: number) { return 'Rp ' + (n || 0).toLocaleString('id-ID') }
function fmtPct(n: number) { return (n * 100).toFixed(0) + '%' }

const emojiMap: Record<string, string> = {
  'siomay-ayam': '🥟', 'siomay-udang': '🍤', 'siomay-kepiting': '🦀',
  'siomay-seafood': '🦐', 'siomay-nori': '🌿', 'siomay-mozzarella': '🧀',
  'hisitkau': '🥢', 'lumpia-kulit-tahu-ayam': '🌯', 'lumpia-kulit-tahu-udang': '🥟',
}
function e(id: string) { return emojiMap[id] || '📦' }
function hargaPorsi(menuId: string, cm: string): number {
  return pkgStore.getMenuCaraMasak(menuId, cm)?.hargaPorsi ?? (cm === 'bakar' ? 18000 : 16000)
}

const activeOrderCount = computed(() => orderStore.getOrderLines().filter(l => l.qty > 0).length)
const activeBakarKukusCount = computed(() => orderStore.getBakarKukusLines().filter(l => l.jumlahPorsi > 0).length)
const totalPorsi = computed(() => orderStore.getTotalPorsi())

// ─── Revenue & Profit ───
const revenueFrozen = computed(() => {
  return orderStore.getOrderLines().reduce((s, l) => {
    const pkg = pkgStore.getPackageById(l.packageId)
    return s + l.qty * (pkg?.price ?? 0)
  }, 0)
})
const revenueBakar = computed(() => orderStore.getSubtotalBakar())
const revenueKukus = computed(() => orderStore.getSubtotalKukus())
const totalRevenue = computed(() => revenueFrozen.value + revenueBakar.value + revenueKukus.value)
const totalHpp = computed(() => result.value?.grandTotalCost ?? 0)
const profit = computed(() => totalRevenue.value - totalHpp.value)
const margin = computed(() => totalRevenue.value > 0 ? profit.value / totalRevenue.value : 0)

function mixSummary() {
  const m = result.value?.mixRecommendation
  if (!m || m.mixes.length === 0) return ''
  return m.mixes.map(mx => `${mx.qty} ${mx.name}`).join(', ')
}
function individualSummary() {
  return result.value?.individualRecommendations?.map(r => {
    const p = r.chosenPack
    const parts: string[] = []
    if (p.largePacks > 0) parts.push(`${p.largePacks}× Large`)
    if (p.mediumPacks > 0) parts.push(`${p.mediumPacks}× Medium`)
    return `${r.menuName} (${parts.join(' + ')})`
  })?.join(', ') || ''
}

// ─── HPP ───
const hppPerPcs = ref(2133)
async function fetchHpp() {
  try {
    const cfg = await $fetch<Record<string, string>>('/api/app-config')
    if (cfg.hpp_per_pcs) hppPerPcs.value = parseInt(cfg.hpp_per_pcs, 10)
  } catch { /* ignore */ }
}
</script>

<template>
  <div class="slide-up space-y-4">
    <!-- Back link -->
    <div class="flex items-center gap-2">
      <button class="text-sm font-semibold active:scale-90" style="color: var(--color-blue-600);" @click="navigateTo('/')">
        ← Kembali
      </button>
      <span class="text-xs font-semibold" style="color: var(--color-ink-500);">/ Rekomendasi PO</span>
    </div>

    <div v-if="loading" class="py-16 text-center font-semibold" style="color: var(--color-ink-500);">Menghitung...</div>

    <div v-else-if="error" class="space-y-4 py-8 text-center">
      <div class="text-sm font-semibold" style="color: #D44B4B;">{{ error }}</div>
      <button class="cta outline" @click="navigateTo('/')">Kembali ke Pesanan</button>
    </div>

    <template v-else-if="result">
      <!-- Hero -->
      <div class="rounded-2xl border p-4" style="background: linear-gradient(135deg, var(--color-blue-500), #1a6bb0); color: white; border: none;">
        <div class="flex items-center gap-2 mb-3">
          <span class="text-2xl">🛒</span>
          <span class="font-display text-base font-semibold opacity-90">Belanja ke Supplier</span>
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div class="rounded-xl bg-white/15 p-3">
            <div class="text-[10px] font-semibold opacity-75">Modal</div>
            <div class="font-display text-xl font-bold mt-0.5">{{ fmtRp(totalHpp) }}</div>
          </div>
          <div class="rounded-xl bg-white/15 p-3">
            <div class="text-[10px] font-semibold opacity-75">Revenue</div>
            <div class="font-display text-xl font-bold mt-0.5">{{ fmtRp(totalRevenue) }}</div>
          </div>
          <div class="rounded-xl bg-white/15 p-3">
            <div class="text-[10px] font-semibold opacity-75">Laba Kotor</div>
            <div class="font-display text-xl font-bold mt-0.5" :style="{ color: profit >= 0 ? '#86efac' : '#fca5a5' }">{{ fmtRp(profit) }}</div>
          </div>
          <div class="rounded-xl bg-white/15 p-3">
            <div class="text-[10px] font-semibold opacity-75">Margin</div>
            <div class="font-display text-xl font-bold mt-0.5">{{ fmtPct(margin) }}</div>
          </div>
        </div>
      </div>

      <!-- Summary -->
      <div class="rounded-2xl border p-3.5" style="background: var(--color-cream-100); border-color: var(--color-cream-200);">
        <div class="flex items-center gap-2.5">
          <span class="text-xl">📝</span>
          <div class="text-xs font-semibold leading-relaxed" style="color: var(--color-ink-900);">
            <template v-if="activeOrderCount > 0">
              <b>{{ activeOrderCount }} paket frozen</b> terjual
              <span v-if="totalPorsi > 0"> + <b>{{ totalPorsi }} porsi</b> bakar/kukus</span>.
            </template>
            <template v-else-if="totalPorsi > 0">
              <b>{{ totalPorsi }} porsi</b> bakar/kukus.
            </template>
            <template v-if="result.mixRecommendation?.mixes.length">
              <br>Beli: <b>{{ mixSummary() }}</b>.
              <span v-if="result.individualRecommendations.length"> + {{ individualSummary() }}.</span>
            </template>
            <template v-else-if="result.individualRecommendations.length">
              <br>Beli: {{ individualSummary() }}.
            </template>
          </div>
        </div>
      </div>

      <!-- Bakar & Kukus -->
      <template v-if="activeBakarKukusCount > 0">
        <div class="flex items-center gap-2.5">
          <div class="flex h-8 w-8 items-center justify-center rounded-xl text-sm" style="background: var(--color-orange-100);">🔥</div>
          <span class="font-display text-base font-semibold" style="color: var(--color-ink-900);">Pesanan Bakar & Kukus</span>
          <span class="ml-auto rounded-full px-2 py-0.5 text-xs font-bold" style="background: var(--color-orange-100); color: var(--color-orange-700);">{{ totalPorsi }} porsi</span>
        </div>
        <div class="rounded-2xl border px-4 py-3 space-y-1" style="background: var(--color-orange-50); border-color: var(--color-orange-100);">
          <div v-for="line in orderStore.getBakarKukusLines().filter(l => l.jumlahPorsi > 0)" :key="line.menuId + '-' + line.caraMasak" class="flex items-center justify-between text-sm">
            <span>
              <span class="font-semibold">{{ pkgStore.getMenuById(line.menuId)?.name || line.menuId }}</span>
              <span class="text-xs font-bold ml-1" :style="{ color: line.caraMasak === 'bakar' ? 'var(--color-orange-600)' : 'var(--color-blue-600)' }">{{ line.caraMasak === 'bakar' ? 'Bakar' : 'Kukus' }}</span>
            </span>
            <span class="font-semibold">{{ line.jumlahPorsi }} porsi × Rp{{ (hargaPorsi(line.menuId, line.caraMasak) / 1000).toFixed(0) }}K = Rp{{ (line.jumlahPorsi * hargaPorsi(line.menuId, line.caraMasak)).toLocaleString() }}</span>
          </div>
          <div class="flex justify-between pt-1 border-t font-bold text-xs" style="border-color: var(--color-orange-200);">
            <span>Total Bakar & Kukus</span>
            <span style="color: var(--color-orange-700);">{{ fmtRp(revenueBakar + revenueKukus) }}</span>
          </div>
        </div>
      </template>

      <!-- Kebutuhan per Menu -->
      <div class="flex items-center gap-2.5">
        <div class="flex h-8 w-8 items-center justify-center rounded-xl text-sm" style="background: var(--color-blue-100);">🧮</div>
        <span class="font-display text-base font-semibold" style="color: var(--color-ink-900);">Kebutuhan per Menu</span>
        <span class="ml-auto rounded-full px-2 py-0.5 text-xs font-bold" style="background: var(--color-blue-100); color: var(--color-blue-700);">{{ result.needs.filter(n => n.grossNeed > 0).length }} menu</span>
      </div>
      <div class="rounded-2xl border bg-white px-4 py-2" style="border-color: var(--color-blue-100);">
        <div class="flex items-center border-b py-2 text-[10px] font-bold" style="color: var(--color-ink-500); border-color: var(--color-blue-100);">
          <span class="w-6"></span>
          <span class="flex-1">Menu</span>
          <span class="w-14 text-right">Pesanan</span>
          <span class="w-14 text-right">Stok</span>
          <span class="w-16 text-right font-bold" style="color: var(--color-blue-700);">Kekurangan</span>
        </div>
        <div v-for="need in result.needs.filter(n => n.grossNeed > 0)" :key="need.menuId"
          class="flex items-center border-b py-2.5 text-sm" style="border-color: var(--color-blue-50);">
          <span class="w-6 text-base shrink-0">{{ e(need.menuId) }}</span>
          <span class="flex-1 font-semibold min-w-0 truncate" style="color: var(--color-ink-900);">{{ need.menuName }}</span>
          <span class="w-14 text-right font-semibold" style="color: var(--color-ink-500);">{{ need.grossNeed }} pcs</span>
          <span class="w-14 text-right font-semibold" :style="{ color: need.stockOnHand > 0 ? 'var(--color-green-600)' : 'var(--color-ink-500)' }">{{ need.stockOnHand || '-' }}</span>
          <span class="w-16 text-right font-bold" :style="{ color: need.netNeed > 0 ? '#D44B4B' : 'var(--color-green-600)' }">{{ need.netNeed > 0 ? need.netNeed + ' pcs' : 'cukup' }}</span>
        </div>
        <div class="flex items-center justify-between py-2 text-xs font-semibold" style="color: var(--color-ink-500);">
          <span>Stok dipakai: {{ result.needs.filter(n => n.stockOnHand > 0).length }} menu</span>
          <span>Total kekurangan: {{ result.needs.reduce((s, n) => s + n.netNeed, 0) }} pcs</span>
        </div>
      </div>

      <!-- Mix Paket -->
      <template v-if="result.mixRecommendation && result.mixRecommendation.mixes.length > 0">
        <div class="flex items-center gap-2.5">
          <div class="flex h-8 w-8 items-center justify-center rounded-xl text-sm" style="background: var(--color-cream-200);">🛍️</div>
          <span class="font-display text-base font-semibold" style="color: var(--color-ink-900);">Beli Mix Paket</span>
          <span class="ml-auto rounded-full px-2 py-0.5 text-xs font-bold" style="background: var(--color-blue-100); color: var(--color-blue-700);">{{ result.mixRecommendation.mixes.length }} jenis</span>
        </div>
        <div class="space-y-2">
          <div v-for="mx in result.mixRecommendation.mixes" :key="mx.mixId"
            class="flex items-center gap-3 rounded-2xl border bg-white p-3.5" style="border-color: var(--color-blue-100); box-shadow: 0 4px 20px rgba(46, 139, 192, 0.08);">
            <div class="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-lg" style="background: var(--color-cream-100);">🥟</div>
            <div class="min-w-0 flex-1">
              <div class="font-display text-sm font-semibold" style="color: var(--color-ink-900);">{{ mx.name }}</div>
              <div class="mt-0.5 text-xs font-semibold" style="color: var(--color-ink-500);">{{ mx.qty }}× = {{ mx.qty * 30 }} pcs <span v-if="mx.qty >= 1">(cukup {{ mx.qty * 3 }} paket)</span></div>
            </div>
            <div class="font-display text-base font-semibold shrink-0" style="color: var(--color-blue-700);">{{ fmtRp(mx.qty * mx.price) }}</div>
          </div>
        </div>
        <div class="rounded-2xl border p-3.5" style="background: var(--color-blue-50); border-color: var(--color-blue-100);">
          <div class="mb-2 font-display text-xs font-semibold" style="color: var(--color-ink-700);">Sisa stok dari Mix</div>
          <div class="flex flex-wrap gap-1.5 mb-3">
            <span v-for="det in result.mixRecommendation.skuDetails" :key="det.menuId"
              class="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-bold"
              :style="{ background: det.waste > 0 ? 'var(--color-cream-100)' : 'var(--color-green-100)', color: det.waste > 0 ? '#8B5E0E' : 'var(--color-green-700)' }">
              {{ det.waste > 0 ? `${det.waste} ${det.menuName}` : '✓ ' + det.menuName }}
            </span>
          </div>
          <div v-if="result.mixRecommendation.wasteBonus && result.mixRecommendation.wasteBonus.totalPackages > 0"
            class="rounded-xl border p-3" style="background: var(--color-green-100); border-color: #B5E0C2;">
            <div class="mb-1.5 font-display text-xs font-bold" style="color: var(--color-green-700);">🎁 Dari sisa stok, bisa dibuat</div>
            <div class="flex flex-wrap items-center gap-2">
              <span v-for="(count, pkgId) in result.mixRecommendation.wasteBonus.counts" :key="pkgId" v-show="count > 0"
                class="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold shadow-sm"
                :style="{ background: pkgId === 'paket-halu' ? 'var(--color-blue-100)' : pkgId === 'paket-when-ya' ? 'var(--color-cream-200)' : 'var(--color-pink-100)' }">
                <span>{{ pkgId === 'paket-halu' ? '🌟' : pkgId === 'paket-when-ya' ? '✨' : '🌈' }}</span>
                <span>{{ count }} {{ pkgId === 'paket-halu' ? 'Halu' : pkgId === 'paket-when-ya' ? 'When Ya' : 'Solulu' }}</span>
              </span>
            </div>
          </div>
        </div>
      </template>

      <!-- Individual -->
      <template v-if="result.individualRecommendations.length > 0">
        <div class="flex items-center gap-2.5">
          <div class="flex h-8 w-8 items-center justify-center rounded-xl text-sm" style="background: var(--color-pink-100);">📦</div>
          <span class="font-display text-base font-semibold" style="color: var(--color-ink-900);">Beli Satuan</span>
          <span class="ml-auto rounded-full px-2 py-0.5 text-xs font-bold" style="background: var(--color-blue-100); color: var(--color-blue-700);">{{ result.individualRecommendations.length }} item</span>
        </div>
        <div class="rounded-2xl border bg-white px-4 py-2" style="border-color: var(--color-blue-100);">
          <div v-for="rec in result.individualRecommendations" :key="rec.menuId"
            class="flex items-center gap-3 border-b py-2.5" style="border-color: var(--color-blue-50);">
            <span class="text-lg w-6 shrink-0">{{ e(rec.menuId) }}</span>
            <span class="flex-1 text-sm font-semibold" style="color: var(--color-ink-900);">{{ rec.menuName }}</span>
            <div class="text-right shrink-0">
              <div class="font-display text-sm font-semibold" style="color: var(--color-blue-700);">{{ fmtRp(rec.chosenPack.totalCost) }}</div>
              <div class="text-[10px] font-semibold" style="color: var(--color-ink-500);">
                <span v-if="rec.chosenPack.largePacks > 0">{{ rec.chosenPack.largePacks }}× Large ({{ rec.chosenPack.totalUnits }} pcs)</span>
                <span v-else-if="rec.chosenPack.mediumPacks > 0">{{ rec.chosenPack.mediumPacks }}× Medium ({{ rec.chosenPack.totalUnits }} pcs)</span>
                <span v-if="rec.chosenPack.waste > 0" style="color: var(--color-orange-500);"> sisa {{ rec.chosenPack.waste }}</span>
              </div>
            </div>
          </div>
        </div>
      </template>

      <!-- Empty -->
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
        <span class="font-display text-base font-semibold" style="color: var(--color-ink-900);">Rincian Biaya</span>
      </div>
      <div class="rounded-2xl border bg-white p-4 space-y-2" style="border-color: var(--color-blue-100);">
        <div class="flex items-center justify-between text-xs">
          <span class="font-semibold" style="color: var(--color-ink-700);">Revenue Frozen ({{ activeOrderCount }} paket)</span>
          <span class="font-bold" style="color: var(--color-blue-700);">{{ fmtRp(revenueFrozen) }}</span>
        </div>
        <div v-if="revenueBakar + revenueKukus > 0" class="flex items-center justify-between text-xs">
          <span class="font-semibold" style="color: var(--color-ink-700);">Revenue Bakar & Kukus ({{ totalPorsi }} porsi)</span>
          <span class="font-bold" style="color: var(--color-orange-600);">{{ fmtRp(revenueBakar + revenueKukus) }}</span>
        </div>
        <div class="flex items-center justify-between text-xs border-t pt-2" style="border-color: var(--color-blue-100);">
          <span class="font-bold" style="color: var(--color-ink-900);">Total Revenue</span>
          <span class="font-display text-base font-bold" style="color: var(--color-ink-900);">{{ fmtRp(totalRevenue) }}</span>
        </div>
        <div class="flex items-center justify-between text-xs">
          <span class="font-semibold" style="color: var(--color-ink-700);">HPP (Modal Supplier)</span>
          <span class="font-bold" style="color: #D44B4B;">− {{ fmtRp(totalHpp) }}</span>
        </div>
        <div class="flex items-center justify-between text-sm border-t pt-2" style="border-color: var(--color-blue-100);">
          <span class="font-bold" style="color: var(--color-ink-900);">Laba Kotor</span>
          <span class="font-display text-lg font-bold" :style="{ color: profit >= 0 ? 'var(--color-green-700)' : '#D44B4B' }">{{ fmtRp(profit) }} ({{ fmtPct(margin) }})</span>
        </div>
        <div class="flex items-center justify-between pt-1">
          <span class="text-[10px] font-semibold" style="color: var(--color-ink-500);">Sisa stok (waste)</span>
          <span class="text-[10px] font-semibold" style="color: var(--color-ink-500);">{{ result.totalWaste }} pcs</span>
        </div>
      </div>

      <div class="pt-2">
        <button class="w-full rounded-2xl py-4 font-display text-base font-semibold text-white shadow-lg transition-transform active:scale-[0.98]"
          style="background: linear-gradient(135deg, var(--color-blue-400), var(--color-blue-600)); box-shadow: 0 8px 24px rgba(46, 139, 192, 0.35);"
          @click="navigateTo('/')">↩ Edit Pesanan</button>
      </div>
    </template>

    <div v-else class="py-16 text-center space-y-4">
      <div class="text-5xl">🌷</div>
      <div class="font-display text-lg font-semibold" style="color: var(--color-ink-700);">Belum ada perhitungan</div>
      <div class="text-xs font-semibold" style="color: var(--color-ink-500);">Isi pesanan dulu ✨</div>
      <button class="cta outline" @click="navigateTo('/')">📋 Isi Pesanan</button>
    </div>
  </div>
</template>
