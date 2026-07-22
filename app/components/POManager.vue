<script setup lang="ts">
import { usePoStore } from '~/stores/po'
import { usePackageStore } from '~/stores/packages'
import { useOrderStore } from '~/stores/orders'
import { useInventoryStore } from '~/stores/inventory'
import type { CustomerOrder, PurchaseOrder } from '~/types'

const poStore = usePoStore()
const pkgStore = usePackageStore()
const orderStore = useOrderStore()
const invStore = useInventoryStore()
onMounted(() => { pkgStore.ensureLoaded() })
const packages = computed(() => pkgStore.getAllPackages())

const activeOrders = computed(() => poStore.getActiveOrders())
const selectedPoId = ref<string | null>(null)
const newPoLabel = ref('')
const newCustomerName = ref('')

const selectedPo = computed(() => {
  if (!selectedPoId.value) return null
  return poStore.orders.find(o => o.id === selectedPoId.value) || null
})

const closedOrders = computed(() => poStore.getClosedOrders())
const totalRevenue = computed(() => poStore.totalRevenue())
const totalCustomers = computed(() => poStore.totalCustomers())
const totalPackagesSold = computed(() => poStore.totalPackagesSold())

const emojis: Record<string, string> = {
  'paket-halu': '🌟', 'paket-when-ya': '✨', 'paket-solulu': '🌈',
}

watch(activeOrders, (orders) => {
  if (orders.length > 0 && !selectedPoId.value) {
    selectedPoId.value = orders[0]!.id
  }
}, { immediate: true })

function createPo() {
  const label = newPoLabel.value.trim()
  if (!label) return
  const po = poStore.createOrder(label)
  selectedPoId.value = po.id
  newPoLabel.value = ''
}

function addCustomer() {
  const name = newCustomerName.value.trim()
  if (!name || !selectedPoId.value) return
  poStore.addCustomer(selectedPoId.value, name)
  newCustomerName.value = ''
}

function removeCustomer(customerId: string) {
  if (!selectedPoId.value) return
  poStore.removeCustomer(selectedPoId.value, customerId)
}

function getItem(customer: CustomerOrder, pkgId: string) {
  return customer.items.find(i => i.packageId === pkgId)
}

function setQty(customer: CustomerOrder, pkgId: string, qty: number) {
  const existing = getItem(customer, pkgId)
  const extra = existing?.extraChiliOil || 0
  if (!selectedPoId.value) return
  poStore.setCustomerItem(selectedPoId.value, customer.id, pkgId, Math.max(0, qty), extra)
}

// Auto-deduct stock from inventory when marking shipped
function handleToggleShipped(poId: string, customer: CustomerOrder) {
  const po = poStore.getOrderById(poId)
  if (!po) return

  // Deduct stock if shipping, add back if un-shipping
  for (const item of customer.items) {
    const pkg = pkgStore.getPackageById(item.packageId)
    if (!pkg) continue
    // Each package bom has skuId × qty — multiply by item.qty
    for (const bom of pkg.bom) {
      const totalPcs = bom.qty * item.qty
      const current = invStore.getStock(bom.skuId)
      if (customer.shipped) {
        // Un-shipping → add back
        invStore.setStock(bom.skuId, current + totalPcs)
      } else {
        // Shipping → deduct
        invStore.setStock(bom.skuId, current - totalPcs)
      }
    }
  }
  poStore.toggleShipped(poId, customer.id)
}

function toggleChili(customer: CustomerOrder, pkgId: string) {
  const existing = getItem(customer, pkgId)
  if (!existing) return
  const current = existing.extraChiliOil || 0
  if (!selectedPoId.value) return
  poStore.setCustomerItem(selectedPoId.value, customer.id, pkgId, existing.qty, current > 0 ? 0 : 1)
}

function closePo() {
  if (!selectedPoId.value) return
  poStore.closeOrder(selectedPoId.value)
  selectedPoId.value = null
}

function deletePo(id: string) {
  poStore.deleteOrder(id)
  if (selectedPoId.value === id) selectedPoId.value = null
}

