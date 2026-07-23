
export default defineEventHandler(async (event) => {
  const sql = useDb()
  const rows = await sql`SELECT * FROM product_variants ORDER BY product_id, name`
  return rows
})
