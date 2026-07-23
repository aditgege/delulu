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
              <h1 class="font-display text-xl font-bold" style="color: var(--color-ink-900);">Delulu</h1>
              <div class="text-[11px] font-semibold" style="color: var(--color-ink-500); margin-top: -2px;">Belanja cerdas, untung maksimal ✨</div>
            </div>
          </div>
          <div
            class="text-xs font-bold"
            style="padding: 6px 12px; border-radius: 999px; background: var(--color-cream-100); color: var(--color-ink-700); border: 1.5px solid var(--color-cream-200);"
          >{{ todayStr }}</div>
        </div>
      </header>

      <main class="mx-auto max-w-lg px-4 pb-8 pt-4">
        <NuxtRouteAnnouncer />
        <NuxtPage />
      </main>
    </div>
  </UApp>
</template>

<script setup lang="ts">
const todayStr = new Date().toLocaleDateString('id-ID', {
  weekday: 'short', day: 'numeric', month: 'short',
})
</script>

<style>
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Fredoka:wght@500;600;700&display=swap');

.page-enter-active,
.page-leave-active { transition: all 0.25s ease-out; }
.page-enter-from { opacity: 0; transform: translateY(16px); }
.page-leave-to { opacity: 0; transform: translateY(-16px); }
</style>
