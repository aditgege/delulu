export default defineEventHandler(async (event) => {
  const sql = useDb()
  const { id, name, unit, category } = await readBody(event)
  await sql`UPDATE menus SET name = ${name}, unit = ${unit || 'pcs'}, category = ${category || 'dimsum'} WHERE id = ${id}`
  return { status: 'ok' }
})
