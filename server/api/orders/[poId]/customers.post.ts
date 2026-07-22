
export default defineEventHandler(async (event) => {
  const sql = useDb()
  const poId = getRouterParam(event, 'poId')
  const { id, name } = await readBody(event)
  
  await sql`INSERT INTO order_customers (id, po_id, name) VALUES (${id}, ${poId}, ${name})`
  return { status: 'ok' }
})
