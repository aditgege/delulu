import { menuSchema } from '../../app/utils/validation'

export default defineEventHandler(async (event) => {
  const sql = useDb()
  const { id, name, unit, category } = await validateBody(event, menuSchema)
  await sql`INSERT INTO menus (id, name, unit, category) VALUES (${id}, ${name}, ${unit}, ${category || 'dimsum'})`
  return { status: 'ok' }
})
