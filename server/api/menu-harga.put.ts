export default defineEventHandler(async (event) => {
  const sql = useDb()
  const { menu_id, cara_masak_id, harga_porsi } = await readBody(event)
  await sql`INSERT INTO menu_cara_masak (menu_id, cara_masak_id, harga_porsi) VALUES (${menu_id}, ${cara_masak_id}, ${harga_porsi}) ON CONFLICT (menu_id, cara_masak_id) DO UPDATE SET harga_porsi = ${harga_porsi}`
  return { status: 'ok' }
})