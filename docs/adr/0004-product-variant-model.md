# ADR-0004: Product + Variant Model

**Status:** Draft
**Date:** 2026-07-23

## Context

Model sebelumnya:
- `packages` untuk bundle frozen
- `menu_cara_masak` untuk harga matang
- `menus.base_price` untuk chili oil
- `order_items` + `order_bakar_kukus_items` + `extra_chili_oil` terpisah

Susah nambah produk baru, harga pecah di 3 tempat, order item 3 tabel.

## Keputusan

Ganti ke model **Product → Variant → Composition:**

### Entities

```
product (apa yang dijual)
├─ id, name, unit
├─ type: 'bundle' | 'single' | 'addon'
├─ base_price: harga default

product_variant (varian harga)
├─ product_id
├─ name: 'Bakar' | 'Kukus' | 'Frozen 30pcs' | 'Frozen 24pcs'
├─ price

product_composition (bahan penyusun bundle)
├─ product_id
├─ menu_id (refer ke raw material)
├─ qty

order_item (1 baris = 1 produk yg dibeli)
├─ customer_id
├─ product_id
├─ variant: nama varian (null kalo gak ada)
├─ qty
├─ unit_price (snapshot pas beli)
```

### Mapping model lama → baru

| Lama | Baru |
|------|------|
| `packages` (Halu, When Ya, Solulu) | `product` type=bundle + `product_compositions` |
| `menu_cara_masak` | `product_variant` per menu (Bakar/Kukus/Frozen) |
| `chili-oil` di menus | `product` type=addon |
| `order_items` (frozen) | `order_item` unified |
| `order_bakar_kukus_items` | `order_item` dengan variant |
| `extra_chili_oil` | `order_item` terpisah (product=chili-oil) |

### Yang tetap sama
- `menus` — raw material buat stock & supplier
- `supplier_packs` + `supplier_mixes` + `mix_contents` — supplier pricing
- `inventory` — stok per raw material
- `purchase_orders` + `order_customers` — PO & customer

## Konsekuensi

- Semua order jadi 1 tabel — simple
- Nambah produk baru tinggal insert ke `products`
- Tapi perlu refactor 15+ API handler, store, komponen
- Optimizer perlu update referensi produk `Paket Halu` → product_id
