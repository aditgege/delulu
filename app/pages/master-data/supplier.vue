<script setup lang="ts">
import { usePackageStore } from '~/stores/packages'

definePageMeta({ title: 'Supplier' })

const pkgStore = usePackageStore()

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

const menus = ref<any[]>([])

// ── Add Mix ──
const newMix = ref({ id: '', name: '', price: 0, contents: [] as Array<{ menuId: string; qty: number }> })
function addMixRow() { newMix.value.contents.push({ menuId: menus.value[0]?.id || '', qty: 6 }) }
async function saveNewMix() {
  const m = newMix.value; if (!m.id || !m.name || !m.price || !m.contents.length) return
  await $fetch('/api/mixes', { method: 'POST', body: m })
  newMix.value = { id: '', name: '', price: 0, contents: [] }
  await fetchSupplier()
}

// ── Add Pack ──
const newPack = ref({ menuId: '', label: 'Medium', sizePcs: 30, price: 0 })
async function saveNewPack() {
  const p = newPack.value; if (!p.menuId || !p.label || !p.sizePcs || !p.price) return
  await $fetch('/api/supplier-packs', { method: 'POST', body: p })
  newPack.value = { menuId: '', label: 'Medium', sizePcs: 30, price: 0 }
  await fetchSupplier()
}

async function fetchSupplier() {
  [supplierMixes.value, supplierPacks.value] = await Promise.all([
    $fetch<SupplierMixItem[]>('/api/mixes'),
    $fetch<SupplierPackItem[]>('/api/supplier-packs'),
  ])
  editMixPrice.value = Object.fromEntries(supplierMixes.value.map(m => [m.id, m.price]))
  editPackPrice.value = Object.fromEntries(supplierPacks.value.map(p => [String(p.id), p.price]))
}

