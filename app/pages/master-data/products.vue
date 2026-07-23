<script setup lang="ts">
import { usePackageStore } from '~/stores/packages'
import type { Menu, Product, ProductVariant, ProductComposition } from '~/types'

definePageMeta({ title: 'Produk' })

const pkgStore = usePackageStore()

// ── Products ──
const products = ref<Product[]>([])
const menus = ref<Menu[]>([])
const productAdd = ref({ id: '', name: '', unit: 'pcs', type: 'single' as string, basePrice: 0, hpp: 0 })
const productTypes = ['bundle', 'single', 'addon']
const typeLabels: Record<string, string> = { bundle: 'Paket', single: 'Satuan', addon: 'Tambahan' }

// ── Variants ──
const variants = ref<ProductVariant[]>([])
const editVariantPrice = ref<Record<string, number>>({})
const editingVariantId = ref('')

const productsWithVariants = computed(() =>
  products.value
    .filter(p => variants.value.some(v => v.productId === p.id))
    .map(p => ({
      product: p,
      variants: variants.value.filter(v => v.productId === p.id)
    }))
)

// ── Edit Product Drawer ──
const showEditDrawer = ref(false)
const editingProduct = ref<Product | null>(null)
const editForm = ref({ name: '', type: '', basePrice: 0, hpp: 0 })

// ── Delete Confirmation ──
const showDeleteDrawer = ref(false)
const deletingProduct = ref<Product | null>(null)

// ── Compositions (BOM) ──
const compositions = ref<ProductComposition[]>([])
const showBomDrawer = ref(false)
const editingBomProduct = ref<string | null>(null)
const bomForm = ref<Array<{ menuId: string; qty: number }>>([])

function getCompositions(productId: string) {
  return compositions.value.filter(c => c.productId === productId)
}

// ── Fetch ──
async function fetchAll() {
  const [rawProducts, variantsRaw, compositionsRaw, menusRaw] = await Promise.all([
    $fetch<any[]>('/api/products'),
    $fetch<any[]>('/api/product-variants'),
    $fetch<any[]>('/api/product-compositions'),
    $fetch<any[]>('/api/menus'),
  ])
  products.value = rawProducts.map((p: any) => ({ ...p, basePrice: p.base_price ?? 0 }))
  variants.value = variantsRaw.map((v: any) => ({ id: v.id, productId: v.product_id, name: v.name, price: v.price, hpp: v.hpp }))
  compositions.value = compositionsRaw.map((c: any) => ({ productId: c.product_id, menuId: c.menu_id, qty: c.qty }))
  menus.value = menusRaw.map((m: any) => ({ ...m, basePrice: m.base_price ?? 0 }))
  editVariantPrice.value = Object.fromEntries(variants.value.map(v => [v.id, v.price]))
}

// ── Product CRUD ──
async function addProduct() {
  const f = productAdd.value; if (!f.id || !f.name) return
  await $fetch('/api/products', { method: 'POST', body: f })
  await fetchAll(); productAdd.value = { id: '', name: '', unit: 'pcs', type: 'single', basePrice: 0, hpp: 0 }
}

function openEdit(p: Product) {
  editingProduct.value = p
  editForm.value = { name: p.name, type: p.type, basePrice: p.basePrice, hpp: p.hpp || 0 }
  showEditDrawer.value = true
}

async function saveEdit() {
  const p = editingProduct.value; if (!p) return
  const e = editForm.value
  await $fetch('/api/products', { method: 'PUT', body: { id: p.id, name: e.name, unit: p.unit, type: e.type, basePrice: e.basePrice, hpp: e.hpp } })
  p.name = e.name; p.type = e.type; p.basePrice = e.basePrice; p.hpp = e.hpp
  showEditDrawer.value = false; editingProduct.value = null
}

function openDelete(p: Product) {
  deletingProduct.value = p
  showDeleteDrawer.value = true
}

async function confirmDelete() {
  const p = deletingProduct.value; if (!p) return
  await $fetch(`/api/products/${p.id}`, { method: 'DELETE' })
  products.value = products.value.filter(x => x.id !== p.id)
  showDeleteDrawer.value = false; deletingProduct.value = null
}

function decQty(ri: number) { if (bomForm.value[ri]?.qty > 1) bomForm.value[ri].qty-- }
function incQty(ri: number) { if (bomForm.value[ri]) bomForm.value[ri].qty++ }

