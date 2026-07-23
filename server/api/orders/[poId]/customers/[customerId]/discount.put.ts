
export default defineEventHandler(async (event) => {
  const sql = useDb()
  const customerId = getRouterParam(event, 'customerId')
  const { discount } = await readBody(event)

  await sql`UPDATE order_customers SET discount = ${Math.max(0, Math.floor(discount || 0))} WHERE id = ${customerId}`
  return { status: 'ok' }
})
