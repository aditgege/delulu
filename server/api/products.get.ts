
export default defineEventHandler(async (event) => {
  const sql = useDb()
  const rows = await sql`SELECT * FROM products ORDER BY type, name`
  return rows
})
