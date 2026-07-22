export default defineEventHandler(async (event) => {
  const sql = useDb()
  const body = await readBody(event)
  const { menuId, qty } = body

  await sql`
    UPDATE inventory SET qty_on_hand = qty_on_hand - ${qty} 
    WHERE menu_id = ${menuId}
  `
  return { status: 'ok' }
})