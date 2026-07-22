export default defineEventHandler(async (event) => {
  const sql = useDb()
  const body = await readBody(event)
  const { entries } = body // [{ menuId, qtyOnHand }]

  for (const entry of entries) {
    await sql`
      INSERT INTO inventory (menu_id, qty_on_hand) 
      VALUES (${entry.menuId}, ${entry.qtyOnHand})
      ON CONFLICT (menu_id) DO UPDATE SET qty_on_hand = ${entry.qtyOnHand}
    `
  }
  return { status: 'ok' }
})