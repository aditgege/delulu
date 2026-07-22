
export default defineEventHandler(async () => {
  const sql = useDb()
  await sql`UPDATE inventory SET qty_on_hand = 0`
  return { status: 'ok' }
})
