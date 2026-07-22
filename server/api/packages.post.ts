export default defineEventHandler(async (event) => {
  const sql = useDb()
  const body = await readBody(event)
  const { id, name, price, bom } = body

  await sql`INSERT INTO packages (id, name, price) VALUES (${id}, ${name}, ${price})`
  
  for (const line of bom || []) {
    await sql`INSERT INTO package_bom (package_id, menu_id, qty) VALUES (${id}, ${line.menuId}, ${line.qty})`
  }

  return { status: 'ok', id }
})