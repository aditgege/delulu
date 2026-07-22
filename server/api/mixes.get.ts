
export default defineEventHandler(async () => {
  const sql = useDb()
  const mixes = await sql`SELECT * FROM supplier_mixes ORDER BY name`
  const contents = await sql`SELECT * FROM mix_contents ORDER BY mix_id, sku_id`
  
  return mixes.map((mix: any) => ({
    id: mix.id,
    name: mix.name,
    price: mix.price,
    contents: contents.filter((c: any) => c.mix_id === mix.id).map((c: any) => ({
      skuId: c.sku_id,
      qty: c.qty,
    })),
  }))
})
