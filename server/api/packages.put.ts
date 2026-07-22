export default defineEventHandler(async (event) => {
  const sql = useDb()
  const body = await readBody(event)
  const { id, name, price, bom } = body

  await sql`UPDATE packages SET name = ${name}, price = ${price} WHERE id = ${id}`
  await sql`DELETE FROM package_bom WHERE package_id = ${id}`
  
  for (const line of bom || []) {
    await sql`INSERT INTO package_bom (package_id, menu_id, qty) VALUES (${id}, ${line.menuId}, ${line.qty})`
  }

  return { status: 'ok' }
})