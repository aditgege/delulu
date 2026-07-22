<script setup lang="ts">
import { usePackageStore } from '~/stores/packages'
import { useInventoryStore } from '~/stores/inventory'

definePageMeta({ title: 'Stok & Pengaturan' })

const pkgStore = usePackageStore()
const invStore = useInventoryStore()
onMounted(async () => {
  await Promise.all([pkgStore.ensureLoaded(), invStore.ensureLoaded()])
})
const packages = computed(() => pkgStore.getAllPackages())
const allSkus = computed(() => pkgStore.getAllSkus())
const inventory = computed(() => pkgStore.getAllSupplierPacks)

const emojiMap: Record<string, string> = {
  'siomay-ayam': '🥟', 'siomay-udang': '🍤', 'siomay-kepiting': '🦀',
  'siomay-seafood': '🦐', 'siomay-nori': '🌿', 'siomay-mozzarella': '🧀',
  'siomay-mercon': '🌶️', 'gyoza-ayam': '🥟', 'gyoza-ayam-udang': '🥟',
  'bakpao-ayam': '🥟', 'bakpao-susu': '🥛', 'bakpao-cokelat': '🍫',
  'shisitkau': '🥢', 'lumpia-tahu-ayam': '🌯', 'lumpia-tahu-udang': '🥟',
  'angsio': '🍲', 'hakau': '🥟',
  'ayam-bola-keju': '🧀', 'pangsit-ayam': '🥟', 'pangsit-udang': '🥟',
  'ekado': '🥟', 'kumis-naga': '🐉', 'kuotie': '🥟', 'wonton': '🥟',
  'cakue-goreng-udang': '🦐', 'lumpia-goreng-ayam': '🌯', 'lumpia-goreng-udang': '🌯',
  'lumpia-goreng-keju': '🧀', 'gohyong': '🥟',
  'pangsit-ayam-rebus': '🥟',
  'chicken-drumstick': '🍗', 'kani-roll': '🦀', 'egg-chicken-roll': '🥚',
  'kaki-naga': '🐉', 'chicken-katsu': '🍗',
}

const editingId = ref<string | null>(null)
const editName = ref('')
const editBom = ref<Array<{ skuId: string; qty: number }>>([])

function e(id: string) { return emojiMap[id] || '📦' }

function startEdit(id: string) {
  const pkg = pkgStore.getPackageById(id)
  if (!pkg) return
  editingId.value = id
  editName.value = pkg.name
  editBom.value = pkg.bom.map(b => ({ ...b }))
}
function cancelEdit() { editingId.value = null }
function saveEdit() {
  if (!editingId.value) return
  pkgStore.updatePackage(editingId.value, {
    name: editName.value,
    bom: editBom.value.filter(b => b.qty > 0),
  })
  editingId.value = null
}
function removePkg(id: string) { pkgStore.removePackage(id) }
function addBomLine() { editBom.value.push({ skuId: '', qty: 1 }) }
function removeBomLine(idx: number) { editBom.value.splice(idx, 1) }

function incBom(idx: number) { const e = editBom.value[idx]; if (e) e.qty++ }
function decBom(idx: number) { const e = editBom.value[idx]; if (e && e.qty > 1) e.qty-- }
</script>

