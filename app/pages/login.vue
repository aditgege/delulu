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
  <div class="flex min-h-screen items-center justify-center bg-neutral-950 px-4">
    <div class="w-full max-w-sm">
      <div class="mb-8 text-center">
        <div class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-purple-600 text-2xl font-bold text-white">
          D
        </div>
        <h1 class="text-xl font-bold text-white">Delulul</h1>
        <p class="mt-1 text-sm text-neutral-400">Masukkan PIN untuk melanjutkan</p>
      </div>

      <form @submit.prevent="submit" class="space-y-4">
        <input
          v-model="pin"
          type="password"
          inputmode="numeric"
          maxlength="6"
          placeholder="****"
          class="w-full rounded-lg border border-neutral-700 bg-neutral-900 px-4 py-3 text-center text-2xl tracking-[0.5em] text-white placeholder-neutral-600 outline-none focus:border-purple-500"
          autofocus
        />
        <p v-if="error" class="text-center text-sm text-red-400">{{ error }}</p>
        <button
          type="submit"
          :disabled="loading || pin.length < 4"
          class="w-full rounded-lg bg-purple-600 py-3 font-semibold text-white transition hover:bg-purple-500 disabled:opacity-50"
        >
          {{ loading ? 'Memeriksa...' : 'Masuk' }}
        </button>
      </form>
    </div>
  </div>
</template>
