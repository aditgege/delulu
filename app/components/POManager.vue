<script setup lang="ts">
import { usePoStore } from '~/stores/po'
import { usePackageStore } from '~/stores/packages'
import { useOrderStore } from '~/stores/orders'
import { useInventoryStore } from '~/stores/inventory'
import type { CustomerOrder, PurchaseOrder, BakarKukusLine, CaraMasakId } from '~/types'
import { formatInvoiceText, MERCHANT_INFO } from '~/utils/invoice'
import { toPng } from 'html-to-image'

const poStore = usePoStore()
const pkgStore = usePackageStore()
const orderStore = useOrderStore()
const invStore = useInventoryStore()

// ── Loading states ──
const initialLoading = ref(true)
const savingCustomer = ref(false)
const savingOrder = ref<Record<string, boolean>>({})
const savingOrderCount = ref(0)  // number of customers currently saving (for footer button)
const togglingStatus = ref<Record<string, boolean>>({})
const closingPo = ref(false)
const deletingPo = ref(false)

onMounted(async () => {
  await poStore.ensureLoaded()
  await pkgStore.ensureLoaded()
  await pkgStore.ensureCaraMasakLoaded()
  const active = poStore.getActiveOrders()
  if (active.length > 0) selectedPoId.value = active[0]!.id
  initialLoading.value = false
})
const packages = computed(() => pkgStore.getAllPackages())

const activeOrders = computed(() => poStore.getActiveOrders())
const selectedPoId = ref<string | null>(null)
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

// All 9 core menus available for bakar/kukus
const availableMenus = computed(() => pkgStore.getAllMenus())

watch(activeOrders, (orders) => {
  if (orders.length > 0 && !selectedPoId.value) {
    selectedPoId.value = orders[0]!.id
  }
}, { immediate: true })

async function createPo() {
  const label = prompt('Nama PO (misal: Jumat 25 Juli):')
  if (!label?.trim()) return
  const po = await poStore.createOrder(label.trim())
  selectedPoId.value = po.id
}

async function addCustomer() {
  const name = newCustomerName.value.trim()
  if (!name || !selectedPoId.value || savingCustomer.value) return
  savingCustomer.value = true
  try { await poStore.addCustomer(selectedPoId.value, name); newCustomerName.value = '' }
  finally { savingCustomer.value = false }
}

async function removeCustomer(customerId: string) {
  if (!selectedPoId.value) return
  try { await poStore.removeCustomer(selectedPoId.value, customerId) }
  catch (_) { /* ignore */ }
}

function getItem(customer: CustomerOrder, pkgId: string) {
  return customer.items.find(i => i.packageId === pkgId)
}

async function setQty(customer: CustomerOrder, pkgId: string, qty: number) {
  const existing = getItem(customer, pkgId)
  const extra = existing?.extraChiliOil || 0
  if (!selectedPoId.value || savingOrder.value[customer.id]) return
  savingOrder.value[customer.id] = true; savingOrderCount.value++
  try { await poStore.setCustomerItem(selectedPoId.value, customer.id, pkgId, Math.max(0, qty), extra) }
  finally { savingOrder.value[customer.id] = false; savingOrderCount.value-- }
}

function getBakarKukusItem(customer: CustomerOrder, menuId: string, caraMasak: CaraMasakId): BakarKukusLine | undefined {
  return customer.bakarKukusItems?.find(i => i.menuId === menuId && i.caraMasak === caraMasak)
}

async function setBakarKukusPorsi(customer: CustomerOrder, menuId: string, caraMasak: CaraMasakId, porsi: number) {
  if (!selectedPoId.value || savingOrder.value[customer.id]) return
  savingOrder.value[customer.id] = true; savingOrderCount.value++
  try {
    const existing = [...(customer.bakarKukusItems || [])]
    const idx = existing.findIndex(i => i.menuId === menuId && i.caraMasak === caraMasak)
    if (idx >= 0) {
      if (porsi > 0) existing[idx] = { menuId, caraMasak, jumlahPorsi: porsi }
      else existing.splice(idx, 1)
    } else if (porsi > 0) {
      existing.push({ menuId, caraMasak, jumlahPorsi: porsi })
    }
    await $fetch(`/api/orders/${selectedPoId.value}/customers/${customer.id}/bakar-kukus-items`, { method: 'PUT', body: { items: existing } })
    customer.bakarKukusItems = existing
  }
  finally { savingOrder.value[customer.id] = false; savingOrderCount.value-- }
}