<template>
  <div class="slide-up space-y-4">
    <div class="rounded-2xl border p-3.5" style="background: var(--color-pink-100); border-color: var(--color-pink-300);">
      <div class="font-display text-lg font-semibold" style="color: var(--color-ink-900);">Pengaturan Toko ⚙️</div>
      <div class="mt-1 text-xs font-semibold" style="color: var(--color-ink-700);">Atur komposisi paket. Data tersimpan di HP ini.</div>
    </div>

    <div class="flex items-center gap-2.5">
      <div class="flex h-8 w-8 items-center justify-center rounded-xl text-sm" style="background: var(--color-cream-200);">🎁</div>
      <span class="font-display text-base font-semibold" style="color: var(--color-ink-900);">Komposisi Paket</span>
      <button
        class="ml-auto rounded-full px-2.5 py-1 text-xs font-bold transition-colors"
        style="background: var(--color-blue-100); color: var(--color-blue-700);"
        @click="pkgStore.resetToSeed()"
      >↻ Reset</button>
    </div>

    <template v-for="pkg in packages" :key="pkg.id">
      <!-- View mode -->
      <div v-if="editingId !== pkg.id" class="rounded-2xl border bg-white px-4 py-3" style="border-color: var(--color-blue-100);">
        <div class="flex items-center justify-between mb-2">
          <div class="flex items-center gap-2.5">
            <span class="text-xl">{{ pkg.id === 'paket-halu' ? '🌟' : pkg.id === 'paket-when-ya' ? '✨' : '🌈' }}</span>
            <span class="font-display text-sm font-semibold" style="color: var(--color-ink-900);">{{ pkg.name }}</span>
          </div>
          <div class="flex gap-1.5">
            <button class="rounded-lg px-2.5 py-1 text-xs font-bold transition-colors" style="background: var(--color-blue-50); color: var(--color-blue-700);" @click="startEdit(pkg.id)">Edit</button>
            <button class="rounded-lg px-2.5 py-1 text-xs font-bold transition-colors" style="background: #FAD3D3; color: #B14343;" @click="removePkg(pkg.id)">Hapus</button>
          </div>
        </div>
        <div class="space-y-1">
          <template v-for="bom in pkg.bom" :key="bom.skuId">
            <div class="flex items-center gap-2 text-xs font-semibold" style="color: var(--color-ink-500);">
              <span>{{ e(bom.skuId) }}</span>
              <span>{{ pkgStore.getSkuById(bom.skuId)?.name ?? bom.skuId }}</span>
              <span class="ml-auto font-display text-sm" style="color: var(--color-ink-700);">× {{ bom.qty }}</span>
            </div>
          </template>
        </div>
      </div>

      <!-- Edit mode -->
      <div v-else class="rounded-2xl border bg-white px-4 py-3" style="border-color: var(--color-blue-100);">
        <div class="font-display text-sm font-semibold mb-3" style="color: var(--color-ink-900);">Edit {{ editName }}</div>
        <input
          v-model="editName"
          class="mb-3 w-full rounded-xl border px-3 py-2 text-sm font-semibold outline-none"
          style="border-color: var(--color-blue-200);"
          placeholder="Nama paket"
        />
        <div class="space-y-2">
          <div v-for="(line, idx) in editBom" :key="idx" class="flex items-center gap-2">
            <select v-model="line.skuId" class="flex-1 rounded-xl border px-2 py-1.5 text-xs font-semibold outline-none" style="border-color: var(--color-blue-200);">
              <option value="" disabled>Pilih SKU</option>
              <option v-for="sku in allSkus" :key="sku.id" :value="sku.id">{{ e(sku.id) }} {{ sku.name }}</option>
            </select>
            <button class="flex h-7 w-7 items-center justify-center rounded-lg border text-xs font-bold" style="border-color: var(--color-blue-200); color: var(--color-blue-600);" @click="decBom(idx)">−</button>
            <span class="font-display text-sm font-semibold w-6 text-center">{{ line.qty }}</span>
            <button class="flex h-7 w-7 items-center justify-center rounded-lg border text-xs font-bold text-white" style="background: var(--color-blue-500);" @click="incBom(idx)">+</button>
            <button class="flex h-7 w-7 items-center justify-center rounded-lg text-xs font-bold" style="color: #B14343;" @click="removeBomLine(idx)">×</button>
          </div>
        </div>
        <button class="mt-2 text-xs font-bold" style="color: var(--color-blue-600);" @click="addBomLine">+ Tambah Bahan</button>
        <div class="mt-3 flex gap-2">
          <button
            class="flex-1 rounded-xl py-2 font-display text-sm font-semibold text-white"
            style="background: linear-gradient(135deg, var(--color-blue-400), var(--color-blue-600));"
            @click="saveEdit()"
          >Simpan</button>
          <button
            class="flex-1 rounded-xl py-2 font-display text-sm font-semibold"
            style="background: var(--color-blue-50); color: var(--color-ink-700);"
            @click="cancelEdit()"
          >Batal</button>
        </div>
      </div>
    </template>

    <div class="border-t pt-4" style="border-color: var(--color-blue-100);">
      <InventoryInput />
    </div>
  </div>
</template>
