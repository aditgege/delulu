-- Delulul Schema for Neon PostgreSQL

CREATE TABLE IF NOT EXISTS menus (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  unit TEXT NOT NULL DEFAULT 'pcs',
  category TEXT
);

CREATE TABLE IF NOT EXISTS packages (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  price INTEGER
);

CREATE TABLE IF NOT EXISTS package_bom (
  package_id TEXT NOT NULL REFERENCES packages(id) ON DELETE CASCADE,
  menu_id TEXT NOT NULL REFERENCES menus(id),
  qty INTEGER NOT NULL DEFAULT 1,
  PRIMARY KEY (package_id, menu_id)
);

CREATE TABLE IF NOT EXISTS supplier_packs (
  id SERIAL PRIMARY KEY,
  menu_id TEXT NOT NULL REFERENCES menus(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  size_pcs INTEGER NOT NULL,
  price INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS supplier_mixes (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  price INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS mix_contents (
  mix_id TEXT NOT NULL REFERENCES supplier_mixes(id) ON DELETE CASCADE,
  menu_id TEXT NOT NULL REFERENCES menus(id),
  qty INTEGER NOT NULL DEFAULT 6,
  PRIMARY KEY (mix_id, menu_id)
);

CREATE TABLE IF NOT EXISTS inventory (
  menu_id TEXT PRIMARY KEY REFERENCES menus(id) ON DELETE CASCADE,
  qty_on_hand INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS purchase_orders (
  id TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  created_at BIGINT NOT NULL,
  closed BOOLEAN NOT NULL DEFAULT false
);

CREATE TABLE IF NOT EXISTS order_customers (
  id TEXT PRIMARY KEY,
  po_id TEXT NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  shipping_fee INTEGER NOT NULL DEFAULT 0,
  paid BOOLEAN NOT NULL DEFAULT false,
  shipped BOOLEAN NOT NULL DEFAULT false
);

CREATE TABLE IF NOT EXISTS order_items (
  id SERIAL PRIMARY KEY,
  customer_id TEXT NOT NULL REFERENCES order_customers(id) ON DELETE CASCADE,
  package_id TEXT NOT NULL,
  qty INTEGER NOT NULL DEFAULT 0,
  extra_chili_oil INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS cara_masak (
  id TEXT PRIMARY KEY,
  label TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS menu_cara_masak (
  menu_id TEXT NOT NULL REFERENCES menus(id) ON DELETE CASCADE,
  cara_masak_id TEXT NOT NULL REFERENCES cara_masak(id),
  harga_porsi INTEGER NOT NULL,
  PRIMARY KEY (menu_id, cara_masak_id)
);

CREATE TABLE IF NOT EXISTS order_bakar_kukus_items (
  id SERIAL PRIMARY KEY,
  customer_id TEXT NOT NULL REFERENCES order_customers(id) ON DELETE CASCADE,
  menu_id TEXT NOT NULL,
  cara_masak TEXT NOT NULL,
  jumlah_porsi INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS app_config (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
