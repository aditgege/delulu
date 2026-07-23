import { productSchema } from '../../app/utils/validation'

export default defineEventHandler(async (event) => {
  const sql = useDb()
  const body = await readBody(event)
  const mapped = { ...body, base_price: body.basePrice ?? 0 }
  const result = productSchema.safeParse(mapped)
  if (!result.success) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Validation Error',
      message: result.error.errors.map((e: { path: (string | number)[]; message: string }) => `${e.path.join('.')}: ${e.message}`).join('; '),
    })
  }
  const { id, name, unit, type, base_price } = result.data
  const hpp = body.hpp ?? 0
  await sql`UPDATE products SET name = ${name}, unit = ${unit}, type = ${type}, base_price = ${base_price}, hpp = ${hpp} WHERE id = ${id}`
  return { status: 'ok' }
})
