
export default defineEventHandler(async () => {
  const sql = useDb()
  return await sql`SELECT * FROM purchase_orders ORDER BY created_at DESC`
})
