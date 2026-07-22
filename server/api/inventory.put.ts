
export default defineEventHandler(async (event) => {
  const sql = useDb()
  const body = await readBody(event)
  const { entries } = body // [{ skuId, qtyOnHand }]

  for (const entry of entries) {
    await sql`
      INSERT INTO inventory (sku_id, qty_on_hand) 
      VALUES (${entry.skuId}, ${entry.qtyOnHand})
      ON CONFLICT (sku_id) DO UPDATE SET qty_on_hand = ${entry.qtyOnHand}
    `
  }
  return { status: 'ok' }
})
