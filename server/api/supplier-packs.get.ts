
export default defineEventHandler(async () => {
  const sql = useDb()
  return await sql`SELECT * FROM supplier_packs ORDER BY sku_id, label`
})
