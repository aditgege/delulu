# Delulu Dimsum — Data Reference

> Ringkasan seluruh data bisnis Delulu Dimsum.  
> Digunakan sebagai acuan seed data, API, dan kalkulator.

---

## 1. Menu Dimsum

| ID                      | Nama                    |
| ----------------------- | ----------------------- |
| hisitkau                | Hisitkau                |
| lumpia-kulit-tahu-ayam  | Lumpia Kulit Tahu Ayam  |
| lumpia-kulit-tahu-udang | Lumpia Kulit Tahu Udang |
| siomay-ayam             | Siomay Ayam             |
| siomay-kepiting         | Siomay Kepiting         |
| siomay-mozzarella       | Siomay Mozzarella       |
| siomay-nori             | Siomay Nori             |
| siomay-seafood          | Siomay Seafood          |
| siomay-udang            | Siomay Udang            |

**Total menu:** 9 varian dimsum

---

## 2. Stok Awal

| Menu                    | Qty (pcs) |
| ----------------------- | --------: |
| Hisitkau                |         8 |
| Lumpia Kulit Tahu Ayam  |        20 |
| Lumpia Kulit Tahu Udang |         0 |
| Siomay Ayam             |         6 |
| Siomay Kepiting         |        10 |
| Siomay Mozzarella       |         6 |
| Siomay Nori             |        18 |
| Siomay Seafood          |         6 |
| Siomay Udang            |         8 |

**Total stok:** **82 pcs**

---

## 3. Supplier Mix

Semua mix harga **Rp64.000**.

| Mix   | Nama    |    Harga |    Isi |
| ----- | ------- | -------: | -----: |
| Mix A | Halu    | Rp64.000 | 30 pcs |
| Mix B | When Ya | Rp64.000 | 30 pcs |
| Mix E | Solulu  | Rp64.000 | 30 pcs |

### Mix A (Halu)

| Menu                    | Qty |
| ----------------------- | --: |
| Siomay Ayam             |   6 |
| Lumpia Kulit Tahu Udang |   6 |
| Siomay Nori             |   6 |
| Siomay Kepiting         |   6 |
| Hisitkau                |   6 |

### Mix B (When Ya)

| Menu                   | Qty |
| ---------------------- | --: |
| Siomay Udang           |   6 |
| Lumpia Kulit Tahu Ayam |   6 |
| Siomay Nori            |   6 |
| Siomay Seafood         |   6 |
| Hisitkau               |   6 |

### Mix E (Solulu)

| Menu                   | Qty |
| ---------------------- | --: |
| Siomay Ayam            |   6 |
| Lumpia Kulit Tahu Ayam |   6 |
| Siomay Nori            |   6 |
| Siomay Kepiting        |   6 |
| Siomay Mozzarella      |   6 |

---

## 4. Paket Frozen

Harga jual: **Rp35.000** per paket (10 pcs).

### Paket Halu

| Menu                    | Qty |
| ----------------------- | --: |
| Siomay Ayam             |   2 |
| Lumpia Kulit Tahu Udang |   2 |
| Siomay Nori             |   2 |
| Siomay Kepiting         |   2 |
| Hisitkau                |   2 |

### Paket When Ya

| Menu                   | Qty |
| ---------------------- | --: |
| Siomay Udang           |   2 |
| Lumpia Kulit Tahu Ayam |   2 |
| Siomay Nori            |   2 |
| Siomay Seafood         |   2 |
| Hisitkau               |   2 |

### Paket Solulu

| Menu                   | Qty |
| ---------------------- | --: |
| Siomay Ayam            |   2 |
| Lumpia Kulit Tahu Ayam |   2 |
| Siomay Nori            |   2 |
| Siomay Kepiting        |   2 |
| Siomay Mozzarella      |   2 |

---

## 5. Menu Siap Saji

| Jenis |    Harga | Isi                    |
| ----- | -------: | ---------------------- |
| Kukus | Rp16.000 | 4 pcs (1 varian) |
| Bakar | Rp18.000 | 4 pcs (1 varian) |

---

## 6. Ringkasan Harga

| Produk       |    Harga |
| ------------ | -------: |
| Supplier Mix | Rp64.000 |
| Paket Frozen | Rp35.000 |
| Kukus        | Rp16.000 |
| Bakar        | Rp18.000 |

---

## 7. HPP

| Item                      |    Nilai |
| ------------------------- | -------: |
| Harga Supplier            | Rp64.000 |
| Isi Supplier              |   30 pcs |
| HPP per pcs               |  Rp2.133 |
| HPP Paket Frozen (10 pcs) | Rp21.333 |

---

## 8. Business Rules

| Produk         | Pemakaian Stok         |
| -------------- | ---------------------- |
| 1 Paket Frozen | 2 pcs per varian       |
| 1 Porsi Kukus  | 4 pcs (satu varian)    |
| 1 Porsi Bakar  | 4 pcs (satu varian)    |

### Rumus Stok

- **Frozen:** `floor(qty_on_hand / 2)` → jumlah paket bisa dibuat
- **Kukus/Bakar:** `floor(qty_on_hand / 4)` → jumlah porsi bisa dibuat

### Alur Pengurangan Stok

**Order Frozen** — setiap paket kurangi 2 pcs per varian di BOM.  
**Order Kukus/Bakar** — kurangi `jumlahPorsi × 4` pcs dari menu terkait.

---

## 9. Lokasi Seed Data

| File | Keterangan |
|------|-----------|
| `server/db/seed.sql` | ~~SQL seed~~ (deleted, pakai TS seed) |
| `server/api/_migrate.ts` | Runtime migration + seed (dijalankan otomatis) |
| `app/data/seed.ts` | TypeScript seed data (referensi) |
