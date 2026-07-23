import { z } from 'zod'

const packPriceSchema = z.object({
  id: z.number().int().positive(),
  price: z.number().int().min(0),
})

export default defineEventHandler(async (event) => {
  const sql = useDb()
  const body = await readBody(event)
  const result = packPriceSchema.safeParse(body)
  if (!result.success) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Validation Error',
      message: result.error.errors.map((e: { path: (string | number)[]; message: string }) => `${e.path.join('.')}: ${e.message}`).join('; '),
    })
  }
  const { id, price } = result.data
  await sql`UPDATE supplier_packs SET price = ${price} WHERE id = ${id}`
  return { status: 'ok' }
})
