import { supplierMixSchema } from '../../app/utils/validation'

export default defineEventHandler(async (event) => {
  const sql = useDb()
  const { id, name, price, contents } = await validateBody(event, supplierMixSchema)

  await sql`INSERT INTO supplier_mixes (id, name, price) VALUES (${id}, ${name}, ${price})`

  for (const c of contents) {
    await sql`INSERT INTO mix_contents (mix_id, menu_id, qty) VALUES (${id}, ${c.menuId}, ${c.qty})`
  }

  return { status: 'ok' }
})
