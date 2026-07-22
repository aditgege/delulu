export default defineEventHandler(async (event) => {
  const sql = useDb()
  const id = getRouterParam(event, 'id')
  await sql`DELETE FROM menus WHERE id = ${id}`
  return { status: 'ok' }
})
