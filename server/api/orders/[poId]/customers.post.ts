
export default defineEventHandler(async (event) => {
  const sql = useDb()
  const poId = getRouterParam(event, 'poId')
  const { id, name, discount } = await readBody(event)
  
  await sql`INSERT INTO order_customers (id, po_id, name, discount) VALUES (${id}, ${poId}, ${name}, ${Math.max(0, Math.floor(discount || 0))})`
  return { status: 'ok' }
})
