export default defineEventHandler(async (event) => {
  const sql = useDb()
  const body = await readBody(event)
  const { menuId, label, sizePcs, price } = body

  if (!menuId || !label || !sizePcs || !price) {
    throw createError({ statusCode: 400, message: 'menuId, label, sizePcs, price required' })
  }

  const [row] = await sql`
    INSERT INTO supplier_packs (menu_id, label, size_pcs, price)
    VALUES (${menuId}, ${label}, ${sizePcs}, ${price})
    RETURNING id
  `

  return { status: 'ok', id: row.id }
})