// ── Variant price ──
async function saveVariantPrice(id: string) {
  const price = editVariantPrice.value[id]
  if (!price || price <= 0) return
  await $fetch('/api/product-variants', { method: 'PUT', body: { id, price } })
  const v = variants.value.find(v => v.id === id)
  if (v) v.price = price
}

// ── BOM Drawer ──
function openBom(productId: string) {
  editingBomProduct.value = productId
  const existing = getCompositions(productId)
  bomForm.value = existing.length
    ? existing.map(c => ({ menuId: c.menuId, qty: c.qty }))
    : [{ menuId: '', qty: 2 }]
  showBomDrawer.value = true
}

async function saveBom() {
  if (!editingBomProduct.value) return
  const comps = bomForm.value.filter(c => c.menuId && c.qty > 0)
  if (!comps.length) return
  await $fetch('/api/product-compositions', { method: 'PUT', body: { productId: editingBomProduct.value, compositions: comps } })
  compositions.value = compositions.value.filter(c => c.productId !== editingBomProduct.value)
  compositions.value.push(...comps.map(c => ({ productId: editingBomProduct.value!, menuId: c.menuId, qty: c.qty })))
  showBomDrawer.value = false; editingBomProduct.value = null
}

const menuEmoji: Record<string, string> = {
  'siomay-ayam': '🥟', 'siomay-udang': '🍤', 'siomay-kepiting': '🦀',
  'siomay-seafood': '🦐', 'siomay-nori': '🌿', 'siomay-mozzarella': '🧀',
  'hisitkau': '🥢', 'lumpia-kulit-tahu-ayam': '🌯', 'lumpia-kulit-tahu-udang': '🥟',
  'chili-oil': '🌶️',
}

onMounted(async () => { await pkgStore.ensureLoaded(); await fetchAll() })
</script>

