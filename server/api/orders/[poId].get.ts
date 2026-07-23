
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
      shippingFee: c.shipping_fee ?? 0,
      discount: c.discount ?? 0,
      paid: c.paid,
      shipped: c.shipped,
      items: items.map((i: any) => ({
        productId: i.product_id,
        variant: i.variant,
        qty: i.qty,
        unitPrice: i.unit_price,
      })),
    })
  }
  
  return { order, customers: customersWithItems }
})
