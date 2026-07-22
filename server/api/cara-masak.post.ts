export default defineEventHandler(async (event) => {
  const sql = useDb()
  const { id, label } = await readBody(event)
  await sql`INSERT INTO cara_masak (id, label) VALUES (${id}, ${label}) ON CONFLICT (id) DO NOTHING`
  return { status: 'ok' }
})
