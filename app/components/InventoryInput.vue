<script setup lang="ts">
import { useInventoryStore } from '~/stores/inventory'
import { usePackageStore } from '~/stores/packages'

const invStore = useInventoryStore()
const pkgStore = usePackageStore()
const skus = computed(() => pkgStore.getAllMenus())
const isOpen = ref(false)
const search = ref('')
const expandedCats = ref<Set<string>>(new Set())

const emojiMap: Record<string, string> = {
  'siomay-ayam': '🥟', 'siomay-udang': '🍤', 'siomay-kepiting': '🦀',
  'siomay-seafood': '🦐', 'siomay-nori': '🌿', 'siomay-mozzarella': '🧀',
  'hisitkau': '🥢', 'lumpia-kulit-tahu-ayam': '🌯', 'lumpia-kulit-tahu-udang': '🥟',
}

const categories = [
  { id: 'siomay', name: 'Siomay', emoji: '🥟', prefixes: ['siomay-'] },
  { id: 'lumpia', name: 'Lumpia', emoji: '🌯', prefixes: ['lumpia-kulit-tahu-'] },
  { id: 'lainnya', name: 'Lainnya', emoji: '📦', prefixes: [] },
]

function getCategoryId(skuId: string): string {
  for (const cat of categories) {
    if (cat.id === 'lainnya') continue
    if (cat.prefixes.some(p => skuId.startsWith(p))) return cat.id
  }
  return 'lainnya'
}

const filteredSkus = computed(() => {
  if (!search.value) return skus.value
  const q = search.value.toLowerCase()
  return skus.value.filter(s => s.name.toLowerCase().includes(q) || s.id.toLowerCase().includes(q))
})

const groupedSkus = computed(() => {
  const map = new Map<string, typeof filteredSkus.value>()
  for (const cat of categories) map.set(cat.id, [])
  for (const sku of filteredSkus.value) {
    const catId = getCategoryId(sku.id)
    map.get(catId)!.push(sku)
  }
  return map
})

function filledCount(catId: string): number {
  return groupedSkus.value.get(catId)?.filter(s => invStore.getStock(s.id) > 0).length || 0
}

function totalCount(catId: string): number {
  return groupedSkus.value.get(catId)?.length || 0
}

function hasValue(catId: string): boolean {
  return groupedSkus.value.get(catId)?.some(s => invStore.getStock(s.id) > 0) ?? false
}

function toggleCat(id: string) {
  const next = new Set(expandedCats.value)
  if (next.has(id)) next.delete(id)
  else next.add(id)
  expandedCats.value = next
}

function inc(id: string) { invStore.setStock(id, invStore.getStock(id) + 1) }
function inc10(id: string) { invStore.setStock(id, invStore.getStock(id) + 10) }
function dec(id: string) { invStore.setStock(id, Math.max(0, invStore.getStock(id) - 1)) }

function onInput(id: string, e: Event) {
  const val = parseInt((e.target as HTMLInputElement).value, 10)
  invStore.setStock(id, isNaN(val) ? 0 : val)
}

function clearCategory(catId: string) {
  for (const sku of groupedSkus.value.get(catId) || []) {
    invStore.setStock(sku.id, 0)
  }
}

function fillCategory(catId: string, val: number) {
  for (const sku of groupedSkus.value.get(catId) || []) {
    if (invStore.getStock(sku.id) === 0) invStore.setStock(sku.id, val)
  }
}

function clearAll() {
  for (const sku of skus.value) invStore.setStock(sku.id, 0)
}

function e(skuId: string) { return emojiMap[skuId] || '📦' }

const totalFilled = computed(() => skus.value.filter(s => invStore.getStock(s.id) > 0).length)
const totalAll = computed(() => skus.value.length)
const allCollapsed = computed(() => expandedCats.value.size === 0)
const someFilled = computed(() => totalFilled.value > 0)
</script>

