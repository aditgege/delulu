export default defineEventHandler(async () => {
  const sql = useDb()
  return await sql`SELECT * FROM menus ORDER BY category, name`
})
