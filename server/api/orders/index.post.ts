
export default defineEventHandler(async (event) => {
  const sql = useDb()
  const { id, label, createdAt } = await readBody(event)
  await sql`INSERT INTO purchase_orders (id, label, created_at) VALUES (${id}, ${label}, ${createdAt})`
  return { status: 'ok' }
})