async function handleToggleShipped(poId: string, customer: CustomerOrder) {
  if (togglingStatus.value[customer.id]) return
  togglingStatus.value[customer.id] = true
  try {
    const po = poStore.getOrderById(poId); if (!po) return
    for (const item of customer.items) {
      const pkg = pkgStore.getPackageById(item.packageId); if (!pkg) continue
      for (const bom of pkg.bom) {
        const totalPcs = bom.qty * item.qty; const current = invStore.getStock(bom.menuId)
        if (customer.shipped) await invStore.setStock(bom.menuId, current + totalPcs)
        else await invStore.setStock(bom.menuId, current - totalPcs)
      }
    }
    for (const item of customer.bakarKukusItems || []) {
      const pcsNeed = item.jumlahPorsi * 4; const current = invStore.getStock(item.menuId)
      if (customer.shipped) await invStore.setStock(item.menuId, current + pcsNeed)
      else await invStore.setStock(item.menuId, current - pcsNeed)
    }
    await poStore.toggleShipped(poId, customer.id)
  } finally { togglingStatus.value[customer.id] = false }
}

async function toggleChili(customer: CustomerOrder, pkgId: string) {
  const existing = getItem(customer, pkgId)
  if (!existing || !selectedPoId.value || savingOrder.value[customer.id]) return
  savingOrder.value[customer.id] = true; savingOrderCount.value++
  try { const current = existing.extraChiliOil || 0; await poStore.setCustomerItem(selectedPoId.value, customer.id, pkgId, existing.qty, current > 0 ? 0 : 1) }
  finally { savingOrder.value[customer.id] = false; savingOrderCount.value-- }
}

async function closePo() {
  if (!selectedPoId.value || closingPo.value) return
  closingPo.value = true
  try { await poStore.closeOrder(selectedPoId.value); selectedPoId.value = null }
  finally { closingPo.value = false }
}

async function deletePo(id: string) {
  if (deletingPo.value) return
  deletingPo.value = true
  try { await poStore.deleteOrder(id); if (selectedPoId.value === id) selectedPoId.value = null }
  finally { deletingPo.value = false }
}

function goToResults() {
  if (!selectedPoId.value) return
  const po = poStore.getOrderById(selectedPoId.value)
  if (!po) return
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
  for (const pkg of packages.value) {
    orderStore.setQty(pkg.id, agg.get(pkg.id) || 0)
  }
  for (const [key, total] of bkAgg) {
    const [menuId, caraMasak] = key.split('::') as [string, 'bakar' | 'kukus']
    orderStore.setBakarKukus(menuId, caraMasak, total)
  }
  navigateTo(`/rekomendasi/${po.id}`)
}

function hasAnyOrders(po: PurchaseOrder): boolean {
  return po.customers.some(c => c.items.length > 0 || (c.bakarKukusItems?.length || 0) > 0)
}

// Bakar & Kukus picker state
const showBakarKukusPicker = ref<Record<string, boolean>>({})

function activeBakarKukusItems(customer: CustomerOrder): BakarKukusLine[] {
  return (customer.bakarKukusItems || []).filter(i => i.jumlahPorsi > 0)
}

function hasAnyBakarKukus(customer: CustomerOrder, menuId: string): boolean {
  return (customer.bakarKukusItems || []).some(i => i.menuId === menuId && i.jumlahPorsi > 0)
}

// ── Shipping fee ──
async function updateShippingFee(customer: CustomerOrder, val: number) {
  if (!selectedPoId.value) return
  const fee = Math.max(0, Math.floor(isNaN(val) ? 0 : val))
  await poStore.setShippingFee(selectedPoId.value, customer.id, fee)
}

// ── Invoice sharing ──
const shareModal = ref<{ customer: CustomerOrder; text: string } | null>(null)
const invoicePreviewEl = ref<HTMLDivElement | null>(null)
const copiedText = ref(false)
const copiedImg = ref(false)
const generatingImg = ref(false)

