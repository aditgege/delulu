export default defineEventHandler(async () => {
  const sql = useDb()
  return await sql`SELECT * FROM supplier_packs ORDER BY menu_id, label`
})