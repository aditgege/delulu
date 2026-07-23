<script setup lang="ts">
import { usePurchaseOptimizer } from '~/composables/usePurchaseOptimizer'
import { useOrderStore } from '~/stores/orders'
import { usePackageStore } from '~/stores/packages'
import { useInventoryStore } from '~/stores/inventory'
import { usePoStore } from '~/stores/po'
import { PORSI_PCS } from '~/types'

definePageMeta({ title: 'Hasil Optimasi Belanja' })

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
  const poStore = usePoStore()
  const po = poStore.getOrderById(poId.value)
  if (!po) return
  orderStore.clearAll()
  const agg = new Map<string, number>()
  const bkAgg = new Map<string, number>()
  for (const c of po.customers) {
    for (const item of c.items) agg.set(item.packageId, (agg.get(item.packageId) || 0) + item.qty)
    for (const item of c.bakarKukusItems || []) {
      const key = `${item.menuId}::${item.caraMasak}`
      bkAgg.set(key, (bkAgg.get(key) || 0) + item.jumlahPorsi)
    }
  }
  for (const pkg of usePackageStore().getAllPackages()) orderStore.setQty(pkg.id, agg.get(pkg.id) || 0)
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
function menuName(id: string) { return pkgStore.getMenuById(id)?.name || id }

const totalFrozenPacks = computed(() => orderStore.getOrderLines().reduce((s, l) => s + l.qty, 0))
const totalPorsi = computed(() => orderStore.getTotalPorsi())

interface MenuDemand { frozen: number; matang: number; total: number }
const menuDemand = computed(() => {
  const map = new Map<string, MenuDemand>()
  for (const line of orderStore.getOrderLines()) {
    const pkg = pkgStore.getPackageById(line.packageId)
    if (!pkg) continue
    for (const b of pkg.bom) {
      const d = map.get(b.menuId) || { frozen: 0, matang: 0, total: 0 }
      d.frozen += b.qty * line.qty
      map.set(b.menuId, d)
    }
  }
  for (const line of orderStore.getBakarKukusLines()) {
    const d = map.get(line.menuId) || { frozen: 0, matang: 0, total: 0 }
    d.matang += line.jumlahPorsi * PORSI_PCS
    map.set(line.menuId, d)
  }
  return map
})

const visibleNeeds = computed(() => result.value?.needs.filter(n => n.grossNeed > 0) || [])
const itemsStokHabis = computed(() => result.value?.needs.filter(n => n.stockOnHand === 0 && n.grossNeed > 0) || [])
const unmetPcs = computed(() => itemsStokHabis.value.reduce((s, n) => s + n.grossNeed, 0))

const totalButuh = computed(() => visibleNeeds.value.reduce((s, n) => s + n.grossNeed, 0))
const totalStock = computed(() => visibleNeeds.value.reduce((s, n) => s + Math.min(n.grossNeed, n.stockOnHand), 0))
const totalKurang = computed(() => visibleNeeds.value.reduce((s, n) => s + n.netNeed, 0))

function hargaPorsi(menuId: string, cm: string): number {
  return pkgStore.getMenuCaraMasak(menuId, cm)?.hargaPorsi ?? (cm === 'bakar' ? 18000 : 16000)
}

const revenueFrozen = computed(() =>
  orderStore.getOrderLines().reduce((s, l) => {
    const pkg = pkgStore.getPackageById(l.packageId)
    return s + l.qty * (pkg?.price ?? 0)
  }, 0)
)
const revenueBakar = computed(() => orderStore.getSubtotalBakar())
const revenueKukus = computed(() => orderStore.getSubtotalKukus())
const revenueMatang = computed(() => revenueBakar.value + revenueKukus.value)
const totalRevenue = computed(() => revenueFrozen.value + revenueBakar.value + revenueKukus.value)
const totalHpp = computed(() => result.value?.grandTotalCost ?? 0)
const profit = computed(() => totalRevenue.value - totalHpp.value)
const margin = computed(() => totalRevenue.value > 0 ? profit.value / totalRevenue.value : 0)
const roi = computed(() => totalHpp.value > 0 ? profit.value / totalHpp.value : 0)

