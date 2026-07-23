import { supplierPackSchema } from '../../app/utils/validation'

export default defineEventHandler(async (event) => {
  const sql = useDb()
  const body = await readBody(event)
  const mapped = { menu_id: body.menuId, label: body.label, size_pcs: body.sizePcs, price: body.price }
  const result = supplierPackSchema.safeParse(mapped)
  if (!result.success) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Validation Error',
      message: result.error.errors.map((e: { path: (string | number)[]; message: string }) => `${e.path.join('.')}: ${e.message}`).join('; '),
    })
  }
  const { menu_id, label, size_pcs, price } = result.data

  const [row] = await sql`
    INSERT INTO supplier_packs (menu_id, label, size_pcs, price)
    VALUES (${menu_id}, ${label}, ${size_pcs}, ${price})
    RETURNING id
  `

  return { status: 'ok', id: row.id }
})
