
export default defineEventHandler(async (event) => {
  const sql = useDb()
  const rows = await sql`SELECT * FROM product_compositions ORDER BY product_id, menu_id`
  return rows
})
