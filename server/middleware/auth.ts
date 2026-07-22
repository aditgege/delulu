export default defineEventHandler(async (event) => {
  // Skip auth for these paths
  const path = getRequestPath(event)
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
