
export default defineEventHandler(async (event) => {
  const sql = useDb()
  const body = await readBody(event)
  const { skuId, qty } = body

  await sql`
    UPDATE inventory SET qty_on_hand = qty_on_hand - ${qty} 
    WHERE sku_id = ${skuId}
  `
  return { status: 'ok' }
})
