
export default defineEventHandler(async (event) => {
  const sql = useDb()
  const poId = getRouterParam(event, 'poId')
  
  const [order] = await sql`SELECT * FROM purchase_orders WHERE id = ${poId}`
  if (!order) return { order: null, customers: [] }
  
  const customers = await sql`SELECT * FROM order_customers WHERE po_id = ${poId} ORDER BY id`
  
  const customersWithItems = []
  for (const c of customers) {
    const items = await sql`SELECT * FROM order_items WHERE customer_id = ${c.id}`
    customersWithItems.push({
      id: c.id,
      name: c.name,
      paid: c.paid,
      shipped: c.shipped,
      items: items.map((i: any) => ({
        packageId: i.package_id,
        qty: i.qty,
        extraChiliOil: i.extra_chili_oil,
      })),
    })
  }
  
  return { order, customers: customersWithItems }
})
