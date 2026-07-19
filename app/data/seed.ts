import type { Package, SKU, SupplierPack, SupplierMix } from '~/types'

export const SEED_SKUS: SKU[] = [
  // Kukus
  { id: 'siomay-ayam', name: 'Siomay Ayam', unit: 'pcs' },
  { id: 'siomay-kepiting', name: 'Siomay Kepiting', unit: 'pcs' },
  { id: 'siomay-seafood', name: 'Siomay Seafood', unit: 'pcs' },
  { id: 'siomay-udang', name: 'Siomay Udang', unit: 'pcs' },
  { id: 'siomay-nori', name: 'Siomay Nori', unit: 'pcs' },
  { id: 'siomay-mozzarella', name: 'Siomay Mozzarella', unit: 'pcs' },
  { id: 'siomay-mercon', name: 'Siomay Mercon', unit: 'pcs' },
  { id: 'gyoza-ayam', name: 'Gyoza Ayam', unit: 'pcs' },
  { id: 'gyoza-ayam-udang', name: 'Gyoza Ayam Udang', unit: 'pcs' },
  { id: 'bakpao-ayam', name: 'Bakpao Ayam', unit: 'pcs' },
  { id: 'bakpao-susu', name: 'Bakpao Susu', unit: 'pcs' },
  { id: 'bakpao-cokelat', name: 'Bakpao Cokelat', unit: 'pcs' },
  { id: 'shisitkau', name: 'Shisitkau', unit: 'pcs' },
  { id: 'lumpia-tahu-ayam', name: 'Lumpia Kulit Tahu Ayam', unit: 'pcs' },
  { id: 'lumpia-tahu-udang', name: 'Lumpia Kulit Tahu Udang', unit: 'pcs' },
  { id: 'angsio', name: 'Angsio', unit: 'pcs' },
  { id: 'hakau', name: 'Hakau', unit: 'pcs' },
  // Goreng
  { id: 'ayam-bola-keju', name: 'Ayam Bola Keju', unit: 'pcs' },
  { id: 'pangsit-ayam', name: 'Pangsit Ayam', unit: 'pcs' },
  { id: 'pangsit-udang', name: 'Pangsit Udang', unit: 'pcs' },
  { id: 'ekado', name: 'Ekado', unit: 'pcs' },
  { id: 'kumis-naga', name: 'Kumis Naga', unit: 'pcs' },
  { id: 'kuotie', name: 'Kuotie', unit: 'pcs' },
  { id: 'wonton', name: 'Wonton', unit: 'pcs' },
  { id: 'cakue-goreng-udang', name: 'Cakue Goreng Udang', unit: 'pcs' },
  { id: 'lumpia-goreng-ayam', name: 'Lumpia Goreng Ayam', unit: 'pcs' },
  { id: 'lumpia-goreng-udang', name: 'Lumpia Goreng Udang', unit: 'pcs' },
  { id: 'lumpia-goreng-keju', name: 'Lumpia Goreng Ayam Keju Lumer', unit: 'pcs' },
  { id: 'gohyong', name: 'Gohyong', unit: 'pcs' },
  // Rebus
  { id: 'pangsit-ayam-rebus', name: 'Pangsit Ayam Rebus', unit: 'pcs' },
  // Bento
  { id: 'chicken-drumstick', name: 'Chicken Drumstick', unit: 'pcs' },
  { id: 'kani-roll', name: 'Kani Roll', unit: 'pcs' },
  { id: 'egg-chicken-roll', name: 'Egg Chicken Roll', unit: 'pcs' },
  { id: 'kaki-naga', name: 'Kaki Naga', unit: 'pcs' },
  { id: 'chicken-katsu', name: 'Chicken Katsu', unit: 'pcs' },
]

