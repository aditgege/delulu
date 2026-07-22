
export default defineEventHandler(async (event) => {
  const sql = useDb()
  const customerId = getRouterParam(event, 'customerId')
  const { shippingFee } = await readBody(event)

  await sql`UPDATE order_customers SET shipping_fee = ${Math.max(0, Math.floor(shippingFee || 0))} WHERE id = ${customerId}`
  return { status: 'ok' }
})
