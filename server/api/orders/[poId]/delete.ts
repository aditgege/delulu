
export default defineEventHandler(async (event) => {
  const sql = useDb()
  const poId = getRouterParam(event, 'poId')
  // Cascade deletes customers + items
  await sql`DELETE FROM purchase_orders WHERE id = ${poId}`
  return { status: 'ok' }
})
