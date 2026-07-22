export default defineEventHandler(async (event) => {
  const sql = useDb()
  const customerId = getRouterParam(event, 'customerId')
  const { items } = await readBody(event)

  // Ensure table exists (self-healing)
  await sql.query('CREATE TABLE IF NOT EXISTS order_bakar_kukus_items (id SERIAL PRIMARY KEY, customer_id TEXT NOT NULL REFERENCES order_customers(id) ON DELETE CASCADE, menu_id TEXT NOT NULL, cara_masak TEXT NOT NULL, jumlah_porsi INTEGER NOT NULL DEFAULT 0)')

  // Replace all bakar/kukus items for this customer
  await sql.query('DELETE FROM order_bakar_kukus_items WHERE customer_id = $1', [customerId])

  for (const item of items) {
    await sql.query('INSERT INTO order_bakar_kukus_items (customer_id, menu_id, cara_masak, jumlah_porsi) VALUES ($1, $2, $3, $4)', [customerId, item.menuId, item.caraMasak, item.jumlahPorsi || 0])
  }

  return { status: 'ok' }
})
