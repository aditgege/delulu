<script setup lang="ts">
import { usePoStore } from '~/stores/po'
import { useInventoryStore } from '~/stores/inventory'
import { usePackageStore } from '~/stores/packages'

definePageMeta({ title: 'Beranda' })

const poStore = usePoStore()
const invStore = useInventoryStore()
const pkgStore = usePackageStore()

const loading = ref(true)

onMounted(async () => {
  await Promise.all([
    poStore.ensureLoaded(),
    pkgStore.ensureLoaded(),
    invStore.ensureLoaded(),
  ])
  loading.value = false
})

// ── Kalkulator Belanja ──
const showCalcPicker = ref(false)
const calcPOs = computed(() => poStore.getActiveOrders())
function pilihPO(id: string) {
  showCalcPicker.value = false
  navigateTo(`/rekomendasi/${id}`)
}

const greeting = (() => {
  const h = new Date().getHours()
  if (h < 11) return 'Selamat pagi'
  if (h < 15) return 'Selamat siang'
  if (h < 18) return 'Selamat sore'
  return 'Selamat malam'
})()

// ── PO Stats ──
const activePOs = computed(() => poStore.getActiveOrders())
const closedPOs = computed(() => poStore.getClosedOrders())

const totalClosedRevenue = computed(() => poStore.totalRevenue())
const totalClosedCustomers = computed(() => poStore.totalCustomers())

// ── Stock alerts ──
const lowStockItems = computed(() => {
  const out: Array<{ id: string; name: string; stock: number }> = []
  for (const entry of invStore.getAllEntries()) {
    const menu = pkgStore.getMenuById(entry.menuId)
    if (entry.qtyOnHand <= 2) {
      out.push({ id: entry.menuId, name: menu?.name || entry.menuId, stock: entry.qtyOnHand })
    }
  }
  return out.sort((a, b) => a.stock - b.stock)
})

const zeroStockItems = computed(() => lowStockItems.value.filter(i => i.stock === 0))
const warningStockItems = computed(() => lowStockItems.value.filter(i => i.stock > 0 && i.stock <= 2))

