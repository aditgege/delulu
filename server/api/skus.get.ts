
export default defineEventHandler(async () => {
  const sql = useDb()
  return await sql`SELECT * FROM skus ORDER BY category, name`
})
