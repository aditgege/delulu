import { z } from 'zod'

const compositionRowSchema = z.object({
  menuId: z.string().min(1),
  qty: z.number().int().min(1),
})

const compositionUpdateSchema = z.object({
  productId: z.string().min(1),
  compositions: z.array(compositionRowSchema).min(1),
})

export default defineEventHandler(async (event) => {
  const sql = useDb()
  const body = await readBody(event)
  const result = compositionUpdateSchema.safeParse(body)
  if (!result.success) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Validation Error',
      message: result.error.errors.map((e: { path: (string | number)[]; message: string }) => `${e.path.join('.')}: ${e.message}`).join('; '),
    })
  }
  const { productId, compositions } = result.data
  await sql`DELETE FROM product_compositions WHERE product_id = ${productId}`
  for (const c of compositions) {
    await sql`INSERT INTO product_compositions (product_id, menu_id, qty) VALUES (${productId}, ${c.menuId}, ${c.qty})`
  }
  return { status: 'ok' }
})
