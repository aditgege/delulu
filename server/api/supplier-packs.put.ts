export default defineEventHandler(async (event) => {
  const sql = useDb()
  const body = await readBody(event)
  const { id, price } = body
  await sql`UPDATE supplier_packs SET price = ${price} WHERE id = ${id}`
  return { status: 'ok' }
})
