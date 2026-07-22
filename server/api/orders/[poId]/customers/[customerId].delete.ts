
export default defineEventHandler(async (event) => {
  const sql = useDb()
  const customerId = getRouterParam(event, 'customerId')
  await sql`DELETE FROM order_customers WHERE id = ${customerId}`
  return { status: 'ok' }
})
