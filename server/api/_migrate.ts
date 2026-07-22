export default defineEventHandler(async () => {
  const sql = useDb()

  // Check if already seeded
  const result = await sql`SELECT COUNT(*)::int as count FROM skus`
  const count = result?.[0]?.count ?? 0
  if (count > 0) {
    return { status: 'ok', message: `Already seeded (${count} SKUs)` }
  }

  // ── Schema ──
  await sql(`CREATE TABLE IF NOT EXISTS skus (
    id TEXT PRIMARY KEY, name TEXT NOT NULL, unit TEXT NOT NULL DEFAULT 'pcs', category TEXT
  )`)
  await sql(`CREATE TABLE IF NOT EXISTS packages (
    id TEXT PRIMARY KEY, name TEXT NOT NULL, price INTEGER
  )`)
  await sql(`CREATE TABLE IF NOT EXISTS package_bom (
    package_id TEXT NOT NULL REFERENCES packages(id) ON DELETE CASCADE,
    sku_id TEXT NOT NULL REFERENCES skus(id),
    qty INTEGER NOT NULL DEFAULT 1,
    PRIMARY KEY (package_id, sku_id)
  )`)
  await sql(`CREATE TABLE IF NOT EXISTS supplier_packs (
    id SERIAL PRIMARY KEY, sku_id TEXT NOT NULL REFERENCES skus(id) ON DELETE CASCADE,
    label TEXT NOT NULL, size_pcs INTEGER NOT NULL, price INTEGER NOT NULL
  )`)
  await sql(`CREATE TABLE IF NOT EXISTS supplier_mixes (
    id TEXT PRIMARY KEY, name TEXT NOT NULL, price INTEGER NOT NULL
  )`)
  await sql(`CREATE TABLE IF NOT EXISTS mix_contents (
    mix_id TEXT NOT NULL REFERENCES supplier_mixes(id) ON DELETE CASCADE,
    sku_id TEXT NOT NULL REFERENCES skus(id), qty INTEGER NOT NULL DEFAULT 6,
    PRIMARY KEY (mix_id, sku_id)
  )`)
  await sql(`CREATE TABLE IF NOT EXISTS inventory (
    sku_id TEXT PRIMARY KEY REFERENCES skus(id) ON DELETE CASCADE, qty_on_hand INTEGER NOT NULL DEFAULT 0
  )`)
  await sql(`CREATE TABLE IF NOT EXISTS purchase_orders (
    id TEXT PRIMARY KEY, label TEXT NOT NULL, created_at BIGINT NOT NULL, closed BOOLEAN NOT NULL DEFAULT false
  )`)
  await sql(`CREATE TABLE IF NOT EXISTS order_customers (
    id TEXT PRIMARY KEY, po_id TEXT NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
    name TEXT NOT NULL, paid BOOLEAN NOT NULL DEFAULT false, shipped BOOLEAN NOT NULL DEFAULT false
  )`)
  await sql(`CREATE TABLE IF NOT EXISTS order_items (
    id SERIAL PRIMARY KEY, customer_id TEXT NOT NULL REFERENCES order_customers(id) ON DELETE CASCADE,
    package_id TEXT NOT NULL, qty INTEGER NOT NULL DEFAULT 0, extra_chili_oil INTEGER NOT NULL DEFAULT 0
  )`)

  // ── Seed: SKUs ──
  const skus = [
    ['siomay-ayam','Siomay Ayam','pcs','kukus'],
    ['siomay-kepiting','Siomay Kepiting','pcs','kukus'],
    ['siomay-seafood','Siomay Seafood','pcs','kukus'],
    ['siomay-udang','Siomay Udang','pcs','kukus'],
    ['siomay-nori','Siomay Nori','pcs','kukus'],
    ['siomay-mozzarella','Siomay Mozzarella','pcs','kukus'],
    ['siomay-mercon','Siomay Mercon','pcs','kukus'],
    ['gyoza-ayam','Gyoza Ayam','pcs','kukus'],
    ['gyoza-ayam-udang','Gyoza Ayam Udang','pcs','kukus'],
    ['bakpao-ayam','Bakpao Ayam','pcs','kukus'],
    ['bakpao-susu','Bakpao Susu','pcs','kukus'],
    ['bakpao-cokelat','Bakpao Cokelat','pcs','kukus'],
    ['shisitkau','Shisitkau','pcs','kukus'],
    ['lumpia-tahu-ayam','Lumpia Kulit Tahu Ayam','pcs','kukus'],
    ['lumpia-tahu-udang','Lumpia Kulit Tahu Udang','pcs','kukus'],
    ['angsio','Angsio','pcs','kukus'],
    ['hakau','Hakau','pcs','kukus'],
    ['ayam-bola-keju','Ayam Bola Keju','pcs','goreng'],
    ['pangsit-ayam','Pangsit Ayam','pcs','goreng'],
    ['pangsit-udang','Pangsit Udang','pcs','goreng'],
    ['ekado','Ekado','pcs','goreng'],
    ['kumis-naga','Kumis Naga','pcs','goreng'],
    ['kuotie','Kuotie','pcs','goreng'],
    ['wonton','Wonton','pcs','goreng'],
    ['cakue-goreng-udang','Cakue Goreng Udang','pcs','goreng'],
    ['lumpia-goreng-ayam','Lumpia Goreng Ayam','pcs','goreng'],
    ['lumpia-goreng-udang','Lumpia Goreng Udang','pcs','goreng'],
    ['lumpia-goreng-keju','Lumpia Goreng Ayam Keju Lumer','pcs','goreng'],
    ['gohyong','Gohyong','pcs','goreng'],
    ['pangsit-ayam-rebus','Pangsit Ayam Rebus','pcs','rebus'],
    ['chicken-drumstick','Chicken Drumstick','pcs','bento'],
    ['kani-roll','Kani Roll','pcs','bento'],
    ['egg-chicken-roll','Egg Chicken Roll','pcs','bento'],
    ['kaki-naga','Kaki Naga','pcs','bento'],
    ['chicken-katsu','Chicken Katsu','pcs','bento'],
    ['chili-oil-80','Chili Oil 80 ml','botol','condiment'],
    ['chili-oil-500','Chili Oil 500 ml','botol','condiment'],
    ['chili-oil-1l','Chili Oil 1 Liter','botol','condiment'],
  ]
  for (const [id, name, unit, category] of skus) {
    await sql`INSERT INTO skus (id,name,unit,category) VALUES (${id},${name},${unit},${category}) ON CONFLICT (id) DO NOTHING`
  }

  await sql`INSERT INTO packages (id,name,price) VALUES ('paket-halu','Paket Halu',35000) ON CONFLICT (id) DO NOTHING`
  await sql`INSERT INTO packages (id,name,price) VALUES ('paket-when-ya','Paket When Ya',35000) ON CONFLICT (id) DO NOTHING`
  await sql`INSERT INTO packages (id,name,price) VALUES ('paket-solulu','Paket Solulu',35000) ON CONFLICT (id) DO NOTHING`
  await sql`INSERT INTO package_bom (package_id,sku_id,qty) VALUES ('paket-halu','siomay-ayam',1),('paket-halu','lumpia-tahu-udang',1),('paket-halu','siomay-nori',1),('paket-halu','siomay-kepiting',1),('paket-halu','shisitkau',1) ON CONFLICT DO NOTHING`
  await sql`INSERT INTO package_bom (package_id,sku_id,qty) VALUES ('paket-when-ya','siomay-udang',1),('paket-when-ya','lumpia-tahu-ayam',1),('paket-when-ya','siomay-nori',1),('paket-when-ya','siomay-seafood',1),('paket-when-ya','shisitkau',1) ON CONFLICT DO NOTHING`
  await sql`INSERT INTO package_bom (package_id,sku_id,qty) VALUES ('paket-solulu','siomay-ayam',1),('paket-solulu','lumpia-tahu-ayam',1),('paket-solulu','siomay-nori',1),('paket-solulu','siomay-kepiting',1),('paket-solulu','siomay-mozzarella',1) ON CONFLICT DO NOTHING`

  await sql`INSERT INTO supplier_mixes (id,name,price) VALUES ('mix-a','Mix A',64000),('mix-b','Mix B',64000),('mix-e','Mix E',64000),('mix-c','Mix C',64000) ON CONFLICT (id) DO NOTHING`

  const mixData = [
    ['mix-a','siomay-ayam'],['mix-a','lumpia-tahu-udang'],['mix-a','siomay-nori'],['mix-a','siomay-kepiting'],['mix-a','shisitkau'],
    ['mix-b','siomay-udang'],['mix-b','lumpia-tahu-ayam'],['mix-b','siomay-nori'],['mix-b','siomay-seafood'],['mix-b','shisitkau'],
    ['mix-e','siomay-ayam'],['mix-e','lumpia-tahu-ayam'],['mix-e','siomay-nori'],['mix-e','siomay-kepiting'],['mix-e','siomay-mozzarella'],
    ['mix-c','kuotie'],['mix-c','lumpia-goreng-ayam'],['mix-c','wonton'],['mix-c','ekado'],['mix-c','kumis-naga'],
  ]
  for (const [mixId, skuId] of mixData) {
    await sql`INSERT INTO mix_contents (mix_id,sku_id,qty) VALUES (${mixId},${skuId},6) ON CONFLICT DO NOTHING`
  }

  const packs: Array<[string,string,number,number]> = [
    ['siomay-ayam','Medium',30,63000],['siomay-ayam','Large',24,63000],
    ['siomay-kepiting','Medium',30,63000],['siomay-kepiting','Large',24,63000],
    ['siomay-seafood','Medium',30,63000],['siomay-seafood','Large',24,63000],
    ['siomay-udang','Medium',30,64000],['siomay-udang','Large',24,64000],
    ['siomay-nori','Medium',30,64000],['siomay-nori','Large',24,64000],
    ['siomay-mozzarella','Medium',30,69000],['siomay-mozzarella','Large',24,69000],
    ['siomay-mercon','Medium',30,69000],['siomay-mercon','Large',24,69000],
    ['gyoza-ayam','Medium',30,58000],['gyoza-ayam-udang','Medium',30,63000],
    ['bakpao-ayam','Large',24,62000],['bakpao-susu','Large',24,62000],['bakpao-cokelat','Large',24,62000],
    ['shisitkau','Medium',30,64000],['shisitkau','Large',24,64000],
    ['lumpia-tahu-ayam','Medium',30,65000],['lumpia-tahu-ayam','Large',24,65000],
    ['lumpia-tahu-udang','Medium',30,66000],['lumpia-tahu-udang','Large',24,66000],
    ['angsio','Large',24,68000],['hakau','Large',24,69000],
    ['ayam-bola-keju','Regular',15,27000],
    ['pangsit-ayam','Medium',30,53000],['pangsit-udang','Medium',30,58000],
    ['ekado','Large',24,63000],['kumis-naga','Medium',30,63000],['kumis-naga','Large',24,63000],
    ['kuotie','Medium',30,63000],['kuotie','Large',24,63000],
    ['wonton','Medium',30,64000],['wonton','Large',24,64000],
    ['cakue-goreng-udang','Large',24,64000],
    ['lumpia-goreng-ayam','Medium',30,63000],['lumpia-goreng-ayam','Large',24,63000],
    ['lumpia-goreng-udang','Medium',30,64000],['lumpia-goreng-udang','Large',24,64000],
    ['lumpia-goreng-keju','Large',24,67000],['gohyong','Medium',30,69000],
    ['pangsit-ayam-rebus','Medium',30,64000],
    ['chicken-drumstick','Regular',10,24000],['kani-roll','Regular',12,24000],
    ['egg-chicken-roll','Regular',12,25000],['kaki-naga','Regular',10,28000],['chicken-katsu','Regular',500,41000],
    ['chili-oil-80','80 ml',1,12000],['chili-oil-500','500 ml',1,47000],['chili-oil-1l','1 Liter',1,83000],
  ]
  for (const [skuId, label, sizePcs, price] of packs) {
    await sql`INSERT INTO supplier_packs (sku_id,label,size_pcs,price) VALUES (${skuId},${label},${sizePcs},${price}) ON CONFLICT DO NOTHING`
  }
  for (const [id] of skus) {
    await sql`INSERT INTO inventory (sku_id,qty_on_hand) VALUES (${id},0) ON CONFLICT (sku_id) DO NOTHING`
  }

  return { status: 'ok', message: 'Migration and seed complete' }
})
