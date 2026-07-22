export default defineEventHandler(async (event) => {
  const sql = useDb()
  const id = getRouterParam(event, 'id')
  await sql`DELETE FROM cara_masak WHERE id = ${id}`
  return { status: 'ok' }
})
