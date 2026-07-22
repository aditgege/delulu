export default defineEventHandler(async (event) => {
  const path = getRequestPath(event)

  // Only protect API routes
  if (!path.startsWith('/api/')) return

  // Skip auth-check and auth endpoints themselves
  if (
    path === '/api/auth-check' ||
    path === '/api/auth' ||
    path === '/api/_migrate' ||
    path.startsWith('/api/_')
  ) return

  const cookie = getCookie(event, 'delulul_auth')
  if (cookie !== 'authenticated') {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }
})
