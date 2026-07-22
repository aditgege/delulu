
export default defineEventHandler(async () => {
  const sql = useDb()
  const packages = await sql`SELECT * FROM packages ORDER BY name`
  const boms = await sql`SELECT * FROM package_bom ORDER BY package_id, sku_id`
  
  // Attach BOM to each package
  return packages.map((pkg: any) => ({
    ...pkg,
    bom: boms.filter((b: any) => b.package_id === pkg.id).map((b: any) => ({
      skuId: b.sku_id,
      qty: b.qty,
    })),
  }))
})
