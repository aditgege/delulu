export default defineEventHandler(async (event) => {
  const sql = useDb()
  const body = await readBody(event)
  for (const [key, value] of Object.entries(body)) {
    await sql`INSERT INTO app_config (key, value) VALUES (${key}, ${String(value)}) ON CONFLICT (key) DO UPDATE SET value = ${String(value)}`
  }
  return { status: 'ok' }
})
