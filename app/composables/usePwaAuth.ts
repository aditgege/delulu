export function usePwaAuth() {
  const { data, refresh } = useFetch('/api/auth-check', {
    watch: false,
    ...{ immediate: true },
  })

  const isAuthenticated = computed(() => data.value?.authenticated === true)

  async function login(pin: string) {
    try {
      await $fetch('/api/auth', { method: 'PUT', body: { pin } })
      await refresh()
      return true
    } catch {
      return false
    }
  }

  return { isAuthenticated, login, refresh }
}
