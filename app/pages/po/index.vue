<script setup lang="ts">
import { usePoStore } from '~/stores/po'
import { usePackageStore } from '~/stores/packages'

definePageMeta({ title: 'Daftar Pre-Order' })

const poStore = usePoStore()
const pkgStore = usePackageStore()

onMounted(async () => {
  await Promise.all([poStore.ensureLoaded(), pkgStore.ensureLoaded()])
})

const activePOs = computed(() => poStore.getActiveOrders())
const closedPOs = computed(() => poStore.getClosedOrders())

const showCreateDrawer = ref(false)
const newPoLabel = ref('')
const creatingPo = ref(false)

async function createPo() {
  if (!newPoLabel.value.trim()) return
  creatingPo.value = true
  try {
    const po = await poStore.createOrder(newPoLabel.value.trim())
    navigateTo(`/po/${po.id}`)
  } finally { creatingPo.value = false }
}

function openCreateDrawer() {
  newPoLabel.value = ''
  showCreateDrawer.value = true
}

function fmtRp(n: number) { return 'Rp ' + (n || 0).toLocaleString('id-ID') }

const stats = computed(() => ({
  totalRevenue: poStore.totalRevenue(),
  totalCustomers: poStore.totalCustomers(),
  totalPackages: poStore.totalPackagesSold(),
}))
</script>

