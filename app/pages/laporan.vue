<script setup lang="ts">
import { usePoStore } from '~/stores/po'
import { usePackageStore } from '~/stores/packages'
import type { PurchaseOrder } from '~/types'

definePageMeta({ title: 'Laporan Keuangan' })

const poStore = usePoStore()
const pkgStore = usePackageStore()

onMounted(async () => {
  await Promise.all([
    poStore.ensureLoaded(),
    pkgStore.ensureLoaded(),
  ])
})

// ── Compute HPP from per-product data ──
function getHpp(productId: string, variant?: string): number {
  return pkgStore.getProductHpp(productId, variant)
}

function calcModal(po: PurchaseOrder): number {
  let total = 0
  for (const c of po.customers) {
    for (const item of c.items) {
      total += getHpp(item.productId, item.variant) * item.qty
    }
    for (const bk of c.bakarKukusItems || []) {
      total += getHpp(bk.menuId, bk.caraMasak) * bk.jumlahPorsi
    }
  }
  return total
}

function calcRevenue(po: PurchaseOrder): number {
  return poStore.orderTotal(po.id)
}

// ── PO filter ──
type FilterMode = 'semua' | 'per-po' | 'bulan'
const filterMode = ref<FilterMode>('semua')
const selectedPoId = ref<string | null>(null)
const selectedMonth = ref(new Date().toISOString().slice(0, 7))

const allPOs = computed(() => poStore.getClosedOrders())
const selectedPO = computed(() => allPOs.value.find(p => p.id === selectedPoId.value))

const filteredPOs = computed(() => {
  if (filterMode.value === 'per-po' && selectedPoId.value) {
    const po = allPOs.value.find(p => p.id === selectedPoId.value)
    return po ? [po] : []
  }
  if (filterMode.value === 'bulan') {
    const [year, month] = selectedMonth.value.split('-').map(Number)
    return allPOs.value.filter(po => {
      const d = new Date(po.createdAt)
      return d.getFullYear() === year && d.getMonth() + 1 === month
    })
  }
  return allPOs.value
})

interface PoReport {
  id: string
  label: string
  createdAt: number
  customers: number
  revenue: number
  modal: number
  laba: number
  ownerShare: number
}

const reports = computed<PoReport[]>(() => {
  return filteredPOs.value.map(po => {
    const revenue = calcRevenue(po)
    const modal = calcModal(po)
    const laba = revenue - modal
    return {
      id: po.id,
      label: po.label,
      createdAt: po.createdAt,
      customers: po.customers.length,
      revenue,
      modal,
      laba,
      ownerShare: laba / 2,
    }
  })
})

const totals = computed(() => ({
  revenue: reports.value.reduce((s, r) => s + r.revenue, 0),
  modal: reports.value.reduce((s, r) => s + r.modal, 0),
  laba: reports.value.reduce((s, r) => s + r.laba, 0),
  ownerShare: reports.value.reduce((s, r) => s + r.ownerShare, 0),
}))

// ── Best Seller ──
interface BsItem { menuId: string; name: string; total: number }
const bestSellers = computed(() => {
  const count = new Map<string, number>()
  for (const po of filteredPOs.value) {
    for (const c of po.customers) {
      for (const item of c.items) {
        const comps = pkgStore.getCompositions(item.productId)
        for (const comp of comps) {
          count.set(comp.menuId, (count.get(comp.menuId) || 0) + comp.qty * item.qty)
        }
      }
      for (const bk of c.bakarKukusItems || []) {
        count.set(bk.menuId, (count.get(bk.menuId) || 0) + bk.jumlahPorsi * 4)
      }
    }
  }
  return [...count.entries()]
    .map(([menuId, total]) => ({ menuId, name: pkgStore.getMenuById(menuId)?.name || menuId, total }))
    .sort((a, b) => b.total - a.total)
})

const emojiMap: Record<string, string> = {
  'siomay-ayam': '🥟', 'siomay-udang': '🍤', 'siomay-kepiting': '🦀',
  'siomay-seafood': '🦐', 'siomay-nori': '🌿', 'siomay-mozzarella': '🧀',
  'hisitkau': '🥢', 'lumpia-kulit-tahu-ayam': '🌯', 'lumpia-kulit-tahu-udang': '🥟',
}
function e(id: string) { return emojiMap[id] || '📦' }
function fmtRp(n: number) { return 'Rp ' + (n || 0).toLocaleString('id-ID') }
</script>