function mixSummary() {
  const m = result.value?.mixRecommendation
  if (!m) return []
  return m.mixes.map(mx => ({ id: mx.mixId, name: mx.name, qty: mx.qty, price: mx.price }))
}
const mixList = computed(() => mixSummary().sort((a, b) => (b.qty * b.price) - (a.qty * a.price)))
const individualList = computed(() => result.value?.individualRecommendations || [])

const alternativeCost = computed(() => {
  const supplierPacks = pkgStore.getAllSupplierPacks()
  let total = 0
  for (const need of visibleNeeds.value) {
    if (need.netNeed <= 0) continue
    const packs = supplierPacks.filter(p => p.menuId === need.menuId)
    if (packs.length === 0) continue
    const cheapest = packs.reduce((best, p) => p.price / p.sizePcs < best.price / best.sizePcs ? p : best, packs[0]!)
    total += Math.ceil(need.netNeed / cheapest.sizePcs) * cheapest.price
  }
  return total
})
const costSavings = computed(() => Math.max(0, alternativeCost.value - totalHpp.value))

const sisaPerMenu = computed(() => {
  const out: Array<{ menuId: string; name: string; qty: number }> = []
  const mixProv = new Map<string, number>()
  const allMixes = pkgStore.getAllMixes()
  for (const mx of mixList.value) {
    const mixDef = allMixes.find(m => m.id === mx.id)
    if (!mixDef) continue
    for (const c of mixDef.contents) mixProv.set(c.menuId, (mixProv.get(c.menuId) || 0) + c.qty * mx.qty)
  }
  const indivProv = new Map<string, number>()
  for (const rec of individualList.value) indivProv.set(rec.menuId, (indivProv.get(rec.menuId) || 0) + rec.chosenPack.totalUnits)
  for (const need of visibleNeeds.value) {
    const totalProv = (mixProv.get(need.menuId) || 0) + (indivProv.get(need.menuId) || 0)
    const sisa = need.stockOnHand + totalProv - need.grossNeed
    if (totalProv > 0) out.push({ menuId: need.menuId, name: need.menuName, qty: sisa })
    else out.push({ menuId: need.menuId, name: need.menuName, qty: Math.max(0, need.stockOnHand - need.grossNeed) })
  }
  return out
})

const sisaNonZero = computed(() => sisaPerMenu.value.filter(s => s.qty > 0).sort((a, b) => b.qty - a.qty))
const totalSisaAll = computed(() => sisaNonZero.value.reduce((s, x) => s + x.qty, 0))

const fulfilledPct = computed(() => totalButuh.value > 0 ? Math.round(((totalStock.value + totalKurang.value) / totalButuh.value) * 100) : 0)

const mixContents = computed(() => {
  const allMixes = pkgStore.getAllMixes()
  return mixList.value.map(mx => {
    const def = allMixes.find(m => m.id === mx.id)
    return { ...mx, menus: def?.contents.map(c => menuName(c.menuId)) || [] }
  })
})

const frozenBreakdown = computed(() =>
  orderStore.getOrderLines().filter(l => l.qty > 0).map(l => {
    const pkg = pkgStore.getPackageById(l.packageId)
    return { id: l.packageId, name: pkg?.name || l.packageId, qty: l.qty, price: pkg?.price ?? 0 }
  })
)

