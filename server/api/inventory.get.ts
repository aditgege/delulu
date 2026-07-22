
export default defineEventHandler(async () => {
  const sql = useDb()
  return await sql`SELECT * FROM inventory ORDER BY sku_id`
})
