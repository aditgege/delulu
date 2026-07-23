import { menuSchema } from '../../app/utils/validation'

export default defineEventHandler(async (event) => {
  const sql = useDb()
  const { id, name, unit, category } = await validateBody(event, menuSchema)
  await sql`UPDATE menus SET name = ${name}, unit = ${unit}, category = ${category || 'dimsum'} WHERE id = ${id}`
  return { status: 'ok' }
})