// ─── Shopping list modal ───
const showShoppingList = ref(false)
const beliList = computed(() => {
  const items: Array<{ label: string; qty: number; price: number }> = []
  for (const mx of mixList.value) items.push({ label: `${mx.name} ×${mx.qty}`, qty: mx.qty, price: mx.qty * mx.price })
  for (const rec of individualList.value) {
    items.push({ label: `${rec.menuName} (${rec.chosenPack.largePacks > 0 ? rec.chosenPack.largePacks + '× Large' : rec.chosenPack.mediumPacks + '× Medium'})`, qty: 1, price: rec.chosenPack.totalCost })
  }
  return items
})

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
    <div class="flex items-center gap-2">
      <button class="text-sm font-semibold active:scale-90" style="color: var(--color-blue-600);" @click="navigateTo('/')">← Kembali</button>
      <span class="text-xs font-semibold" style="color: var(--color-ink-500);">/ 🎯 Hasil Optimasi Belanja</span>
    </div>

    <div v-if="loading" class="py-16 text-center font-semibold" style="color: var(--color-ink-500);">Menghitung...</div>
    <div v-else-if="error" class="space-y-4 py-8 text-center">
      <div class="text-sm font-semibold" style="color: #D44B4B;">{{ error }}</div>
      <button class="cta outline" @click="navigateTo('/')">Kembali ke Pesanan</button>
    </div>

    <template v-else-if="result">
      <!-- 📈 Ringkasan Bisnis -->
      <div class="rounded-2xl border p-4" style="background: linear-gradient(135deg, #059669, #047857); color: white; border: none;">
        <div class="flex items-center gap-2 mb-3">
          <span class="text-lg">📈</span>
          <span class="font-display text-sm font-bold opacity-90">Ringkasan Bisnis</span>
        </div>
        <div class="grid grid-cols-2 gap-2 text-xs">
          <div class="rounded-lg bg-white/10 p-2">
            <div class="opacity-70">Revenue</div>
            <div class="font-bold mt-0.5 text-sm">{{ fmtRp(totalRevenue) }}</div>
          </div>
          <div class="rounded-lg bg-white/10 p-2">
            <div class="opacity-70">Laba</div>
            <div class="font-bold mt-0.5 text-sm">{{ fmtRp(profit) }}</div>
          </div>
          <div class="rounded-lg bg-white/10 p-2">
            <div class="opacity-70">Modal</div>
            <div class="font-bold mt-0.5 text-sm">{{ fmtRp(totalHpp) }}</div>
          </div>
          <div class="rounded-lg bg-white/10 p-2">
            <div class="opacity-70">ROI</div>
            <div class="font-bold mt-0.5 text-sm">{{ fmtPct(roi) }}</div>
          </div>
        </div>
      </div>

      <!-- ⚠️ Perlu Restock -->
      <template v-if="itemsStokHabis.length > 0">
        <div class="rounded-2xl border p-3.5" style="background: #FEF2F2; border-color: #FECACA;">
          <div class="flex items-center gap-2 mb-2">
            <span class="text-lg">⚠️</span>
            <span class="font-display text-sm font-bold" style="color: #B91C1C;">Perlu Restock</span>
            <span class="ml-auto rounded-full px-2 py-0.5 text-[10px] font-bold" style="background: #FECACA; color: #B91C1C;">{{ itemsStokHabis.length }} item &middot; kurang {{ unmetPcs }} pcs</span>
          </div>
          <div class="flex flex-wrap gap-1.5">
            <span v-for="item in itemsStokHabis" :key="item.menuId"
              class="inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-bold"
              style="background: #FEE2E2; color: #B91C1C;">
              {{ e(item.menuId) }} {{ item.menuName }}
              ({{ item.grossNeed }} pcs)
            </span>
          </div>
        </div>
      </template>

      <!-- 🎯 Rekomendasi Supplier -->
      <div v-if="mixList.length > 0" class="rounded-2xl border p-4" style="background: linear-gradient(135deg, #7c3aed, #5b21b6); color: white; border: none;">
        <div class="flex items-center gap-2 mb-3">
          <span class="text-xl">🎯</span>
          <span class="font-display text-sm font-bold opacity-90">Rekomendasi Supplier</span>
        </div>
        <div class="text-xs leading-relaxed opacity-90">
          <p>Dihitung otomatis — seluruh pesanan terpenuhi dengan modal paling rendah.</p>
          <p class="text-[10px] opacity-60 mt-0.5">✓ Kombinasi pembelian terbaik ditemukan</p>
          <div class="flex flex-wrap gap-1.5 my-1.5">
            <span v-for="mx in mixList" :key="mx.id" class="rounded-full px-2.5 py-1 text-xs font-bold" style="background: rgba(255,255,255,0.2);">
              {{ mx.name }} ×{{ mx.qty }}
            </span>
          </div>
        </div>
      </div>

      <!-- 📦 Kebutuhan Pesanan -->
      <div class="rounded-2xl border p-4" style="background: var(--color-blue-50); border-color: var(--color-blue-100);">
        <div class="flex items-center gap-2 mb-3">
          <span class="text-lg">📦</span>
          <span class="font-display text-sm font-semibold" style="color: var(--color-ink-900);">Kebutuhan Pesanan</span>
        </div>
        <div class="flex items-center gap-3 mb-3 text-xs">
          <span class="font-bold" style="color: var(--color-blue-600);">{{ totalFrozenPacks }} Frozen</span>
          <span v-if="totalPorsi > 0" class="font-bold" style="color: var(--color-orange-600);">{{ totalPorsi }} Matang</span>
          <div class="flex-1"></div>
          <span class="font-bold" style="color: var(--color-ink-700);">{{ totalButuh }} pcs dibutuhkan</span>
        </div>
        <div class="flex items-center gap-2 text-[10px] font-bold justify-center mb-2" style="color: var(--color-ink-500);">
          <span class="rounded-full px-2 py-0.5" style="background: var(--color-green-100); color: var(--color-green-700);">{{ totalStock }} tersedia</span>
          <span>+</span>
          <span class="rounded-full px-2 py-0.5" style="background: #FEE2E2; color: #B91C1C;">{{ totalKurang }} dibeli</span>
          <span>→</span>
          <span class="rounded-full px-2 py-0.5" style="background: var(--color-green-200); color: var(--color-green-800);">{{ totalButuh }} terpenuhi ✓</span>
        </div>
        <div class="h-2 rounded-full overflow-hidden mb-1" style="background: var(--color-blue-100);">
          <div class="h-full rounded-full transition-all" style="background: linear-gradient(90deg, var(--color-green-500), var(--color-blue-500));" :style="{ width: fulfilledPct + '%' }"></div>
        </div>
        <div class="text-center text-[10px] font-semibold" style="color: var(--color-green-600);">✓ semua pesanan terpenuhi</div>
      </div>

      <!-- ❄️ Frozen -->
      <template v-if="frozenBreakdown.length > 0">
        <div class="rounded-2xl border bg-white px-4 py-2" style="border-color: var(--color-blue-100);">
          <div class="flex items-center gap-2 py-2">
            <span class="text-sm">❄️</span>
            <span class="text-xs font-bold" style="color: var(--color-ink-700);">Frozen</span>
          </div>
          <div v-for="fb in frozenBreakdown" :key="fb.id" class="flex items-center justify-between border-t py-2 text-sm" style="border-color: var(--color-blue-50);">
            <span class="font-semibold">{{ fb.name }}</span>
            <span class="text-xs font-semibold" style="color: var(--color-ink-500);">{{ fb.qty }} paket &middot; {{ fmtRp(fb.qty * fb.price) }}</span>
          </div>
          <div class="flex justify-between border-t py-2 text-sm font-bold" style="color: var(--color-blue-700); border-color: var(--color-blue-50);">
            <span>Total</span><span>{{ fmtRp(revenueFrozen) }}</span>
          </div>
        </div>
      </template>

      <!-- 🔥 Bakar & Kukus -->
      <template v-if="orderStore.getBakarKukusLines().filter(l => l.jumlahPorsi > 0).length > 0">
        <div class="rounded-2xl border px-4 py-3 space-y-1" style="background: var(--color-orange-50); border-color: var(--color-orange-100);">
          <div class="flex items-center gap-2 pb-1">
            <span class="text-sm">🔥</span>
            <span class="text-xs font-bold" style="color: var(--color-ink-700);">Bakar & Kukus &middot; {{ totalPorsi }} porsi</span>
          </div>
          <div v-for="line in orderStore.getBakarKukusLines().filter(l => l.jumlahPorsi > 0)" :key="line.menuId + '-' + line.caraMasak" class="flex items-center justify-between text-xs border-t pt-1" style="border-color: var(--color-orange-100);">
            <span>
              <span class="font-semibold">{{ menuName(line.menuId) }}</span>
              <span class="font-bold ml-1" :style="{ color: line.caraMasak === 'bakar' ? 'var(--color-orange-600)' : 'var(--color-blue-600)' }">{{ line.caraMasak === 'bakar' ? 'B' : 'K' }}</span>
            </span>
            <span class="font-semibold">{{ line.jumlahPorsi }} × Rp{{ (hargaPorsi(line.menuId, line.caraMasak) / 1000).toFixed(0) }}K = Rp{{ (line.jumlahPorsi * hargaPorsi(line.menuId, line.caraMasak)).toLocaleString() }}</span>
          </div>
          <div class="flex justify-between pt-1 border-t font-bold text-xs" style="border-color: var(--color-orange-200);">
            <span>Total</span>
            <span style="color: var(--color-orange-700);">{{ fmtRp(revenueMatang) }}</span>
          </div>
        </div>
      </template>

      <!-- 🛒 Belanja Supplier -->
      <template v-if="mixContents.length > 0">
        <div class="flex items-center gap-2.5">
          <div class="flex h-8 w-8 items-center justify-center rounded-xl text-sm" style="background: var(--color-cream-200);">🛒</div>
          <span class="font-display text-base font-semibold" style="color: var(--color-ink-900);">Belanja Supplier</span>
        </div>
        <div class="space-y-2">
          <div v-for="mx in mixContents" :key="mx.id"
            class="rounded-2xl border bg-white p-3.5" style="border-color: var(--color-blue-100); box-shadow: 0 4px 20px rgba(46, 139, 192, 0.08);">
            <div class="flex items-start gap-3">
              <div class="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl" style="background: var(--color-cream-100);">
                <div class="text-center">
                  <div class="text-lg">🥟</div>
                  <div class="text-[10px] font-bold" style="color: var(--color-ink-500);">{{ mx.qty * 30 }} pcs</div>
                </div>
              </div>
              <div class="min-w-0 flex-1">
                <div>
                  <div class="font-display text-base font-bold" style="color: var(--color-ink-900);">{{ mx.name }}</div>
                  <div class="text-xs font-bold" style="color: var(--color-blue-700);">{{ mx.qty }}× = {{ fmtRp(mx.qty * mx.price) }}</div>
                </div>
                <div class="mt-1.5 flex flex-wrap gap-0.5">
                  <span v-for="mn in mx.menus" :key="mn" class="inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-[10px] font-semibold" style="background: var(--color-blue-50); color: var(--color-blue-600);">✔ {{ mn }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </template>

      <!-- + Beli Satuan -->
      <template v-if="individualList.length > 0">
        <div class="rounded-2xl border bg-white px-4 py-2" style="border-color: var(--color-blue-100);">
          <div class="text-xs font-bold py-2" style="color: var(--color-ink-500);">+ Beli Satuan</div>
          <div v-for="rec in individualList" :key="rec.menuId" class="flex items-center gap-3 border-t py-2.5" style="border-color: var(--color-blue-50);">
            <span class="text-lg w-6 shrink-0">{{ e(rec.menuId) }}</span>
            <span class="flex-1 text-sm font-semibold" style="color: var(--color-ink-900);">{{ rec.menuName }}</span>
            <div class="font-display text-sm font-semibold shrink-0" style="color: var(--color-blue-700);">{{ fmtRp(rec.chosenPack.totalCost) }}</div>
          </div>
        </div>
      </template>

      <!-- 📊 Analisis Per Menu -->
      <div class="flex items-center gap-2.5">
        <div class="flex h-8 w-8 items-center justify-center rounded-xl text-sm" style="background: var(--color-blue-100);">📊</div>
        <span class="font-display text-base font-semibold" style="color: var(--color-ink-900);">Analisis Per Menu</span>
        <span class="ml-auto rounded-full px-2 py-0.5 text-xs font-bold" style="background: var(--color-blue-100); color: var(--color-blue-700);">{{ visibleNeeds.length }} menu</span>
      </div>
      <div class="rounded-2xl border bg-white px-3 py-2 overflow-x-auto" style="border-color: var(--color-blue-100);">
        <div class="flex items-center border-b py-2 text-[10px] font-bold whitespace-nowrap gap-0.5" style="color: var(--color-ink-500); border-color: var(--color-blue-100);">
          <span class="w-5 shrink-0"></span>
          <span class="w-20 shrink-0">Menu</span>
          <span class="w-10 text-center">❄️</span>
          <span class="w-10 text-center">🔥</span>
          <span class="w-10 text-right font-bold" style="color: var(--color-ink-900);">Butuh</span>
          <span class="w-10 text-right font-bold" style="color: var(--color-green-700);">Stok</span>
          <span class="w-10 text-right font-bold" style="color: #D44B4B;">Kurang</span>
          <span class="w-12 text-right font-bold" style="color: var(--color-blue-600);">Setelah</span>
        </div>
        <div v-for="need in visibleNeeds" :key="need.menuId"
          class="flex items-center border-b py-2.5 text-xs whitespace-nowrap gap-0.5" style="border-color: var(--color-blue-50);"
          :style="{ background: need.netNeed > 0 ? '#FEF2F2' : 'transparent' }">
          <span class="w-5 text-sm shrink-0">{{ e(need.menuId) }}</span>
          <span class="w-20 shrink-0 font-semibold truncate" style="color: var(--color-ink-900);">{{ need.menuName }}</span>
          <span class="w-10 text-center font-semibold" style="color: var(--color-blue-600);">{{ menuDemand.get(need.menuId)?.frozen || 0 }}</span>
          <span class="w-10 text-center font-semibold" style="color: var(--color-orange-600);">{{ menuDemand.get(need.menuId)?.matang || 0 }}</span>
          <span class="w-10 text-right font-bold" style="color: var(--color-ink-900);">{{ need.grossNeed }}</span>
          <span class="w-10 text-right font-bold" :style="{ color: need.stockOnHand > 0 ? 'var(--color-green-600)' : '#DC2626' }">{{ need.stockOnHand || '0' }}</span>
          <span class="w-10 text-right font-bold" :style="{ color: need.netNeed > 0 ? '#DC2626' : '#16A34A' }">{{ need.netNeed > 0 ? need.netNeed : '✓' }}</span>
          <span class="w-12 text-right font-bold" style="color: var(--color-blue-600);">{{ sisaPerMenu.find(s => s.menuId === need.menuId)?.qty ?? '—' }}</span>
        </div>
      </div>

      <!-- 📦 Stok Setelah PO -->
      <template v-if="sisaNonZero.length > 0">
        <div class="rounded-2xl border p-3.5" style="background: var(--color-green-50); border-color: #B5E0C2;">
          <div class="flex items-center gap-2 mb-2">
            <span class="text-sm">📦</span>
            <span class="font-display text-xs font-semibold" style="color: var(--color-green-700);">Stok Setelah PO</span>
            <span class="ml-auto text-[10px] font-bold" style="color: var(--color-green-600);">{{ totalSisaAll }} pcs siap dijual</span>
          </div>
          <div class="text-[10px] font-semibold mb-2" style="color: var(--color-green-500);">{{ sisaNonZero.length }} menu masih memiliki stok</div>
          <div class="grid grid-cols-2 gap-x-4 gap-y-1.5">
            <div v-for="s in sisaNonZero" :key="s.menuId" class="flex items-center justify-between text-xs">
              <span class="flex items-center gap-1 font-semibold" style="color: var(--color-ink-800);">
                <span>{{ e(s.menuId) }}</span> {{ s.name }}
              </span>
              <span class="font-bold" style="color: var(--color-green-700);">{{ s.qty }} pcs</span>
            </div>
          </div>
        </div>
      </template>

      <!-- 💡 Mengapa dipilih? -->
      <template v-if="mixList.length > 0">
        <div class="rounded-2xl border p-4" style="background: var(--color-cream-50); border-color: var(--color-cream-200);">
          <div class="flex items-center gap-2 mb-2">
            <span class="text-sm">💡</span>
            <span class="font-display text-xs font-semibold" style="color: var(--color-ink-700);">Mengapa dipilih?</span>
          </div>
          <div class="text-xs font-semibold space-y-1" style="color: var(--color-ink-700);">
            <div>✓ biaya pembelian paling rendah</div>
            <div>✓ seluruh PO terpenuhi</div>
            <div>✓ tidak membeli paket yang tidak diperlukan</div>
            <div v-if="sisaNonZero.length > 0">✓ stok cukup untuk penjualan berikutnya</div>
          </div>
          <div v-if="costSavings > 0" class="grid grid-cols-2 gap-2 text-xs mt-3">
            <div class="rounded-xl border p-2.5" style="background: #FEF2F2; border-color: #FECACA;">
              <div class="font-bold" style="color: #B91C1C;">Alternatif</div>
              <div class="mt-0.5 font-semibold" style="color: var(--color-ink-600);">Beli satuan semua</div>
              <div class="mt-1 font-display text-sm font-bold" style="color: #B91C1C;">{{ fmtRp(alternativeCost) }}</div>
            </div>
            <div class="rounded-xl border p-2.5" style="background: #F0FDF4; border-color: #B5E0C2;">
              <div class="font-bold" style="color: #16A34A;">⭐ Dipilih</div>
              <div class="mt-0.5 font-semibold" style="color: var(--color-ink-600);">{{ mixList.map(m => `${m.name} ×${m.qty}`).join(', ') }}</div>
              <div class="mt-1 font-display text-sm font-bold" style="color: #16A34A;">{{ fmtRp(totalHpp) }}</div>
            </div>
          </div>
        </div>
      </template>

      <!-- 💰 Keuangan -->
      <div class="rounded-2xl border bg-white p-4 space-y-2" style="border-color: var(--color-blue-100);">
        <div class="flex items-center gap-2 mb-1">
          <span class="text-sm">💰</span>
          <span class="font-display text-xs font-semibold" style="color: var(--color-ink-700);">Keuangan</span>
        </div>
        <div class="flex items-center justify-between text-xs">
          <span class="font-semibold" style="color: var(--color-ink-700);">❄️ Frozen</span>
          <span class="font-bold" style="color: var(--color-blue-700);">{{ fmtRp(revenueFrozen) }}</span>
        </div>
        <div v-if="revenueMatang > 0" class="flex items-center justify-between text-xs">
          <span class="font-semibold" style="color: var(--color-ink-700);">🔥 Matang</span>
          <span class="font-bold" style="color: var(--color-orange-600);">{{ fmtRp(revenueMatang) }}</span>
        </div>
        <div class="flex items-center justify-between text-xs border-t pt-2" style="border-color: var(--color-blue-100);">
          <span class="font-bold" style="color: var(--color-ink-900);">Total Revenue</span>
          <span class="font-bold" style="color: var(--color-ink-900);">{{ fmtRp(totalRevenue) }}</span>
        </div>
        <div class="flex items-center justify-between text-xs">
          <span class="font-semibold" style="color: var(--color-ink-700);">Modal Supplier</span>
          <span class="font-bold" style="color: #D44B4B;">− {{ fmtRp(totalHpp) }}</span>
        </div>
        <div class="flex items-center justify-between text-sm border-t pt-2" style="border-color: var(--color-blue-100);">
          <span class="font-bold" style="color: var(--color-ink-900);">Laba</span>
          <span class="font-display text-lg font-bold" :style="{ color: profit >= 0 ? 'var(--color-green-700)' : '#D44B4B' }">{{ fmtRp(profit) }}</span>
        </div>
      </div>

      <!-- Empty -->
      <div v-if="!mixList.length && !individualList.length" class="rounded-2xl border p-3.5" style="background: var(--color-green-100); border-color: #B5E0C2;">
        <div class="flex items-start gap-2.5">
          <span class="text-xl">🎉</span>
          <div>
            <div class="text-sm font-bold" style="color: var(--color-green-700);">Tidak perlu belanja!</div>
            <div class="mt-0.5 text-xs font-semibold" style="color: var(--color-green-700);">Stok cukup buat semua pesanan hari ini.</div>
          </div>
        </div>
      </div>

      <!-- 🛒 Buat Daftar Belanja -->
      <template v-if="beliList.length > 0">
        <button class="w-full rounded-2xl py-4 font-display text-base font-semibold text-white shadow-lg transition-transform active:scale-[0.98]"
          style="background: linear-gradient(135deg, #7c3aed, #5b21b6); box-shadow: 0 8px 24px rgba(124, 58, 237, 0.35);"
          @click="showShoppingList = true">🛒 Buat Daftar Belanja</button>
      </template>

      <!-- Shopping List Modal -->
      <div v-if="showShoppingList" class="fixed inset-0 z-50 flex items-end justify-center" @click.self="showShoppingList = false">
        <div class="fixed inset-0 bg-black/30 backdrop-blur-sm"></div>
        <div class="relative w-full max-w-lg rounded-t-3xl bg-white p-5 shadow-2xl" style="animation: slideUp 0.3s ease-out;">
          <div class="flex items-center justify-between mb-4">
            <div class="font-display text-base font-bold" style="color: var(--color-ink-900);">🛒 Daftar Belanja Supplier</div>
            <button class="flex h-8 w-8 items-center justify-center rounded-full text-lg font-bold active:scale-90" style="background: var(--color-cream-100); color: var(--color-ink-500);" @click="showShoppingList = false">×</button>
          </div>
          <div class="space-y-2 mb-4">
            <div v-for="item in beliList" :key="item.label" class="flex items-center justify-between rounded-xl border p-3 text-sm" style="border-color: var(--color-blue-100);">
              <span class="flex items-center gap-2">
                <span class="flex h-6 w-6 items-center justify-center rounded-lg text-xs" style="background: var(--color-blue-50);">✓</span>
                <span class="font-semibold" style="color: var(--color-ink-900);">{{ item.label }}</span>
              </span>
              <span class="font-display font-bold" style="color: var(--color-blue-700);">{{ fmtRp(item.price) }}</span>
            </div>
          </div>
          <div class="flex items-center justify-between rounded-xl p-3 mb-4" style="background: var(--color-blue-50);">
            <span class="font-bold text-sm" style="color: var(--color-ink-900);">Total</span>
            <span class="font-display text-lg font-bold" style="color: var(--color-blue-700);">{{ fmtRp(totalHpp) }}</span>
          </div>
          <button class="w-full rounded-2xl py-3.5 font-display text-sm font-semibold text-white transition-transform active:scale-[0.98]"
            style="background: linear-gradient(135deg, var(--color-green-500), var(--color-green-700)); box-shadow: 0 8px 24px rgba(5, 150, 105, 0.35);"
            @click="showShoppingList = false">✓ Siap, Tandai Sudah Dibeli</button>
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