function goToResults() {
  if (!selectedPoId.value) return
  const po = poStore.getOrderById(selectedPoId.value)
  if (!po) return
  const agg = new Map<string, number>()
  for (const c of po.customers) {
    for (const item of c.items) {
      agg.set(item.packageId, (agg.get(item.packageId) || 0) + item.qty)
    }
  }
  for (const pkg of packages.value) {
    orderStore.setQty(pkg.id, agg.get(pkg.id) || 0)
  }
  navigateTo('/rekomendasi')
}

function hasAnyOrders(po: PurchaseOrder): boolean {
  return po.customers.some(c => c.items.length > 0)
}

// Summary helpers
function totalPkgQty(pkgId: string): number {
  if (!selectedPo.value) return 0
  return selectedPo.value.customers.reduce((s, c) => s + (c.items.find(i => i.packageId === pkgId)?.qty || 0), 0)
}
function totalExtraChili(): number {
  if (!selectedPo.value) return 0
  return selectedPo.value.customers.reduce((s, c) => s + c.items.reduce((a, i) => a + (i.extraChiliOil || 0), 0), 0)
}
</script>

<template>
  <div class="space-y-3">
    <!-- === HEADER: Create/Select PO === -->
    <div v-if="activeOrders.length === 0" class="rounded-2xl border p-4 text-center" style="background: var(--color-cream-100); border-color: var(--color-cream-200);">
      <div class="text-sm font-bold" style="color: var(--color-ink-900);">Belum ada PO</div>
      <div class="mt-0.5 text-xs font-semibold" style="color: var(--color-ink-500);">Buat PO dulu buat catat pesanan.</div>
    </div>

    <!-- PO input bar + tabs -->
    <div class="flex items-center gap-2">
      <input
        v-model="newPoLabel"
        type="text"
        placeholder="PO #4 — 25 Juli"
        class="min-w-0 flex-1 rounded-2xl border px-4 py-3 text-base font-semibold outline-none"
        style="border-color: var(--color-blue-200); color: var(--color-ink-900); background: transparent;"
        @keyup.enter="createPo"
      />
      <button
        class="rounded-2xl px-5 py-3 text-base font-bold text-white active:scale-90 disabled:opacity-40"
        :disabled="!newPoLabel.trim()"
        style="background: var(--color-blue-500);"
        @click="createPo"
      >Buat</button>
    </div>

    <!-- PO tabs (horizontal scroll) -->
    <div v-if="activeOrders.length > 0" class="flex gap-2 overflow-x-auto pb-1">
      <button
        v-for="po in activeOrders"
        :key="po.id"
        class="shrink-0 rounded-2xl px-4 py-2.5 text-sm font-bold whitespace-nowrap transition-all"
        :style="{
          background: selectedPoId === po.id ? 'var(--color-blue-500)' : 'var(--color-blue-100)',
          color: selectedPoId === po.id ? 'white' : 'var(--color-blue-700)',
        }"
        @click="selectedPoId = po.id"
      >{{ po.label }}</button>
    </div>

    <!-- === PO DETAIL === -->
    <div v-if="selectedPo" class="space-y-3">

      <!-- PO action bar -->
      <div class="flex items-center justify-between">
        <span class="font-display text-base font-bold" style="color: var(--color-ink-900);">{{ selectedPo.label }}</span>
        <div class="flex gap-2">
          <button class="rounded-xl px-3 py-1.5 text-xs font-bold" style="background: var(--color-orange-100); color: var(--color-orange-700);" @click="closePo">📦 Arsip</button>
          <button class="rounded-xl px-3 py-1.5 text-xs font-bold" style="background: var(--color-red-100); color: var(--color-red-700);" @click="deletePo(selectedPo.id)">🗑 Hapus</button>
        </div>
      </div>

      <!-- Add customer -->
      <div class="flex items-center gap-2">
        <input
          v-model="newCustomerName"
          type="text"
          placeholder="Nama customer..."
          class="min-w-0 flex-1 rounded-2xl border px-4 py-3 text-base font-semibold outline-none"
          style="border-color: var(--color-blue-200); color: var(--color-ink-900); background: transparent;"
          @keyup.enter="addCustomer"
        />
        <button
          class="rounded-2xl px-5 py-3 text-base font-bold text-white active:scale-90 disabled:opacity-40"
          :disabled="!newCustomerName.trim()"
          style="background: var(--color-blue-500);"
          @click="addCustomer"
        >+</button>
      </div>

      <!-- === CUSTOMER CARDS === -->
      <div v-if="selectedPo.customers.length > 0" class="space-y-2">
        <div
          v-for="customer in selectedPo.customers"
          :key="customer.id"
          class="rounded-2xl border-2 bg-white px-4 py-3"
          :style="{ borderColor: customer.shipped ? 'var(--color-green-300)' : 'var(--color-blue-100)' }"
        >

          <!-- Customer header row -->
          <div class="mb-2 flex items-center justify-between">
            <div class="flex items-center gap-2">
              <span class="font-display text-base font-bold" style="color: var(--color-ink-900);">{{ customer.name }}</span>
              <span class="text-sm font-bold" style="color: var(--color-blue-600);">
                Rp{{ poStore.customerTotal(customer).toLocaleString() }}
              </span>
            </div>
            <div class="flex items-center gap-2">
              <!-- Paid togggle -->
              <button
                class="min-w-[64px] rounded-2xl px-3 py-2 text-sm font-bold transition-all active:scale-95"
                :style="{
                  background: customer.paid ? 'var(--color-green-100)' : '#f0f0f0',
                  color: customer.paid ? 'var(--color-green-700)' : 'var(--color-ink-500)',
                }"
                @click="poStore.togglePaid(selectedPo.id, customer.id)"
              >{{ customer.paid ? '✅ Lunas' : '⬜ Bayar' }}</button>
              <!-- Ship toggle -->
              <button
                class="min-w-[64px] rounded-2xl px-3 py-2 text-sm font-bold transition-all active:scale-95"
                :style="{
                  background: customer.shipped ? 'var(--color-blue-100)' : '#f0f0f0',
                  color: customer.shipped ? 'var(--color-blue-700)' : 'var(--color-ink-500)',
                }"
                @click="handleToggleShipped(selectedPo.id, customer)"
              >{{ customer.shipped ? '✅ Kirim' : '⬜ Kirim' }}</button>
              <!-- Delete -->
              <button class="rounded-2xl px-2 py-2 text-base font-bold" style="color: var(--color-red-400);" @click="removeCustomer(customer.id)">✕</button>
            </div>
          </div>

          <!-- Package rows: emoji + name + stepper -->
          <div class="space-y-1.5">
            <div
              v-for="pkg in packages"
              :key="pkg.id"
              class="flex items-center gap-2 rounded-xl px-1 py-1"
              :style="{ background: getItem(customer, pkg.id)?.qty ? 'var(--color-blue-50)' : 'transparent' }"
            >
              <span class="w-8 text-center text-xl">{{ emojis[pkg.id] || '📦' }}</span>
              <span class="min-w-0 flex-1 text-sm font-semibold" style="color: var(--color-ink-700);">{{ pkg.name }}</span>

              <!-- Stepper -->
              <div class="flex items-center gap-1">
                <button
                  class="flex h-10 w-10 items-center justify-center rounded-xl border-2 text-lg font-bold active:scale-90"
                  :disabled="(getItem(customer, pkg.id)?.qty || 0) <= 0"
                  style="border-color: var(--color-blue-200); color: var(--color-blue-600); background: white;"
                  @click="setQty(customer, pkg.id, (getItem(customer, pkg.id)?.qty || 0) - 1)"
                >−</button>
                <span class="flex h-10 w-10 items-center justify-center text-center font-display text-lg font-bold" style="color: var(--color-ink-900);">
                  {{ getItem(customer, pkg.id)?.qty || 0 }}
                </span>
                <button
                  class="flex h-10 w-10 items-center justify-center rounded-xl border-2 text-lg font-bold text-white active:scale-90"
                  style="background: var(--color-blue-500); border-color: var(--color-blue-500);"
                  @click="setQty(customer, pkg.id, (getItem(customer, pkg.id)?.qty || 0) + 1)"
                >+</button>
              </div>

              <!-- Chili toggle: only show if item has qty -->
              <button
                v-if="(getItem(customer, pkg.id)?.qty || 0) > 0"
                class="flex h-10 w-10 items-center justify-center rounded-xl text-lg active:scale-90"
                :style="{
                  background: (getItem(customer, pkg.id)?.extraChiliOil || 0) > 0 ? 'var(--color-orange-100)' : '#f5f5f5',
                }"
                @click="toggleChili(customer, pkg.id)"
              >🌶️</button>
            </div>
          </div>

          <!-- Customer note: chili summary -->
          <div v-if="customer.items.some(i => i.extraChiliOil > 0)" class="mt-1 text-xs font-semibold" style="color: var(--color-orange-600);">
            🌶️ +{{ customer.items.reduce((s, i) => s + (i.extraChiliOil || 0), 0) }} chili oil extra
          </div>
        </div>
      </div>

      <!-- === PO FOOTER: Summary + Hitung button === -->
      <div
        v-if="selectedPo.customers.length > 0"
        class="sticky bottom-0 rounded-2xl border-2 p-4"
        style="background: white; border-color: var(--color-blue-200);"
      >
        <div class="mb-2 flex items-center justify-between">
          <div class="text-sm font-semibold" style="color: var(--color-ink-500);">
            <span v-for="pkg in packages" :key="pkg.id" class="mr-2">
              {{ emojis[pkg.id] || '📦' }}{{ totalPkgQty(pkg.id) }}
            </span>
            <span v-if="totalExtraChili() > 0" style="color: var(--color-orange-600);">🌶️+{{ totalExtraChili() }}</span>
          </div>
          <div class="text-right">
            <div class="text-xs font-semibold" style="color: var(--color-ink-500);">Total</div>
            <div class="font-display text-xl font-bold" style="color: var(--color-blue-700);">
              Rp{{ poStore.orderTotal(selectedPo.id).toLocaleString() }}
            </div>
          </div>
        </div>

        <button
          class="w-full rounded-2xl py-4 font-display text-base font-bold text-white active:scale-[0.97] disabled:opacity-40"
          :disabled="!hasAnyOrders(selectedPo)"
          style="background: linear-gradient(135deg, var(--color-blue-400), var(--color-blue-600));"
          @click="goToResults"
        >🧮 Hitung Kebutuhan Supplier</button>
      </div>
    </div>

    <!-- === CLOSED PO HISTORY === -->
    <div v-if="closedOrders.length > 0" class="space-y-2">
      <div class="flex items-center gap-2">
        <span class="text-base">📊</span>
        <span class="font-display text-sm font-bold" style="color: var(--color-ink-900);">Riwayat Penjualan</span>
      </div>

      <div class="flex gap-2 overflow-x-auto pb-1">
        <button
          v-for="cpo in closedOrders.slice(0, 10)"
          :key="cpo.id"
          class="shrink-0 rounded-2xl px-4 py-2 text-xs font-bold whitespace-nowrap transition-all"
          :style="{
            background: selectedPoId === cpo.id ? 'var(--color-green-200)' : 'var(--color-green-50)',
            color: selectedPoId === cpo.id ? 'var(--color-green-800)' : 'var(--color-green-700)',
          }"
          @click="selectedPoId = cpo.id"
        >{{ cpo.label }} · Rp{{ poStore.orderTotal(cpo.id).toLocaleString() }}</button>
      </div>

      <!-- Totals row -->
      <div class="rounded-2xl border p-3 flex items-center justify-between" style="background: var(--color-green-50); border-color: var(--color-green-200);">
        <div class="space-y-0.5">
          <div class="text-xs font-semibold" style="color: var(--color-ink-500);">{{ closedOrders.length }} PO diarsip</div>
          <div class="flex gap-3">
            <span class="text-xs font-bold" style="color: var(--color-ink-500);">👥 {{ totalCustomers }} pelanggan</span>
            <span class="text-xs font-bold" style="color: var(--color-ink-500);">📦 {{ totalPackagesSold }} paket</span>
          </div>
        </div>
        <div class="text-right">
          <div class="text-[10px] font-semibold" style="color: var(--color-ink-500);">Total pendapatan</div>
          <div class="font-display text-lg font-bold" style="color: var(--color-green-700);">
            Rp{{ totalRevenue.toLocaleString() }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