export const SEED_SUPPLIER_PACKS: SupplierPack[] = [
  // Kukus
  { skuId: 'siomay-ayam', label: 'Medium', sizePcs: 30, price: 63000 },
  { skuId: 'siomay-ayam', label: 'Large', sizePcs: 24, price: 63000 },
  { skuId: 'siomay-kepiting', label: 'Medium', sizePcs: 30, price: 63000 },
  { skuId: 'siomay-kepiting', label: 'Large', sizePcs: 24, price: 63000 },
  { skuId: 'siomay-seafood', label: 'Medium', sizePcs: 30, price: 63000 },
  { skuId: 'siomay-seafood', label: 'Large', sizePcs: 24, price: 63000 },
  { skuId: 'siomay-udang', label: 'Medium', sizePcs: 30, price: 64000 },
  { skuId: 'siomay-udang', label: 'Large', sizePcs: 24, price: 64000 },
  { skuId: 'siomay-nori', label: 'Medium', sizePcs: 30, price: 64000 },
  { skuId: 'siomay-nori', label: 'Large', sizePcs: 24, price: 64000 },
  { skuId: 'siomay-mozzarella', label: 'Medium', sizePcs: 30, price: 69000 },
  { skuId: 'siomay-mozzarella', label: 'Large', sizePcs: 24, price: 69000 },
  { skuId: 'siomay-mercon', label: 'Medium', sizePcs: 30, price: 69000 },
  { skuId: 'siomay-mercon', label: 'Large', sizePcs: 24, price: 69000 },
  { skuId: 'gyoza-ayam', label: 'Medium', sizePcs: 30, price: 58000 },
  { skuId: 'gyoza-ayam-udang', label: 'Medium', sizePcs: 30, price: 63000 },
  { skuId: 'bakpao-ayam', label: 'Large', sizePcs: 24, price: 62000 },
  { skuId: 'bakpao-susu', label: 'Large', sizePcs: 24, price: 62000 },
  { skuId: 'bakpao-cokelat', label: 'Large', sizePcs: 24, price: 62000 },
  { skuId: 'shisitkau', label: 'Medium', sizePcs: 30, price: 64000 },
  { skuId: 'shisitkau', label: 'Large', sizePcs: 24, price: 64000 },
  { skuId: 'lumpia-tahu-ayam', label: 'Medium', sizePcs: 30, price: 65000 },
  { skuId: 'lumpia-tahu-ayam', label: 'Large', sizePcs: 24, price: 65000 },
  { skuId: 'lumpia-tahu-udang', label: 'Medium', sizePcs: 30, price: 66000 },
  { skuId: 'lumpia-tahu-udang', label: 'Large', sizePcs: 24, price: 66000 },
  { skuId: 'angsio', label: 'Large', sizePcs: 24, price: 68000 },
  { skuId: 'hakau', label: 'Large', sizePcs: 24, price: 69000 },
  // Goreng
  { skuId: 'ayam-bola-keju', label: 'Regular', sizePcs: 15, price: 27000 },
  { skuId: 'pangsit-ayam', label: 'Medium', sizePcs: 30, price: 53000 },
  { skuId: 'pangsit-udang', label: 'Medium', sizePcs: 30, price: 58000 },
  { skuId: 'ekado', label: 'Large', sizePcs: 24, price: 63000 },
  { skuId: 'kumis-naga', label: 'Medium', sizePcs: 30, price: 63000 },
  { skuId: 'kumis-naga', label: 'Large', sizePcs: 24, price: 63000 },
  { skuId: 'kuotie', label: 'Medium', sizePcs: 30, price: 63000 },
  { skuId: 'kuotie', label: 'Large', sizePcs: 24, price: 63000 },
  { skuId: 'wonton', label: 'Medium', sizePcs: 30, price: 64000 },
  { skuId: 'wonton', label: 'Large', sizePcs: 24, price: 64000 },
  { skuId: 'cakue-goreng-udang', label: 'Large', sizePcs: 24, price: 64000 },
  { skuId: 'lumpia-goreng-ayam', label: 'Medium', sizePcs: 30, price: 63000 },
  { skuId: 'lumpia-goreng-ayam', label: 'Large', sizePcs: 24, price: 63000 },
  { skuId: 'lumpia-goreng-udang', label: 'Medium', sizePcs: 30, price: 64000 },
  { skuId: 'lumpia-goreng-udang', label: 'Large', sizePcs: 24, price: 64000 },
  { skuId: 'lumpia-goreng-keju', label: 'Large', sizePcs: 24, price: 67000 },
  { skuId: 'gohyong', label: 'Medium', sizePcs: 30, price: 69000 },
  // Rebus
  { skuId: 'pangsit-ayam-rebus', label: 'Medium', sizePcs: 30, price: 64000 },
  // Bento
  { skuId: 'chicken-drumstick', label: 'Regular', sizePcs: 10, price: 24000 },
  { skuId: 'kani-roll', label: 'Regular', sizePcs: 12, price: 24000 },
  { skuId: 'egg-chicken-roll', label: 'Regular', sizePcs: 12, price: 25000 },
  { skuId: 'kaki-naga', label: 'Regular', sizePcs: 10, price: 28000 },
  { skuId: 'chicken-katsu', label: 'Regular', sizePcs: 500, price: 41000 },
]

