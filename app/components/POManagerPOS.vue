<script setup lang="ts">
import { usePoStore } from '~/stores/po'
import { usePackageStore } from '~/stores/packages'
import type { CaraMasakId } from '~/types'

const props = defineProps<{ poId: string }>()

const poStore = usePoStore()
const pkgStore = usePackageStore()

const po = computed(() => poStore.getOrderById(props.poId))
const allProducts = computed(() => pkgStore.getAllPackages())
const bundleProducts = computed(() => allProducts.value.filter(p => p.type === 'bundle'))
const singleProducts = computed(() => allProducts.value.filter(p => p.type === 'single'))
const addonProducts = computed(() => allProducts.value.filter(p => p.type === 'addon'))

// ── Form state (single customer) ──
const editingCustomerId = ref<string | null>(null)
const name = ref('')
const items = ref<Record<string, number>>({})
const bkItems = ref<Record<string, number>>({}) // key: "menuId::caraMasak"
const chiliQty = ref(0)
const shippingFee = ref(0)
const discount = ref(0)
const paid = ref(false)
const shipped = ref(false)
const saving = ref(false)

function resetForm() {
  editingCustomerId.value = null
  name.value = ''
  items.value = {}
  bkItems.value = {}
  chiliQty.value = 0
  shippingFee.value = 0
  discount.value = 0
  paid.value = false
  shipped.value = false
}

function loadCustomer(c: any) {
  editingCustomerId.value = c.id
  name.value = c.name
  items.value = {}
  bkItems.value = {}
  chiliQty.value = 0
  for (const item of (c.items || [])) {
    const v = item.variant?.toLowerCase()
    if (v === 'bakar' || v === 'kukus') {
      bkItems.value[`${item.productId}::${v}`] = item.qty
    } else if (item.productId === 'chili-oil') {
      chiliQty.value = item.qty
    } else {
      items.value[item.productId] = item.qty
    }
  }
  shippingFee.value = c.shippingFee || 0
  discount.value = c.discount || 0
  paid.value = c.paid
  shipped.value = c.shipped
}

function getQty(pkgId: string) { return items.value[pkgId] || 0 }
function incQty(pkgId: string) { items.value[pkgId] = (items.value[pkgId] || 0) + 1 }
function decQty(pkgId: string) {
  const cur = items.value[pkgId] || 0
  if (cur <= 1) delete items.value[pkgId]
  else items.value[pkgId] = cur - 1
}

function getBk(key: string) { return bkItems.value[key] || 0 }
function incBk(menuId: string, cm: CaraMasakId) {
  const key = `${menuId}::${cm}`
  bkItems.value[key] = (bkItems.value[key] || 0) + 1
}
function decBk(menuId: string, cm: CaraMasakId) {
  const key = `${menuId}::${cm}`
  const cur = bkItems.value[key] || 0
  if (cur <= 1) delete bkItems.value[key]
  else bkItems.value[key] = cur - 1
}

function toggleBk(menuId: string, cm: CaraMasakId) {
  const key = `${menuId}::${cm}`
  if (bkItems.value[key]) {
    delete bkItems.value[key]
  } else {
    bkItems.value[key] = 1
  }
}

// ── Totals ──
function fmtRp(n: number) { return 'Rp ' + (n || 0).toLocaleString('id-ID') }

const totalFrozen = computed(() => {
  let t = 0
  for (const pkg of bundleProducts.value) {
    const qty = items.value[pkg.id] || 0
    t += qty * (pkg.basePrice || 0)
  }
  return t
})

const chiliMenu = computed(() => addonProducts.value[0])
const chiliPrice = computed(() => chiliMenu.value?.basePrice || 2000)
const totalChili = computed(() => chiliQty.value * chiliPrice.value)

const totalBk = computed(() => {
  let t = 0
  for (const [key, qty] of Object.entries(bkItems.value)) {
    const [menuId, cm] = key.split('::') as [string, CaraMasakId]
    const harga = pkgStore.getProductPrice(menuId, cm)
    t += qty * harga
  }
  return t
})

const totalForm = computed(() => totalFrozen.value + totalBk.value + totalChili.value + shippingFee.value - discount.value)

