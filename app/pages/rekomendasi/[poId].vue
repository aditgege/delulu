<script setup lang="ts">
import { computeFullRecommendation } from '~/utils/optimizer'
import { usePackageStore } from '~/stores/packages'
import { useInventoryStore } from '~/stores/inventory'
import { usePoStore } from '~/stores/po'
import { PORSI_PCS } from '~/types'
import type { OrderLine, PurchaseRecommendation } from '~/types'

definePageMeta({ title: 'Hasil Optimasi Belanja' })

const route = useRoute()
const poId = computed(() => route.params.poId as string)

const pkgStore = usePackageStore()
const invStore = useInventoryStore()
const poStore = usePoStore()

const loading = ref(true)
const error = ref<string | null>(null)
const result = ref<PurchaseRecommendation | null>(null)

// Aggregated items from PO
const items = ref<OrderLine[]>([])

onMounted(async () => {
  await Promise.all([
    pkgStore.ensureLoaded(),
    invStore.ensureLoaded(),
    poStore.ensureLoaded(),
    fetchHpp(),
  ])
  const po = poStore.getOrderById(poId.value)
  if (!po) {
    error.value = 'PO tidak ditemukan. Silakan pilih PO lain.'
    loading.value = false
    return
  }

  // Aggregate all customer items into unified item list
  const agg = new Map<string, OrderLine>()
  for (const c of po.customers) {
    for (const item of c.items) {
      const key = item.variant ? `${item.productId}::${item.variant.toLowerCase()}` : item.productId
      const existing = agg.get(key)
      if (existing) {
        existing.qty += item.qty
      } else {
        agg.set(key, { productId: item.productId, variant: item.variant?.toLowerCase(), qty: item.qty, unitPrice: item.unitPrice })
      }
    }
  }
  items.value = [...agg.values()]

  // Compute recommendation
  result.value = computeFullRecommendation(
    items.value,
    pkgStore.getAllPackages(),
    pkgStore.compositions,
    pkgStore.getAllMenus(),
    invStore.getAllEntries(),
    pkgStore.getAllSupplierPacks(),
    pkgStore.getAllMixes(),
  )
  loading.value = false
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

// ── Computed from aggregated items ──
const bkVariants = new Set(['bakar', 'kukus'])

function isBK(item: OrderLine): boolean {
  return !!item.variant && bkVariants.has(item.variant.toLowerCase())
}

function isBundle(item: OrderLine): boolean {
  const product = pkgStore.getProductById(item.productId)
  return product?.type === 'bundle'
}

const totalFrozenPacks = computed(() =>
  items.value.filter(i => !isBK(i) && isBundle(i)).reduce((s, l) => s + l.qty, 0)
)

const totalPorsi = computed(() =>
  items.value.filter(i => isBK(i)).reduce((s, l) => s + l.qty, 0)
)

interface MenuDemand { frozen: number; matang: number; total: number }
const menuDemand = computed(() => {
  const map = new Map<string, MenuDemand>()
  for (const item of items.value) {
    if (isBK(item)) {
      const d = map.get(item.productId) || { frozen: 0, matang: 0, total: 0 }
      d.matang += item.qty * PORSI_PCS
      map.set(item.productId, d)
    } else {
      const comps = pkgStore.getCompositions(item.productId)
      if (comps.length > 0) {
        for (const b of comps) {
          const d = map.get(b.menuId) || { frozen: 0, matang: 0, total: 0 }
          d.frozen += b.qty * item.qty
          map.set(b.menuId, d)
        }
      } else {
        const d = map.get(item.productId) || { frozen: 0, matang: 0, total: 0 }
        d.frozen += item.qty
        map.set(item.productId, d)
      }
    }
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
  items.value.filter(i => !isBK(i) && isBundle(i)).reduce((s, l) => {
    const product = pkgStore.getProductById(l.productId)
    return s + l.qty * (product?.basePrice ?? 0)
  }, 0)
)
const revenueBakar = computed(() =>
  items.value.filter(i => i.variant?.toLowerCase() === 'bakar').reduce((s, l) => {
    const price = pkgStore.getProductPrice(l.productId, 'bakar')
    return s + l.qty * price
  }, 0)
)
const revenueKukus = computed(() =>
  items.value.filter(i => i.variant?.toLowerCase() === 'kukus').reduce((s, l) => {
    const price = pkgStore.getProductPrice(l.productId, 'kukus')
    return s + l.qty * price
  }, 0)
)
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

const bkLines = computed(() =>
  items.value.filter(i => isBK(i)).map(i => ({
    menuId: i.productId,
    caraMasak: i.variant!.toLowerCase() as 'bakar' | 'kukus',
    jumlahPorsi: i.qty,
  }))
)

// Unified order display list
interface OrderDisplayItem { id: string; badge: string; label: string; qty: number; price: number }
const unifiedOrderList = computed(() => {
  const out: OrderDisplayItem[] = []
  for (const fb of frozenBreakdown.value) {
    out.push({ id: fb.id, badge: '❄️', label: fb.name, qty: fb.qty, price: fb.qty * fb.price })
  }
  for (const line of bkLines.value) {
    const price = line.jumlahPorsi * hargaPorsi(line.menuId, line.caraMasak)
    out.push({
      id: line.menuId + '-' + line.caraMasak,
      badge: line.caraMasak === 'bakar' ? '🔥' : '💨',
      label: menuName(line.menuId) + ' ' + (line.caraMasak === 'bakar' ? 'Bakar' : 'Kukus'),
      qty: line.jumlahPorsi,
      price,
    })
  }
  const chili = items.value.find(i => i.productId === 'chili-oil')
  if (chili && chili.qty > 0) {
    out.push({ id: 'chili-oil', badge: '🌶️', label: 'Chili Oil', qty: chili.qty, price: chili.qty * (chili.unitPrice || 2000) })
  }
  return out
})

const frozenBreakdown = computed(() =>
  items.value.filter(i => !isBK(i) && isBundle(i)).map(l => {
    const product = pkgStore.getProductById(l.productId)
    return { id: l.productId, name: product?.name || l.productId, qty: l.qty, price: product?.basePrice ?? 0 }
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

</script>

<template>
  <div class="slide-up space-y-4">
    <div class="flex items-center gap-2">
      <button class="rounded-xl px-3 py-2 text-xs font-bold text-white active:scale-90" style="background: var(--color-blue-500);" @click="navigateTo('/')">← Kembali</button>
      <span class="text-xs font-semibold" style="color: var(--color-ink-500);">/ 🎯 Hasil Optimasi Belanja</span>
    </div>

    <div v-if="loading" class="py-16 text-center font-semibold" style="color: var(--color-ink-500);">Menghitung...</div>
    <div v-else-if="error" class="space-y-4 py-8 text-center">
      <div class="text-sm font-semibold" style="color: #D44B4B;">{{ error }}</div>
      <button class="cta outline" @click="navigateTo('/')">Kembali ke Pesanan</button>
    </div>

    <template v-else-if="result">
      <!-- 💰 Modal Belanja -->
      <div class="rounded-2xl border p-4" style="background: linear-gradient(135deg, #7c3aed, #5b21b6); color: white; border: none;">
        <div class="flex items-center gap-2 mb-1">
          <span class="text-lg">💰</span>
          <span class="font-display text-sm font-bold opacity-90">Total Modal Belanja</span>
        </div>
        <div class="font-display text-2xl font-bold mt-1">{{ fmtRp(totalHpp) }}</div>
        <div class="text-xs font-semibold opacity-75 mt-0.5">
          {{ mixList.length > 0 ? mixList.map(m => `${m.name} ×${m.qty}`).join(', ') : '' }}
          {{ individualList.length > 0 ? (mixList.length > 0 ? '+ ' : '') + individualList.length + ' pack satuan' : '' }}
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
          <span class="ml-auto text-xs font-semibold" style="color: var(--color-ink-500);">{{ totalButuh }} pcs</span>
        </div>

        <!-- Progress bar -->
        <div class="flex items-center gap-2 text-[10px] font-bold mb-2" style="color: var(--color-ink-500);">
          <span class="rounded-full px-2 py-0.5" style="background: var(--color-green-100); color: var(--color-green-700);">{{ totalStock }} stok</span>
          <span class="opacity-40">+</span>
          <span class="rounded-full px-2 py-0.5" style="background: #FEE2E2; color: #B91C1C;">{{ totalKurang }} beli</span>
        </div>
        <div class="h-2 rounded-full overflow-hidden mb-3" style="background: var(--color-blue-100);">
          <div class="h-full rounded-full transition-all" style="background: linear-gradient(90deg, var(--color-green-500), var(--color-blue-500));" :style="{ width: fulfilledPct + '%' }"></div>
        </div>

        <!-- Unified item list -->
        <div class="space-y-1">
          <div v-for="item in unifiedOrderList" :key="item.id"
            class="flex items-center justify-between rounded-xl px-3 py-2 text-sm"
            :style="{ background: item.badge === '🔥' ? 'var(--color-orange-50)' : item.badge === '💨' ? 'var(--color-blue-50)' : item.badge === '🌶️' ? '#FFFBEB' : 'white' }">
            <span class="flex items-center gap-2 min-w-0">
              <span class="text-sm shrink-0">{{ item.badge }}</span>
              <span class="font-semibold truncate" style="color: var(--color-ink-900);">{{ item.label }}</span>
            </span>
            <span class="font-semibold shrink-0 ml-2 text-xs" style="color: var(--color-ink-500);">{{ item.qty }} × {{ fmtRp(Math.round(item.price / item.qty)) }}</span>
            <span class="font-display font-bold shrink-0 ml-3 text-sm" style="color: var(--color-blue-700);">{{ fmtRp(item.price) }}</span>
          </div>
        </div>

        <!-- Totals -->
        <div class="mt-2 pt-2 border-t space-y-1" style="border-color: var(--color-blue-100);">
          <div class="flex justify-between text-xs">
            <span class="font-semibold" style="color: var(--color-ink-700);">❄️ Frozen</span>
            <span class="font-bold" style="color: var(--color-blue-700);">{{ fmtRp(revenueFrozen) }}</span>
          </div>
          <div v-if="revenueMatang > 0" class="flex justify-between text-xs">
            <span class="font-semibold" style="color: var(--color-ink-700);">🔥 Matang</span>
            <span class="font-bold" style="color: var(--color-orange-600);">{{ fmtRp(revenueMatang) }}</span>
          </div>
          <div class="flex justify-between text-sm font-bold pt-1 border-t" style="border-color: var(--color-blue-100);">
            <span style="color: var(--color-ink-900);">Total Revenue</span>
            <span style="color: var(--color-ink-900);">{{ fmtRp(totalRevenue) }}</span>
          </div>
        </div>
      </div>

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
      <div class="rounded-2xl border bg-white px-4 py-3" style="border-color: var(--color-blue-100);">
        <div class="flex items-center gap-2 mb-3">
          <div class="flex h-8 w-8 items-center justify-center rounded-xl text-sm" style="background: var(--color-blue-100);">📊</div>
          <span class="font-display text-base font-semibold" style="color: var(--color-ink-900);">Cek Kebutuhan Bahan Baku</span>
          <span class="ml-auto rounded-full px-2 py-0.5 text-xs font-bold" style="background: var(--color-blue-100); color: var(--color-blue-700);">{{ visibleNeeds.length }} menu</span>
        </div>
        <div class="space-y-2.5">
          <div v-for="need in visibleNeeds" :key="need.menuId">
            <div class="flex items-center justify-between text-xs mb-1">
              <span class="flex items-center gap-1.5 min-w-0">
                <span class="text-sm shrink-0">{{ e(need.menuId) }}</span>
                <span class="font-semibold truncate" style="color: var(--color-ink-900);">{{ need.menuName }}</span>
              </span>
              <span class="font-bold shrink-0 ml-2" :style="{ color: need.netNeed > 0 ? '#DC2626' : 'var(--color-green-600)' }">
                {{ need.netNeed > 0 ? `kurang ${need.netNeed} pcs` : '✓ cukup' }}
              </span>
            </div>
            <!-- Progress bar: grossNeed vs stock -->
            <div class="h-3 rounded-full overflow-hidden relative" style="background: var(--color-blue-100);">
              <!-- Stock portion -->
              <div class="h-full rounded-full transition-all" style="background: var(--color-green-500);" :style="{ width: Math.min(100, (need.stockOnHand / Math.max(need.grossNeed, 1)) * 100) + '%' }"></div>
              <!-- Net need indicator (red) — shown as overlay when netNeed > 0 -->
              <div v-if="need.netNeed > 0" class="absolute inset-y-0 rounded-full transition-all" style="background: rgba(220, 38, 38, 0.7); right: 0;" :style="{ width: Math.min(100, (need.netNeed / Math.max(need.grossNeed, 1)) * 100) + '%' }"></div>
            </div>
            <div class="flex justify-between text-[10px] font-semibold mt-0.5" style="color: var(--color-ink-500);">
              <span>{{ need.grossNeed }} pcs dibutuhkan</span>
              <span style="color: var(--color-green-600);">{{ need.stockOnHand }} stok</span>
            </div>
          </div>
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
          <div class="text-[10px] font-semibold mb-2" style="color: var(--color-green-500);">{{ sisaNonZero.length }} menu masih punya sisa stok</div>
          <div class="space-y-1.5">
            <div v-for="s in sisaNonZero" :key="s.menuId" class="flex items-center justify-between rounded-lg px-3 py-1.5 text-xs" style="background: rgba(255,255,255,0.7);">
              <span class="flex items-center gap-1.5 font-semibold" style="color: var(--color-ink-800);">
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

      <!-- 🎉 Tidak perlu belanja / PO kosong -->
      <template v-if="!mixList.length && !individualList.length">
        <div class="rounded-2xl border p-3.5" :style="{ background: items.length === 0 ? '#FEF2F2' : 'var(--color-green-100)', borderColor: items.length === 0 ? '#FECACA' : '#B5E0C2' }">
          <div class="flex items-start gap-2.5">
            <span class="text-xl">{{ items.length === 0 ? '📋' : '🎉' }}</span>
            <div>
              <div v-if="items.length === 0" class="text-sm font-bold" style="color: #B91C1C;">PO belum punya pesanan</div>
              <div v-else class="text-sm font-bold" style="color: var(--color-green-700);">Tidak perlu belanja!</div>
              <div class="mt-0.5 text-xs font-semibold" :style="{ color: items.length === 0 ? '#B91C1C' : 'var(--color-green-700)' }">
                {{ items.length === 0 ? 'Tambah customer & pesanan dulu di halaman PO.' : 'Stok cukup buat semua pesanan hari ini.' }}
              </div>
              <button v-if="items.length === 0"
                class="mt-2 rounded-2xl px-4 py-2 text-xs font-bold text-white active:scale-95"
                style="background: var(--color-blue-500);"
                @click="navigateTo(`/po/${poId}`)">+ Tambah Pesanan</button>
            </div>
          </div>
        </div>
      </template>

      <!-- 🛒 Buat Daftar Belanja -->
      <template v-if="beliList.length > 0">
        <button class="w-full rounded-2xl py-4 font-display text-base font-semibold text-white shadow-lg transition-transform active:scale-[0.98]"
          style="background: linear-gradient(135deg, #7c3aed, #5b21b6); box-shadow: 0 8px 24px rgba(124, 58, 237, 0.35);"
          @click="showShoppingList = true">🛒 Buat Daftar Belanja</button>
      </template>

      <!-- Shopping List Drawer -->
      <UDrawer v-model:open="showShoppingList" title="🛒 Daftar Belanja Supplier" direction="bottom" dismissible close>
        <template #body>
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
            style="background: linear-gradient(135deg, var(--color-green-500), var(--color-green-700));"
            @click="showShoppingList = false">✓ Siap, Tandai Sudah Dibeli</button>
        </template>
      </UDrawer>

      <div class="pt-2">
        <button class="w-full rounded-2xl py-4 font-display text-base font-semibold text-white shadow-lg transition-transform active:scale-[0.98]"
          style="background: linear-gradient(135deg, var(--color-blue-400), var(--color-blue-600)); box-shadow: 0 8px 24px rgba(46, 139, 192, 0.35);"
          @click="navigateTo('/')">↩ Edit Pesanan</button>
      </div>
    </template><!-- end v-else-if="result" -->

    <div v-else class="py-16 text-center space-y-4">
      <div class="text-5xl">🌷</div>
      <div class="font-display text-lg font-semibold" style="color: var(--color-ink-700);">Belum ada perhitungan</div>
      <div class="text-xs font-semibold" style="color: var(--color-ink-500);">Isi pesanan dulu ✨</div>
      <button class="cta outline" @click="navigateTo('/')">📋 Isi Pesanan</button>
    </div>
  </div>
</template>
