export default defineEventHandler(async () => {
  const sql = useDb()
  return await sql`SELECT m.id AS menu_id, m.name AS menu_nama, cm.id AS cara_masak_id, cm.label AS cara_masak_label, mcm.harga_porsi FROM menus m CROSS JOIN cara_masak cm LEFT JOIN menu_cara_masak mcm ON mcm.menu_id = m.id AND mcm.cara_masak_id = cm.id ORDER BY m.name, cm.id`
})