// ── Best seller from closed POs ──
interface BestSeller { menuId: string; name: string; total: number }
const bestSellers = computed(() => {
  const count = new Map<string, number>()
  for (const po of closedPOs.value) {
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
    .slice(0, 5)
})

function fmtRp(n: number) { return 'Rp ' + (n || 0).toLocaleString('id-ID') }

const emojiMap: Record<string, string> = {
  'siomay-ayam': '🥟', 'siomay-udang': '🍤', 'siomay-kepiting': '🦀',
  'siomay-seafood': '🦐', 'siomay-nori': '🌿', 'siomay-mozzarella': '🧀',
  'hisitkau': '🥢', 'lumpia-kulit-tahu-ayam': '🌯', 'lumpia-kulit-tahu-udang': '🥟',
}
function e(id: string) { return emojiMap[id] || '📦' }
</script>

<template>
  <!-- Loading skeleton -->
  <div v-if="loading" class="slide-up space-y-4">
    <div class="rounded-2xl p-4" style="background: linear-gradient(135deg, #059669, #047857);">
      <div class="h-4 w-24 rounded-lg bg-white/30" />
      <div class="mt-2 h-7 w-40 rounded-lg bg-white/30" />
    </div>
    <div class="grid grid-cols-3 gap-2">
      <div v-for="i in 3" :key="i" class="rounded-2xl border p-3" style="border-color: var(--color-blue-100);">
        <div class="h-5 w-12 rounded-lg" style="background: var(--color-blue-100);" />
        <div class="mt-1.5 h-3 w-16 rounded-lg" style="background: var(--color-cream-100);" />
      </div>
    </div>
    <div class="grid grid-cols-3 gap-2">
      <div v-for="i in 3" :key="i" class="h-20 rounded-2xl" style="background: var(--color-cream-100);" />
    </div>
    <div class="h-24 rounded-2xl" style="background: var(--color-cream-100);" />
    <div class="h-16 rounded-2xl" style="background: var(--color-cream-100);" />
    <div class="h-24 rounded-2xl" style="background: var(--color-cream-100);" />
    <div class="h-20 rounded-2xl" style="background: var(--color-cream-100);" />
  </div>

  <div v-else class="slide-up space-y-4">

    <!-- Greeting -->
    <div class="rounded-2xl border p-4" style="background: linear-gradient(135deg, #059669, #047857); color: white; border: none;">
      <div class="flex items-start justify-between">
        <div>
          <div class="text-xs font-semibold opacity-80">{{ greeting }},</div>
          <div class="font-display text-xl font-bold">Delulu 🌟</div>
          <div class="mt-1 text-xs font-semibold opacity-75">Belanja cerdas, untung maksimal ✨</div>
        </div>
        <div class="rounded-full bg-white/20 px-3 py-1 text-xs font-bold">
          {{ new Date().toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short' }) }}
        </div>
      </div>
    </div>

    <!-- Quick Stats -->
    <div class="grid grid-cols-3 gap-2">
      <div class="rounded-2xl border bg-white p-3 text-center" style="border-color: var(--color-blue-100);">
        <div class="text-lg">{{ activePOs.length }}</div>
        <div class="text-[10px] font-semibold" style="color: var(--color-ink-500);">PO Aktif</div>
      </div>
      <div class="rounded-2xl border bg-white p-3 text-center" style="border-color: var(--color-green-100);">
        <div class="text-lg font-bold" style="color: var(--color-green-700);">{{ fmtRp(totalClosedRevenue) }}</div>
        <div class="text-[10px] font-semibold" style="color: var(--color-ink-500);">Total Pendapatan</div>
      </div>
      <div class="rounded-2xl border bg-white p-3 text-center" style="border-color: var(--color-orange-100);">
        <div class="text-lg font-bold" style="color: var(--color-orange-600);">{{ totalClosedCustomers }}</div>
        <div class="text-[10px] font-semibold" style="color: var(--color-ink-500);">Pelanggan</div>
      </div>
    </div>

    <!-- Quick Actions -->
    <div class="rounded-2xl border bg-white p-3" style="border-color: var(--color-blue-100);">
      <div class="font-display text-xs font-bold mb-2" style="color: var(--color-ink-600);">Menu Cepat</div>
      <div class="grid grid-cols-3 gap-2">
        <button @click="navigateTo('/po')"
          class="rounded-xl border p-2.5 text-center font-semibold text-xs active:scale-95 transition-all"
          style="background: var(--color-blue-50); border-color: var(--color-blue-100); color: var(--color-blue-700);">
          <div class="text-lg mb-0.5">📋</div>
          <div>PO</div>
        </button>
        <button @click="navigateTo('/stok')"
          class="rounded-xl border p-2.5 text-center font-semibold text-xs active:scale-95 transition-all"
          style="background: var(--color-cream-50); border-color: var(--color-cream-200); color: var(--color-ink-700);">
          <div class="text-lg mb-0.5">📦</div>
          <div>Stok</div>
        </button>
        <button @click="navigateTo('/laporan')"
          class="rounded-xl border p-2.5 text-center font-semibold text-xs active:scale-95 transition-all"
          style="background: var(--color-green-50); border-color: var(--color-green-100); color: var(--color-green-700);">
          <div class="text-lg mb-0.5">💰</div>
          <div>Laporan</div>
        </button>
        <button @click="navigateTo('/master-data')"
          class="rounded-xl border p-2.5 text-center font-semibold text-xs active:scale-95 transition-all"
          style="background: var(--color-purple-50); border-color: #E9D5FF; color: #7C3AED;">
          <div class="text-lg mb-0.5">📦</div>
          <div>Master Data</div>
        </button>
        <button @click="navigateTo('/master-data/supplier')"
          class="rounded-xl border p-2.5 text-center font-semibold text-xs active:scale-95 transition-all"
          style="background: var(--color-orange-50); border-color: #FED7AA; color: #C2410C;">
          <div class="text-lg mb-0.5">🏭</div>
          <div>Supplier</div>
        </button>
        <button @click="navigateTo('/settings')"
          class="rounded-xl border p-2.5 text-center font-semibold text-xs active:scale-95 transition-all"
          style="background: var(--color-blue-50); border-color: var(--color-blue-100); color: var(--color-ink-600);">
          <div class="text-lg mb-0.5">⚙️</div>
          <div>Settings</div>
        </button>
      </div>
    </div>

    <!-- 🧮 Kalkulator Belanja -->
    <div class="rounded-2xl border" style="background: linear-gradient(135deg, #7c3aed, #5b21b6); color: white; border: none;">
      <button
        class="flex w-full items-center gap-3 p-4 active:scale-[0.98] transition-all"
        @click="showCalcPicker = true"
      >
        <div class="flex h-12 w-12 items-center justify-center rounded-2xl text-2xl" style="background: rgba(255,255,255,0.15);">🧮</div>
        <div class="text-left flex-1">
          <div class="font-display text-base font-bold">Kalkulator Belanja</div>
          <div class="text-xs font-semibold opacity-75">Pilih PO → lihat rekomendasi belanja supplier</div>
        </div>
        <span class="text-xl opacity-60">→</span>
      </button>
    </div>

    <!-- PO Picker Drawer -->
    <UDrawer v-model:open="showCalcPicker" title="🧮 Pilih PO" direction="bottom" dismissible close>
      <template #body>
        <div v-if="calcPOs.length === 0" class="py-8 text-center space-y-2">
          <div class="text-3xl">📋</div>
          <div class="text-sm font-semibold" style="color: var(--color-ink-500);">Belum ada PO aktif.</div>
          <div class="text-xs font-semibold" style="color: var(--color-ink-400);">Buat PO dulu buat mulai catat pesanan.</div>
          <button
            class="mt-2 rounded-2xl px-5 py-2.5 text-sm font-bold text-white active:scale-95"
            style="background: var(--color-blue-500);"
            @click="showCalcPicker = false; navigateTo('/po')"
          >+ Buat PO</button>
        </div>
        <div v-else class="space-y-2 pb-4">
          <div v-for="po in calcPOs" :key="po.id"
            class="flex items-center gap-3 rounded-2xl border p-3.5 active:scale-[0.98] transition-all cursor-pointer"
            style="border-color: var(--color-blue-100);"
            @click="pilihPO(po.id)"
          >
            <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-lg" style="background: var(--color-blue-50);">📋</div>
            <div class="flex-1 min-w-0">
              <div class="font-display text-sm font-bold truncate" style="color: var(--color-ink-900);">{{ po.label }}</div>
              <div class="text-xs font-semibold" style="color: var(--color-ink-500);">👥 {{ po.customers.length }} pembeli</div>
            </div>
            <span class="text-lg opacity-40">→</span>
          </div>
        </div>
      </template>
    </UDrawer>

    <!-- Empty state -->
    <div v-if="activePOs.length === 0 && closedPOs.length === 0" class="rounded-2xl border p-6 text-center space-y-2" style="background: var(--color-cream-50); border-color: var(--color-cream-200);">
      <div class="text-3xl">📋</div>
      <div class="font-display text-base font-bold" style="color: var(--color-ink-900);">Belum ada PO</div>
      <div class="text-xs font-semibold" style="color: var(--color-ink-500);">Klik "Buat PO" buat mulai catat pesanan</div>
    </div>

    <!-- Stock Alerts -->
    <div v-if="zeroStockItems.length > 0" class="rounded-2xl border p-3.5" style="background: #FEF2F2; border-color: #FECACA;">
      <div class="flex items-center gap-2 mb-2">
        <span class="text-sm">⚠️</span>
        <span class="font-display text-xs font-bold" style="color: #B91C1C;">Stok Habis — {{ zeroStockItems.length }} menu</span>
        <button @click="navigateTo('/settings')" class="ml-auto text-[10px] font-bold active:scale-90" style="color: var(--color-blue-600);">Update →</button>
      </div>
      <div class="flex flex-wrap gap-1">
        <span v-for="item in zeroStockItems" :key="item.id"
          class="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-bold" style="background: #FEE2E2; color: #B91C1C;">
          {{ e(item.id) }} {{ item.name }}
        </span>
      </div>
    </div>

    <div v-if="warningStockItems.length > 0" class="rounded-2xl border p-3.5" style="background: #FFFBEB; border-color: #FDE68A;">
      <div class="flex items-center gap-2">
        <span class="text-sm">📦</span>
        <span class="font-display text-xs font-bold" style="color: #92400E;">Stok Menipis</span>
      </div>
      <div class="flex flex-wrap gap-1 mt-1.5">
        <span v-for="item in warningStockItems" :key="item.id"
          class="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-bold" style="background: #FEF3C7; color: #92400E;">
          {{ e(item.id) }} {{ item.name }} ({{ item.stock }} pcs)
        </span>
      </div>
    </div>

    <!-- Best Seller -->
    <div v-if="bestSellers.length > 0" class="rounded-2xl border bg-white p-3.5" style="border-color: var(--color-blue-100);">
      <div class="flex items-center gap-2 mb-2">
        <span class="text-sm">🏆</span>
        <span class="font-display text-xs font-bold" style="color: var(--color-ink-900);">Best Seller</span>
      </div>
      <div class="space-y-1">
        <div v-for="(item, i) in bestSellers" :key="item.menuId"
          class="flex items-center gap-2 text-xs py-1 border-b last:border-0" style="border-color: var(--color-blue-50);">
          <span class="w-5 text-center font-bold" :style="{ color: i < 3 ? '#D97706' : 'var(--color-ink-400)' }">{{ i + 1 }}</span>
          <span>{{ e(item.menuId) }}</span>
          <span class="flex-1 font-semibold" style="color: var(--color-ink-800);">{{ item.name }}</span>
          <span class="font-bold" style="color: var(--color-blue-600);">{{ item.total }} pcs</span>
        </div>
      </div>
    </div>

    <!-- Recent Closed PO Summary -->
    <div v-if="closedPOs.length > 0" class="rounded-2xl border p-3.5" style="background: var(--color-green-50); border-color: var(--color-green-200);">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2">
          <span class="text-sm">📊</span>
          <span class="font-display text-xs font-bold" style="color: var(--color-green-700);">Riwayat</span>
        </div>
        <button @click="navigateTo('/laporan')" class="text-[10px] font-bold active:scale-90" style="color: var(--color-blue-600);">Lengkap →</button>
      </div>
      <div class="text-xs mt-1.5 font-semibold" style="color: var(--color-green-600);">
        {{ closedPOs.length }} PO selesai · {{ totalClosedCustomers }} pelanggan · {{ fmtRp(totalClosedRevenue) }}
      </div>
    </div>

  </div>
</template>