// ── Save ──
async function saveCustomer() {
  if (!name.value.trim() || !po.value || saving.value) return
  saving.value = true
  try {
    // Build unified items list
    const unifiedItems: Array<{ productId: string; variant?: string; qty: number; unitPrice: number }> = []
    for (const p of bundleProducts.value) {
      const qty = items.value[p.id] || 0
      if (qty > 0) unifiedItems.push({ productId: p.id, qty, unitPrice: p.basePrice })
    }
    for (const [key, qty] of Object.entries(bkItems.value)) {
      if (qty <= 0) continue
      const [menuId, cm] = key.split('::') as [string, string]
      const price = pkgStore.getProductPrice(menuId, cm)
      unifiedItems.push({ productId: menuId, variant: cm, qty, unitPrice: price })
    }
    if (chiliQty.value > 0) {
      unifiedItems.push({ productId: 'chili-oil', qty: chiliQty.value, unitPrice: chiliPrice.value })
    }

    if (editingCustomerId.value) {
      // Update existing
      await $fetch(`/api/orders/${props.poId}/customers/${editingCustomerId.value}/items`, {
        method: 'PUT', body: { items: unifiedItems },
      })
      if (shippingFee.value !== (po.value.customers.find(c => c.id === editingCustomerId.value)?.shippingFee || 0)) {
        await poStore.setShippingFee(props.poId, editingCustomerId.value, shippingFee.value)
      }
      if (discount.value !== (po.value.customers.find(c => c.id === editingCustomerId.value)?.discount || 0)) {
        await poStore.setDiscount(props.poId, editingCustomerId.value, discount.value)
      }
      const cust = po.value.customers.find(c => c.id === editingCustomerId.value)
      if (cust) {
        if (paid.value !== cust.paid) await poStore.togglePaid(props.poId, editingCustomerId.value)
        if (shipped.value !== cust.shipped) await poStore.toggleShipped(props.poId, editingCustomerId.value)
        cust.items = unifiedItems
      }
    } else {
      // Create new
      const customer = await poStore.addCustomer(props.poId, name.value.trim())
      if (!customer) return
      await $fetch(`/api/orders/${props.poId}/customers/${customer.id}/items`, {
        method: 'PUT', body: { items: unifiedItems },
      })
      customer.items = unifiedItems
      if (shippingFee.value > 0) await poStore.setShippingFee(props.poId, customer.id, shippingFee.value)
      if (discount.value > 0) await poStore.setDiscount(props.poId, customer.id, discount.value)
      if (paid.value) await poStore.togglePaid(props.poId, customer.id)
      if (shipped.value) await poStore.toggleShipped(props.poId, customer.id)
    }
    resetForm()
  } finally { saving.value = false }
}

// ── Delete customer ──
async function deleteCustomer(id: string) {
  if (!po.value) return
  if (editingCustomerId.value === id) resetForm()
  await poStore.removeCustomer(props.poId, id)
}

// ── Emoji ──
const emojiMap: Record<string, string> = {
  'paket-halu': '🌟', 'paket-when-ya': '✨', 'paket-solulu': '🌈',
  'siomay-ayam': '🥟', 'siomay-udang': '🍤', 'siomay-kepiting': '🦀',
  'siomay-seafood': '🦐', 'siomay-nori': '🌿', 'siomay-mozzarella': '🧀',
  'hisitkau': '🥢', 'lumpia-kulit-tahu-ayam': '🌯', 'lumpia-kulit-tahu-udang': '🥟',
}
function e(id: string) { return emojiMap[id] || '📦' }
function mn(id: string) { return pkgStore.getMenuById(id)?.name || id }
function pn(id: string) { return pkgStore.getProductById(id)?.name || id }
</script>

