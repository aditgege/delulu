-- Seed data for Delulul — Kukus/Frozen only (9 dimsum variants)

INSERT INTO menus (id, name, unit, category) VALUES
  -- Dimsum jual
  ('hisitkau', 'Hisitkau', 'pcs', 'dimsum'),
  ('lumpia-kulit-tahu-ayam', 'Lumpia Kulit Tahu Ayam', 'pcs', 'dimsum'),
  ('lumpia-kulit-tahu-udang', 'Lumpia Kulit Tahu Udang', 'pcs', 'dimsum'),
  ('siomay-ayam', 'Siomay Ayam', 'pcs', 'dimsum'),
  ('siomay-kepiting', 'Siomay Kepiting', 'pcs', 'dimsum'),
  ('siomay-mozzarella', 'Siomay Mozzarella', 'pcs', 'dimsum'),
  ('siomay-nori', 'Siomay Nori', 'pcs', 'dimsum'),
  ('siomay-seafood', 'Siomay Seafood', 'pcs', 'dimsum'),
  ('siomay-udang', 'Siomay Udang', 'pcs', 'dimsum'),
  -- Supplier kukus tambahan
  ('siomay-mercon', 'Siomay Mercon', 'pcs', 'kukus'),
  ('gyoza-ayam', 'Gyoza Ayam', 'pcs', 'kukus'),
  ('gyoza-ayam-udang', 'Gyoza Ayam Udang', 'pcs', 'kukus'),
  ('bakpao-ayam', 'Bakpao Ayam', 'pcs', 'kukus'),
  ('bakpao-susu', 'Bakpao Susu', 'pcs', 'kukus'),
  ('bakpao-cokelat', 'Bakpao Cokelat', 'pcs', 'kukus'),
  ('angsio', 'Angsio', 'pcs', 'kukus'),
  ('hakau', 'Hakau', 'pcs', 'kukus'),
  -- Supplier goreng
  ('ayam-bola-keju', 'Ayam Bola Keju', 'pcs', 'goreng'),
  ('pangsit-ayam', 'Pangsit Ayam', 'pcs', 'goreng'),
  ('pangsit-udang', 'Pangsit Udang', 'pcs', 'goreng'),
  ('ekado', 'Ekado', 'pcs', 'goreng'),
  ('kumis-naga', 'Kumis Naga', 'pcs', 'goreng'),
  ('kuotie', 'Kuotie', 'pcs', 'goreng'),
  ('wonton', 'Wonton', 'pcs', 'goreng'),
  ('cakue-goreng-udang', 'Cakue Goreng Udang', 'pcs', 'goreng'),
  ('lumpia-goreng-ayam', 'Lumpia Goreng Ayam', 'pcs', 'goreng'),
  ('lumpia-goreng-udang', 'Lumpia Goreng Udang', 'pcs', 'goreng'),
  ('lumpia-goreng-keju', 'Lumpia Goreng Keju Lumer', 'pcs', 'goreng'),
  ('gohyong', 'Gohyong', 'pcs', 'goreng'),
  -- Supplier rebus
  ('pangsit-ayam-rebus', 'Pangsit Ayam Rebus', 'pcs', 'rebus')
ON CONFLICT (id) DO NOTHING;

INSERT INTO supplier_mixes (id, name, price) VALUES
  ('mix-a', 'Mix A', 64000),
  ('mix-b', 'Mix B', 64000),
  ('mix-c', 'Mix C', 64000),
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
  ('mix-e', 'siomay-mozzarella', 6),
  ('mix-c', 'kuotie', 6),
  ('mix-c', 'lumpia-goreng-ayam', 6),
  ('mix-c', 'wonton', 6),
  ('mix-c', 'ekado', 6),
  ('mix-c', 'kumis-naga', 6)
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
  ('lumpia-kulit-tahu-udang', 'Large', 24, 66000),
  -- Kukus tambahan
  ('siomay-mercon', 'Medium', 30, 69000),
  ('siomay-mercon', 'Large', 24, 69000),
  ('gyoza-ayam', 'Medium', 30, 58000),
  ('gyoza-ayam-udang', 'Medium', 30, 63000),
  ('bakpao-ayam', 'Large', 24, 62000),
  ('bakpao-susu', 'Large', 24, 62000),
  ('bakpao-cokelat', 'Large', 24, 62000),
  ('angsio', 'Large', 24, 68000),
  ('hakau', 'Large', 24, 69000),
  -- Goreng
  ('ayam-bola-keju', 'Regular', 15, 27000),
  ('pangsit-ayam', 'Medium', 30, 53000),
  ('pangsit-udang', 'Medium', 30, 58000),
  ('ekado', 'Large', 24, 63000),
  ('kumis-naga', 'Medium', 30, 63000),
  ('kuotie', 'Large', 24, 63000),
  ('wonton', 'Medium', 30, 64000),
  ('cakue-goreng-udang', 'Large', 24, 64000),
  ('lumpia-goreng-ayam', 'Medium', 30, 63000),
  ('lumpia-goreng-udang', 'Medium', 30, 64000),
  ('lumpia-goreng-keju', 'Large', 24, 67000),
  ('gohyong', 'Medium', 30, 69000),
  -- Rebus
  ('pangsit-ayam-rebus', 'Medium', 30, 64000)
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
