export default defineNuxtRouteMiddleware(async (to) => {
  if (to.path === '/login') return

  try {
    const { authenticated } = await $fetch('/api/auth-check')
    if (!authenticated) return navigateTo('/login')
  } catch {
    return navigateTo('/login')
  }
})
