# Delulu Dimsum — Data Reference

> Ringkasan seluruh data bisnis Delulu Dimsum.
> Source of truth: `server/api/_migrate.ts` (seed).

---

## 1. Products (Apa yang Dijual)

### Bundle Frozen

| Product ID   | Harga Jual |
|-------------|-----------:|
| paket-halu   | Rp35.000   |
| paket-when-ya| Rp35.000   |
| paket-solulu | Rp35.000   |

- **Harga**: Rp35.000/paket (10 pcs)
- **HPP**: Rp21.333/paket

### Single Matang (per porsi = 4 pcs)

| Menu                    | Bakar    | Kukus    |
|-------------------------|---------:|---------:|
| Siomay Ayam             | Rp18.000 | Rp16.000 |
| Siomay Kepiting         | Rp18.000 | Rp16.000 |
| Siomay Mozzarella       | Rp18.000 | Rp16.000 |
| Siomay Nori             | Rp18.000 | Rp16.000 |
| Siomay Seafood          | Rp18.000 | Rp16.000 |
| Siomay Udang            | Rp18.000 | Rp16.000 |
| Hisitkau                | Rp18.000 | Rp16.000 |
| Lumpia Kulit Tahu Ayam  | Rp18.000 | Rp16.000 |
| Lumpia Kulit Tahu Udang | Rp18.000 | Rp16.000 |

### Addon

| Product   | Harga    |
|-----------|---------:|
| Chili Oil | Rp2.000  |

---

## 2. Supplier Mix

| Mix   | Harga    | Isi     |
|-------|---------:|:--------|
| Mix A | Rp64.000 | 30 pcs  |
| Mix B | Rp64.000 | 30 pcs  |
| Mix E | Rp64.000 | 30 pcs  |

### Mix A (Halu)
Siomay Ayam(6), Lumpia Kulit Tahu Udang(6), Siomay Nori(6), Siomay Kepiting(6), Hisitkau(6)

### Mix B (When Ya)
Siomay Udang(6), Lumpia Kulit Tahu Ayam(6), Siomay Nori(6), Siomay Seafood(6), Hisitkau(6)

### Mix E (Solulu)
Siomay Ayam(6), Lumpia Kulit Tahu Ayam(6), Siomay Nori(6), Siomay Kepiting(6), Siomay Mozzarella(6)

---

## 3. Supplier Pack (per Menu)

| Menu                    | Medium (30 pcs) | Large (24 pcs) |
|-------------------------|----------------:|----------------:|
| Siomay Ayam             |         Rp63.000|        Rp63.000 |
| Siomay Kepiting         |         Rp63.000|        Rp63.000 |
| Siomay Seafood          |         Rp63.000|        Rp63.000 |
| Siomay Udang            |         Rp64.000|        Rp64.000 |
| Siomay Nori             |         Rp64.000|        Rp64.000 |
| Siomay Mozzarella       |         Rp69.000|        Rp69.000 |
| Hisitkau                |         Rp64.000|        Rp64.000 |
| Lumpia Kulit Tahu Ayam  |         Rp65.000|        Rp65.000 |
| Lumpia Kulit Tahu Udang |         Rp66.000|        Rp66.000 |

---

## 4. Raw Materials (Menus)

9 menu dimsum + chili oil (condiment). Digunakan sebagai:
- Bahan baku untuk inventory
- Referensi komposisi produk (BOM)
- Tracking stok

---

## 5. Business Rules

| Produk         | Pemakaian Stok         |
| -------------- | -----------------------|
| 1 Paket Frozen | 2 pcs per varian di BOM|
| 1 Porsi Kukus  | 4 pcs (satu varian)    |
| 1 Porsi Bakar  | 4 pcs (satu varian)    |

### Rumus Stok
- **Frozen:** `floor(qty_on_hand / 2)` → jumlah paket bisa dibuat
- **Kukus/Bakar:** `floor(qty_on_hand / 4)` → jumlah porsi bisa dibuat

---

## 6. HPP Constants

```ts
BAKAR_PRICE = 18000   // per porsi
KUKUS_PRICE = 16000   // per porsi
FROZEN_PRICE = 35000  // per paket
CHILI_OIL_PRICE = 2000
MIX_PRICE = 64000     // per mix supplier
```

HPP per pcs dihitung dari `supplier_packs.price / supplier_packs.size_pcs`.
