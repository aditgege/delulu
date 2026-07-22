
export default defineEventHandler(async (event) => {
  const sql = useDb()
  const poId = getRouterParam(event, 'poId')
  await sql`UPDATE purchase_orders SET closed = true WHERE id = ${poId}`
  return { status: 'ok' }
})
