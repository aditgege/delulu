
export default defineEventHandler(async (event) => {
  const sql = useDb()
  const customerId = getRouterParam(event, 'customerId')
  const { items } = await readBody(event)
  
  // Replace all items for this customer
  await sql`DELETE FROM order_items WHERE customer_id = ${customerId}`
  
  for (const item of items) {
    if (item.qty > 0) {
      await sql`INSERT INTO order_items (customer_id, product_id, variant, qty, unit_price)
        VALUES (${customerId}, ${item.productId}, ${item.variant ?? null}, ${item.qty}, ${item.unitPrice ?? 0})`
    }
  }
  
  return { status: 'ok' }
})