function getMenuName(menuId: string): string | undefined {
  return availableMenus.value.find(m => m.id === menuId)?.name
}

function getPackageById(id: string) {
  return pkgStore.getPackageById(id)
}

function getHargaPorsi(menuId: string, caraMasak: string): number {
  return pkgStore.getMenuCaraMasak(menuId, caraMasak)?.hargaPorsi ?? (caraMasak === 'bakar' ? 18000 : 16000)
}

// ── Invoice preview computed ──
const invoiceItems = computed(() => {
  if (!shareModal.value) return []
  return shareModal.value.customer.items
    .filter(i => i.qty > 0)
    .map(i => {
      const pkg = getPackageById(i.packageId)
      return { name: pkg?.name ?? i.packageId, qty: i.qty, price: pkg?.price ?? 0 }
    })
})

const invoiceBkItems = computed(() => {
  if (!shareModal.value) return []
  return (shareModal.value.customer.bakarKukusItems || [])
    .filter(i => (i.jumlahPorsi || 0) > 0 && (i.caraMasak === 'bakar' || i.caraMasak === 'kukus'))
    .map(i => {
      const harga = getHargaPorsi(i.menuId, i.caraMasak)
      const nama = getMenuName(i.menuId) ?? i.menuId
      return {
        label: `${nama} (${i.caraMasak === 'bakar' ? 'Bakar' : 'Kukus'})`,
        qty: `${i.jumlahPorsi} porsi`,
        price: harga,
        total: i.jumlahPorsi * harga,
      }
    })
})

const invoiceChiliCount = computed(() => {
  if (!shareModal.value) return 0
  return shareModal.value.customer.items.reduce((s, i) => s + (i.extraChiliOil || 0), 0)
})

const invoiceGrandTotal = computed(() => {
  if (!shareModal.value) return 0
  const pkgTotal = invoiceItems.value.reduce((s, i) => s + i.qty * i.price, 0)
  const bkTotal = invoiceBkItems.value.reduce((s, i) => s + i.total, 0)
  const chili = invoiceChiliCount.value * 2000
  return pkgTotal + bkTotal + chili + (shareModal.value.customer.shippingFee || 0)
})

function rp(n: number): string {
  return 'Rp' + n.toLocaleString('id-ID')
}

function openShareModal(customer: CustomerOrder) {
  if (!selectedPo.value) return
  const text = formatInvoiceText(
    customer,
    selectedPo.value.label,
    getPackageById,
    getMenuName,
    getHargaPorsi,
  )
  shareModal.value = { customer, text }
  copiedText.value = false
  generatingImg.value = false
}

function closeShareModal() {
  shareModal.value = null
}

async function copyText() {
  if (!shareModal.value) return
  try {
    await navigator.clipboard.writeText(shareModal.value.text)
    copiedText.value = true
    setTimeout(() => { copiedText.value = false }, 2000)
  } catch { /* ignore */ }
}

