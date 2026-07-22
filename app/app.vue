<template>
  <UApp>
    <div class="min-h-screen" style="background: linear-gradient(180deg, var(--color-cream-50) 0%, var(--color-blue-50) 60%, var(--color-blue-100) 100%);">
      <!-- Top bar -->
      <header
        class="sticky top-0 z-30 border-b px-4 py-3"
        style="background: rgba(255, 251, 240, 0.85); backdrop-filter: saturate(180%) blur(16px); border-color: rgba(168, 213, 245, 0.25);"
      >
        <div class="mx-auto flex max-w-lg items-center justify-between">
          <div class="flex items-center gap-2.5">
            <div
              class="flex h-9 w-9 items-center justify-center rounded-xl text-lg"
              style="background: linear-gradient(135deg, var(--color-blue-300), var(--color-blue-500)); box-shadow: 0 4px 12px rgba(79, 168, 224, 0.3);"
            >🧊</div>
            <div>
              <h1 class="font-display text-xl font-bold" style="color: var(--color-ink-900);">StokCeria</h1>
              <div class="text-[11px] font-semibold" style="color: var(--color-ink-500); margin-top: -2px;">Belanja cerdas, untung maksimal ✨</div>
            </div>
          </div>
          <div
            class="text-xs font-bold"
            style="padding: 6px 12px; border-radius: 999px; background: var(--color-cream-100); color: var(--color-ink-700); border: 1.5px solid var(--color-cream-200);"
          >{{ todayStr }}</div>
        </div>
      </header>

      <main class="mx-auto max-w-lg px-4 pb-24 pt-4">
        <NuxtRouteAnnouncer />
        <NuxtPage />
      </main>

      <!-- Bottom Nav -->
      <nav
        class="fixed bottom-0 left-1/2 z-50 w-full max-w-lg -translate-x-1/2 border-t px-2 py-1.5"
        style="background: rgba(255, 255, 255, 0.92); backdrop-filter: saturate(180%) blur(16px); border-color: var(--color-blue-100);"
      >
        <div class="flex justify-around">
          <button
            v-for="tab in tabs"
            :key="tab.id"
            class="nav-item"
            :class="{ active: currentTab === tab.id }"
            @click="navigateTo(tab.to)"
          >
            <span class="nav-emoji">{{ tab.emoji }}</span>
            <span class="nav-label">{{ tab.label }}</span>
          </button>
        </div>
      </nav>
    </div>
  </UApp>
</template>

<script setup lang="ts">
const route = useRoute()

const tabs = [
  { id: 'order', label: 'Pesanan', emoji: '🛒', to: '/' },
  { id: 'results', label: 'Hasil', emoji: '📊', to: '/rekomendasi' },
  { id: 'manage', label: 'Stok & Atur', emoji: '⚙️', to: '/kelola-paket' },
]

const currentTab = computed(() => {
  const path = route.path
  if (path === '/') return 'order'
  if (path === '/rekomendasi') return 'results'
  return 'manage'
})

const todayStr = new Date().toLocaleDateString('id-ID', {
  weekday: 'short', day: 'numeric', month: 'short',
})
</script>

<style>
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Fredoka:wght@500;600;700&display=swap');

.nav-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 8px 6px;
  border-radius: 14px;
  background: transparent;
  border: none;
  color: var(--color-ink-500);
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 10px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s;
}
.nav-item .nav-emoji { font-size: 22px; line-height: 1; transition: transform 0.2s; }
.nav-item.active { color: var(--color-blue-700); background: var(--color-blue-50); }
.nav-item.active .nav-emoji { transform: scale(1.1); }
.nav-item:active .nav-emoji { transform: scale(0.9); }

.page-enter-active,
.page-leave-active { transition: all 0.25s ease-out; }
.page-enter-from { opacity: 0; transform: translateY(16px); }
.page-leave-to { opacity: 0; transform: translateY(-16px); }
</style>
