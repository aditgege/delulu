# ADR-0003: Mobile-First Pre-Order Management App

**Status:** Draft
**Date:** 2026-07-23
**Context:** Diskusi dengan owner — app saat ini hanya kalkulator belanja (optimizer). Bisnis perlu jadi sistem pre-order internal yang dioperasikan dari HP.

## Keputusan

### 1. Mobile-Only (PWA)
- **Tidak bikin native app.** PWA sudah berjalan (Nuxt + Vite PWA plugin), cukup optimasi layout untuk HP.
- Semua interaksi: scroll, tap, form input di layar kecil. No desktop mode.
- Bottom sheet, swipe, drag handle — gesture HP.

### 2. Flexible Flow (Tidak Berurutan)

**Prinsip:** Semua fitur bisa diakses kapan aja, urutan bebas. App cuma dashboard — user atur sendiri ritmenya.

```
┌─────────────────────────────────────┐
│          DASHBOARD HOME             │
│  ➕ Buat PO baru                    │
│  📦 Update stok                     │
│  👥 Daftar customer & pesanan       │
│  💰 Laporan laba                    │
│  📊 Analytics best seller           │
└─────────────────────────────────────┘
```

**Contoh alur user:**

```
Hari ini:     Buat PO "PO 26 Juli" → catet 5 pembeli
Besok pagi:   Input stok terbaru → app rekomendasi belanja
Beli supplier
Sore:         Update status kirim beberapa customer
Besok:        Catet tambahan 2 pembeli → rekomendasi belanja update otomatis
Lusa:         Tutup PO → liat laba 50:50
```

**Aturan:**
- PO bisa dibuat tanpa stok — rekomendasi belanja baru muncul kalo stok udah diisi
- Stok bisa diupdate kapan aja (tiap mau beli supplier, atau abis jualan)
- Status bayar/kirim bebas diubah
- Laba otomatis terhitung setiap ada perubahan
- Laporan bisa liat per PO, per tanggal, atau gabungan beberapa PO

### 3. Manajemen Stok
- Input stok manual tiap buka PO (sesuai kebiasaan sekarang)
- App hitung: stok - kebutuhan = perlu beli
- Notifikasi kalo stok di bawah threshold tertentu

### 4. Keuangan 2 Owner (50:50)
- Setiap PO: Revenue - Modal = Laba
- Laba / 2 = bagian masing-masing owner
- Laporan per PO, per hari, per bulan, kustom tanggal
- Filter: liat 1 PO atau gabungan beberapa PO

### 5. Best Seller Analytics
- Ranking penjualan per menu per PO
- Akumulasi sepanjang waktu
- Biar tau menu apa yang paling laku

## Konsekuensi

**Positif:**
- Owner cukup buka HP, catet pesanan, semua otomatis
- Gak perlu excel lagi
- Bagi hasil transparan — "ini PO laba RpX, separo lo RpY"
- Stok selalu terhitung sebelum belanja — gak kelebihan/kekurangan

**Negatif:**
- Perlu UI ulang di semua halaman (mobile-first)
- Flow input harus ringan — owner jualan sibuk, gak mau ribet
- Stok manual — rawan kalo lupa input

## Glossary

| Istilah | Arti |
|---------|------|
| PO | Pre-Order — gelombang pesanan yang dibuka kapan aja |
| Owner | 2 orang, modal bareng, bagi hasil 50:50 |
| Paket Frozen | Halu, When Ya, Solulu — jualan frozen |
| Matang | Bakar & Kukus — dimsum yang dimasak |
| Ongkir | Biaya kirim, beda tiap pembeli |
| Mix | Paket belanja dari supplier (Mix A, B, E — 30pcs) |