<template>
  <div v-if="po" class="space-y-3">

    <!-- Header -->
    <div class="flex items-center gap-2">
      <button class="text-sm font-bold active:scale-90" style="color: var(--color-blue-600);" @click="navigateTo('/po')">←</button>
      <span class="font-display text-base font-bold" style="color: var(--color-ink-900);">{{ po.label }}</span>
      <span class="ml-auto text-xs font-semibold rounded-full px-2 py-0.5" style="background: var(--color-blue-50); color: var(--color-blue-700);">
        {{ po.customers.length }} pembeli
      </span>
    </div>

    <!-- Form -->
    <div class="rounded-2xl border bg-white p-3.5 gap-2 flex flex-col" style="border-color: var(--color-blue-100);">
      <!-- Customer name -->
      <div class="flex items-center gap-2 mb-3">
        <span class="text-lg">👤</span>
        <input v-model="name" type="text" placeholder="Nama pembeli..."
          class="flex-1 rounded-2xl border px-4 py-3 text-base font-semibold outline-none"
          style="border-color: var(--color-blue-200); color: var(--color-ink-900); background: transparent;"
          :disabled="saving"
        />
      </div>

      <!-- Product grid: Frozen packages -->
      <div class="mb-3">
        <div class="text-xs font-bold mb-2" style="color: var(--color-ink-500);">❄️ Frozen</div>
        <div class="grid grid-cols-2 gap-2">
          <div v-for="pkg in bundleProducts" :key="pkg.id"
            class="rounded-2xl border p-3 text-center" :class="{ 'ring-2 ring-blue-300': getQty(pkg.id) > 0 }"
            :style="{ borderColor: getQty(pkg.id) > 0 ? 'var(--color-blue-300)' : 'var(--color-blue-100)' }"
          >
            <div class="text-2xl mb-1">{{ e(pkg.id) }}</div>
            <div class="text-xs font-bold" style="color: var(--color-ink-800);">{{ pkg.name }}</div>
            <div class="text-[10px] font-semibold mb-2" style="color: var(--color-ink-500);">{{ fmtRp(pkg.basePrice || 0) }}</div>
            <div class="flex items-center justify-center gap-1">
              <button @click="decQty(pkg.id)"
                class="flex h-8 w-8 items-center justify-center rounded-xl border-2 text-base font-bold active:scale-90 disabled:opacity-30"
                :disabled="getQty(pkg.id) <= 0 || saving"
                style="border-color: var(--color-blue-200); color: var(--color-blue-600); background: white;"
              >−</button>
              <span class="flex h-8 w-10 items-center justify-center font-display text-base font-bold" style="color: var(--color-ink-900);">
                {{ getQty(pkg.id) }}
              </span>
              <button @click="incQty(pkg.id)"
                class="flex h-8 w-8 items-center justify-center rounded-xl border-2 text-base font-bold text-white active:scale-90 disabled:opacity-30"
                :disabled="saving"
                style="background: var(--color-blue-500); border-color: var(--color-blue-500);"
              >+</button>
            </div>
          </div>
        </div>
      </div>

      <!-- Bakar & Kukus -->
      <div class="mb-3">
        <div class="text-xs font-bold mb-2" style="color: var(--color-ink-500);">🔥 Bakar & Kukus</div>
        <div class="space-y-1">
          <div v-for="m in singleProducts" :key="m.id"
            class="flex items-center gap-1.5 rounded-xl px-2.5 py-1.5"
            :style="{ background: getBk(`${m.id}::bakar`) || getBk(`${m.id}::kukus`) ? 'var(--color-orange-50)' : 'transparent' }"
          >
            <span class="text-sm shrink-0">{{ e(m.id) }}</span>
            <span class="flex-1 text-xs font-semibold truncate" style="color: var(--color-ink-800);">{{ m.name }}</span>
            <div class="flex items-center gap-1">
              <!-- Kukus button -->
              <button @click="toggleBk(m.id, 'kukus')"
                class="rounded-full px-2.5 py-1 text-[10px] font-bold border active:scale-90 transition-all"
                :class="{ 'text-white border-transparent': getBk(`${m.id}::kukus`) > 0 }"
                :style="getBk(`${m.id}::kukus`) > 0
                  ? { background: 'var(--color-blue-500)' }
                  : { background: 'white', borderColor: 'var(--color-blue-200)', color: 'var(--color-blue-600)' }"
              >K{{ getBk(`${m.id}::kukus`) || '' }}</button>
              <!-- Bakar button -->
              <button @click="toggleBk(m.id, 'bakar')"
                class="rounded-full px-2.5 py-1 text-[10px] font-bold border active:scale-90 transition-all"
                :class="{ 'text-white border-transparent': getBk(`${m.id}::bakar`) > 0 }"
                :style="getBk(`${m.id}::bakar`) > 0
                  ? { background: '#B45309' }
                  : { background: 'white', borderColor: 'var(--color-orange-300)', color: '#B45309' }"
              >B{{ getBk(`${m.id}::bakar`) || '' }}</button>
            </div>
          </div>
        </div>
      </div>

      <!-- 🌶️ Tambahan (condiments from DB) -->
      <div v-if="addonProducts.length > 0" class="mb-3">
        <div class="text-xs font-bold mb-2" style="color: var(--color-ink-500);">🌶️ Tambahan</div>
        <div v-for="m in addonProducts" :key="m.id"
          class="flex items-center justify-between rounded-2xl border px-4 py-2.5 mb-1.5"
          style="border-color: var(--color-orange-200); background: var(--color-orange-50);">
          <div class="flex items-center gap-2">
            <span class="text-lg">{{ e(m.id) }}</span>
            <div>
              <div class="text-sm font-semibold" style="color: var(--color-ink-800);">{{ m.name }}</div>
              <div class="text-[10px] font-semibold" style="color: var(--color-ink-500);">{{ fmtRp(chiliPrice) }}/pc</div>
            </div>
          </div>
          <div class="flex items-center gap-1">
            <button @click="chiliQty = Math.max(0, chiliQty - 1)"
              class="flex h-8 w-8 items-center justify-center rounded-xl border-2 text-base font-bold active:scale-90 disabled:opacity-30"
              :disabled="chiliQty <= 0"
              style="border-color: var(--color-orange-300); color: #B45309; background: white;"
            >−</button>
            <span class="flex h-8 w-10 items-center justify-center font-display text-base font-bold" style="color: var(--color-ink-900);">{{ chiliQty }}</span>
            <button @click="chiliQty++"
              class="flex h-8 w-8 items-center justify-center rounded-xl text-base font-bold text-white active:scale-90 disabled:opacity-30"
              :disabled="saving"
              style="background: #B45309; border: 2px solid #B45309;"
            >+</button>
          </div>
        </div>
      </div>

      <!-- ═══ Summary: Ongkir + Diskon + Total ═══ -->
      <div class="rounded-2xl border p-4 space-y-3" style="border-color: var(--color-blue-100); background: white;">
        <div class="text-[10px] font-bold uppercase tracking-wider" style="color: var(--color-ink-500);">Ringkasan</div>

        <!-- Ongkir -->
        <div class="flex items-center justify-between gap-3">
          <div class="flex items-center gap-2.5">
            <span class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-sm" style="background: var(--color-blue-50);">🚚</span>
            <span class="text-xs font-semibold" style="color: var(--color-ink-500);">Ongkir</span>
          </div>
          <div class="flex items-center gap-2">
            <input type="number" min="0" step="1000" v-model.number="shippingFee"
              class="w-24 rounded-xl border px-3 py-2 text-sm font-bold text-right outline-none"
              style="border-color: var(--color-blue-200); color: var(--color-ink-900);"
              placeholder="0"
            />
          </div>
        </div>

        <!-- Diskon -->
        <div class="flex items-center justify-between gap-3">
          <div class="flex items-center gap-2.5">
            <span class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-sm" style="background: #FEF2F2;">🏷️</span>
            <span class="text-xs font-semibold" style="color: #B91C1C;">Diskon</span>
          </div>
          <div class="flex items-center gap-2">
            <input type="number" min="0" step="1000" v-model.number="discount"
              class="w-24 rounded-xl border px-3 py-2 text-sm font-bold text-right outline-none"
              style="border-color: #FECACA; color: var(--color-ink-900);"
              placeholder="0"
            />
          </div>
        </div>

        <!-- Divider -->
        <div class="border-t" style="border-color: var(--color-blue-50);"></div>

        <!-- Total -->
        <div class="flex w-full justify-between gap-2 flex-col">
            <div class="flex items-center justify-between">
              <span class="font-display text-sm font-bold" style="color: var(--color-red-900);">Diskon</span>
              <span class="font-display text-sm font-bold" style="color: var(--color-red-900);">−{{ fmtRp(discount) }}</span>
            </div>
            
            <div class="flex items-center justify-between">
              <span class="font-display text-sm font-bold" style="color: var(--color-ink-900);">Ongkir</span>
              <span class="font-display text-sm font-bold" style="color: var(--color-blue-700);">{{ fmtRp(shippingFee) }}</span>
            </div>

            <div class="flex items-center justify-between">
              <span class="font-display text-sm font-bold" style="color: var(--color-ink-900);">Total</span>
              <span class="font-display text-lg font-bold" style="color: var(--color-blue-700);">{{ fmtRp(totalForm) }}</span>
            </div>
         </div>
      </div>

      <!-- Payment status -->
      <div class="flex gap-2.5">
        <button @click="paid = !paid"
          class="flex-1 rounded-xl py-3 text-xs font-bold active:scale-95 transition-all"
          :style="{
            background: paid ? 'var(--color-green-100)' : '#f5f5f5',
            color: paid ? 'var(--color-green-700)' : 'var(--color-ink-500)',
          }"
        >{{ paid ? '✅ Lunas' : '💳 Bayar' }}</button>
        <button @click="shipped = !shipped"
          class="flex-1 rounded-xl py-3 text-xs font-bold active:scale-95 transition-all"
          :style="{
            background: shipped ? 'var(--color-blue-100)' : '#f5f5f5',
            color: shipped ? 'var(--color-blue-700)' : 'var(--color-ink-500)',
          }"
        >{{ shipped ? '📦 Dikirim' : '📬 Kirim' }}</button>
      </div>

      <!-- Save / Cancel -->
      <div class="flex gap-2.5">
        <button v-if="editingCustomerId"
          @click="resetForm"
          class="flex-1 rounded-2xl py-3 text-sm font-bold active:scale-95 transition-all"
          style="background: #f5f5f5; color: var(--color-ink-500);"
        >✕ Batal</button>
        <button @click="saveCustomer"
          :disabled="!name.trim() || saving"
          class="flex-1 rounded-2xl py-3 text-sm font-bold text-white active:scale-95 disabled:opacity-40 transition-all"
          style="background: linear-gradient(135deg, var(--color-blue-400), var(--color-blue-600));"
        >{{ saving ? '⏳' : editingCustomerId ? '💾 Simpan' : '➕ Tambah' }}</button>
      </div>
    </div>

    <!-- Customer list (saved) -->
    <div v-if="po.customers.length > 0" class="space-y-1.5">
      <div class="flex items-center gap-2 mb-1">
        <span class="text-sm">👥</span>
        <span class="font-display text-xs font-bold" style="color: var(--color-ink-900);">Daftar Pembeli</span>
        <span class="text-[10px] font-semibold" style="color: var(--color-ink-500);">— tap buat edit</span>
      </div>
      <div v-for="c in po.customers" :key="c.id"
        class="rounded-2xl border bg-white p-3 active:scale-[0.98] transition-all cursor-pointer"
        :class="{ 'ring-2 ring-blue-300': editingCustomerId === c.id }"
        style="border-color: var(--color-blue-100);"
        @click="loadCustomer(c)"
      >
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2 min-w-0">
            <span class="font-display text-sm font-bold truncate" style="color: var(--color-ink-900);">{{ c.name }}</span>
            <span class="text-xs font-bold shrink-0" style="color: var(--color-blue-600);">{{ fmtRp(poStore.customerTotal(c)) }}</span>
          </div>
          <div class="flex items-center gap-1 shrink-0">
            <span v-if="c.paid" class="rounded-full px-1.5 py-0.5 text-[10px] font-bold" style="background: var(--color-green-100); color: var(--color-green-700);">✅</span>
            <span v-if="c.shipped" class="rounded-full px-1.5 py-0.5 text-[10px] font-bold" style="background: var(--color-blue-100); color: var(--color-blue-700);">📦</span>
            <button @click.stop="deleteCustomer(c.id)"
              class="flex h-7 w-7 items-center justify-center rounded-xl text-xs font-bold active:scale-90"
              style="color: var(--color-red-400); background: #FEE2E2;"
            >✕</button>
          </div>
        </div>
        <div class="flex flex-wrap gap-1 mt-1">
          <span v-for="item in (c.items || []).filter((i: any) => i.qty > 0 && i.productId !== 'chili-oil' && i.variant !== 'Bakar' && i.variant !== 'Kukus')" :key="item.productId"
            class="inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-[10px] font-semibold"
            style="background: var(--color-blue-50); color: var(--color-blue-600);"
          >{{ e(item.productId) }}{{ item.qty }}</span>
          <span v-for="item in (c.items || []).filter((i: any) => { const v = i.variant?.toLowerCase(); return v === 'bakar' || v === 'kukus' })" :key="item.productId + item.variant"
            class="inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-[10px] font-semibold"
            :style="{ background: item.variant?.toLowerCase() === 'bakar' ? 'var(--color-orange-50)' : 'var(--color-blue-50)', color: item.variant?.toLowerCase() === 'bakar' ? '#B45309' : 'var(--color-blue-600)' }"
          >{{ mn(item.productId) }} {{ item.variant?.toLowerCase() === 'bakar' ? 'B' : 'K' }}×{{ item.qty }}</span>
          <span v-for="item in (c.items || []).filter((i: any) => i.productId === 'chili-oil' && i.qty > 0)" :key="item.productId"
            class="inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-[10px] font-semibold"
            style="background: var(--color-orange-50); color: #B45309;"
          >🌶️{{ item.qty }}</span>
        </div>
        <div v-if="c.shippingFee > 0" class="text-[10px] font-semibold mt-0.5" style="color: var(--color-ink-400);">🚚 {{ fmtRp(c.shippingFee) }}</div>
        <div v-if="c.discount > 0" class="text-[10px] font-semibold" style="color: #B91C1C;">🏷️ Diskon Rp{{ (c.discount || 0).toLocaleString('id-ID') }}</div>
      </div>
    </div>

    <!-- Close PO -->
    <button @click="poStore.closeOrder(props.poId)"
      class="w-full rounded-2xl border py-3 text-xs font-bold active:scale-95 transition-all"
      style="background: var(--color-orange-50); border-color: var(--color-orange-200); color: var(--color-orange-700);"
    >📦 Tutup PO</button>

  </div>
</template>
