-- Seed data for Delulul — Kukus/Frozen only (9 dimsum variants)

INSERT INTO menus (id, name, unit, category) VALUES
  ('hisitkau', 'Hisitkau', 'pcs', 'dimsum'),
  ('lumpia-kulit-tahu-ayam', 'Lumpia Kulit Tahu Ayam', 'pcs', 'dimsum'),
  ('lumpia-kulit-tahu-udang', 'Lumpia Kulit Tahu Udang', 'pcs', 'dimsum'),
  ('siomay-ayam', 'Siomay Ayam', 'pcs', 'dimsum'),
  ('siomay-kepiting', 'Siomay Kepiting', 'pcs', 'dimsum'),
  ('siomay-mozzarella', 'Siomay Mozzarella', 'pcs', 'dimsum'),
  ('siomay-nori', 'Siomay Nori', 'pcs', 'dimsum'),
  ('siomay-seafood', 'Siomay Seafood', 'pcs', 'dimsum'),
  ('siomay-udang', 'Siomay Udang', 'pcs', 'dimsum')
ON CONFLICT (id) DO NOTHING;

INSERT INTO supplier_mixes (id, name, price) VALUES
  ('mix-a', 'Mix A', 64000),
  ('mix-b', 'Mix B', 64000),
  ('mix-e', 'Mix E', 64000)
ON CONFLICT (id) DO NOTHING;

INSERT INTO mix_contents (mix_id, menu_id, qty) VALUES
  ('mix-a', 'siomay-ayam', 6),
  ('mix-a', 'lumpia-kulit-tahu-udang', 6),
  ('mix-a', 'siomay-nori', 6),
  ('mix-a', 'siomay-kepiting', 6),
  ('mix-a', 'hisitkau', 6),
  ('mix-b', 'siomay-udang', 6),
  ('mix-b', 'lumpia-kulit-tahu-ayam', 6),
  ('mix-b', 'siomay-nori', 6),
  ('mix-b', 'siomay-seafood', 6),
  ('mix-b', 'hisitkau', 6),
  ('mix-e', 'siomay-ayam', 6),
  ('mix-e', 'lumpia-kulit-tahu-ayam', 6),
  ('mix-e', 'siomay-nori', 6),
  ('mix-e', 'siomay-kepiting', 6),
  ('mix-e', 'siomay-mozzarella', 6)
ON CONFLICT DO NOTHING;

INSERT INTO packages (id, name, price) VALUES
  ('paket-halu', 'Paket Halu', 35000),
  ('paket-when-ya', 'Paket When Ya', 35000),
  ('paket-solulu', 'Paket Solulu', 35000)
ON CONFLICT (id) DO NOTHING;

INSERT INTO package_bom (package_id, menu_id, qty) VALUES
  ('paket-halu', 'siomay-ayam', 2),
  ('paket-halu', 'lumpia-kulit-tahu-udang', 2),
  ('paket-halu', 'siomay-nori', 2),
  ('paket-halu', 'siomay-kepiting', 2),
  ('paket-halu', 'hisitkau', 2),
  ('paket-when-ya', 'siomay-udang', 2),
  ('paket-when-ya', 'lumpia-kulit-tahu-ayam', 2),
  ('paket-when-ya', 'siomay-nori', 2),
  ('paket-when-ya', 'siomay-seafood', 2),
  ('paket-when-ya', 'hisitkau', 2),
  ('paket-solulu', 'siomay-ayam', 2),
  ('paket-solulu', 'lumpia-kulit-tahu-ayam', 2),
  ('paket-solulu', 'siomay-nori', 2),
  ('paket-solulu', 'siomay-kepiting', 2),
  ('paket-solulu', 'siomay-mozzarella', 2)
ON CONFLICT DO NOTHING;

INSERT INTO supplier_packs (menu_id, label, size_pcs, price) VALUES
  ('siomay-ayam', 'Medium', 30, 63000),
  ('siomay-ayam', 'Large', 24, 63000),
  ('siomay-kepiting', 'Medium', 30, 63000),
  ('siomay-kepiting', 'Large', 24, 63000),
  ('siomay-seafood', 'Medium', 30, 63000),
  ('siomay-seafood', 'Large', 24, 63000),
  ('siomay-udang', 'Medium', 30, 64000),
  ('siomay-udang', 'Large', 24, 64000),
  ('siomay-nori', 'Medium', 30, 64000),
  ('siomay-nori', 'Large', 24, 64000),
  ('siomay-mozzarella', 'Medium', 30, 69000),
  ('siomay-mozzarella', 'Large', 24, 69000),
  ('hisitkau', 'Medium', 30, 64000),
  ('hisitkau', 'Large', 24, 64000),
  ('lumpia-kulit-tahu-ayam', 'Medium', 30, 65000),
  ('lumpia-kulit-tahu-ayam', 'Large', 24, 65000),
  ('lumpia-kulit-tahu-udang', 'Medium', 30, 66000),
  ('lumpia-kulit-tahu-udang', 'Large', 24, 66000)
ON CONFLICT DO NOTHING;

INSERT INTO app_config (key, value) VALUES ('hpp_per_pcs', '2133') ON CONFLICT (key) DO NOTHING;

INSERT INTO cara_masak (id, label) VALUES ('bakar', 'Bakar'), ('kukus', 'Kukus') ON CONFLICT (id) DO NOTHING;
INSERT INTO menu_cara_masak (menu_id, cara_masak_id, harga_porsi) SELECT id, 'bakar', 18000 FROM menus ON CONFLICT DO NOTHING;
INSERT INTO menu_cara_masak (menu_id, cara_masak_id, harga_porsi) SELECT id, 'kukus', 16000 FROM menus ON CONFLICT DO NOTHING;
INSERT INTO inventory (menu_id, qty_on_hand) VALUES
  ('hisitkau', 8),
  ('lumpia-kulit-tahu-ayam', 20),
  ('lumpia-kulit-tahu-udang', 0),
  ('siomay-ayam', 6),
  ('siomay-kepiting', 10),
  ('siomay-mozzarella', 6),
  ('siomay-nori', 18),
  ('siomay-seafood', 6),
  ('siomay-udang', 8)
ON CONFLICT (menu_id) DO UPDATE SET qty_on_hand = EXCLUDED.qty_on_hand;
