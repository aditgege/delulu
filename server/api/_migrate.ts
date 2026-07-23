export default defineEventHandler(async (event) => {
  const sql = useDb()
  const query = getQuery(event)
  const force = query.force === 'true'

  // Check if already seeded
  const result = await sql`SELECT COUNT(*)::int as count FROM menus`
  const count = result?.[0]?.count ?? 0

  // Always cleanup non-core menus (supplier tambahan/goreng/rebus)
  const coreMenuIds = ['hisitkau','lumpia-kulit-tahu-ayam','lumpia-kulit-tahu-udang','siomay-ayam','siomay-kepiting','siomay-mozzarella','siomay-nori','siomay-seafood','siomay-udang']
  const ph = coreMenuIds.map((_, i) => `$${i + 1}`).join(',')
  await sql.query(`DELETE FROM menus WHERE id NOT IN (${ph})`, coreMenuIds).catch(() => {})

  if (count > 0 && !force) {
    return { status: 'ok', message: `Already seeded (${count} menus)` }
  }

  if (force) {
    const tables = ['menu_cara_masak', 'cara_masak', 'inventory', 'mix_contents', 'supplier_mixes', 'supplier_packs', 'package_bom', 'packages', 'order_bakar_kukus_items', 'order_items', 'order_customers', 'purchase_orders']
    for (const t of tables) await sql.query(`DELETE FROM ${t}`, []).catch(() => {})
    await sql.query('DELETE FROM menus', []).catch(() => {})
  }

  // ——— Migration: rename skus → menus if old table exists ———
  await sql.query('ALTER TABLE IF EXISTS skus RENAME TO menus', []).catch(() => {})
  await sql.query('ALTER TABLE IF EXISTS package_bom RENAME COLUMN sku_id TO menu_id', []).catch(() => {})
  await sql.query('ALTER TABLE IF EXISTS supplier_packs RENAME COLUMN sku_id TO menu_id', []).catch(() => {})
  await sql.query('ALTER TABLE IF EXISTS mix_contents RENAME COLUMN sku_id TO menu_id', []).catch(() => {})
  await sql.query('ALTER TABLE IF EXISTS inventory RENAME COLUMN sku_id TO menu_id', []).catch(() => {})
  await sql.query('ALTER TABLE IF EXISTS order_bakar_kukus_items RENAME COLUMN varian_id TO menu_id', []).catch(() => {})

  // Always-apply schema additions (idempotent)
  await sql.query("CREATE TABLE IF NOT EXISTS menus (id TEXT PRIMARY KEY, name TEXT NOT NULL, unit TEXT NOT NULL DEFAULT 'pcs', category TEXT)", []).catch(() => {})
  await sql.query('CREATE TABLE IF NOT EXISTS order_bakar_kukus_items (id SERIAL PRIMARY KEY, customer_id TEXT NOT NULL REFERENCES order_customers(id) ON DELETE CASCADE, menu_id TEXT NOT NULL, cara_masak TEXT NOT NULL, jumlah_porsi INTEGER NOT NULL DEFAULT 0)', [])
  await sql.query("ALTER TABLE order_customers ADD COLUMN IF NOT EXISTS shipping_fee INTEGER NOT NULL DEFAULT 0", []).catch(() => {})
  await sql.query('CREATE TABLE IF NOT EXISTS cara_masak (id TEXT PRIMARY KEY, label TEXT NOT NULL)', [])
  await sql.query('CREATE TABLE IF NOT EXISTS menu_cara_masak (menu_id TEXT NOT NULL REFERENCES menus(id) ON DELETE CASCADE, cara_masak_id TEXT NOT NULL REFERENCES cara_masak(id), harga_porsi INTEGER NOT NULL, PRIMARY KEY (menu_id, cara_masak_id))', [])

  // ── Schema ──
  await sql.query("CREATE TABLE IF NOT EXISTS menus (id TEXT PRIMARY KEY, name TEXT NOT NULL, unit TEXT NOT NULL DEFAULT 'pcs', category TEXT)", [])
  await sql.query('CREATE TABLE IF NOT EXISTS packages (id TEXT PRIMARY KEY, name TEXT NOT NULL, price INTEGER)', [])
  await sql.query('CREATE TABLE IF NOT EXISTS package_bom (package_id TEXT NOT NULL REFERENCES packages(id) ON DELETE CASCADE, menu_id TEXT NOT NULL REFERENCES menus(id), qty INTEGER NOT NULL DEFAULT 1, PRIMARY KEY (package_id, menu_id))', [])
  await sql.query('CREATE TABLE IF NOT EXISTS supplier_packs (id SERIAL PRIMARY KEY, menu_id TEXT NOT NULL REFERENCES menus(id) ON DELETE CASCADE, label TEXT NOT NULL, size_pcs INTEGER NOT NULL, price INTEGER NOT NULL)', [])
  await sql.query('CREATE TABLE IF NOT EXISTS supplier_mixes (id TEXT PRIMARY KEY, name TEXT NOT NULL, price INTEGER NOT NULL)', [])
  await sql.query('CREATE TABLE IF NOT EXISTS mix_contents (mix_id TEXT NOT NULL REFERENCES supplier_mixes(id) ON DELETE CASCADE, menu_id TEXT NOT NULL REFERENCES menus(id), qty INTEGER NOT NULL DEFAULT 6, PRIMARY KEY (mix_id, menu_id))', [])
  await sql.query('CREATE TABLE IF NOT EXISTS inventory (menu_id TEXT PRIMARY KEY REFERENCES menus(id) ON DELETE CASCADE, qty_on_hand INTEGER NOT NULL DEFAULT 0)', [])
  await sql.query('CREATE TABLE IF NOT EXISTS purchase_orders (id TEXT PRIMARY KEY, label TEXT NOT NULL, created_at BIGINT NOT NULL, closed BOOLEAN NOT NULL DEFAULT false)', [])
  await sql.query('CREATE TABLE IF NOT EXISTS order_customers (id TEXT PRIMARY KEY, po_id TEXT NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE, name TEXT NOT NULL, paid BOOLEAN NOT NULL DEFAULT false, shipped BOOLEAN NOT NULL DEFAULT false)', [])
  await sql.query('CREATE TABLE IF NOT EXISTS order_items (id SERIAL PRIMARY KEY, customer_id TEXT NOT NULL REFERENCES order_customers(id) ON DELETE CASCADE, package_id TEXT NOT NULL, qty INTEGER NOT NULL DEFAULT 0, extra_chili_oil INTEGER NOT NULL DEFAULT 0)', [])

  // ── Seed: menus (9 core) ──
  const skus: Array<[string, string, string]> = [
    ['hisitkau', 'Hisitkau', 'dimsum'],
    ['lumpia-kulit-tahu-ayam', 'Lumpia Kulit Tahu Ayam', 'dimsum'],
    ['lumpia-kulit-tahu-udang', 'Lumpia Kulit Tahu Udang', 'dimsum'],
    ['siomay-ayam', 'Siomay Ayam', 'dimsum'],
    ['siomay-kepiting', 'Siomay Kepiting', 'dimsum'],
    ['siomay-mozzarella', 'Siomay Mozzarella', 'dimsum'],
    ['siomay-nori', 'Siomay Nori', 'dimsum'],
    ['siomay-seafood', 'Siomay Seafood', 'dimsum'],
    ['siomay-udang', 'Siomay Udang', 'dimsum'],
  ]
  for (const [id, name, cat] of skus) {
    await sql`INSERT INTO menus (id, name, unit, category) VALUES (${id}, ${name}, 'pcs', ${cat}) ON CONFLICT (id) DO NOTHING`
  }

  await sql`INSERT INTO packages (id,name,price) VALUES ('paket-halu','Paket Halu',35000) ON CONFLICT (id) DO NOTHING`
  await sql`INSERT INTO packages (id,name,price) VALUES ('paket-when-ya','Paket When Ya',35000) ON CONFLICT (id) DO NOTHING`
  await sql`INSERT INTO packages (id,name,price) VALUES ('paket-solulu','Paket Solulu',35000) ON CONFLICT (id) DO NOTHING`
  await sql`INSERT INTO package_bom (package_id,menu_id,qty) VALUES ('paket-halu','siomay-ayam',2),('paket-halu','lumpia-kulit-tahu-udang',2),('paket-halu','siomay-nori',2),('paket-halu','siomay-kepiting',2),('paket-halu','hisitkau',2) ON CONFLICT DO NOTHING`
  await sql`INSERT INTO package_bom (package_id,menu_id,qty) VALUES ('paket-when-ya','siomay-udang',2),('paket-when-ya','lumpia-kulit-tahu-ayam',2),('paket-when-ya','siomay-nori',2),('paket-when-ya','siomay-seafood',2),('paket-when-ya','hisitkau',2) ON CONFLICT DO NOTHING`
  await sql`INSERT INTO package_bom (package_id,menu_id,qty) VALUES ('paket-solulu','siomay-ayam',2),('paket-solulu','lumpia-kulit-tahu-ayam',2),('paket-solulu','siomay-nori',2),('paket-solulu','siomay-kepiting',2),('paket-solulu','siomay-mozzarella',2) ON CONFLICT DO NOTHING`

  await sql`INSERT INTO supplier_mixes (id,name,price) VALUES ('mix-a','Mix A',64000),('mix-b','Mix B',64000),('mix-e','Mix E',64000) ON CONFLICT (id) DO NOTHING`

  const mixData: Array<[string, string]> = [
    ['mix-a','siomay-ayam'],['mix-a','lumpia-kulit-tahu-udang'],['mix-a','siomay-nori'],['mix-a','siomay-kepiting'],['mix-a','hisitkau'],
    ['mix-b','siomay-udang'],['mix-b','lumpia-kulit-tahu-ayam'],['mix-b','siomay-nori'],['mix-b','siomay-seafood'],['mix-b','hisitkau'],
    ['mix-e','siomay-ayam'],['mix-e','lumpia-kulit-tahu-ayam'],['mix-e','siomay-nori'],['mix-e','siomay-kepiting'],['mix-e','siomay-mozzarella'],
  ]
  for (const [mixId, menuId] of mixData) {
    await sql`INSERT INTO mix_contents (mix_id,menu_id,qty) VALUES (${mixId},${menuId},6) ON CONFLICT DO NOTHING`
  }

  const packs: Array<[string, string, number, number]> = [
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
  for (const [menuId, label, sizePcs, price] of packs) {
    await sql`INSERT INTO supplier_packs (menu_id,label,size_pcs,price) VALUES (${menuId},${label},${sizePcs},${price}) ON CONFLICT DO NOTHING`
  }

  await sql`INSERT INTO app_config (key, value) VALUES ('hpp_per_pcs', '2133') ON CONFLICT (key) DO NOTHING`

  // ── Seed: cara_masak + menu_cara_masak ──
  await sql.query("INSERT INTO cara_masak (id, label) VALUES ('bakar', 'Bakar'), ('kukus', 'Kukus') ON CONFLICT (id) DO NOTHING", [])
  await sql.query("INSERT INTO menu_cara_masak (menu_id, cara_masak_id, harga_porsi) SELECT id, 'bakar', 18000 FROM menus ON CONFLICT DO NOTHING", [])
  await sql.query("INSERT INTO menu_cara_masak (menu_id, cara_masak_id, harga_porsi) SELECT id, 'kukus', 16000 FROM menus ON CONFLICT DO NOTHING", [])

  await sql`INSERT INTO inventory (menu_id, qty_on_hand) VALUES
    ('hisitkau', 8),
    ('lumpia-kulit-tahu-ayam', 20),
    ('lumpia-kulit-tahu-udang', 0),
    ('siomay-ayam', 6),
    ('siomay-kepiting', 10),
    ('siomay-mozzarella', 6),
    ('siomay-nori', 18),
    ('siomay-seafood', 6),
    ('siomay-udang', 8)
  ON CONFLICT (menu_id) DO UPDATE SET qty_on_hand = EXCLUDED.qty_on_hand`

  return { status: 'ok', message: 'Migration and seed complete' }
})
