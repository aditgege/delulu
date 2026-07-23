export default defineEventHandler(async (event) => {
  const sql = useDb()
  const body = await readBody(event)
  const { id, name, price, contents } = body

  if (!id || !name || !price || !contents?.length) {
    throw createError({ statusCode: 400, message: 'id, name, price, contents required' })
  }

  await sql`INSERT INTO supplier_mixes (id, name, price) VALUES (${id}, ${name}, ${price})`

  for (const c of contents) {
    await sql`INSERT INTO mix_contents (mix_id, menu_id, qty) VALUES (${id}, ${c.menuId}, ${c.qty})`
  }

  return { status: 'ok' }
})
