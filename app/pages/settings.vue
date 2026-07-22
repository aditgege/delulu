<script setup lang="ts">
import { usePackageStore } from '~/stores/packages'
import { useInventoryStore } from '~/stores/inventory'
import type { Menu, CaraMasak, MenuCategory } from '~/types'

definePageMeta({ title: 'Pengaturan' })

const pkgStore = usePackageStore()
const invStore = useInventoryStore()

type TabId = 'menu' | 'stok' | 'paket' | 'supplier'
const activeTab = ref<TabId>('menu')

function tabStyle(tab: TabId): Record<string, string> {
  const active = activeTab.value === tab
  return {
    background: active ? 'var(--color-blue-500)' : 'var(--color-blue-50)',
    color: active ? '#fff' : 'var(--color-blue-700)',
    padding: '10px 20px',
    borderRadius: '14px',
    border: 'none',
    fontWeight: '700',
    fontSize: '14px',
    cursor: 'pointer',
  }
}

function fmtRp(n: number) { return 'Rp ' + (n || 0).toLocaleString('id-ID') }

// ── Tab: Menu Management ──
const menus = ref<Menu[]>([])
const menuAdd = ref({ id: '', name: '', unit: 'pcs', category: 'dimsum' as MenuCategory })
const menuEditId = ref<string | null>(null)
const menuEdit = ref({ name: '', unit: '', category: '' as MenuCategory })

const caraMasaks = ref<CaraMasak[]>([])
const cmAdd = ref({ id: '', label: '' })

interface MenuHargaRow {
  menu_id: string; menu_nama: string
  cara_masak_id: string; cara_masak_label: string; harga_porsi: number
}
const menuHargas = ref<MenuHargaRow[]>([])
const editPrices = ref<Record<string, number>>({})
function pk(menuId: string, cmId: string) { return `${menuId}::${cmId}` }

const hargaGrid = computed(() => menus.value.map(menu => ({
  menu_id: menu.id, menu_nama: menu.name,
  columns: caraMasaks.value.map(cm => {
    const existing = menuHargas.value.find(h => h.menu_id === menu.id && h.cara_masak_id === cm.id)
    return { cara_masak_id: cm.id, cara_masak_label: cm.label, harga_porsi: existing?.harga_porsi ?? 0 }
  })
})))

async function fetchAll() {
  [menus.value, caraMasaks.value, menuHargas.value] = await Promise.all([
    $fetch<Menu[]>('/api/menus'),
    $fetch<CaraMasak[]>('/api/cara-masak'),
    $fetch<MenuHargaRow[]>('/api/menu-harga'),
  ])
  const m: Record<string, number> = {}
  for (const h of menuHargas.value) m[pk(h.menu_id, h.cara_masak_id)] = h.harga_porsi
  editPrices.value = m
}

// ── Supplier data ──
interface SupplierMixItem {
  id: string; name: string; price: number
  contents: Array<{ menuId: string; qty: number }>
}
interface SupplierPackItem {
  id: number; menu_id: string; label: string; size_pcs: number; price: number
}
const supplierMixes = ref<SupplierMixItem[]>([])
const supplierPacks = ref<SupplierPackItem[]>([])

const editMixPrice = ref<Record<string, number>>({})
const editPackPrice = ref<Record<string, number>>({})

async function fetchSupplier() {
  [supplierMixes.value, supplierPacks.value] = await Promise.all([
    $fetch<SupplierMixItem[]>('/api/mixes'),
    $fetch<SupplierPackItem[]>('/api/supplier-packs'),
  ])
  editMixPrice.value = Object.fromEntries(supplierMixes.value.map(m => [m.id, m.price]))
  editPackPrice.value = Object.fromEntries(supplierPacks.value.map(p => [String(p.id), p.price]))
}

async function saveMixPrice(id: string) {
  const price = editMixPrice.value[id]
  if (!price || price <= 0) return
  await $fetch('/api/mixes', { method: 'PUT', body: { id, price } })
  const m = supplierMixes.value.find(m => m.id === id)
  if (m) m.price = price
}

async function savePackPrice(id: number) {
  const price = editPackPrice.value[String(id)]
  if (!price || price <= 0) return
  await $fetch('/api/supplier-packs', { method: 'PUT', body: { id, price } })
  const p = supplierPacks.value.find(p => p.id === id)
  if (p) p.price = price
}

