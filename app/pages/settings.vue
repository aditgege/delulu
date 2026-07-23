<script setup lang="ts">
definePageMeta({ title: 'Pengaturan' })

const links = [
  { icon: '📦', title: 'Master Data', desc: 'Bahan baku, produk, varian, dan komposisi BOM', to: '/master-data', color: 'from-blue-400 to-blue-600' },
  { icon: '🏭', title: 'Supplier', desc: 'Harga mix, pack, dan konfigurasi supplier', to: '/master-data/supplier', color: 'from-orange-400 to-orange-600' },
]
</script>

<template>
  <div class="slide-up space-y-4">
    <div class="flex items-center gap-2">
      <button class="rounded-xl px-3 py-2 text-xs font-bold text-white active:scale-90" style="background: var(--color-blue-500);" @click="navigateTo('/')">← Kembali</button>
      <span class="text-xs font-semibold" style="color: var(--color-ink-500);">/ ⚙️ Pengaturan</span>
    </div>

    <div class="rounded-2xl border p-4" style="background: linear-gradient(135deg, #1E40AF, #3B82F6); color: white; border: none;">
      <div class="font-display text-lg font-bold">⚙️ Pengaturan</div>
      <div class="mt-1 text-xs font-semibold opacity-80">Navigasi data master dan konfigurasi aplikasi.</div>
    </div>

    <!-- Navigation Cards -->
    <div class="grid gap-3">
      <button v-for="l in links" :key="l.to"
        @click="navigateTo(l.to)"
        class="rounded-2xl border bg-white p-4 text-left active:scale-[0.98] transition-all"
        style="border-color: var(--color-blue-100);"
      >
        <div class="flex items-center gap-4">
          <div class="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-2xl"
            :style="{ background: `linear-gradient(135deg, ${l.color.replace('from-', '').split(' ')[0]}, ${l.color.replace('to-', '').split(' ')[0]})`, opacity: 0.15 }">
          </div>
          <div class="flex-1 min-w-0">
            <div class="font-display text-base font-bold" style="color: var(--color-ink-900);">{{ l.icon }} {{ l.title }}</div>
            <div class="text-xs font-semibold mt-0.5" style="color: var(--color-ink-500);">{{ l.desc }}</div>
          </div>
          <span class="text-lg" style="color: var(--color-ink-300);">→</span>
        </div>
      </button>
    </div>
  </div>
</template>
