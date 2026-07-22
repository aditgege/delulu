export default defineEventHandler(async (event) => {
  const { pin } = await readBody(event)
  const expected = process.env.APP_PIN || '1234'
  
  if (pin === expected) {
    setCookie(event, 'delulul_auth', 'authenticated', {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7, // 7 days
    })
    return { status: 'ok' }
  }
  
  throw createError({ statusCode: 401, statusMessage: 'Invalid PIN' })
})