// ── Menu CRUD ──
async function addMenu() {
  const f = menuAdd.value; if (!f.id || !f.name) return
  await $fetch('/api/menus', { method: 'POST', body: { id: f.id, name: f.name, unit: f.unit, category: f.category } })
  await fetchAll(); menuAdd.value = { id: '', name: '', unit: 'pcs', category: 'dimsum' }
}
async function deleteMenu(id: string) {
  await $fetch('/api/menus', { method: 'DELETE', body: { id } })
  menus.value = menus.value.filter(m => m.id !== id)
}
function editMenu(m: Menu) { menuEditId.value = m.id; menuEdit.value = { name: m.name, unit: m.unit, category: m.category || 'dimsum' } }
function cancelEditMenu() { menuEditId.value = null }
async function saveEditMenu(m: Menu) {
  const e = menuEdit.value; await $fetch('/api/menus', { method: 'PUT', body: { id: m.id, name: e.name, unit: e.unit, category: e.category } })
  m.name = e.name; m.unit = e.unit; m.category = e.category; menuEditId.value = null
}

async function addCaraMasak() {
  const f = cmAdd.value; if (!f.id || !f.label) return
  await $fetch('/api/cara-masak', { method: 'POST', body: { id: f.id, label: f.label } })
  await fetchAll(); cmAdd.value = { id: '', label: '' }
}
async function deleteCaraMasak(id: string) {
  await $fetch('/api/cara-masak', { method: 'DELETE', body: { id } })
  caraMasaks.value = caraMasaks.value.filter(c => c.id !== id)
}
async function saveRow(menuId: string) {
  for (const cm of caraMasaks.value) {
    const key = pk(menuId, cm.id); const harga = editPrices.value[key]
    if (harga !== undefined && harga > 0) await $fetch('/api/menu-harga', { method: 'PUT', body: { menu_id: menuId, cara_masak_id: cm.id, harga_porsi: harga } })
  }
  await fetchAll()
}

const applyAllPrice = ref<Record<string, number>>({})
async function applyToAll(caraMasakId: string) {
  const harga = applyAllPrice.value[caraMasakId]
  if (!harga || harga <= 0) return
  for (const menu of menus.value) {
    await $fetch('/api/menu-harga', { method: 'PUT', body: { menu_id: menu.id, cara_masak_id: caraMasakId, harga_porsi: harga } })
  }
  await fetchAll()
}

const categoryOptions: MenuCategory[] = ['dimsum', 'bento', 'condiment', 'other']

// ── Tab: Paket ──
interface EditBomLine { menuId: string; qty: number }
const packages = ref<(import('~/types').Package)[]>([])
const editPkg = ref({ id: '', name: '', price: 0, bom: [] as EditBomLine[] })
const editingId = ref<string | null>(null)

async function fetchPackages() {
  packages.value = await $fetch('/api/packages')
}

async function addPkg() {
  const p = editPkg.value; if (!p.id || !p.name) return
  await $fetch('/api/packages', { method: 'POST', body: { id: p.id, name: p.name, price: p.price, bom: p.bom } })
  await fetchPackages(); editPkg.value = { id: '', name: '', price: 0, bom: [] }
}
function startEditPkg(pkg: any) {
  editingId.value = pkg.id
  editPkg.value = { id: pkg.id, name: pkg.name, price: pkg.price || 0, bom: pkg.bom.map((b: any) => ({ menuId: b.menuId, qty: b.qty })) }
}
function cancelEditPkg() { editingId.value = null }
async function saveEditPkg() {
  const p = editPkg.value; await $fetch('/api/packages', { method: 'PUT', body: { id: p.id, name: p.name, price: p.price, bom: p.bom } })
  editingId.value = null; await fetchPackages()
}
async function deletePkg(id: string) {
  await $fetch('/api/packages', { method: 'DELETE', body: { id } })
  packages.value = packages.value.filter((p: any) => p.id !== id)
}
function addBomLine() { editPkg.value.bom.push({ menuId: '', qty: 1 }) }

const emojis: Record<string, string> = { 'paket-halu': '🌟', 'paket-when-ya': '✨', 'paket-solulu': '🌈' }

// ── HPP ──
const hppPerPcs = ref(2133)

async function fetchHpp() {
  const cfg = await $fetch<Record<string, string>>('/api/app-config')
  if (cfg.hpp_per_pcs) hppPerPcs.value = parseInt(cfg.hpp_per_pcs, 10)
}

async function saveHpp() {
  await $fetch('/api/app-config', { method: 'PUT', body: { hpp_per_pcs: String(hppPerPcs.value) } })
}

