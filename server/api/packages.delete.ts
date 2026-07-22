
export default defineEventHandler(async (event) => {
  const sql = useDb()
  const { id } = await readBody(event)
  await sql`DELETE FROM packages WHERE id = ${id}`
  return { status: 'ok' }
})
