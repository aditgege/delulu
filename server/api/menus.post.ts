export default defineEventHandler(async (event) => {
  const sql = useDb()
  const { id, name, unit, category } = await readBody(event)
  await sql`INSERT INTO menus (id, name, unit, category) VALUES (${id}, ${name}, ${unit || 'pcs'}, ${category || 'dimsum'})`
  return { status: 'ok' }
})
