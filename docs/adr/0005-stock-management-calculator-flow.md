# ADR-0005: Stock Management & Calculator Flow

**Status:** Accepted
**Date:** 2026-07-23

## Context

Diskusi setelah POS refactor — kalkulator belanja perlu diintegrasi ke dashboard, tapi stok masih manual dan user bingung alurnya. Ada 3 opsi stok: refactor model data, buat history tracking, atau cukup pisah halaman aja.

## Keputusan

### 1. Model Data Stok TETAP (Tidak Diubah)

`InventoryEntry { menuId: string, qtyOnHand: number }` sudah cukup. Granularitas raw-material level cocok untuk bisnis reseller frozen. Tidak perlu batch/lot, history, atau pemisahan stok frozen vs matang.

### 2. Halaman Stok Dipisah dari Settings

Settings saat ini campur aduk (supplier, harga, stok). Stok pindah ke halaman sendiri dengan satu tujuan: **update angka stok terkini**. User fokus satu aksi dalam satu waktu.

### 3. Stok Manual — Tidak Otomatis Berkurang

Stok tetap diinput manual. Tidak ada auto-deduction saat PO ditutup. Keputusan ini bisa direvisi nanti jika user merasa perlu otomatis.

### 4. Flow Kalkulator dari Dashboard

```
Dashboard
  ↓ klik "Kalkulator Belanja"
Pilih PO aktif (modal/list)
  ↓
Langsung tampil rekomendasi — stok 0 = beli semua
```

### 5. Rekomendasi Selalu Muncul (Tidak Diblok Stok)

Awalnya dirancang: rekomendasi hanya muncul jika stok terisi (ADR-0003). Tapi setelah dipakai, user merasa lebih praktis rekomendasi langsung muncul dengan stok berapapun. Stok=0 berarti `netNeed = grossNeed` (beli semua), yang merupakan kalkulasi yang benar. Info stok habis tetap terlihat lewat section "⚠️ Perlu Restock".
**Perubahan dari desain awal:** prompt blocking "Update Stok Dulu" dihapus. Rekomendasi langsung tampil.

## Considered Options

### Stock auto-deduction on PO close
Ditolak — user request "biarkan manual". Bisa ditambahkan nanti sebagai fitur optional.

### Stock history table (`inventory_log`)
Ditolak — YAGNI. User cukup lihat angka terkini. History gak nambah nilai buat kalkulasi.

### Separate stock per PO (snapshot)
Ditolak — terlalu kompleks. Stok adalah realitas freezer, bukan per-PO.

## Konsekuensi

- Settings page perlu di-simplify (stok diangkat)
- Halaman stok baru perlu dibuat — daftar menu + input angka + simpan
- Dashboard perlu tombol "Kalkulator Belanja" + PO picker
- Rekomendasi langsung tampil tanpa blocking prompt stok
- Tidak ada perubahan di API atau model data backend — hanya UI refactor
