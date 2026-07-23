export default defineEventHandler(async (event) => {
  const sql = useDb()
  const customerId = getRouterParam(event, 'customerId')
  const { items } = await readBody(event)

  // Write to unified order_items
  await sql`DELETE FROM order_items WHERE customer_id = ${customerId} AND variant IN ('Bakar','Kukus')`
  for (const item of items) {
    const unitPrice = item.caraMasak === 'bakar' ? 18000 : 16000
    if (item.jumlahPorsi > 0) {
      await sql`INSERT INTO order_items (customer_id, product_id, variant, qty, unit_price)
        VALUES (${customerId}, ${item.menuId}, ${item.caraMasak}, ${item.jumlahPorsi}, ${unitPrice})`
    }
  }

  return { status: 'ok' }
})