onMounted(async () => {
  await Promise.all([pkgStore.ensureLoaded(), invStore.ensureLoaded(), fetchAll(), fetchPackages(), fetchSupplier(), fetchHpp()])
})
</script>

<template>
  <div class="slide-up space-y-4">
    <div class="rounded-2xl border p-3.5" style="background: var(--color-cream-100); border-color: var(--color-cream-200);">
      <div class="font-display text-lg font-semibold" style="color: var(--color-ink-900);">⚙️ Pengaturan</div>
      <div class="mt-1 text-xs font-semibold" style="color: var(--color-ink-700);">Kelola menu, stok, paket frozen, dan harga supplier.</div>
    </div>

    <!-- Tab buttons -->
    <div class="rounded-2xl border p-3" style="background: var(--color-blue-50); border-color: var(--color-blue-100);">
      <div class="flex gap-1 flex-wrap">
        <button @click="activeTab = 'menu'" :style="tabStyle('menu')">Daftar Menu</button>
        <button @click="activeTab = 'stok'" :style="tabStyle('stok')">Stok</button>
        <button @click="activeTab = 'paket'" :style="tabStyle('paket')">Paket Frozen</button>
        <button @click="activeTab = 'supplier'" :style="tabStyle('supplier')">Supplier</button>
      </div>
    </div>

    <!-- ═══ Tab: Menu ═══ -->
    <div v-if="activeTab === 'menu'" class="space-y-3">
      <div class="rounded-2xl border bg-white px-4 py-3 space-y-2" style="border-color: var(--color-blue-100);">
        <div class="font-display text-sm font-semibold" style="color: var(--color-ink-900);">Tambah Menu</div>
        <div class="grid grid-cols-2 gap-2">
          <input v-model="menuAdd.id" placeholder="ID (contoh: siomay-ayam)" class="rounded-2xl border px-4 py-3 text-base font-semibold outline-none col-span-2" style="border-color: var(--color-blue-200);" />
          <input v-model="menuAdd.name" placeholder="Nama menu" class="rounded-2xl border px-4 py-3 text-base font-semibold outline-none" style="border-color: var(--color-blue-200);" />
          <input v-model="menuAdd.unit" placeholder="Unit" class="rounded-2xl border px-4 py-3 text-base font-semibold outline-none" style="border-color: var(--color-blue-200);" />
          <select v-model="menuAdd.category" class="rounded-2xl border px-4 py-3 text-base font-semibold outline-none col-span-2" style="border-color: var(--color-blue-200);">
            <option v-for="c in categoryOptions" :key="c" :value="c">{{ c }}</option>
          </select>
        </div>
        <button class="rounded-2xl px-5 py-3 text-base font-bold text-white w-full" style="background: linear-gradient(135deg, var(--color-blue-400), var(--color-blue-600));" @click="addMenu()">Tambah</button>
      </div>

      <div v-for="m in menus" :key="m.id" class="rounded-2xl border bg-white px-4 py-3" style="border-color: var(--color-blue-100);">
        <template v-if="menuEditId !== m.id">
          <div class="flex items-center justify-between">
            <div>
              <div class="font-display text-sm font-semibold" style="color: var(--color-ink-900);">{{ m.name }}</div>
              <div class="text-xs font-semibold" style="color: var(--color-ink-500);">{{ m.id }} · {{ m.unit }} · {{ m.category }}</div>
            </div>
            <div class="flex gap-1.5">
              <button class="rounded-lg px-2.5 py-1 text-xs font-bold" style="background: var(--color-blue-50); color: var(--color-blue-700);" @click="editMenu(m)">Edit</button>
              <button class="rounded-lg px-2.5 py-1 text-xs font-bold" style="background: #FAD3D3; color: #B14343;" @click="deleteMenu(m.id)">Hapus</button>
            </div>
          </div>
        </template>
        <template v-else>
          <div class="font-display text-sm font-semibold mb-2" style="color: var(--color-ink-900);">Edit {{ m.name }}</div>
          <div class="space-y-2">
            <input v-model="menuEdit.name" placeholder="Nama" class="w-full rounded-2xl border px-4 py-3 text-base font-semibold outline-none" style="border-color: var(--color-blue-200);" />
            <input v-model="menuEdit.unit" placeholder="Unit" class="w-full rounded-2xl border px-4 py-3 text-base font-semibold outline-none" style="border-color: var(--color-blue-200);" />
            <select v-model="menuEdit.category" class="w-full rounded-2xl border px-4 py-3 text-base font-semibold outline-none" style="border-color: var(--color-blue-200);">
              <option v-for="c in categoryOptions" :key="c" :value="c">{{ c }}</option>
            </select>
          </div>
          <div class="mt-3 flex gap-2">
            <button class="flex-1 rounded-2xl py-3 font-display text-sm font-semibold text-white" style="background: linear-gradient(135deg, var(--color-blue-400), var(--color-blue-600));" @click="saveEditMenu(m)">Simpan</button>
            <button class="flex-1 rounded-2xl py-3 font-display text-sm font-semibold" style="background: var(--color-blue-50); color: var(--color-ink-700);" @click="cancelEditMenu()">Batal</button>
          </div>
        </template>
      </div>

      <div class="rounded-2xl border bg-white px-4 py-3" style="border-color: var(--color-blue-100);">
        <div class="font-display text-sm font-semibold mb-2" style="color: var(--color-ink-900);">Cara Masak</div>
        <div class="flex flex-wrap gap-2 mb-3">
          <span v-for="cm in caraMasaks" :key="cm.id" class="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold" :style="{ background: cm.id === 'bakar' ? 'var(--color-orange-100)' : cm.id === 'kukus' ? 'var(--color-blue-100)' : 'var(--color-cream-200)', color: 'var(--color-ink-800)' }">
            {{ cm.label }}
            <button style="color: var(--color-red-400);" @click="deleteCaraMasak(cm.id)">✕</button>
          </span>
        </div>
        <div class="flex gap-2">
          <input v-model="cmAdd.id" placeholder="ID (goreng)" class="flex-1 rounded-xl border px-3 py-2 text-sm font-semibold outline-none" style="border-color: var(--color-blue-200);" />
          <input v-model="cmAdd.label" placeholder="Label (Goreng)" class="flex-1 rounded-xl border px-3 py-2 text-sm font-semibold outline-none" style="border-color: var(--color-blue-200);" />
          <button class="rounded-xl px-3 py-2 text-xs font-bold text-white" style="background: var(--color-blue-500);" @click="addCaraMasak()">Tambah</button>
        </div>
      </div>

      <div class="rounded-2xl border bg-white px-4 py-3" style="border-color: var(--color-blue-100);">
        <div class="font-display text-sm font-semibold mb-2" style="color: var(--color-ink-900);">Harga per Menu</div>
        <div class="rounded-xl p-3 mb-3" style="background: var(--color-cream-50); border: 1px solid var(--color-cream-200);">
          <div class="text-xs font-bold mb-2" style="color: var(--color-ink-600);">⚡ Set harga default untuk SEMUA menu</div>
          <div class="space-y-1.5">
            <div v-for="cm in caraMasaks" :key="cm.id" class="flex items-center gap-2">
              <span class="text-xs font-bold w-12 shrink-0" :style="{ color: cm.id === 'bakar' ? '#B45309' : cm.id === 'kukus' ? '#2563EB' : 'var(--color-ink-500)' }">{{ cm.label }}</span>
              <div class="flex items-center gap-1">
                <span class="text-[10px] font-semibold" style="color: var(--color-ink-500);">Rp</span>
                <input type="number" v-model.number="applyAllPrice[cm.id]" placeholder="0" class="w-20 rounded-lg border px-2 py-1 text-sm font-semibold outline-none" style="border-color: var(--color-blue-200);" />
                <button class="text-xs font-bold rounded-lg px-2.5 py-1.5 active:scale-90" style="background: var(--color-green-100); color: var(--color-green-700);" @click="applyToAll(cm.id)">Terapkan ke semua</button>
              </div>
            </div>
          </div>
        </div>
        <div v-for="row in hargaGrid" :key="row.menu_id" class="border-b py-2" style="border-color: var(--color-blue-50);">
          <div class="text-xs font-semibold mb-1" style="color: var(--color-ink-700);">{{ row.menu_nama }}</div>
          <div class="flex flex-wrap gap-2">
            <div v-for="col in row.columns" :key="col.cara_masak_id" class="flex items-center gap-0.5">
              <input type="number" :value="editPrices[pk(row.menu_id, col.cara_masak_id)] ?? col.harga_porsi" @input="editPrices[pk(row.menu_id, col.cara_masak_id)] = Number(($event.target as HTMLInputElement).value)"
                class="w-16 rounded-lg border px-1 py-1 text-xs font-semibold outline-none text-center" :style="{ borderColor: col.cara_masak_id === 'bakar' ? 'var(--color-orange-300)' : 'var(--color-blue-200)' }" />
              <span class="text-[10px] font-bold" :style="{ color: col.cara_masak_id === 'bakar' ? '#B45309' : col.cara_masak_id === 'kukus' ? '#2563EB' : 'var(--color-ink-500)' }">{{ col.cara_masak_label.substring(0,3) }}</span>
            </div>
            <button class="text-[10px] font-bold rounded-lg px-2 py-1 active:scale-90" style="background: var(--color-blue-50); color: var(--color-blue-600);" @click="saveRow(row.menu_id)">Simpan</button>
          </div>
        </div>
      </div>
    </div>

    <!-- ═══ Tab: Stok ═══ -->
    <div v-if="activeTab === 'stok'" class="space-y-3">
      <div class="rounded-2xl border p-3.5" style="background: var(--color-blue-50); border-color: var(--color-blue-100);">
        <div class="flex items-center justify-between">
          <div class="font-display text-sm font-bold" style="color: var(--color-ink-900);">📦 Stok Inventory</div>
          <div class="text-[10px] font-semibold" style="color: var(--color-ink-500);">Stok per menu</div>
        </div>
      </div>
      <ClientOnly>
        <InventoryInput />
      </ClientOnly>
    </div>

    <!-- ═══ Tab: Paket Frozen ═══ -->
    <div v-if="activeTab === 'paket'" class="space-y-3">
      <div class="rounded-2xl border bg-white px-4 py-3 space-y-2" style="border-color: var(--color-blue-100);">
        <div class="font-display text-sm font-semibold" style="color: var(--color-ink-900);">Tambah Paket</div>
        <input v-model="editPkg.id" placeholder="ID (paket-baru)" class="w-full rounded-2xl border px-4 py-3 text-base font-semibold outline-none" style="border-color: var(--color-blue-200);" />
        <input v-model="editPkg.name" placeholder="Nama paket" class="w-full rounded-2xl border px-4 py-3 text-base font-semibold outline-none" style="border-color: var(--color-blue-200);" />
        <input v-model.number="editPkg.price" type="number" placeholder="Harga" class="w-full rounded-2xl border px-4 py-3 text-base font-semibold outline-none" style="border-color: var(--color-blue-200);" />
        <div v-for="(line, li) in editPkg.bom" :key="li" class="flex gap-2">
          <select v-model="line.menuId" class="flex-1 rounded-xl border px-2 py-1.5 text-xs font-semibold outline-none" style="border-color: var(--color-blue-200);">
            <option v-for="menu in menus" :key="menu.id" :value="menu.id">{{ menu.name }}</option>
          </select>
          <input v-model.number="line.qty" type="number" placeholder="Qty" class="w-16 rounded-xl border px-2 py-1.5 text-xs font-semibold outline-none" style="border-color: var(--color-blue-200);" />
          <button class="text-xs font-bold" style="color: var(--color-red-400);" @click="editPkg.bom.splice(li, 1)">✕</button>
        </div>
        <button class="text-xs font-bold" style="color: var(--color-blue-600);" @click="addBomLine()">+ Tambah item</button>
        <button class="rounded-2xl px-5 py-3 text-base font-bold text-white w-full" style="background: linear-gradient(135deg, var(--color-blue-400), var(--color-blue-600));" @click="addPkg()">Tambah Paket</button>
      </div>

      <div v-for="pkg in packages" :key="pkg.id" class="rounded-2xl border bg-white px-4 py-3" style="border-color: var(--color-blue-100);">
        <div class="flex items-center justify-between">
          <div>
            <div class="font-display text-sm font-semibold" style="color: var(--color-ink-900);">{{ emojis[pkg.id] || '📦' }} {{ pkg.name }}</div>
            <div class="text-xs font-semibold" style="color: var(--color-ink-500);">Rp{{ (pkg.price || 0).toLocaleString() }} · {{ pkg.bom?.length }} item</div>
          </div>
          <div class="flex gap-1.5">
            <button class="rounded-lg px-2.5 py-1 text-xs font-bold" style="background: var(--color-blue-50); color: var(--color-blue-700);" @click="startEditPkg(pkg)">Edit</button>
            <button class="rounded-lg px-2.5 py-1 text-xs font-bold" style="background: #FAD3D3; color: #B14343;" @click="deletePkg(pkg.id)">Hapus</button>
          </div>
        </div>
      </div>
    </div>

    <!-- ═══ Tab: Supplier ═══ -->
    <div v-if="activeTab === 'supplier'" class="space-y-4">
      <!-- Mix Pricing -->
      <div class="rounded-2xl border bg-white px-4 py-3" style="border-color: var(--color-blue-100);">
        <div class="font-display text-sm font-semibold mb-3" style="color: var(--color-ink-900);">🛍️ Harga Mix Supplier</div>
        <div class="space-y-2">
          <div v-for="mix in supplierMixes" :key="mix.id"
            class="flex items-center gap-3 rounded-xl border p-3" style="border-color: var(--color-blue-50);">
            <div class="flex-1">
              <div class="text-sm font-semibold" style="color: var(--color-ink-900);">{{ mix.name }}</div>
              <div class="text-[10px] font-semibold" style="color: var(--color-ink-500);">
                30 pcs · {{ mix.contents.map(c => `${c.qty} ${c.menuId}`).join(', ') }}
              </div>
            </div>
            <div class="flex items-center gap-1">
              <span class="text-xs font-semibold" style="color: var(--color-ink-500);">Rp</span>
              <input type="number" v-model.number="editMixPrice[mix.id]"
                class="w-20 rounded-lg border px-2 py-1.5 text-sm font-semibold outline-none text-right"
                style="border-color: var(--color-blue-200);" />
            </div>
            <button class="rounded-lg px-3 py-1.5 text-xs font-bold text-white active:scale-90"
              style="background: var(--color-blue-500);"
              @click="saveMixPrice(mix.id)">Simpan</button>
          </div>
        </div>
      </div>

      <!-- Pack Pricing -->
      <div class="rounded-2xl border bg-white px-4 py-3" style="border-color: var(--color-blue-100);">
        <div class="font-display text-sm font-semibold mb-3" style="color: var(--color-ink-900);">📦 Harga Pack per Varian</div>
        <div class="space-y-1">
          <div v-for="pack in supplierPacks" :key="pack.id"
            class="flex items-center gap-2 rounded-lg px-2 py-2" style="border-bottom: 1px solid var(--color-blue-50);">
            <span class="flex-1 text-xs font-semibold" style="color: var(--color-ink-700);">{{ pack.menu_id }}</span>
            <span class="text-[10px] font-semibold" style="color: var(--color-ink-500);">{{ pack.label }} ({{ pack.size_pcs }} pcs)</span>
            <div class="flex items-center gap-1">
              <span class="text-[10px] font-semibold" style="color: var(--color-ink-500);">Rp</span>
              <input type="number" v-model.number="editPackPrice[String(pack.id)]"
                class="w-16 rounded-lg border px-1 py-1 text-xs font-semibold outline-none text-right"
                style="border-color: var(--color-blue-200);" />
            </div>
            <button class="rounded-lg px-2 py-1 text-[10px] font-bold text-white active:scale-90"
              style="background: var(--color-blue-500);"
              @click="savePackPrice(pack.id)">Simpan</button>
          </div>
        </div>
      </div>

      <!-- HPP Setting -->
      <div class="rounded-2xl border bg-white px-4 py-3" style="border-color: var(--color-blue-100);">
        <div class="font-display text-sm font-semibold mb-2" style="color: var(--color-ink-900);">💰 HPP (Harga Pokok Produksi)</div>
        <div class="text-[10px] font-semibold mb-2" style="color: var(--color-ink-500);">Biaya produksi per pcs. Dipakai hitung laba di rekomendasi.</div>
        <div class="flex items-center gap-2">
          <span class="text-xs font-semibold" style="color: var(--color-ink-500);">Rp</span>
          <input type="number" v-model.number="hppPerPcs"
            class="w-24 rounded-lg border px-3 py-2 text-sm font-semibold outline-none"
            style="border-color: var(--color-blue-200);" />
          <span class="text-xs font-semibold" style="color: var(--color-ink-500);">/ pcs</span>
          <button class="rounded-lg px-3 py-1.5 text-xs font-bold text-white active:scale-90 ml-auto"
            style="background: var(--color-blue-500);"
            @click="saveHpp">Simpan</button>
        </div>
        <div v-if="hppPerPcs > 0" class="mt-2 text-[10px] font-semibold" style="color: var(--color-ink-500);">
          ≈ HPP per paket (10 pcs): <b>Rp{{ (hppPerPcs * 10).toLocaleString() }}</b>
        </div>
      </div>
    </div>
  </div>
</template>
