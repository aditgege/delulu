export default defineEventHandler(async (event) => {
  const cookie = getCookie(event, 'delulul_auth')
  return { authenticated: cookie === 'authenticated' }
})
