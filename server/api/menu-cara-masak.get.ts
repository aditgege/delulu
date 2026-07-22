export default defineEventHandler(async () => {
  const sql = useDb()
  return await sql`SELECT menu_id AS "menuId", cara_masak_id AS "caraMasakId", harga_porsi AS "hargaPorsi" FROM menu_cara_masak ORDER BY menu_id, cara_masak_id`
})