<template>
  <div class="rounded-2xl border" style="border-color: var(--color-blue-100);">
    <!-- Header -->
    <button
      class="flex w-full items-center gap-2 px-4 py-3 text-sm font-bold transition-colors"
      style="color: var(--color-ink-700);"
      @click="isOpen = !isOpen"
    >
      📦 Atur Stok Awal <span class="text-xs font-semibold" style="color: var(--color-ink-500);">(opsional)</span>
      <span v-if="someFilled" class="ml-1 rounded-full px-2 py-0.5 text-[10px] font-bold text-white" style="background: var(--color-blue-500);">
        {{ totalFilled }}/{{ totalAll }}
      </span>
      <span class="ml-auto transition-transform" :class="isOpen ? 'rotate-180' : ''">▾</span>
    </button>

    <div v-if="isOpen" class="border-t px-4 pb-4 pt-3 space-y-3" style="border-color: var(--color-blue-100);">
      <!-- Description + quick actions -->
      <div class="flex items-center justify-between gap-2">
        <div class="text-xs font-semibold" style="color: var(--color-ink-500);">Sisa produksi kemarin? Isi stok biar dikurangi dari pembelian.</div>
        <button
          v-if="someFilled"
          class="shrink-0 rounded-lg px-2 py-1 text-[10px] font-bold"
          style="background: #FAD3D3; color: #B14343;"
          @click="clearAll"
        >↻ Reset semua</button>
      </div>

      <!-- Search bar -->
      <div class="relative">
        <span class="absolute left-3 top-1/2 -translate-y-1/2 text-sm">🔍</span>
        <input
          v-model="search"
          type="text"
          placeholder="Cari bahan..."
          class="w-full rounded-xl border px-8 py-2 text-sm font-semibold outline-none"
          style="border-color: var(--color-blue-200); color: var(--color-ink-900); background: white;"
        />
        <button
          v-if="search"
          class="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold"
          style="color: var(--color-ink-500);"
          @click="search = ''"
        >✕</button>
      </div>

      <!-- Collapse all / Expand all -->
      <div class="flex gap-2">
        <button
          class="rounded-lg px-2.5 py-1 text-[10px] font-bold"
          style="background: var(--color-blue-50); color: var(--color-blue-700);"
          @click="expandedCats = new Set(allCollapsed ? categories.map(c => c.id) : [])"
        >{{ allCollapsed ? '🔽 Buka semua' : '🔼 Tutup semua' }}</button>
      </div>

      <!-- Category groups -->
      <div class="space-y-2">
        <div
          v-for="cat in categories"
          :key="cat.id"
          class="rounded-xl border overflow-hidden transition-all"
          :style="{
            background: hasValue(cat.id) ? 'var(--color-blue-50)' : 'white',
            borderColor: hasValue(cat.id) ? 'var(--color-blue-200)' : 'var(--color-blue-100)',
          }"
        >
          <!-- Category header -->
          <button
            class="flex w-full items-center gap-2 px-3 py-2.5 text-left active:scale-[0.99]"
            @click="toggleCat(cat.id)"
          >
            <span class="text-lg">{{ cat.emoji }}</span>
            <span class="font-display text-sm font-bold" style="color: var(--color-ink-900);">{{ cat.name }}</span>
            <span
              class="rounded-full px-1.5 py-0.5 text-[10px] font-bold whitespace-nowrap"
              :style="{
                background: filledCount(cat.id) === totalCount(cat.id) ? 'var(--color-green-100)' : 'var(--color-cream-100)',
                color: filledCount(cat.id) === totalCount(cat.id) ? 'var(--color-green-700)' : 'var(--color-ink-500)',
              }"
            >{{ filledCount(cat.id) }}/{{ totalCount(cat.id) }}</span>

            <!-- Quick actions (visible when collapsed or expanded) -->
            <div class="ml-auto flex items-center gap-1" @click.stop>
              <button
                v-if="hasValue(cat.id)"
                class="rounded-lg px-1.5 py-0.5 text-[10px] font-bold"
                style="color: #B14343;"
                @click="clearCategory(cat.id)"
              >Kosongkan</button>
              <button
                v-if="!hasValue(cat.id) && expandedCats.has(cat.id)"
                class="rounded-lg px-1.5 py-0.5 text-[10px] font-bold"
                style="color: var(--color-blue-600);"
                @click="fillCategory(cat.id, 10)"
              >Isi 10</button>
              <span class="ml-1 text-xs transition-transform" :class="expandedCats.has(cat.id) ? 'rotate-180' : ''">▾</span>
            </div>
          </button>

          <!-- SKU rows (expanded) -->
          <div v-if="expandedCats.has(cat.id) && groupedSkus.get(cat.id)!.length > 0" class="border-t px-3 pb-2 pt-1" style="border-color: var(--color-blue-100);">
            <div
              v-for="sku in groupedSkus.get(cat.id)"
              :key="sku.id"
              class="flex items-center gap-2 py-1.5"
            >
              <span class="text-base w-6 text-center shrink-0">{{ e(sku.id) }}</span>
              <span class="flex-1 text-xs font-semibold leading-tight" style="color: var(--color-ink-700);">{{ sku.name }}</span>

              <!-- Stepper -->
              <div class="flex items-center gap-0.5">
                <button
                  class="flex h-8 w-8 items-center justify-center rounded-lg border text-sm font-bold transition-colors active:scale-90 disabled:opacity-30"
                  style="border-color: var(--color-blue-200); background: white; color: var(--color-ink-500);"
                  :disabled="invStore.getStock(sku.id) <= 0"
                  @click="dec(sku.id)"
                >−</button>
                <div class="relative">
                  <input
                    :value="invStore.getStock(sku.id)"
                    type="number"
                    inputmode="numeric"
                    class="h-8 w-14 rounded-lg border text-center font-display text-sm font-bold outline-none"
                    :style="{
                      borderColor: invStore.getStock(sku.id) > 0 ? 'var(--color-blue-300)' : 'var(--color-blue-100)',
                      color: invStore.getStock(sku.id) > 0 ? 'var(--color-blue-700)' : 'var(--color-ink-500)',
                    }"
                    @input="onInput(sku.id, $event)"
                  />
                </div>
                <button
                  class="flex h-8 w-8 items-center justify-center rounded-lg border text-sm font-bold text-white transition-colors active:scale-90"
                  style="background: var(--color-blue-500); border-color: var(--color-blue-500);"
                  @click="inc(sku.id)"
                >+</button>
              </div>

              <!-- Quick 10-step button -->
              <button
                class="flex h-8 items-center rounded-lg border px-2 text-[10px] font-bold transition-colors active:scale-90"
                style="border-color: var(--color-blue-200); color: var(--color-blue-600); background: white;"
                @click="inc10(sku.id)"
              >+10</button>
            </div>
          </div>

          <!-- Empty state -->
          <div v-else-if="expandedCats.has(cat.id) && groupedSkus.get(cat.id)!.length === 0" class="px-3 pb-2 pt-1 text-center text-[10px] font-semibold" style="color: var(--color-ink-500);">
            (kosong)
          </div>
        </div>
      </div>

      <!-- Footer summary -->
      <div v-if="someFilled" class="flex items-center justify-between rounded-xl border px-3 py-2" style="border-color: var(--color-blue-200); background: white;">
        <span class="text-xs font-semibold" style="color: var(--color-ink-500);">Total terisi</span>
        <span class="font-display text-sm font-bold" style="color: var(--color-blue-700);">
          {{ totalFilled }} / {{ totalAll }} bahan
        </span>
      </div>
    </div>
  </div>
</template>
