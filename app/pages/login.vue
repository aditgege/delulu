<script setup lang="ts">
definePageMeta({ layout: false })
const { login } = usePwaAuth()
const router = useRouter()
const pin = ref('')
const error = ref('')
const loading = ref(false)

async function submit() {
  if (pin.value.length < 4) return
  loading.value = true
  error.value = ''
  const ok = await login(pin.value)
  loading.value = false
  if (ok) {
    router.push('/')
  } else {
    error.value = 'PIN salah'
    pin.value = ''
  }
}
</script>

<template>
  <div class="slide-up flex min-h-screen items-center justify-center px-4">
    <div class="w-full max-w-sm">
      <div class="rounded-2xl border p-6 text-center" style="background: var(--color-cream-100); border-color: var(--color-cream-200);">
        <div class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl text-2xl" style="background: linear-gradient(135deg, var(--color-blue-300), var(--color-blue-500)); box-shadow: 0 4px 12px rgba(79, 168, 224, 0.3);">🧊</div>
        <h1 class="font-display text-xl font-bold" style="color: var(--color-ink-900);">Delulu</h1>
        <p class="mt-1 text-sm font-semibold" style="color: var(--color-ink-500);">Masukkan PIN untuk melanjutkan</p>
      </div>

      <form @submit.prevent="submit" class="mt-4 space-y-4">
        <div class="rounded-2xl border bg-white px-4 py-3" style="border-color: var(--color-blue-100);">
          <input
            v-model="pin"
            type="password"
            inputmode="numeric"
            maxlength="6"
            placeholder="****"
            class="w-full text-center text-2xl tracking-[0.5em] font-semibold outline-none placeholder-neutral-300"
            style="color: var(--color-ink-900);"
            autofocus
          />
        </div>
        <p v-if="error" class="text-center text-sm font-semibold" style="color: var(--color-pink-500);">{{ error }}</p>
        <button
          type="submit"
          :disabled="loading || pin.length < 4"
          class="w-full rounded-2xl py-4 font-display text-base font-semibold text-white shadow-lg transition-transform active:scale-[0.98] disabled:opacity-50"
          style="background: linear-gradient(135deg, var(--color-blue-400), var(--color-blue-600)); box-shadow: 0 8px 24px rgba(46, 139, 192, 0.35);"
        >
          {{ loading ? 'Memeriksa...' : 'Masuk' }}
        </button>
      </form>
    </div>
  </div>
</template>
