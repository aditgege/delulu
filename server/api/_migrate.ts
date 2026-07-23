const FROZEN_PRICE = 35000
const KUKUS_PRICE = 16000
const BAKAR_PRICE = 18000
const CHILI_OIL_PRICE = 2000
const MIX_PRICE = 64000
const HPP_FROZEN = 26000
const HPP_KUKUS = 11000
const HPP_BAKAR = 12000
const HPP_CHILI = 2000

export default defineEventHandler(async (event) => {
  const sql = useDb()
  const query = getQuery(event)
  const force = query.force === 'true'

  // ── DROP ──
  if (force) {
    const tables = [
      'order_items', 'order_customers', 'purchase_orders',
      'mix_contents', 'supplier_mixes', 'supplier_packs',
      'product_compositions', 'product_variants', 'products',
      'inventory', 'menus', 'menu_cara_masak', 'cara_masak',
      'package_bom', 'packages', 'order_bakar_kukus_items',
    ]
    for (const t of tables) await sql.query(`DROP TABLE IF EXISTS ${t} CASCADE`, []).catch(() => {})
  }

  // ── CREATE ──
  await sql`CREATE TABLE IF NOT EXISTS menus (id TEXT PRIMARY KEY, name TEXT NOT NULL, unit TEXT NOT NULL DEFAULT 'pcs', category TEXT, base_price INTEGER)`
  await sql`CREATE TABLE IF NOT EXISTS purchase_orders (id TEXT PRIMARY KEY, label TEXT NOT NULL, created_at BIGINT NOT NULL, closed BOOLEAN NOT NULL DEFAULT false)`
  await sql`CREATE TABLE IF NOT EXISTS order_customers (id TEXT PRIMARY KEY, po_id TEXT NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE, name TEXT NOT NULL, shipping_fee INTEGER NOT NULL DEFAULT 0, discount INTEGER NOT NULL DEFAULT 0, paid BOOLEAN NOT NULL DEFAULT false, shipped BOOLEAN NOT NULL DEFAULT false)`
  await sql`CREATE TABLE IF NOT EXISTS inventory (menu_id TEXT PRIMARY KEY REFERENCES menus(id) ON DELETE CASCADE, qty_on_hand INTEGER NOT NULL DEFAULT 0)`
  await sql`CREATE TABLE IF NOT EXISTS products (id TEXT PRIMARY KEY, name TEXT NOT NULL, unit TEXT NOT NULL DEFAULT 'pcs', type TEXT NOT NULL DEFAULT 'single', base_price INTEGER NOT NULL DEFAULT 0, hpp INTEGER)`
  await sql`CREATE TABLE IF NOT EXISTS product_variants (id TEXT PRIMARY KEY, product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE, name TEXT NOT NULL, price INTEGER NOT NULL DEFAULT 0, hpp INTEGER)`
  await sql`CREATE TABLE IF NOT EXISTS product_compositions (product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE, menu_id TEXT NOT NULL REFERENCES menus(id), qty INTEGER NOT NULL DEFAULT 1, PRIMARY KEY (product_id, menu_id))`
  await sql`CREATE TABLE IF NOT EXISTS supplier_packs (id SERIAL PRIMARY KEY, menu_id TEXT NOT NULL REFERENCES menus(id) ON DELETE CASCADE, label TEXT NOT NULL, size_pcs INTEGER NOT NULL, price INTEGER NOT NULL)`
  await sql`CREATE TABLE IF NOT EXISTS supplier_mixes (id TEXT PRIMARY KEY, name TEXT NOT NULL, price INTEGER NOT NULL)`
  await sql`CREATE TABLE IF NOT EXISTS mix_contents (mix_id TEXT NOT NULL REFERENCES supplier_mixes(id) ON DELETE CASCADE, menu_id TEXT NOT NULL REFERENCES menus(id), qty INTEGER NOT NULL DEFAULT 6, PRIMARY KEY (mix_id, menu_id))`
  await sql`CREATE TABLE IF NOT EXISTS order_items (id SERIAL PRIMARY KEY, customer_id TEXT NOT NULL REFERENCES order_customers(id) ON DELETE CASCADE, product_id TEXT NOT NULL REFERENCES products(id), variant TEXT, qty INTEGER NOT NULL DEFAULT 1, unit_price INTEGER NOT NULL DEFAULT 0)`

  // ── CHECK ALREADY SEEDED ──
  const [{ count }] = await sql`SELECT COUNT(*)::int as count FROM menus`
  if (count > 0 && !force) return { status: 'ok', message: `Already seeded (${count} menus)` }

  // ── SEED: menus ──
  const menuData = [
    ['hisitkau', 'Hisitkau', 'dimsum'],
    ['lumpia-kulit-tahu-ayam', 'Lumpia Kulit Tahu Ayam', 'dimsum'],
    ['lumpia-kulit-tahu-udang', 'Lumpia Kulit Tahu Udang', 'dimsum'],
    ['siomay-ayam', 'Siomay Ayam', 'dimsum'],
    ['siomay-kepiting', 'Siomay Kepiting', 'dimsum'],
    ['siomay-mozzarella', 'Siomay Mozzarella', 'dimsum'],
    ['siomay-nori', 'Siomay Nori', 'dimsum'],
    ['siomay-seafood', 'Siomay Seafood', 'dimsum'],
    ['siomay-udang', 'Siomay Udang', 'dimsum'],
    ['chili-oil', 'Chili Oil', 'condiment'],
  ]
  for (const [id, name, cat] of menuData) {
    await sql`INSERT INTO menus (id, name, unit, category) VALUES (${id}, ${name}, 'pcs', ${cat}) ON CONFLICT (id) DO NOTHING`
  }

  // ── SEED: products ──
  const prodData: Array<[string, string, string, string, number, number]> = [
    ['paket-halu', 'Paket Halu', 'paket', 'bundle', FROZEN_PRICE, HPP_FROZEN],
    ['paket-when-ya', 'Paket When Ya', 'paket', 'bundle', FROZEN_PRICE, HPP_FROZEN],
    ['paket-solulu', 'Paket Solulu', 'paket', 'bundle', FROZEN_PRICE, HPP_FROZEN],
    ['siomay-ayam', 'Siomay Ayam', 'porsi', 'single', KUKUS_PRICE, HPP_KUKUS],
    ['siomay-kepiting', 'Siomay Kepiting', 'porsi', 'single', KUKUS_PRICE, HPP_KUKUS],
    ['siomay-mozzarella', 'Siomay Mozzarella', 'porsi', 'single', KUKUS_PRICE, HPP_KUKUS],
    ['siomay-nori', 'Siomay Nori', 'porsi', 'single', KUKUS_PRICE, HPP_KUKUS],
    ['siomay-seafood', 'Siomay Seafood', 'porsi', 'single', KUKUS_PRICE, HPP_KUKUS],
    ['siomay-udang', 'Siomay Udang', 'porsi', 'single', KUKUS_PRICE, HPP_KUKUS],
    ['hisitkau', 'Hisitkau', 'porsi', 'single', KUKUS_PRICE, HPP_KUKUS],
    ['lumpia-kulit-tahu-ayam', 'Lumpia Kulit Tahu Ayam', 'porsi', 'single', KUKUS_PRICE, HPP_KUKUS],
    ['lumpia-kulit-tahu-udang', 'Lumpia Kulit Tahu Udang', 'porsi', 'single', KUKUS_PRICE, HPP_KUKUS],
    ['chili-oil', 'Chili Oil', 'pcs', 'addon', CHILI_OIL_PRICE, HPP_CHILI],
  ]
  for (const [id, name, unit, type, price, hpp] of prodData) {
    await sql`INSERT INTO products (id, name, unit, type, base_price, hpp) VALUES (${id}, ${name}, ${unit}, ${type}, ${price}, ${hpp}) ON CONFLICT (id) DO NOTHING`
  }

  // ── SEED: variants ──
  const variantData: Array<[string, string, number, number]> = [
    ['siomay-ayam', 'Bakar', BAKAR_PRICE, HPP_BAKAR], ['siomay-ayam', 'Kukus', KUKUS_PRICE, HPP_KUKUS],
    ['siomay-kepiting', 'Bakar', BAKAR_PRICE, HPP_BAKAR], ['siomay-kepiting', 'Kukus', KUKUS_PRICE, HPP_KUKUS],
    ['siomay-mozzarella', 'Bakar', BAKAR_PRICE, HPP_BAKAR], ['siomay-mozzarella', 'Kukus', KUKUS_PRICE, HPP_KUKUS],
    ['siomay-nori', 'Bakar', BAKAR_PRICE, HPP_BAKAR], ['siomay-nori', 'Kukus', KUKUS_PRICE, HPP_KUKUS],
    ['siomay-seafood', 'Bakar', BAKAR_PRICE, HPP_BAKAR], ['siomay-seafood', 'Kukus', KUKUS_PRICE, HPP_KUKUS],
    ['siomay-udang', 'Bakar', BAKAR_PRICE, HPP_BAKAR], ['siomay-udang', 'Kukus', KUKUS_PRICE, HPP_KUKUS],
    ['hisitkau', 'Bakar', BAKAR_PRICE, HPP_BAKAR], ['hisitkau', 'Kukus', KUKUS_PRICE, HPP_KUKUS],
    ['lumpia-kulit-tahu-ayam', 'Bakar', BAKAR_PRICE, HPP_BAKAR], ['lumpia-kulit-tahu-ayam', 'Kukus', KUKUS_PRICE, HPP_KUKUS],
    ['lumpia-kulit-tahu-udang', 'Bakar', BAKAR_PRICE, HPP_BAKAR], ['lumpia-kulit-tahu-udang', 'Kukus', KUKUS_PRICE, HPP_KUKUS],
  ]
  for (const [pid, name, price, hpp] of variantData) {
    await sql`INSERT INTO product_variants (id, product_id, name, price, hpp) VALUES (${pid + '-' + name.toLowerCase()}, ${pid}, ${name}, ${price}, ${hpp}) ON CONFLICT (id) DO NOTHING`
  }

  // ── SEED: compositions ──
  await sql`INSERT INTO product_compositions (product_id,menu_id,qty) VALUES ('paket-halu','siomay-ayam',2),('paket-halu','lumpia-kulit-tahu-udang',2),('paket-halu','siomay-nori',2),('paket-halu','siomay-kepiting',2),('paket-halu','hisitkau',2) ON CONFLICT DO NOTHING`
  await sql`INSERT INTO product_compositions (product_id,menu_id,qty) VALUES ('paket-when-ya','siomay-udang',2),('paket-when-ya','lumpia-kulit-tahu-ayam',2),('paket-when-ya','siomay-nori',2),('paket-when-ya','siomay-seafood',2),('paket-when-ya','hisitkau',2) ON CONFLICT DO NOTHING`
  await sql`INSERT INTO product_compositions (product_id,menu_id,qty) VALUES ('paket-solulu','siomay-ayam',2),('paket-solulu','lumpia-kulit-tahu-ayam',2),('paket-solulu','siomay-nori',2),('paket-solulu','siomay-kepiting',2),('paket-solulu','siomay-mozzarella',2) ON CONFLICT DO NOTHING`

  // ── SEED: supplier mixes ──
  await sql`INSERT INTO supplier_mixes (id,name,price) VALUES ('mix-a','Mix A',${MIX_PRICE}),('mix-b','Mix B',${MIX_PRICE}),('mix-e','Mix E',${MIX_PRICE}) ON CONFLICT (id) DO NOTHING`
  const mixContents: Array<[string, string]> = [
    ['mix-a','siomay-ayam'],['mix-a','lumpia-kulit-tahu-udang'],['mix-a','siomay-nori'],['mix-a','siomay-kepiting'],['mix-a','hisitkau'],
    ['mix-b','siomay-udang'],['mix-b','lumpia-kulit-tahu-ayam'],['mix-b','siomay-nori'],['mix-b','siomay-seafood'],['mix-b','hisitkau'],
    ['mix-e','siomay-ayam'],['mix-e','lumpia-kulit-tahu-ayam'],['mix-e','siomay-nori'],['mix-e','siomay-kepiting'],['mix-e','siomay-mozzarella'],
  ]
  for (const [mixId, menuId] of mixContents) {
    await sql`INSERT INTO mix_contents (mix_id,menu_id,qty) VALUES (${mixId},${menuId},6) ON CONFLICT DO NOTHING`
  }

  // ── SEED: supplier packs ──
  const packData: Array<[string, string, number, number]> = [
    ['siomay-ayam','Medium',30,63000],['siomay-ayam','Large',24,63000],
    ['siomay-kepiting','Medium',30,63000],['siomay-kepiting','Large',24,63000],
    ['siomay-seafood','Medium',30,63000],['siomay-seafood','Large',24,63000],
    ['siomay-udang','Medium',30,64000],['siomay-udang','Large',24,64000],
    ['siomay-nori','Medium',30,64000],['siomay-nori','Large',24,64000],
    ['siomay-mozzarella','Medium',30,69000],['siomay-mozzarella','Large',24,69000],
    ['hisitkau','Medium',30,64000],['hisitkau','Large',24,64000],
    ['lumpia-kulit-tahu-ayam','Medium',30,65000],['lumpia-kulit-tahu-ayam','Large',24,65000],
    ['lumpia-kulit-tahu-udang','Medium',30,66000],['lumpia-kulit-tahu-udang','Large',24,66000],
  ]
  for (const [menuId, label, sizePcs, price] of packData) {
    await sql`INSERT INTO supplier_packs (menu_id,label,size_pcs,price) VALUES (${menuId},${label},${sizePcs},${price}) ON CONFLICT DO NOTHING`
  }

  // ── SEED: inventory ──
  await sql`INSERT INTO inventory (menu_id, qty_on_hand) VALUES ('hisitkau',8),('lumpia-kulit-tahu-ayam',20),('lumpia-kulit-tahu-udang',0),('siomay-ayam',6),('siomay-kepiting',10),('siomay-mozzarella',6),('siomay-nori',18),('siomay-seafood',6),('siomay-udang',8) ON CONFLICT (menu_id) DO UPDATE SET qty_on_hand = EXCLUDED.qty_on_hand`

  // ── SEED: PO 1 (19 Juli 2026 - CLOSED) ──
  const t1 = new Date('2026-07-19T10:00:00+07:00').getTime()
  await sql`INSERT INTO purchase_orders (id, label, created_at, closed) VALUES ('po-juli-19', '19 Juli 2026', ${t1}, true) ON CONFLICT DO NOTHING`
  const po1: Array<[string, string, Array<[string, number, number]>]> = [
    ['po1-adit', 'Adit', [['paket-when-ya',1,35000], ['paket-solulu',1,35000]]],
    ['po1-budi', 'Budi', [['paket-when-ya',1,35000], ['paket-solulu',1,35000]]],
    ['po1-wulan', 'Wulan', [['paket-solulu',1,35000]]],
    ['po1-kak-oca', 'Kak Oca', [['paket-when-ya',1,35000]]],
    ['po1-ocana', 'Ocana', [['paket-when-ya',1,35000]]],
    ['po1-bunga', 'Bunga', [['paket-solulu',1,35000]]],
    ['po1-teh-ami', 'Teh Ami', [['paket-halu',1,35000]]],
    ['po1-intan', 'Intan', [['paket-solulu',1,35000]]],
    ['po1-ilma', 'Ilma', [['paket-when-ya',1,35000]]],
    ['po1-desi', 'Desi', [['paket-solulu',1,35000]]],
    ['po1-anya', 'Anya', [['paket-halu',1,35000], ['paket-when-ya',1,35000]]],
    ['po1-indri', 'Indri', [['paket-halu',1,35000]]],
    ['po1-sheryn', 'Sheryn', [['paket-halu',1,35000]]],
  ]
  for (const [cid, name, items] of po1) {
    await sql`INSERT INTO order_customers (id, po_id, name) VALUES (${cid}, 'po-juli-19', ${name}) ON CONFLICT DO NOTHING`
    for (const [pid, qty, price] of items) {
      await sql`INSERT INTO order_items (customer_id, product_id, qty, unit_price) VALUES (${cid}, ${pid}, ${qty}, ${price})`
    }
  }

  // ── SEED: PO 2 (24-25 Juli 2026 - OPEN) ──
  const t2 = new Date('2026-07-24T10:00:00+07:00').getTime()
  await sql`INSERT INTO purchase_orders (id, label, created_at, closed) VALUES ('po-juli-24', '24-25 Juli 2026', ${t2}, false) ON CONFLICT DO NOTHING`
  type PoItem = [string, number, number, string | null]
  const po2: Array<[string, string, PoItem[]]> = [
    ['po2-budi', 'Budi', [['paket-halu',1,35000,null], ['paket-when-ya',1,35000,null], ['paket-solulu',1,35000,null]]],
    ['po2-andika', 'Andika', [['paket-when-ya',1,35000,null], ['siomay-nori',1,18000,'Bakar'], ['siomay-mozzarella',1,18000,'Bakar']]],
    ['po2-widia', 'Widia', [['paket-solulu',1,35000,null]]],
    ['po2-fikri', 'Fikri', [['siomay-ayam',1,16000,'Kukus'], ['siomay-mozzarella',1,18000,'Bakar']]],
    ['po2-tasya', 'Tasya', [['paket-halu',1,35000,null], ['paket-when-ya',1,35000,null]]],
    ['po2-hapsa', 'Hapsa', [['siomay-ayam',1,16000,'Kukus'], ['siomay-nori',1,18000,'Bakar']]],
    ['po2-iko', 'Iko', [['paket-halu',1,35000,null], ['paket-when-ya',1,35000,null], ['paket-solulu',1,35000,null]]],
    ['po2-ema', 'Ema', [['lumpia-kulit-tahu-ayam',1,18000,'Bakar']]],
    ['po2-mita', 'Mita', [['siomay-mozzarella',1,16000,'Kukus']]],
    ['po2-zalfa', 'Zalfa', [['paket-halu',1,35000,null]]],
    ['po2-caca', 'Caca', [['siomay-ayam',1,16000,'Kukus']]],
    ['po2-kak-oca', 'Kak Oca', [['siomay-ayam',1,16000,'Kukus'], ['hisitkau',1,18000,'Bakar']]],
  ]
  for (const [cid, name, items] of po2) {
    await sql`INSERT INTO order_customers (id, po_id, name) VALUES (${cid}, 'po-juli-24', ${name}) ON CONFLICT DO NOTHING`
    for (const [pid, qty, price, variant] of items) {
      await sql`INSERT INTO order_items (customer_id, product_id, variant, qty, unit_price) VALUES (${cid}, ${pid}, ${variant}, ${qty}, ${price})`
    }
  }

  return { status: 'ok', message: 'Migration and seed complete' }
})
