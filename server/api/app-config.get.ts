export default defineEventHandler(async () => {
  const sql = useDb()
  const rows = await sql`SELECT key, value FROM app_config`
  const config: Record<string, string> = {}
  for (const row of rows) config[row.key] = row.value
  return config
})
