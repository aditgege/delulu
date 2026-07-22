export default defineEventHandler(async () => {
  const sql = useDb()
  return await sql`SELECT * FROM cara_masak ORDER BY id`
})
