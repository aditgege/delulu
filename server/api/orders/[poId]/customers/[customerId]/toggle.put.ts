
export default defineEventHandler(async (event) => {
  const sql = useDb()
  const customerId = getRouterParam(event, 'customerId')
  const { field } = await readBody(event) // 'paid' or 'shipped'
  
  if (field === 'paid') {
    await sql`
      UPDATE order_customers SET paid = NOT paid WHERE id = ${customerId}
    `
  } else if (field === 'shipped') {
    await sql`
      UPDATE order_customers SET shipped = NOT shipped WHERE id = ${customerId}
    `
  }
  
  return { status: 'ok' }
})
