# Delulul — Domain Glossary

## Produk

| Term | Definisi |
|---|---|
| **Varian Dimsum** / **SKU** | Jenis dimsum individual (contoh: Siomay Ayam, Bakpao Cokelat). Setiap varian punya `id` unik dan `kategori` produk. |
| **Kategori Produk** | Sifat produk: `kukus`, `bento`, `condiment`, `other`. Menentukan grouping stok & procurement. Bukan cara masak. |
| **Paket Frozen** | Paket pre-defined berisi 10 pcs varian campur, frozen, dijual satuan dengan harga tetap. Contoh: Paket Halu (35rb). |

## Menu Baru: Bakar & Kukus

| Term | Definisi |
|---|---|
| **Menu Bakar & Kukus** | Layanan baru: dimsum fresh, dimasak sesaat sebelum disajikan. |
| **Cara Masak** | Metode penyajian: `bakar` (grilled) atau `kukus` (steamed). Setiap varian dimsum bisa dipesan dengan cara masak manapun. |
| **Porsi** | Satuan minimal order bakar/kukus. **1 porsi = 4 pcs varian yang sama.** |
| **Harga Porsi** | Flat per cara masak: Bakar = Rp18.000/porsi, Kukus = Rp16.000/porsi. Berlaku untuk SEMUA varian. |

## Order

| Term | Definisi |
|---|---|
| **Order** | Pesanan customer. Bisa campur: paket frozen + line-item bakar/kukus dalam satu order. |
| **Line Item Frozen** | Satu baris order untuk paket frozen: `{ packageId, qty }`. |
| **Line Item Bakar/Kukus** | Satu baris order untuk menu bakar/kukus: `{ varian, caraMasak, jumlahPorsi }`. 1 porsi = 4 pcs. |
| **Ongkir (shippingFee)** | Biaya pengiriman, diisi manual per order. Bervariasi, tidak ada rumus tetap. |

## Invoice / Nota Pembelian

| Term | Definisi |
|---|---|
| **Invoice / Nota Pembelian** | Ringkasan pesanan per customer yang dishare via WhatsApp. Format: text copy-to-clipboard + image PNG. |
| **Merchant Info** | Data toko hardcode: BCA 2802430397 a.n. LUSIANA ARLAN, brand "Love at first bite / Delulu Dimsum", alamat Jl Saluyu III no.33, telp 082129897952 / 082116815427, IG @dimsumlulu. |
| **Share Invoice** | Aksi dari tombol di card customer → copy text + generate image → buka WhatsApp. |
| **Ongkir (shippingFee)** | Biaya pengiriman per customer, field integer di `CustomerOrder`. Default 0. |

## Pricing

| Komponen | Rumus |
|---|---|
| Subtotal Bakar | ∑ (jumlahPorsi × 18.000) |
| Subtotal Kukus | ∑ (jumlahPorsi × 16.000) |
| Subtotal Frozen | ∑ (qty × hargaPaket) |
| **Total Order** | Subtotal Bakar + Subtotal Kukus + Subtotal Frozen + ongkir |

## Aturan Bisnis

1. Minimal order bakar/kukus: **1 porsi** (4 pcs varian yang sama)
2. Varian yang sama dengan cara masak berbeda dihitung sebagai dua line item terpisah
3. 1 porsi = 4 pcs varian SAMA — tidak bisa campur varian dalam satu porsi
4. Goreng & rebus: tidak dijual, dihapus dari menu