<template>
  <div class="slide-up space-y-4">

    <!-- Header -->
    <div class="flex items-center gap-2">
      <button class="rounded-xl px-3 py-2 text-xs font-bold text-white active:scale-90" style="background: var(--color-blue-500);" @click="navigateTo('/')">← Kembali</button>
      <span class="text-lg">💰</span>
      <span class="font-display text-base font-bold" style="color: var(--color-ink-900);">Laporan Keuangan</span>
    </div>

    <!-- Empty state -->
    <div v-if="allPOs.length === 0" class="rounded-2xl border p-6 text-center space-y-2" style="background: var(--color-cream-50); border-color: var(--color-cream-200);">
      <div class="text-3xl">📊</div>
      <div class="font-display text-base font-bold" style="color: var(--color-ink-900);">Belum ada PO selesai</div>
      <div class="text-xs font-semibold" style="color: var(--color-ink-500);">Tutup PO dulu buat lihat laporan</div>
    </div>

    <template v-else>
      <!-- Filter -->
      <div class="rounded-2xl border bg-white p-3.5" style="border-color: var(--color-blue-100);">
        <div class="flex gap-2 mb-3">
          <button v-for="opt in ([{ id: 'semua', label: 'Semua' }, { id: 'per-po', label: 'Per PO' }, { id: 'bulan', label: 'Per Bulan' }] as const)" :key="opt.id"
            class="rounded-xl px-3 py-1.5 text-xs font-bold transition-all active:scale-95"
            :style="{
              background: filterMode === opt.id ? 'var(--color-blue-500)' : 'var(--color-blue-50)',
              color: filterMode === opt.id ? 'white' : 'var(--color-blue-700)',
            }"
            @click="filterMode = opt.id"
          >{{ opt.label }}</button>
        </div>

        <div v-if="filterMode === 'per-po'" class="flex gap-2 overflow-x-auto pb-1">
          <button v-for="po in allPOs" :key="po.id"
            class="shrink-0 rounded-xl px-3 py-1.5 text-xs font-bold whitespace-nowrap"
            :style="{
              background: selectedPoId === po.id ? 'var(--color-green-500)' : 'var(--color-green-50)',
              color: selectedPoId === po.id ? 'white' : 'var(--color-green-700)',
            }"
            @click="selectedPoId = po.id"
          >{{ po.label }}</button>
        </div>

        <div v-if="filterMode === 'bulan'" class="flex items-center gap-2">
          <input type="month" :value="selectedMonth" @input="selectedMonth = ($event.target as HTMLInputElement).value"
            class="rounded-xl border px-3 py-1.5 text-xs font-semibold outline-none" style="border-color: var(--color-blue-200);">
        </div>
      </div>

      <!-- Summary Cards -->
      <div class="grid grid-cols-2 gap-2">
        <div class="rounded-2xl border p-3.5" style="background: var(--color-green-50); border-color: var(--color-green-200);">
          <div class="text-[10px] font-semibold" style="color: var(--color-green-600);">Revenue</div>
          <div class="font-display text-lg font-bold" style="color: var(--color-green-700);">{{ fmtRp(totals.revenue) }}</div>
        </div>
        <div class="rounded-2xl border p-3.5" style="background: #FEF2F2; border-color: #FECACA;">
          <div class="text-[10px] font-semibold" style="color: #B91C1C;">Modal</div>
          <div class="font-display text-lg font-bold" style="color: #B91C1C;">{{ fmtRp(totals.modal) }}</div>
        </div>
        <div class="rounded-2xl border p-3.5" style="border-color: var(--color-blue-100);">
          <div class="text-[10px] font-semibold" style="color: var(--color-blue-600);">Laba</div>
          <div class="font-display text-lg font-bold" style="color: var(--color-blue-700);">{{ fmtRp(totals.laba) }}</div>
        </div>
        <div class="rounded-2xl border p-3.5" style="background: var(--color-cream-50); border-color: var(--color-cream-200);">
          <div class="text-[10px] font-semibold" style="color: var(--color-ink-600);">👤 Masing-masing</div>
          <div class="font-display text-lg font-bold" style="color: var(--color-ink-900);">{{ fmtRp(totals.ownerShare) }}</div>
        </div>
      </div>

      <!-- Per PO Breakdown -->
      <div class="rounded-2xl border bg-white overflow-hidden" style="border-color: var(--color-blue-100);">
        <div class="flex items-center gap-2 p-3.5 border-b" style="border-color: var(--color-blue-50);">
          <span class="text-sm">📋</span>
          <span class="font-display text-xs font-bold" style="color: var(--color-ink-900);">Rincian per PO</span>
          <span class="ml-auto text-[10px] font-semibold rounded-full px-2 py-0.5" style="background: var(--color-blue-50); color: var(--color-blue-700);">{{ reports.length }} PO</span>
        </div>
        <div v-for="r in reports" :key="r.id"
          class="border-b p-3.5 text-xs space-y-1 last:border-0" style="border-color: var(--color-blue-50);">
          <div class="flex items-center justify-between">
            <span class="font-bold" style="color: var(--color-ink-900);">{{ r.label }}</span>
            <span class="rounded-full px-2 py-0.5 text-[10px] font-semibold" style="background: var(--color-blue-50); color: var(--color-blue-600);">{{ r.customers }} pembeli</span>
          </div>
          <div class="flex items-center justify-between" style="color: var(--color-ink-500);">
            <span>Revenue</span>
            <span class="font-semibold" style="color: var(--color-green-600);">{{ fmtRp(r.revenue) }}</span>
          </div>
          <div class="flex items-center justify-between" style="color: var(--color-ink-500);">
            <span>Modal</span>
            <span class="font-semibold" style="color: #B91C1C;">− {{ fmtRp(r.modal) }}</span>
          </div>
          <div class="flex items-center justify-between border-t pt-1" style="border-color: var(--color-blue-50);">
            <span class="font-bold" style="color: var(--color-ink-800);">Laba</span>
            <span class="font-bold" style="color: var(--color-blue-600);">{{ fmtRp(r.laba) }}</span>
          </div>
          <div class="flex items-center justify-between" style="color: var(--color-ink-500);">
            <span>👤 Bagian Owner</span>
            <span class="font-bold" style="color: var(--color-ink-900);">{{ fmtRp(r.ownerShare) }} × 2</span>
          </div>
        </div>
      </div>

      <!-- Best Seller -->
      <div v-if="bestSellers.length > 0" class="rounded-2xl border bg-white p-3.5" style="border-color: var(--color-blue-100);">
        <div class="flex items-center gap-2 mb-2">
          <span class="text-sm">🏆</span>
          <span class="font-display text-xs font-bold" style="color: var(--color-ink-900);">Best Seller</span>
          <span class="ml-auto text-[10px] font-semibold rounded-full px-2 py-0.5" style="background: var(--color-orange-50); color: #B45309;">{{ bestSellers.length }} menu</span>
        </div>
        <div class="space-y-1">
          <div v-for="(item, i) in bestSellers" :key="item.menuId"
            class="flex items-center gap-2 text-xs py-1.5 border-b last:border-0" style="border-color: var(--color-blue-50);">
            <span class="w-5 text-center text-sm font-bold" :style="{ color: i < 3 ? '#D97706' : 'var(--color-ink-400)' }">{{ ['🥇','🥈','🥉'][i] || '' }}</span>
            <span>{{ e(item.menuId) }}</span>
            <span class="flex-1 font-semibold" style="color: var(--color-ink-800);">{{ item.name }}</span>
            <span class="font-bold" style="color: var(--color-blue-600);">{{ item.total }} pcs</span>
            <div class="h-1.5 w-16 rounded-full overflow-hidden" style="background: var(--color-blue-100);">
              <div class="h-full rounded-full" style="background: linear-gradient(90deg, var(--color-blue-400), var(--color-blue-600));"
                :style="{ width: (item.total / (bestSellers[0]?.total || 1)) * 100 + '%' }"></div>
            </div>
          </div>
        </div>
      </div>

      <!-- Share button -->
      <button @click="navigator.clipboard?.writeText(
        `📊 *Laporan Keuangan Delulu*\n` +
        `Revenue: ${fmtRp(totals.revenue)}\n` +
        `Modal: ${fmtRp(totals.modal)}\n` +
        `Laba: ${fmtRp(totals.laba)}\n` +
        `👤 Per Owner (50:50): ${fmtRp(totals.ownerShare)}\n` +
        `\n🏆 Best Seller:\n` +
        bestSellers.slice(0, 5).map((item, i) => `${i+1}. ${item.name} — ${item.total} pcs`).join('\n')
      )"
        class="w-full rounded-2xl border py-3.5 text-sm font-bold active:scale-95 transition-all"
        style="background: #25D366; color: white; border: none;">
        💬 Salin Laporan ke WA
      </button>
    </template>

  </div>
</template>