export const SEED_PACKAGES: Package[] = [
  {
    id: 'paket-halu',
    name: 'Paket Halu',
    bom: [
      { skuId: 'siomay-ayam', qty: 1 },
      { skuId: 'lumpia-tahu-udang', qty: 1 },
      { skuId: 'siomay-nori', qty: 1 },
      { skuId: 'siomay-kepiting', qty: 1 },
      { skuId: 'shisitkau', qty: 1 },
    ],
  },
  {
    id: 'paket-when-ya',
    name: 'Paket When Ya',
    bom: [
      { skuId: 'siomay-udang', qty: 1 },
      { skuId: 'lumpia-tahu-ayam', qty: 1 },
      { skuId: 'siomay-nori', qty: 1 },
      { skuId: 'siomay-seafood', qty: 1 },
      { skuId: 'shisitkau', qty: 1 },
    ],
  },
  {
    id: 'paket-solulu',
    name: 'Paket Solulu',
    bom: [
      { skuId: 'siomay-ayam', qty: 1 },
      { skuId: 'lumpia-tahu-ayam', qty: 1 },
      { skuId: 'siomay-nori', qty: 1 },
      { skuId: 'siomay-kepiting', qty: 1 },
      { skuId: 'siomay-mozzarella', qty: 1 },
    ],
  },
]

// ——— Supplier Mix Paket (bundle of 6×5 = 30 pcs) ———

export const SEED_MIXES: SupplierMix[] = [
  {
    id: 'mix-a',
    name: 'Mix A',
    price: 64000,
    contents: [
      { skuId: 'siomay-ayam', qty: 6 },
      { skuId: 'lumpia-tahu-udang', qty: 6 },
      { skuId: 'siomay-nori', qty: 6 },
      { skuId: 'siomay-kepiting', qty: 6 },
      { skuId: 'shisitkau', qty: 6 },
    ],
  },
  {
    id: 'mix-b',
    name: 'Mix B',
    price: 64000,
    contents: [
      { skuId: 'siomay-udang', qty: 6 },
      { skuId: 'lumpia-tahu-ayam', qty: 6 },
      { skuId: 'siomay-nori', qty: 6 },
      { skuId: 'siomay-seafood', qty: 6 },
      { skuId: 'shisitkau', qty: 6 },
    ],
  },
  {
    id: 'mix-e',
    name: 'Mix E',
    price: 64000,
    contents: [
      { skuId: 'siomay-ayam', qty: 6 },
      { skuId: 'lumpia-tahu-ayam', qty: 6 },
      { skuId: 'siomay-nori', qty: 6 },
      { skuId: 'siomay-kepiting', qty: 6 },
      { skuId: 'siomay-mozzarella', qty: 6 },
    ],
  },
  {
    id: 'mix-c',
    name: 'Mix C',
    price: 64000,
    contents: [
      { skuId: 'kuotie', qty: 6 },
      { skuId: 'lumpia-goreng-ayam', qty: 6 },
      { skuId: 'wonton', qty: 6 },
      { skuId: 'ekado', qty: 6 },
      { skuId: 'kumis-naga', qty: 6 },
    ],
  },
]

// ——— Chili Oil & other individual packs (not in Mix) ———

export const EXTRA_SUPPLIER_PACKS: SupplierPack[] = [
  { skuId: 'chili-oil-80', label: '80 ml', sizePcs: 1, price: 12000 },
  { skuId: 'chili-oil-500', label: '500 ml', sizePcs: 1, price: 47000 },
  { skuId: 'chili-oil-1l', label: '1 Liter', sizePcs: 1, price: 83000 },
]

export const CHILI_OIL_SKUS: SKU[] = [
  { id: 'chili-oil-80', name: 'Chili Oil 80 ml', unit: 'botol' },
  { id: 'chili-oil-500', name: 'Chili Oil 500 ml', unit: 'botol' },
  { id: 'chili-oil-1l', name: 'Chili Oil 1 Liter', unit: 'botol' },
]

// SKUs that ARE covered by Mixes (for quick lookup)
export const MIX_COVERED_SKUS = new Set([
  'siomay-ayam', 'siomay-kepiting', 'siomay-seafood', 'siomay-udang',
  'siomay-nori', 'siomay-mozzarella', 'siomay-mercon',
  'lumpia-tahu-ayam', 'lumpia-tahu-udang', 'shisitkau',
  'kuotie', 'lumpia-goreng-ayam', 'wonton', 'ekado', 'kumis-naga',
])