<template>
  <div class="slide-up space-y-4">
    <div class="flex items-center gap-2">
      <button class="rounded-xl px-3 py-2 text-xs font-bold text-white active:scale-90" style="background: var(--color-blue-500);" @click="navigateTo('/master-data')">← Kembali</button>
      <span class="text-xs font-semibold" style="color: var(--color-ink-500);">/ 📦 Produk</span>
    </div>

    <div class="rounded-2xl border p-4" style="background: linear-gradient(135deg, #7c3aed, #5b21b6); color: white; border: none;">
      <div class="font-display text-lg font-bold">📦 Produk</div>
      <div class="mt-1 text-xs font-semibold opacity-80">Produk jual, varian harga, dan komposisi BOM.</div>
    </div>

    <!-- ═══ Add Product ═══ -->
    <div class="rounded-2xl border bg-white px-4 py-3 space-y-2" style="border-color: var(--color-blue-100);">
      <div class="font-display text-sm font-bold" style="color: var(--color-ink-900);">Tambah Produk</div>
      <div class="grid grid-cols-2 gap-2">
        <input v-model="productAdd.id" placeholder="ID (paket-baru)" class="col-span-2 rounded-xl border px-3 py-2.5 text-sm font-semibold outline-none" style="border-color: var(--color-blue-200);" />
        <input v-model="productAdd.name" placeholder="Nama produk" class="rounded-xl border px-3 py-2.5 text-sm font-semibold outline-none" style="border-color: var(--color-blue-200);" />
        <select v-model="productAdd.type" class="rounded-xl border px-3 py-2.5 text-sm font-semibold outline-none" style="border-color: var(--color-blue-200);">
          <option v-for="t in productTypes" :key="t" :value="t">{{ typeLabels[t] }}</option>
        </select>
        <div class="flex items-center gap-1 col-span-2">
          <span class="text-xs font-semibold" style="color: var(--color-ink-500);">Rp</span>
          <input type="number" v-model.number="productAdd.basePrice" placeholder="Harga jual" class="flex-1 rounded-xl border px-3 py-2.5 text-sm font-semibold outline-none" style="border-color: var(--color-blue-200);" />
        </div>
        <div class="flex items-center gap-1 col-span-2">
          <span class="text-xs font-semibold" style="color: var(--color-ink-500);">HPP Rp</span>
          <input type="number" v-model.number="productAdd.hpp" placeholder="Biaya produksi" class="flex-1 rounded-xl border px-3 py-2.5 text-sm font-semibold outline-none" style="border-color: var(--color-blue-200);" />
        </div>
      </div>
      <button class="rounded-xl px-4 py-2.5 text-sm font-bold text-white w-full active:scale-[0.97]" style="background: var(--color-blue-500);" @click="addProduct()">+ Tambah</button>
    </div>

    <!-- ═══ Product Cards ═══ -->
    <div class="grid gap-3">
      <div v-for="p in products" :key="p.id"
        class="rounded-2xl border bg-white shadow-sm transition-all active:scale-[0.99]"
        style="border-color: var(--color-blue-100);"
      >
        <!-- Card Header: emoji + name + type -->
        <div class="flex items-center gap-3 px-4 pt-3.5 pb-2.5">
          <span class="flex h-10 w-10 items-center justify-center rounded-xl text-lg"
            :style="{ background: p.type === 'bundle' ? 'var(--color-green-50)' : p.type === 'addon' ? 'var(--color-orange-50)' : 'var(--color-blue-50)' }"
          >{{ menuEmoji[p.id] || '📦' }}</span>
          <div class="min-w-0 flex-1">
            <div class="truncate text-sm font-bold" style="color: var(--color-ink-900);">{{ p.name }}</div>
            <div class="flex items-center gap-1.5 mt-0.5">
              <span class="max-w-[120px] truncate text-[10px] font-semibold" style="color: var(--color-ink-500);">{{ p.id }}</span>
              <span class="rounded-md px-1.5 py-[1px] text-[9px] font-bold"
                :style="{ background: p.type === 'bundle' ? 'var(--color-green-100)' : p.type === 'addon' ? 'var(--color-orange-100)' : 'var(--color-blue-50)', color: p.type === 'bundle' ? '#15803D' : p.type === 'addon' ? '#C2410C' : '#1D4ED8' }"
              >{{ typeLabels[p.type] || p.type }}</span>
            </div>
          </div>
        </div>

        <!-- Card Body: price info grid -->
        <div class="grid grid-cols-2 gap-2 px-4 pb-3">
          <div class="rounded-xl px-3 py-2.5" style="background: var(--color-blue-50);">
            <div class="text-[9px] font-semibold" style="color: var(--color-ink-500);">Harga Jual</div>
            <div class="mt-0.5 text-sm font-bold" style="color: var(--color-ink-900);">Rp{{ (p.basePrice || 0).toLocaleString() }}</div>
          </div>
          <div v-if="p.hpp" class="rounded-xl px-3 py-2.5" style="background: var(--color-green-50);">
            <div class="text-[9px] font-semibold" style="color: var(--color-green-700);">HPP</div>
            <div class="mt-0.5 text-sm font-bold" style="color: var(--color-green-700);">Rp{{ (p.hpp || 0).toLocaleString() }}</div>
          </div>
          <div v-else class="rounded-xl px-3 py-2.5 border border-dashed" style="border-color: var(--color-blue-100);">
            <div class="text-[9px] font-semibold" style="color: var(--color-ink-500);">HPP</div>
            <div class="mt-0.5 text-xs font-semibold" style="color: var(--color-ink-300);">Belum diisi</div>
          </div>
        </div>

        <!-- Variants (bakar/kukus) — tap price to edit -->
        <div v-if="p.type === 'single'" class="border-t px-4 py-2.5" style="border-color: var(--color-blue-50);">
          <div class="flex flex-wrap gap-1.5">
            <div v-for="v in variants.filter(x => x.productId === p.id)" :key="v.id"
              class="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5"
              :style="{ background: v.name === 'Bakar' ? 'var(--color-orange-50)' : 'var(--color-blue-50)' }"
            >
              <span class="text-[10px] font-bold" :style="{ color: v.name === 'Bakar' ? '#C2410C' : '#1D4ED8' }">{{ v.name }}</span>

              <!-- Editable price -->
              <template v-if="editingVariantId === v.id">
                <input type="number" v-model.number="editVariantPrice[v.id]"
                  class="w-16 rounded-md border px-1.5 py-0.5 text-[10px] font-bold text-center outline-none"
                  style="border-color: var(--color-blue-300);" @keyup.enter="editingVariantId = ''; saveVariantPrice(v.id)" />
                <button @click="editingVariantId = ''; saveVariantPrice(v.id)"
                  class="text-[9px] font-bold px-1.5 py-0.5 rounded-md" style="background: var(--color-blue-500); color: white;">Simpan</button>
              </template>
              <template v-else>
                <button @click="editingVariantId = v.id"
                  class="text-[10px] font-bold" style="color: var(--color-ink-900);">Rp{{ (v.price || 0).toLocaleString() }}</button>
              </template>

              <span v-if="v.hpp" class="text-[9px] font-semibold" style="color: var(--color-green-700);">HPP Rp{{ (v.hpp || 0).toLocaleString() }}</span>
            </div>
            <div v-if="!variants.some(x => x.productId === p.id)"
              class="w-full text-[10px] font-semibold" style="color: var(--color-ink-300);">
              Belum ada varian
            </div>
          </div>
        </div>

        <!-- Card Actions -->
        <div class="flex items-center gap-1.5 border-t px-4 py-2.5" style="border-color: var(--color-blue-50);">
          <button class="flex-1 rounded-lg py-2 text-[11px] font-bold active:scale-[0.97] transition-all"
            style="background: var(--color-blue-50); color: var(--color-blue-700);"
            @click="openEdit(p)"
          >✏️ Edit</button>
          <button class="flex-1 rounded-lg py-2 text-[11px] font-bold active:scale-[0.97] transition-all"
            style="background: var(--color-cream-100); color: var(--color-ink-700);"
            @click="openBom(p.id)"
          >🧩 BOM</button>
          <button class="flex-1 rounded-lg py-2 text-[11px] font-bold active:scale-[0.97] transition-all"
            style="background: #FAD3D3; color: #B14343;"
            @click="openDelete(p)"
          >🗑️ Hapus</button>
        </div>

        <!-- BOM Section (collapsible inside card) -->
        <div v-if="getCompositions(p.id).length"
          class="border-t px-4 py-2.5"
          style="border-color: var(--color-blue-50); background: var(--color-cream-50);"
        >
          <div class="flex items-center justify-between">
            <span class="text-[10px] font-semibold" style="color: var(--color-ink-500);">
              🧩 {{ getCompositions(p.id).length }} item BOM
            </span>
          </div>
          <div class="mt-1.5 space-y-1">
            <div v-for="c in getCompositions(p.id)" :key="c.menuId"
              class="flex items-center gap-1.5 rounded-lg px-2 py-1"
              style="background: white;"
            >
              <span class="text-xs">{{ menuEmoji[c.menuId] || '📦' }}</span>
              <span class="text-[10px] font-semibold truncate" style="color: var(--color-ink-700);">{{ c.menuId }}</span>
              <span class="ml-auto text-[10px] font-bold rounded-md px-1.5 py-[1px]" style="background: var(--color-blue-50); color: var(--color-blue-700);">×{{ c.qty }}</span>
            </div>
          </div>
        </div>
        <div v-else-if="p.type === 'bundle'"
          class="border-t px-4 py-2.5"
          style="border-color: var(--color-blue-50);"
        >
          <button class="text-[10px] font-bold" style="color: var(--color-blue-600);" @click="openBom(p.id)">+ Atur Komposisi BOM</button>
        </div>
      </div>
    </div>


    <!-- ═══ Edit Product Drawer ═══ -->
    <UDrawer v-model:open="showEditDrawer" :title="'✏️ Edit ' + (editingProduct?.name || '')" direction="bottom" dismissible close>
      <template #body>
        <div class="space-y-4 py-4">
          <div class="space-y-2">
            <label class="text-xs font-bold" style="color: var(--color-ink-600);">Nama Produk</label>
            <input v-model="editForm.name" class="w-full rounded-xl border px-4 py-3 text-base font-semibold outline-none" style="border-color: var(--color-blue-200);" />
          </div>
          <div class="space-y-2">
            <label class="text-xs font-bold" style="color: var(--color-ink-600);">Tipe</label>
            <select v-model="editForm.type" class="w-full rounded-xl border px-4 py-3 text-base font-semibold outline-none" style="border-color: var(--color-blue-200);">
              <option v-for="t in productTypes" :key="t" :value="t">{{ typeLabels[t] }}</option>
            </select>
          </div>
          <div class="space-y-2">
            <label class="text-xs font-bold" style="color: var(--color-ink-600);">Harga (Rp)</label>
            <input type="number" v-model.number="editForm.basePrice" class="w-full rounded-xl border px-4 py-3 text-base font-semibold outline-none" style="border-color: var(--color-blue-200);" />
          </div>
          <div class="space-y-2">
            <label class="text-xs font-bold" style="color: var(--color-ink-600);">HPP (Rp)</label>
            <input type="number" v-model.number="editForm.hpp" class="w-full rounded-xl border px-4 py-3 text-base font-semibold outline-none" style="border-color: var(--color-blue-200);" />
          </div>
          <button class="w-full rounded-2xl py-3.5 text-base font-bold text-white active:scale-[0.97] transition-all" style="background: var(--color-blue-500);" @click="saveEdit()">Simpan Perubahan</button>
        </div>
      </template>
    </UDrawer>

    <!-- ═══ BOM Drawer ═══ -->
    <UDrawer v-model:open="showBomDrawer" title="🧩 Komposisi BOM" direction="bottom" dismissible close>
      <template #body>
        <div class="py-4 space-y-3">
          <div class="text-[10px] font-semibold mb-2" style="color: var(--color-ink-500);">Pilih menu bahan baku dan tentukan jumlah per paket.</div>

          <div v-for="(row, ri) in bomForm" :key="ri"
            class="rounded-xl border p-3" style="border-color: var(--color-blue-100); background: var(--color-cream-50);"
          >
            <div class="flex items-center gap-2">
              <div class="flex-1">
                <select v-model="row.menuId"
                  class="w-full rounded-lg border px-3 py-2.5 text-sm font-bold outline-none appearance-none"
                  style="border-color: var(--color-blue-200); color: var(--color-ink-900); background: white;">
                  <option value="" disabled>Pilih bahan baku...</option>
                  <option v-for="menu in menus" :key="menu.id" :value="menu.id">{{ menuEmoji[menu.id] }} {{ menu.name }}</option>
                </select>
              </div>
              <button
                class="flex h-9 w-9 items-center justify-center rounded-full active:scale-90 transition-all"
                style="background: #FAD3D3; color: #B14343; font-size: 14px; font-weight: bold;"
                @click="bomForm.splice(ri, 1)"
              >✕</button>
            </div>
            <div class="flex items-center gap-2 mt-2">
              <span class="text-xs font-semibold" style="color: var(--color-ink-500);">Jumlah per paket:</span>
              <div class="flex items-center gap-1.5">
                <button
                  class="flex h-8 w-8 items-center justify-center rounded-lg text-lg font-bold active:scale-90 transition-all"
                  style="background: var(--color-blue-50); color: var(--color-blue-700);"
                  @click="decQty(ri)"
                >−</button>
                <input type="number" v-model.number="row.qty"
                  class="w-14 rounded-lg border px-1 py-1.5 text-base font-bold outline-none text-center"
                  style="border-color: var(--color-blue-200);" />
                <button
                  class="flex h-8 w-8 items-center justify-center rounded-lg text-lg font-bold active:scale-90 transition-all"
                  style="background: var(--color-blue-50); color: var(--color-blue-700);"
                  @click="incQty(ri)"
                >+</button>
              </div>
            </div>
          </div>

          <button @click="bomForm.push({ menuId: '', qty: 2 })"
            class="w-full rounded-xl border-2 border-dashed py-3.5 text-sm font-bold active:scale-[0.97] transition-all"
            style="border-color: var(--color-blue-200); color: var(--color-blue-600);"
          >+ Tambah Bahan</button>

          <button class="w-full rounded-2xl py-3.5 text-base font-bold text-white active:scale-[0.97] transition-all"
            style="background: var(--color-green-500);"
            @click="saveBom()">💾 Simpan BOM</button>
        </div>
      </template>
    </UDrawer>

    <!-- ═══ Delete Confirmation Drawer ═══ -->
    <UDrawer v-model:open="showDeleteDrawer" title="Hapus Produk" direction="bottom" dismissible close>
      <template #body>
        <div class="py-6 text-center space-y-4">
          <div class="text-4xl">🗑️</div>
          <div>
            <div class="font-display text-base font-bold" style="color: var(--color-ink-900);">Hapus {{ deletingProduct?.name }}?</div>
            <div class="text-xs font-semibold mt-1" style="color: var(--color-ink-500);">Data yang dihapus tidak bisa dikembalikan.</div>
          </div>
          <div class="flex gap-3">
            <button class="flex-1 rounded-2xl py-3.5 text-base font-bold text-white active:scale-[0.97]" style="background: #DC2626;" @click="confirmDelete()">Ya, Hapus</button>
            <button class="flex-1 rounded-2xl py-3.5 text-base font-bold active:scale-[0.97] transition-all" style="background: var(--color-blue-50); color: var(--color-ink-700);" @click="showDeleteDrawer = false">Batal</button>
          </div>
        </div>
      </template>
    </UDrawer>
  </div>
</template>