<template>
  <div class="slide-up space-y-4">

    <!-- Header -->
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2">
          <button class="rounded-xl px-3 py-2 text-xs font-bold text-white active:scale-90" style="background: var(--color-blue-500);" @click="navigateTo('/')">← Kembali</button>
          <span class="text-lg">📋</span>
          <span class="font-display text-base font-bold" style="color: var(--color-ink-900);">Pre-Order</span>
        </div>
      <button @click="openCreateDrawer"
        class="rounded-2xl px-4 py-2.5 text-sm font-bold text-white active:scale-95"
        style="background: linear-gradient(135deg, var(--color-blue-400), var(--color-blue-600));"
      >+ Buat PO</button>
    </div>

    <!-- Empty state -->
    <div v-if="activePOs.length === 0 && closedPOs.length === 0" class="rounded-2xl border p-6 text-center space-y-2" style="background: var(--color-cream-50); border-color: var(--color-cream-200);">
      <div class="text-3xl">📋</div>
      <div class="font-display text-base font-bold" style="color: var(--color-ink-900);">Belum ada PO</div>
      <div class="text-xs font-semibold" style="color: var(--color-ink-500);">Bikin PO dulu buat mulai catat pesanan</div>
      <button class="rounded-2xl px-6 py-3 text-sm font-bold text-white active:scale-95" style="background: var(--color-blue-500);" @click="openCreateDrawer">+ Buat PO Baru</button>
    </div>

    <!-- Active POs -->
    <div v-if="activePOs.length > 0">
      <div class="flex items-center gap-2 mb-2.5">
        <span class="text-sm">🟢</span>
        <span class="font-display text-sm font-bold" style="color: var(--color-ink-900);">Aktif — {{ activePOs.length }}</span>
      </div>
      <div class="space-y-2">
        <div v-for="po in activePOs" :key="po.id"
          @click="navigateTo(`/po/${po.id}`)"
          class="rounded-2xl border bg-white p-3.5 active:scale-[0.98] transition-all cursor-pointer"
          style="border-color: var(--color-blue-100); box-shadow: 0 4px 12px rgba(46, 139, 192, 0.08);"
        >
          <div class="flex items-center justify-between mb-1">
            <span class="font-display font-bold text-base" style="color: var(--color-ink-900);">{{ po.label }}</span>
            <span class="font-display text-sm font-bold" style="color: var(--color-blue-600);">{{ fmtRp(poStore.orderTotal(po.id)) }}</span>
          </div>
          <div class="flex items-center gap-3 text-xs" style="color: var(--color-ink-500);">
            <span>👥 {{ po.customers.length }} pembeli</span>
            <span>📦 {{ po.customers.reduce((s, c) => s + c.items.reduce((a, i) => a + i.qty, 0), 0) }} paket</span>
          </div>
          <div class="mt-1.5 flex gap-1.5">
            <span v-if="po.customers.filter(c => !c.paid).length > 0"
              class="text-[10px] font-bold rounded-full px-2 py-0.5" style="background: #FEF2F2; color: #B91C1C;">
              ⏳ {{ po.customers.filter(c => !c.paid).length }} blm bayar
            </span>
            <span v-if="po.customers.filter(c => !c.shipped).length > 0"
              class="text-[10px] font-bold rounded-full px-2 py-0.5" style="background: var(--color-orange-50); color: #B45309;">
              📬 {{ po.customers.filter(c => !c.shipped).length }} blm kirim
            </span>
            <span v-if="po.customers.every(c => c.paid && c.shipped)"
              class="text-[10px] font-bold rounded-full px-2 py-0.5" style="background: var(--color-green-50); color: var(--color-green-700);">
              ✅ Selesai
            </span>
          </div>
          <div class="mt-2 text-[10px] font-semibold" style="color: var(--color-ink-400);">
            {{ new Date(po.createdAt).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long' }) }}
          </div>
        </div>
      </div>
    </div>

    <!-- Closed POs -->
    <div v-if="closedPOs.length > 0">
      <div class="flex items-center gap-2 mb-2.5">
        <span class="text-sm">📊</span>
        <span class="font-display text-sm font-bold" style="color: var(--color-ink-900);">Riwayat — {{ closedPOs.length }}</span>
      </div>
      <div class="space-y-1.5">
        <div v-for="po in closedPOs" :key="po.id"
          @click="navigateTo(`/po/${po.id}`)"
          class="rounded-2xl border p-3 active:scale-[0.98] transition-all cursor-pointer"
          style="background: var(--color-green-50); border-color: var(--color-green-200);"
        >
          <div class="flex items-center justify-between">
            <span class="font-semibold text-sm" style="color: var(--color-ink-800);">{{ po.label }}</span>
            <span class="text-xs font-bold rounded-full px-2 py-0.5" style="background: var(--color-green-100); color: var(--color-green-700);">
              ✅ Selesai
            </span>
          </div>
          <div class="flex items-center gap-3 text-[11px] mt-0.5" style="color: var(--color-ink-500);">
            <span>👥 {{ po.customers.length }} pembeli</span>
            <span class="font-bold" style="color: var(--color-green-600);">{{ fmtRp(poStore.orderTotal(po.id)) }}</span>
          </div>
        </div>
      </div>

      <!-- Totals -->
      <div class="rounded-2xl border p-3 flex items-center justify-between" style="background: var(--color-green-50); border-color: var(--color-green-200);">
        <div class="space-y-0.5">
          <div class="text-[10px] font-semibold" style="color: var(--color-ink-500);">Total semua PO selesai</div>
          <div class="text-xs font-bold" style="color: var(--color-ink-600);">👥 {{ stats.totalCustomers }} pelanggan · 📦 {{ stats.totalPackages }} paket</div>
        </div>
        <div class="text-right">
          <div class="text-[10px] font-semibold" style="color: var(--color-ink-500);">Pendapatan</div>
          <div class="font-display text-lg font-bold" style="color: var(--color-green-700);">{{ fmtRp(stats.totalRevenue) }}</div>
        </div>
      </div>
    </div>

    <!-- Create PO Drawer -->
    <UDrawer v-model:open="showCreateDrawer" title="📋 Buat PO" direction="bottom" dismissible close>
      <template #body>
        <div class="space-y-4 pb-4">
          <div class="text-xs font-semibold" style="color: var(--color-ink-500);">Nama PO</div>
          <input v-model="newPoLabel" type="text" placeholder="Misal: Jumat 25 Juli"
            class="w-full rounded-2xl border px-4 py-3 text-base font-semibold outline-none"
            style="border-color: var(--color-blue-200); color: var(--color-ink-900); background: transparent;"
            @keydown.enter="createPo"
          />
          <button @click="createPo"
            :disabled="!newPoLabel.trim() || creatingPo"
            class="w-full rounded-2xl py-3 text-sm font-bold text-white active:scale-95 disabled:opacity-40 transition-all"
            style="background: linear-gradient(135deg, var(--color-blue-400), var(--color-blue-600));"
          >{{ creatingPo ? '⏳ Membuat...' : '📋 Buat PO' }}</button>
        </div>
      </template>
    </UDrawer>

  </div>
</template>