async function fetchMenus() {
  menus.value = await $fetch<any[]>('/api/menus')
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

onMounted(async () => {
  await Promise.all([pkgStore.ensureLoaded(), fetchMenus(), fetchSupplier()])
})
</script>

<template>
  <div class="slide-up space-y-5">
    <!-- Breadcrumb -->
    <div class="flex items-center gap-2">
      <button class="rounded-xl px-3 py-2 text-xs font-bold text-white active:scale-90" style="background: var(--color-blue-500);" @click="navigateTo('/master-data')">← Kembali</button>
      <span class="text-xs font-semibold" style="color: var(--color-ink-500);">/ 🏭 Supplier</span>
    </div>

    <!-- Header -->
    <div class="rounded-2xl p-4" style="background: linear-gradient(135deg, #F5B82E, #FFCB52); color: white; border: none;">
      <div class="flex items-center gap-3">
        <div class="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/25 text-2xl">🏭</div>
        <div>
          <div class="font-display text-lg font-bold">Supplier</div>
          <div class="mt-0.5 text-xs font-semibold opacity-80">Kelola harga mix & pack supplier</div>
        </div>
      </div>
    </div>

    <!-- Mix Pricing -->
    <div class="rounded-2xl border bg-white overflow-hidden" style="border-color: var(--color-blue-100); box-shadow: 0 2px 12px rgba(79, 168, 224, 0.08);">
      <!-- Section header -->
      <div class="flex items-center gap-2 border-b px-4 py-3" style="border-color: var(--color-blue-50);">
        <div class="flex h-8 w-8 items-center justify-center rounded-lg text-sm" style="background: var(--color-blue-50);">🛍️</div>
        <span class="font-display text-sm font-semibold" style="color: var(--color-ink-900);">Harga Mix Supplier</span>
      </div>

      <!-- Add Mix form -->
      <div class="mx-3 mt-3 rounded-xl p-4 space-y-3" style="background: var(--color-cream-50); border: 1px solid var(--color-cream-200);">
        <div class="flex items-center gap-1.5">
          <span class="flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold text-white" style="background: var(--color-green-500);">+</span>
          <span class="text-xs font-bold" style="color: var(--color-ink-700);">Tambah Mix Baru</span>
        </div>

        <div class="space-y-2.5">
          <div>
            <label class="mb-1 block text-[11px] font-bold uppercase tracking-wide" style="color: var(--color-ink-500);">ID Mix</label>
            <input v-model="newMix.id" placeholder="Contoh: mix-f" class="w-full rounded-xl border px-3.5 py-2.5 text-xs font-semibold outline-none transition-all focus:ring-2" style="border-color: var(--color-blue-200);" />
          </div>
          <div>
            <label class="mb-1 block text-[11px] font-bold uppercase tracking-wide" style="color: var(--color-ink-500);">Nama Mix</label>
            <input v-model="newMix.name" placeholder="Contoh: Mix F" class="w-full rounded-xl border px-3.5 py-2.5 text-xs font-semibold outline-none transition-all focus:ring-2" style="border-color: var(--color-blue-200);" />
          </div>
          <div>
            <label class="mb-1 block text-[11px] font-bold uppercase tracking-wide" style="color: var(--color-ink-500);">Harga</label>
            <div class="relative">
              <span class="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold" style="color: var(--color-ink-500);">Rp</span>
              <input type="number" v-model.number="newMix.price" placeholder="64000" class="w-full rounded-xl border py-2.5 pl-9 pr-3.5 text-xs font-semibold outline-none transition-all focus:ring-2" style="border-color: var(--color-blue-200);" />
            </div>
          </div>
        </div>

        <!-- Mix contents -->
        <div>
          <label class="mb-1.5 block text-[11px] font-bold uppercase tracking-wide" style="color: var(--color-ink-500);">Kandungan Menu</label>
          <div class="space-y-1.5">
            <div v-for="(row, ri) in newMix.contents" :key="ri" class="flex items-center gap-2">
              <select v-model="row.menuId" class="flex-1 rounded-lg border px-3 py-2 text-xs font-semibold outline-none" style="border-color: var(--color-blue-200); background: white;">
                <option v-for="menu in menus" :key="menu.id" :value="menu.id">{{ menu.name }}</option>
              </select>
              <div class="flex items-center gap-1 rounded-lg border px-2.5 py-2" style="border-color: var(--color-blue-200); background: white;">
                <input type="number" v-model.number="row.qty" placeholder="6" class="w-12 text-center text-xs font-semibold outline-none" />
                <span class="text-[10px] font-semibold" style="color: var(--color-ink-500);">pcs</span>
              </div>
              <button class="flex h-8 w-8 items-center justify-center rounded-lg text-xs font-bold active:scale-90" style="color: var(--color-red-400); background: rgba(248, 113, 113, 0.1);" @click="newMix.contents.splice(ri, 1)">✕</button>
            </div>
          </div>
        </div>

        <div class="flex items-center gap-3 pt-1">
          <button class="flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-bold transition-all active:scale-90" style="color: var(--color-blue-600); background: var(--color-blue-50);" @click="addMixRow()">
            <span>+</span> Tambah item menu
          </button>
          <button class="ml-auto rounded-xl px-4 py-2 text-xs font-bold text-white transition-all active:scale-90" style="background: var(--color-green-500);" @click="saveNewMix()">
            Simpan Mix
          </button>
        </div>
      </div>

      <!-- Mix list -->
      <div class="px-3 pb-3">
        <div class="mt-2 mb-2 flex items-center gap-2 px-1">
          <div class="h-px flex-1" style="background: var(--color-blue-50);"></div>
          <span class="text-[10px] font-semibold uppercase tracking-wider" style="color: var(--color-ink-500);">Daftar Mix</span>
          <div class="h-px flex-1" style="background: var(--color-blue-50);"></div>
        </div>

        <div class="space-y-2">
          <div v-for="mix in supplierMixes" :key="mix.id"
            class="flex flex-wrap items-center gap-3 rounded-xl border p-3.5 transition-all active:scale-[0.99]"
            style="border-color: var(--color-blue-50); background: white;">
            <div class="flex-1 min-w-[140px]">
              <div class="flex items-center gap-1.5">
                <span class="flex h-5 w-5 items-center justify-center rounded-md text-[10px]" style="background: var(--color-cream-100);">🛍️</span>
                <span class="text-sm font-semibold" style="color: var(--color-ink-900);">{{ mix.name }}</span>
              </div>
              <div class="mt-0.5 text-[10px] font-semibold" style="color: var(--color-ink-500);">
                {{ mix.contents.map(c => `${c.qty} ${c.menuId}`).join(', ') }}
              </div>
            </div>
            <div class="flex items-center gap-2">
              <div class="flex items-center rounded-lg border px-2.5 py-1.5" style="border-color: var(--color-blue-100);">
                <span class="mr-1 text-[11px] font-bold" style="color: var(--color-ink-500);">Rp</span>
                <input type="number" v-model.number="editMixPrice[mix.id]"
                  class="w-20 text-right text-sm font-semibold outline-none"
                  style="color: var(--color-ink-900);" />
              </div>
              <button
                class="rounded-lg px-3.5 py-2 text-xs font-bold text-white transition-all active:scale-90"
                style="background: var(--color-blue-500);"
                @click="saveMixPrice(mix.id)">Simpan</button>
            </div>
          </div>
          <div v-if="!supplierMixes.length" class="py-6 text-center">
            <span class="text-xs font-semibold" style="color: var(--color-ink-300);">Belum ada mix supplier</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Pack Pricing -->
    <div class="rounded-2xl border bg-white overflow-hidden" style="border-color: var(--color-blue-100); box-shadow: 0 2px 12px rgba(79, 168, 224, 0.08);">
      <div class="flex items-center gap-2 border-b px-4 py-3" style="border-color: var(--color-blue-50);">
        <div class="flex h-8 w-8 items-center justify-center rounded-lg text-sm" style="background: var(--color-blue-50);">📦</div>
        <span class="font-display text-sm font-semibold" style="color: var(--color-ink-900);">Harga Pack per Varian</span>
      </div>

      <!-- Add Pack form -->
      <div class="mx-3 mt-3 rounded-xl p-4 space-y-3" style="background: var(--color-cream-50); border: 1px solid var(--color-cream-200);">
        <div class="flex items-center gap-1.5">
          <span class="flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold text-white" style="background: var(--color-green-500);">+</span>
          <span class="text-xs font-bold" style="color: var(--color-ink-700);">Tambah Pack Baru</span>
        </div>

        <div class="grid grid-cols-2 gap-2.5">
          <div class="col-span-2">
            <label class="mb-1 block text-[11px] font-bold uppercase tracking-wide" style="color: var(--color-ink-500);">Menu</label>
            <select v-model="newPack.menuId" class="w-full rounded-xl border px-3.5 py-2.5 text-xs font-semibold outline-none" style="border-color: var(--color-blue-200); background: white;">
              <option value="" disabled>Pilih menu</option>
              <option v-for="menu in menus" :key="menu.id" :value="menu.id">{{ menu.name }}</option>
            </select>
          </div>
          <div>
            <label class="mb-1 block text-[11px] font-bold uppercase tracking-wide" style="color: var(--color-ink-500);">Label</label>
            <input v-model="newPack.label" placeholder="Medium" class="w-full rounded-xl border px-3.5 py-2.5 text-xs font-semibold outline-none" style="border-color: var(--color-blue-200);" />
          </div>
          <div>
            <label class="mb-1 block text-[11px] font-bold uppercase tracking-wide" style="color: var(--color-ink-500);">Ukuran (pcs)</label>
            <input type="number" v-model.number="newPack.sizePcs" placeholder="30" class="w-full rounded-xl border px-3.5 py-2.5 text-xs font-semibold outline-none" style="border-color: var(--color-blue-200);" />
          </div>
          <div class="col-span-2">
            <label class="mb-1 block text-[11px] font-bold uppercase tracking-wide" style="color: var(--color-ink-500);">Harga</label>
            <div class="relative">
              <span class="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold" style="color: var(--color-ink-500);">Rp</span>
              <input type="number" v-model.number="newPack.price" placeholder="63000" class="w-full rounded-xl border py-2.5 pl-9 pr-3.5 text-xs font-semibold outline-none" style="border-color: var(--color-blue-200);" />
            </div>
          </div>
        </div>

        <button class="w-full rounded-xl py-2.5 text-xs font-bold text-white transition-all active:scale-90" style="background: var(--color-green-500);" @click="saveNewPack()">
          Simpan Pack
        </button>
      </div>

      <!-- Pack list -->
      <div class="px-3 pb-3">
        <div class="mt-2 mb-2 flex items-center gap-2 px-1">
          <div class="h-px flex-1" style="background: var(--color-blue-50);"></div>
          <span class="text-[10px] font-semibold uppercase tracking-wider" style="color: var(--color-ink-500);">Daftar Pack</span>
          <div class="h-px flex-1" style="background: var(--color-blue-50);"></div>
        </div>

        <div class="space-y-1.5">
          <div v-for="pack in supplierPacks" :key="pack.id"
            class="flex flex-wrap items-center gap-2 rounded-xl border px-3.5 py-3"
            style="border-color: var(--color-blue-50);">
            <div class="flex-1 min-w-[120px]">
              <div class="flex items-center gap-1.5">
                <span class="text-xs font-bold" style="color: var(--color-ink-900);">{{ pack.menu_id }}</span>
                <span class="text-[10px] font-semibold" style="color: var(--color-ink-500);">· {{ pack.label }}</span>
              </div>
              <div class="mt-0.5 text-[10px] font-semibold" style="color: var(--color-ink-500);">{{ pack.size_pcs }} pcs</div>
            </div>
            <div class="flex items-center gap-2">
              <div class="flex items-center rounded-lg border px-2.5 py-1.5" style="border-color: var(--color-blue-100);">
                <span class="mr-1 text-[11px] font-bold" style="color: var(--color-ink-500);">Rp</span>
                <input type="number" v-model.number="editPackPrice[String(pack.id)]"
                  class="w-16 text-right text-xs font-semibold outline-none"
                  style="color: var(--color-ink-900);" />
              </div>
              <button
                class="rounded-lg px-3 py-1.5 text-[11px] font-bold text-white transition-all active:scale-90"
                style="background: var(--color-blue-500);"
                @click="savePackPrice(pack.id)">Simpan</button>
            </div>
          </div>
          <div v-if="!supplierPacks.length" class="py-6 text-center">
            <span class="text-xs font-semibold" style="color: var(--color-ink-300);">Belum ada pack supplier</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
