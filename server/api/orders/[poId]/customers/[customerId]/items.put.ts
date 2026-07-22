
export default defineEventHandler(async (event) => {
  const sql = useDb()
  const customerId = getRouterParam(event, 'customerId')
  const { items } = await readBody(event)

  // Replace all items for this customer
  await sql`DELETE FROM order_items WHERE customer_id = ${customerId}`
  
  for (const item of items) {
    await sql`
      INSERT INTO order_items (customer_id, package_id, qty, extra_chili_oil)
      VALUES (${customerId}, ${item.packageId}, ${item.qty || 0}, ${item.extraChiliOil || 0})
    `
  }
  
  return { status: 'ok' }
})