async function downloadImage() {
  if (!shareModal.value || !invoicePreviewEl.value) return
  generatingImg.value = true
  try {
    const dataUrl = await toPng(invoicePreviewEl.value, {
      quality: 1,
      pixelRatio: 2,
      backgroundColor: '#ffffff',
      cacheBust: true,
    })
    const bin = atob(dataUrl.split(',')[1]!)
    const buf = new Uint8Array(bin.length)
    for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i)
    const blob = new Blob([buf], { type: 'image/png' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `nota-${shareModal.value.customer.name}.png`
    a.click()
    URL.revokeObjectURL(url)
  } catch { /* ignore */ }
  finally { generatingImg.value = false }
}

async function copyImage() {
  if (!shareModal.value || !invoicePreviewEl.value) return
  generatingImg.value = true
  try {
    const dataUrl = await toPng(invoicePreviewEl.value, {
      quality: 1,
      pixelRatio: 2,
      backgroundColor: '#ffffff',
      cacheBust: true,
    })
    const res = await fetch(dataUrl)
    const blob = await res.blob()
    await navigator.clipboard.write([
      new ClipboardItem({ 'image/png': blob }),
    ])
    copiedImg.value = true
    setTimeout(() => { copiedImg.value = false }, 2000)
  } catch { /* ignore */ }
  finally { generatingImg.value = false }
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
    <!-- Skeleton loading -->
    <div v-if="initialLoading" class="space-y-3">
      <div class="animate-pulse rounded-2xl border p-4 space-y-3" style="border-color: var(--color-blue-100);">
        <div class="h-4 w-32 rounded-lg" style="background: var(--color-blue-100);" />
        <div class="h-10 w-full rounded-xl" style="background: var(--color-blue-100);" />
        <div v-for="i in 3" :key="i" class="h-20 rounded-2xl" style="background: var(--color-cream-100);" />
      </div>
    </div>

    <template v-else>
      <!-- No PO yet -->
      <div v-if="activeOrders.length === 0 && !selectedPo" class="rounded-2xl border p-6 text-center space-y-3" style="background: var(--color-cream-100); border-color: var(--color-cream-200);">
        <div class="text-3xl">📋</div>
        <div class="font-display text-base font-bold" style="color: var(--color-ink-900);">Belum ada Pre-Order</div>
        <div class="text-xs font-semibold" style="color: var(--color-ink-500);">Bikin PO dulu buat mulai catat pesanan</div>
        <button class="rounded-2xl px-6 py-3 text-sm font-bold text-white active:scale-95"
          style="background: var(--color-blue-500);"
          @click="createPo"
        >+ Buat Pre-Order</button>
      </div>

      <!-- === PO HEADER === -->
      <div v-if="selectedPo" class="flex items-center justify-between">
        <span class="font-display text-base font-bold" style="color: var(--color-ink-900);">📋 {{ selectedPo.label }}</span>
        <div class="flex gap-2">
          <button class="rounded-xl px-2 py-1 text-xs font-bold active:scale-95"
            style="background: var(--color-green-100); color: var(--color-green-700);"
            @click="createPo"
          >+ PO Baru</button>
          <button
            class="rounded-xl px-3 py-1 text-xs font-bold active:scale-95 disabled:opacity-40"
            :disabled="closingPo"
            style="background: var(--color-orange-100); color: var(--color-orange-700);"
            @click="closePo"
          >{{ closingPo ? '⏳' : '📦 Selesai' }}</button>
          <button
            class="rounded-xl px-3 py-1 text-xs font-bold active:scale-95 disabled:opacity-40"
            :disabled="deletingPo"
            style="background: var(--color-red-100); color: var(--color-red-700);"
            @click="deletePo(selectedPo.id)"
          >{{ deletingPo ? '⏳' : '🗑 Hapus' }}</button>
        </div>
      </div>

      <!-- PO tabs (show all active, always visible when >1) -->
      <div v-if="activeOrders.length > 1" class="flex gap-2 overflow-x-auto pb-1">
        <button
          v-for="po in activeOrders"
          :key="po.id"
          class="shrink-0 rounded-2xl px-4 py-2 text-xs font-bold whitespace-nowrap transition-all"
          :style="{
            background: selectedPoId === po.id ? 'var(--color-blue-500)' : 'var(--color-blue-100)',
            color: selectedPoId === po.id ? 'white' : 'var(--color-blue-700)',
          }"
          @click="selectedPoId = po.id"
        >{{ po.label }}</button>
      </div>

    <!-- === PRE-ORDER ENTRY === -->
    <div v-if="selectedPo" class="space-y-3">

      <!-- Add customer -->
      <div class="flex items-center gap-2">
        <input
          v-model="newCustomerName"
          type="text"
          placeholder="Nama customer..."
          class="min-w-0 flex-1 rounded-2xl border px-4 py-3 text-base font-semibold outline-none disabled:opacity-40"
          style="border-color: var(--color-blue-200); color: var(--color-ink-900); background: transparent;"
          :disabled="savingCustomer"
          @keyup.enter="addCustomer"
        />
        <button
          class="rounded-2xl px-5 py-3 text-base font-bold text-white active:scale-90 disabled:opacity-40"
          :disabled="!newCustomerName.trim() || savingCustomer"
          style="background: var(--color-blue-500);"
          @click="addCustomer"
        >{{ savingCustomer ? '⏳' : '+' }}</button>
      </div>

      <!-- === CUSTOMER CARDS === -->
      <div v-if="selectedPo.customers.length > 0" class="space-y-2">
        <div
          v-for="customer in selectedPo.customers"
          :key="customer.id"
            class="rounded-2xl border-2 bg-white px-4 py-3 transition-opacity"
            :class="{ 'opacity-50 pointer-events-none': togglingStatus[customer.id] }"
          :style="{ borderColor: customer.shipped ? 'var(--color-green-300)' : 'var(--color-blue-100)' }"
        >

          <!-- Customer header row -->
          <div class="mb-2 flex items-center justify-between gap-2">
            <div class="flex items-center gap-1.5 min-w-0">
              <span class="font-display text-base font-bold truncate" style="color: var(--color-ink-900);">{{ customer.name }}</span>
              <span class="text-xs font-bold shrink-0" style="color: var(--color-blue-600);">
                Rp{{ poStore.customerTotal(customer).toLocaleString() }}
              </span>
            </div>
            <div class="flex items-center gap-1 shrink-0">
              <!-- Paid status toggle (compact) -->
              <button
                class="flex h-8 w-8 items-center justify-center rounded-xl text-sm font-bold transition-all active:scale-90 disabled:opacity-40"
                :disabled="togglingStatus[customer.id]"
                :style="{
                  background: customer.paid ? 'var(--color-green-100)' : '#f0f0f0',
                }"
                @click="poStore.togglePaid(selectedPo.id, customer.id)"
                :title="customer.paid ? 'Lunas' : 'Bayar'"
              >{{ customer.paid ? '✅' : '💳' }}</button>
              <!-- Ship status toggle (compact) -->
              <button
                class="flex h-8 w-8 items-center justify-center rounded-xl text-sm font-bold transition-all active:scale-90 disabled:opacity-40"
                :disabled="togglingStatus[customer.id]"
                :style="{
                  background: customer.shipped ? 'var(--color-blue-100)' : '#f0f0f0',
                }"
                @click="handleToggleShipped(selectedPo.id, customer)"
                :title="customer.shipped ? 'Terkirim' : 'Kirim'"
              >{{ customer.shipped ? '📦' : '📬' }}</button>
              <!-- Share -->
              <button
                class="flex h-8 w-8 items-center justify-center rounded-xl text-sm transition-all active:scale-90"
                style="background: var(--color-green-100);"
                @click="openShareModal(customer)" title="Share"
              >📤</button>
              <!-- Delete -->
              <button class="flex h-8 w-8 items-center justify-center rounded-xl text-base transition-all active:scale-90" style="color: var(--color-red-400); background: #FEE2E2;" @click="removeCustomer(customer.id)" title="Hapus">✕</button>
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
                    class="flex h-10 w-10 items-center justify-center rounded-xl border-2 text-lg font-bold active:scale-90 disabled:opacity-30"
                    :disabled="(getItem(customer, pkg.id)?.qty || 0) <= 0 || savingOrder[customer.id]"
                    style="border-color: var(--color-blue-200); color: var(--color-blue-600); background: white;"
                    @click="setQty(customer, pkg.id, (getItem(customer, pkg.id)?.qty || 0) - 1)"
                  >−</button>
                  <span class="flex h-10 w-10 items-center justify-center text-center font-display text-lg font-bold" style="color: var(--color-ink-900);">
                    {{ savingOrder[customer.id] ? '⋯' : getItem(customer, pkg.id)?.qty || 0 }}
                  </span>
                  <button
                    class="flex h-10 w-10 items-center justify-center rounded-xl border-2 text-lg font-bold text-white active:scale-90 disabled:opacity-30"
                    :disabled="savingOrder[customer.id]"
                    style="background: var(--color-blue-500); border-color: var(--color-blue-500);"
                    @click="setQty(customer, pkg.id, (getItem(customer, pkg.id)?.qty || 0) + 1)"
                  >+</button>
              </div>

              <!-- Chili toggle: only show if item has qty -->
                <button
                  v-if="(getItem(customer, pkg.id)?.qty || 0) > 0"
                  class="flex h-10 w-10 items-center justify-center rounded-xl text-lg active:scale-90 disabled:opacity-30"
                  :disabled="savingOrder[customer.id]"
                  :style="{ background: (getItem(customer, pkg.id)?.extraChiliOil || 0) > 0 ? 'var(--color-orange-100)' : '#f5f5f5' }"
                  @click="toggleChili(customer, pkg.id)"
                >🌶️</button>
            </div>
          </div>

          <!-- Shipping fee row -->
          <div class="mt-2 flex items-center gap-2 rounded-xl px-3 py-2" style="background: var(--color-gray-50);">
            <span class="text-sm font-semibold" style="color: var(--color-ink-500);">🚚 Ongkir</span>
            <input type="number" min="0" step="1000"
              :value="customer.shippingFee"
              @input="updateShippingFee(customer, Number(($event.target as HTMLInputElement).value))"
              class="w-24 rounded-xl border px-3 py-2 text-sm font-semibold outline-none"
              style="border-color: var(--color-blue-200);"
              placeholder="0"
            />
            <span class="text-sm font-semibold" style="color: var(--color-ink-500);">
              Rp{{ (customer.shippingFee || 0).toLocaleString() }}
            </span>
          </div>

          <!-- Bakar & Kukus Section -->
          <div class="mt-3" style="border-top: 1px dashed var(--color-orange-200); padding-top: 12px;">
            <div class="mb-2 flex items-center justify-between">
              <div class="flex items-center gap-2">
                <span class="text-sm">🔥</span>
                <span class="font-display text-sm font-bold" style="color: var(--color-orange-700);">Bakar & Kukus</span>
              </div>
              <button
                class="rounded-lg px-2.5 py-1 text-xs font-bold active:scale-95 transition-all"
                style="background: var(--color-orange-100); color: var(--color-orange-700);"
                @click="showBakarKukusPicker[customer.id] = !showBakarKukusPicker[customer.id]"
              >{{ showBakarKukusPicker[customer.id] ? '✕ Tutup' : '+ Tambah' }}</button>
            </div>

            <!-- Active order items (compact chips) -->
            <div v-if="activeBakarKukusItems(customer).length > 0" class="space-y-1 mb-2">
              <div v-for="item in activeBakarKukusItems(customer)" :key="item.menuId + '-' + item.caraMasak"
                class="flex items-center gap-1.5 rounded-lg px-2 py-1.5"
                :style="{ background: item.caraMasak === 'bakar' ? 'var(--color-orange-50)' : 'var(--color-blue-50)' }"
              >
                <span class="text-xs font-semibold flex-1 truncate" style="color: var(--color-ink-800);">{{ pkgStore.getMenuById(item.menuId)?.name || item.menuId }}</span>
                <span class="text-[10px] font-bold rounded-full px-1.5 py-0.5 shrink-0" :style="{
                  background: item.caraMasak === 'bakar' ? 'var(--color-orange-100)' : 'var(--color-blue-100)',
                  color: item.caraMasak === 'bakar' ? '#B45309' : '#2563EB'
                }">{{ item.caraMasak === 'bakar' ? 'Bakar' : 'Kukus' }}</span>
                <span class="text-[10px] font-semibold shrink-0" style="color: var(--color-ink-500);">@{{ (getHargaPorsi(item.menuId, item.caraMasak) / 1000).toFixed(0) }}K</span>
                  <button class="flex h-6 w-6 items-center justify-center rounded-md border text-xs font-bold active:scale-90 disabled:opacity-30"
                    :disabled="savingOrder[customer.id]"
                    style="border-color: #ddd; color: #666; background: white;"
                    @click="setBakarKukusPorsi(customer, item.menuId, item.caraMasak, item.jumlahPorsi - 1)">−</button>
                  <span class="w-5 text-center text-xs font-bold" style="color: var(--color-ink-900);">
                    {{ savingOrder[customer.id] ? '⋯' : item.jumlahPorsi }}
                  </span>
                  <button class="flex h-6 w-6 items-center justify-center rounded-md text-xs font-bold text-white active:scale-90 disabled:opacity-30"
                    :disabled="savingOrder[customer.id]"
                    :style="{ background: item.caraMasak === 'bakar' ? 'var(--color-orange-500)' : 'var(--color-blue-500)' }"
                  @click="setBakarKukusPorsi(customer, item.menuId, item.caraMasak, item.jumlahPorsi + 1)">+</button>
                <span class="text-[10px] font-semibold w-14 text-right shrink-0" style="color: var(--color-ink-500);">
                  Rp{{ (item.jumlahPorsi * getHargaPorsi(item.menuId, item.caraMasak)).toLocaleString() }}
                </span>
              </div>
            </div>

            <!-- Picker dropdown (toggled) -->
            <div v-if="showBakarKukusPicker[customer.id]" class="space-y-1 rounded-lg p-2" style="background: var(--color-cream-50); border: 1px solid var(--color-cream-200);">
              <div v-for="m in availableMenus" :key="m.id" class="flex items-center gap-1.5 rounded-md px-1.5 py-1 text-xs"
                :style="{ background: hasAnyBakarKukus(customer, m.id) ? 'var(--color-orange-50)' : 'transparent' }"
              >
                <span class="flex-1 font-semibold" style="color: var(--color-ink-700);">{{ m.name }}</span>
                <button class="rounded-full px-2 py-0.5 text-[10px] font-bold border active:scale-90"
                  style="border-color: var(--color-blue-200); color: var(--color-blue-600); background: white;"
                  @click="setBakarKukusPorsi(customer, m.id, 'kukus', (getBakarKukusItem(customer, m.id, 'kukus')?.jumlahPorsi || 0) + 1)">+ Kukus</button>
                <button class="rounded-full px-2 py-0.5 text-[10px] font-bold border active:scale-90"
                  style="border-color: var(--color-orange-300); color: #B45309; background: white;"
                  @click="setBakarKukusPorsi(customer, m.id, 'bakar', (getBakarKukusItem(customer, m.id, 'bakar')?.jumlahPorsi || 0) + 1)">+ Bakar</button>
              </div>
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
          :disabled="!hasAnyOrders(selectedPo) || savingOrderCount > 0"
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

    <!-- Share Modal -->
    <Teleport to="body">
      <div
        v-if="shareModal"
        class="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4"
        @click.self="closeShareModal"
      >
        <div class="mt-4 w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl">

          <!-- Invoice preview — rendered visible for screenshot -->
          <div ref="invoicePreviewEl" class="rounded-xl bg-white p-4" style="font-family: system-ui, sans-serif;">
            <div class="text-center mb-3">
              <div class="text-[10px] text-gray-400">{{ MERCHANT_INFO.brand }}</div>
              <div class="text-lg font-bold text-gray-900">{{ MERCHANT_INFO.name }}</div>
              <div class="my-2 text-xs font-semibold text-gray-600 border-t border-b border-dashed border-gray-300 py-1 tracking-widest">
                {{ MERCHANT_INFO.title }}
              </div>
            </div>

            <div class="text-xs text-gray-600 mb-3 leading-5">
              <div>Nama Pembeli: <strong class="text-gray-900">{{ shareModal.customer.name }}</strong></div>
              <div>Tanggal: <strong class="text-gray-900">{{ selectedPo?.label }}</strong></div>
            </div>

            <table class="w-full text-xs border-collapse">
              <thead>
                <tr class="border-b-2 border-gray-900 text-gray-500 font-semibold">
                  <td class="py-1 pr-1">No.</td>
                  <td class="py-1 pr-1">Produk</td>
                  <td class="py-1 pr-1 text-center">Qty</td>
                  <td class="py-1 pr-1 text-right">Harga</td>
                  <td class="py-1 text-right">Total</td>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(item, i) in invoiceItems" :key="'pkg-' + i" class="border-b border-gray-100">
                  <td class="py-1.5 pr-1 text-gray-400">{{ i + 1 }}</td>
                  <td class="py-1.5 pr-1 font-semibold text-gray-900">{{ item.name }}</td>
                  <td class="py-1.5 pr-1 text-center">{{ item.qty }}</td>
                  <td class="py-1.5 pr-1 text-right text-gray-500">{{ rp(item.price) }}</td>
                  <td class="py-1.5 text-right font-semibold">{{ rp(item.qty * item.price) }}</td>
                </tr>
                <tr v-for="item in invoiceBkItems" :key="'bk-' + item.label" class="border-b border-gray-100">
                  <td class="py-1.5 pr-1 text-gray-400"></td>
                  <td class="py-1.5 pr-1 font-semibold text-gray-900">{{ item.label }}</td>
                  <td class="py-1.5 pr-1 text-center">{{ item.qty }}</td>
                  <td class="py-1.5 pr-1 text-right text-gray-500">{{ rp(item.price) }}</td>
                  <td class="py-1.5 text-right font-semibold">{{ rp(item.total) }}</td>
                </tr>
                <tr v-if="invoiceChiliCount > 0">
                  <td colspan="5" class="py-1 text-right text-[10px]" style="color: #d97706;">
                    🌶️ +{{ invoiceChiliCount }} chili oil ({{ rp(invoiceChiliCount * 2000) }})
                  </td>
                </tr>
                <tr v-if="shareModal.customer.shippingFee > 0" class="border-b border-gray-100">
                  <td class="py-1.5 pr-1 text-gray-400"></td>
                  <td class="py-1.5 pr-1 font-semibold text-gray-900" colspan="2">Ongkir</td>
                  <td class="py-1.5 pr-1 text-right text-gray-500"></td>
                  <td class="py-1.5 text-right font-semibold">{{ rp(shareModal.customer.shippingFee) }}</td>
                </tr>
              </tbody>
            </table>

            <div class="mt-3 pt-2 border-t-2 border-gray-900 text-right text-base font-bold">
              TOTAL: {{ rp(invoiceGrandTotal) }}
            </div>

            <div class="mt-4 text-xs text-gray-600 leading-5">
              <div class="font-semibold text-gray-900">Transfer</div>
              <div>{{ MERCHANT_INFO.bank }} &nbsp; {{ MERCHANT_INFO.accountNumber }}</div>
              <div>a.n. {{ MERCHANT_INFO.accountName }}</div>
            </div>

            <div class="mt-3 pt-3 border-t border-dashed border-gray-300 text-[10px] text-gray-400 leading-5">
              <div>{{ MERCHANT_INFO.phone1 }} / {{ MERCHANT_INFO.phone2 }}</div>
              <div>{{ MERCHANT_INFO.ig }}</div>
              <div>{{ MERCHANT_INFO.address }}</div>
            </div>

            <div class="mt-3 text-center text-[10px] text-gray-400 italic">
              {{ MERCHANT_INFO.footer }} 🥟
            </div>
          </div>

          <!-- Action buttons -->
          <div class="mt-4 flex flex-col gap-2">
            <button
              class="flex items-center justify-center gap-2 rounded-2xl py-3 text-sm font-bold text-white active:scale-95"
              style="background: var(--color-blue-500);"
              @click="copyText"
            >
              {{ copiedText ? '✅ Tersalin!' : '📋 Salin Teks' }}
            </button>

            <button
              class="flex items-center justify-center gap-2 rounded-2xl py-3 text-sm font-bold active:scale-95 disabled:opacity-40"
              :disabled="generatingImg"
              style="background: var(--color-green-100); color: var(--color-green-700);"
              @click="downloadImage"
            >
              {{ generatingImg ? '⏳ Memproses...' : '🖼️ Download Gambar' }}
            </button>

            <button
              class="flex items-center justify-center gap-2 rounded-2xl py-3 text-sm font-bold active:scale-95 disabled:opacity-40"
              :disabled="generatingImg"
              style="background: #E8F5E9; color: #2E7D32;"
              @click="copyImage"
            >
              {{ copiedImg ? '✅ Tergambar!' : '📋 Salin Gambar' }}
            </button>

            <a
              :href="`https://wa.me/?text=${encodeURIComponent(shareModal.text)}`"
              target="_blank"
              class="flex items-center justify-center gap-2 rounded-2xl py-3 text-sm font-bold active:scale-95"
              style="background: #25D366; color: white; text-decoration: none;"
              @click="closeShareModal"
            >
              💬 Buka WhatsApp
            </a>

            <button
              class="rounded-2xl py-2.5 text-sm font-semibold active:scale-95"
              style="background: #f0f0f0; color: var(--color-ink-500);"
              @click="closeShareModal"
            >Tutup</button>
          </div>
        </div>
      </div>
    </Teleport>
    </template>

  </div>
</template>