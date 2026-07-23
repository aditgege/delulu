import { z } from 'zod'

const mixPriceSchema = z.object({
  id: z.string().min(1),
  price: z.number().int().min(0),
})

export default defineEventHandler(async (event) => {
  const sql = useDb()
  const body = await readBody(event)
  const result = mixPriceSchema.safeParse(body)
  if (!result.success) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Validation Error',
      message: result.error.errors.map((e: { path: (string | number)[]; message: string }) => `${e.path.join('.')}: ${e.message}`).join('; '),
    })
  }
  const { id, price } = result.data
  await sql`UPDATE supplier_mixes SET price = ${price} WHERE id = ${id}`
  return { status: 'ok' }
})
