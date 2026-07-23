<script setup lang="ts">
import type { Menu, MenuCategory } from '~/types'

definePageMeta({ title: 'Bahan Baku' })

const menus = ref<Menu[]>([])

// Add form
const menuAdd = ref({ id: '', name: '', unit: 'pcs', category: 'dimsum' as MenuCategory })

// Edit drawer
const showEditDrawer = ref(false)
const editingMenu = ref<Menu | null>(null)
const editForm = ref({ name: '', category: '' as string })

// Delete drawer
const showDeleteDrawer = ref(false)
const deletingMenu = ref<Menu | null>(null)

const categoryOptions: MenuCategory[] = ['dimsum', 'bento', 'condiment', 'other']

const menuEmoji: Record<string, string> = {
  'siomay-ayam': '🥟', 'siomay-udang': '🍤', 'siomay-kepiting': '🦀',
  'siomay-seafood': '🦐', 'siomay-nori': '🌿', 'siomay-mozzarella': '🧀',
  'hisitkau': '🥢', 'lumpia-kulit-tahu-ayam': '🌯', 'lumpia-kulit-tahu-udang': '🥟',
  'chili-oil': '🌶️',
}

async function fetchMenus() { menus.value = await $fetch<Menu[]>('/api/menus') }

// ── Add ──
async function addMenu() {
  const f = menuAdd.value; if (!f.id || !f.name) return
  await $fetch('/api/menus', { method: 'POST', body: { id: f.id, name: f.name, unit: f.unit, category: f.category } })
  await fetchMenus(); menuAdd.value = { id: '', name: '', unit: 'pcs', category: 'dimsum' }
}

// ── Edit ──
function openEdit(m: Menu) {
  editingMenu.value = m
  editForm.value = { name: m.name, category: m.category || 'dimsum' }
  showEditDrawer.value = true
}

async function saveEdit() {
  const m = editingMenu.value; if (!m) return
  await $fetch('/api/menus', { method: 'PUT', body: { id: m.id, name: editForm.value.name, unit: m.unit, category: editForm.value.category } })
  m.name = editForm.value.name; m.category = editForm.value.category as MenuCategory
  showEditDrawer.value = false; editingMenu.value = null
}

// ── Delete ──
function openDelete(m: Menu) {
  deletingMenu.value = m
  showDeleteDrawer.value = true
}

async function confirmDelete() {
  const m = deletingMenu.value; if (!m) return
  await $fetch('/api/menus', { method: 'DELETE', body: { id: m.id } })
  menus.value = menus.value.filter(x => x.id !== m.id)
  showDeleteDrawer.value = false; deletingMenu.value = null
}

onMounted(fetchMenus)
</script>

<template>
  <div class="slide-up space-y-4">
    <div class="flex items-center gap-2">
      <button class="rounded-xl px-3 py-2 text-xs font-bold text-white active:scale-90" style="background: var(--color-blue-500);" @click="navigateTo('/master-data')">← Kembali</button>
      <span class="text-xs font-semibold" style="color: var(--color-ink-500);">/ 🥟 Bahan Baku</span>
    </div>

    <div class="rounded-2xl border p-4" style="background: linear-gradient(135deg, #059669, #047857); color: white; border: none;">
      <div class="font-display text-lg font-bold">🥟 Bahan Baku</div>
      <div class="mt-1 text-xs font-semibold opacity-80">Kelola menu dimsum — bahan dasar semua produk.</div>
    </div>

    <!-- Add form -->
    <div class="rounded-2xl border bg-white px-4 py-3 space-y-2" style="border-color: var(--color-blue-100);">
      <div class="font-display text-sm font-bold" style="color: var(--color-ink-900);">Tambah Menu</div>
      <div class="grid grid-cols-2 gap-2">
        <input v-model="menuAdd.id" placeholder="ID (siomay-ayam)" class="col-span-2 rounded-xl border px-3 py-2.5 text-sm font-semibold outline-none" style="border-color: var(--color-blue-200);" />
        <input v-model="menuAdd.name" placeholder="Nama menu" class="rounded-xl border px-3 py-2.5 text-sm font-semibold outline-none" style="border-color: var(--color-blue-200);" />
        <select v-model="menuAdd.category" class="rounded-xl border px-3 py-2.5 text-sm font-semibold outline-none" style="border-color: var(--color-blue-200);">
          <option v-for="c in categoryOptions" :key="c" :value="c">{{ c }}</option>
        </select>
      </div>
      <button class="rounded-xl px-4 py-2.5 text-sm font-bold text-white w-full active:scale-[0.97]" style="background: var(--color-blue-500);" @click="addMenu()">+ Tambah</button>
    </div>

    <!-- Menu list -->
    <div v-for="m in menus" :key="m.id" class="rounded-2xl border bg-white px-4 py-3" style="border-color: var(--color-blue-100);">
      <div class="flex items-center gap-3">
        <span class="text-lg">{{ menuEmoji[m.id] || '📦' }}</span>
        <div class="flex-1 min-w-0">
          <div class="text-sm font-bold truncate" style="color: var(--color-ink-900);">{{ m.name }}</div>
          <div class="text-[10px] font-semibold" style="color: var(--color-ink-500);">{{ m.id }} · {{ m.unit }} · {{ m.category }}</div>
        </div>
        <button class="rounded-lg px-2.5 py-1 text-[10px] font-bold" style="background: var(--color-blue-50); color: var(--color-blue-700);" @click="openEdit(m)">Edit</button>
        <button class="rounded-lg px-2.5 py-1 text-[10px] font-bold" style="background: #FAD3D3; color: #B14343;" @click="openDelete(m)">Hapus</button>
      </div>
    </div>

    <!-- ═══ Edit Drawer ═══ -->
    <UDrawer v-model:open="showEditDrawer" :title="'✏️ Edit ' + (editingMenu?.name || '')" direction="bottom" dismissible close>
      <template #body>
        <div class="space-y-4 py-4">
          <div class="space-y-2">
            <label class="text-xs font-bold" style="color: var(--color-ink-600);">Nama Menu</label>
            <input v-model="editForm.name" class="w-full rounded-xl border px-4 py-3 text-base font-semibold outline-none" style="border-color: var(--color-blue-200);" />
          </div>
          <div class="space-y-2">
            <label class="text-xs font-bold" style="color: var(--color-ink-600);">Kategori</label>
            <select v-model="editForm.category" class="w-full rounded-xl border px-4 py-3 text-base font-semibold outline-none" style="border-color: var(--color-blue-200);">
              <option v-for="c in categoryOptions" :key="c" :value="c">{{ c }}</option>
            </select>
          </div>
          <button class="w-full rounded-2xl py-3.5 text-base font-bold text-white active:scale-[0.97] transition-all" style="background: var(--color-blue-500);" @click="saveEdit()">Simpan Perubahan</button>
        </div>
      </template>
    </UDrawer>

    <!-- ═══ Delete Confirmation Drawer ═══ -->
    <UDrawer v-model:open="showDeleteDrawer" title="Hapus Menu" direction="bottom" dismissible close>
      <template #body>
        <div class="py-6 text-center space-y-4">
          <div class="text-4xl">🗑️</div>
          <div>
            <div class="font-display text-base font-bold" style="color: var(--color-ink-900);">Hapus {{ deletingMenu?.name }}?</div>
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
