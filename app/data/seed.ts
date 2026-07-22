import type { Package, Menu, SupplierPack, SupplierMix } from '~/types'

export const SEED_MENUS: Menu[] = [
  { id: 'hisitkau', name: 'Hisitkau', unit: 'pcs', category: 'dimsum' },
  { id: 'lumpia-kulit-tahu-ayam', name: 'Lumpia Kulit Tahu Ayam', unit: 'pcs', category: 'dimsum' },
  { id: 'lumpia-kulit-tahu-udang', name: 'Lumpia Kulit Tahu Udang', unit: 'pcs', category: 'dimsum' },
  { id: 'siomay-ayam', name: 'Siomay Ayam', unit: 'pcs', category: 'dimsum' },
  { id: 'siomay-kepiting', name: 'Siomay Kepiting', unit: 'pcs', category: 'dimsum' },
  { id: 'siomay-mozzarella', name: 'Siomay Mozzarella', unit: 'pcs', category: 'dimsum' },
  { id: 'siomay-nori', name: 'Siomay Nori', unit: 'pcs', category: 'dimsum' },
  { id: 'siomay-seafood', name: 'Siomay Seafood', unit: 'pcs', category: 'dimsum' },
  { id: 'siomay-udang', name: 'Siomay Udang', unit: 'pcs', category: 'dimsum' },
]

export const SEED_SUPPLIER_PACKS: SupplierPack[] = [
  { menuId: 'siomay-ayam', label: 'Medium', sizePcs: 30, price: 63000 },
  { menuId: 'siomay-ayam', label: 'Large', sizePcs: 24, price: 63000 },
  { menuId: 'siomay-kepiting', label: 'Medium', sizePcs: 30, price: 63000 },
  { menuId: 'siomay-kepiting', label: 'Large', sizePcs: 24, price: 63000 },
  { menuId: 'siomay-seafood', label: 'Medium', sizePcs: 30, price: 63000 },
  { menuId: 'siomay-seafood', label: 'Large', sizePcs: 24, price: 63000 },
  { menuId: 'siomay-udang', label: 'Medium', sizePcs: 30, price: 64000 },
  { menuId: 'siomay-udang', label: 'Large', sizePcs: 24, price: 64000 },
  { menuId: 'siomay-nori', label: 'Medium', sizePcs: 30, price: 64000 },
  { menuId: 'siomay-nori', label: 'Large', sizePcs: 24, price: 64000 },
  { menuId: 'siomay-mozzarella', label: 'Medium', sizePcs: 30, price: 69000 },
  { menuId: 'siomay-mozzarella', label: 'Large', sizePcs: 24, price: 69000 },
  { menuId: 'hisitkau', label: 'Medium', sizePcs: 30, price: 64000 },
  { menuId: 'hisitkau', label: 'Large', sizePcs: 24, price: 64000 },
  { menuId: 'lumpia-kulit-tahu-ayam', label: 'Medium', sizePcs: 30, price: 65000 },
  { menuId: 'lumpia-kulit-tahu-ayam', label: 'Large', sizePcs: 24, price: 65000 },
  { menuId: 'lumpia-kulit-tahu-udang', label: 'Medium', sizePcs: 30, price: 66000 },
  { menuId: 'lumpia-kulit-tahu-udang', label: 'Large', sizePcs: 24, price: 66000 },
]

export const SEED_PACKAGES: Package[] = [
  {
    id: 'paket-halu',
    name: 'Paket Halu',
    price: 35000,
    bom: [
      { menuId: 'siomay-ayam', qty: 2 },
      { menuId: 'lumpia-kulit-tahu-udang', qty: 2 },
      { menuId: 'siomay-nori', qty: 2 },
      { menuId: 'siomay-kepiting', qty: 2 },
      { menuId: 'hisitkau', qty: 2 },
    ],
  },
  {
    id: 'paket-when-ya',
    name: 'Paket When Ya',
    price: 35000,
    bom: [
      { menuId: 'siomay-udang', qty: 2 },
      { menuId: 'lumpia-kulit-tahu-ayam', qty: 2 },
      { menuId: 'siomay-nori', qty: 2 },
      { menuId: 'siomay-seafood', qty: 2 },
      { menuId: 'hisitkau', qty: 2 },
    ],
  },
  {
    id: 'paket-solulu',
    name: 'Paket Solulu',
    price: 35000,
    bom: [
      { menuId: 'siomay-ayam', qty: 2 },
      { menuId: 'lumpia-kulit-tahu-ayam', qty: 2 },
      { menuId: 'siomay-nori', qty: 2 },
      { menuId: 'siomay-kepiting', qty: 2 },
      { menuId: 'siomay-mozzarella', qty: 2 },
    ],
  },
]

// --- Supplier Mix Paket (bundle of 6x5 = 30 pcs) ---

export const SEED_MIXES: SupplierMix[] = [
  {
    id: 'mix-a',
    name: 'Mix A',
    price: 64000,
    contents: [
      { menuId: 'siomay-ayam', qty: 6 },
      { menuId: 'lumpia-kulit-tahu-udang', qty: 6 },
      { menuId: 'siomay-nori', qty: 6 },
      { menuId: 'siomay-kepiting', qty: 6 },
      { menuId: 'hisitkau', qty: 6 },
    ],
  },
  {
    id: 'mix-b',
    name: 'Mix B',
    price: 64000,
    contents: [
      { menuId: 'siomay-udang', qty: 6 },
      { menuId: 'lumpia-kulit-tahu-ayam', qty: 6 },
      { menuId: 'siomay-nori', qty: 6 },
      { menuId: 'siomay-seafood', qty: 6 },
      { menuId: 'hisitkau', qty: 6 },
    ],
  },
  {
    id: 'mix-e',
    name: 'Mix E',
    price: 64000,
    contents: [
      { menuId: 'siomay-ayam', qty: 6 },
      { menuId: 'lumpia-kulit-tahu-ayam', qty: 6 },
      { menuId: 'siomay-nori', qty: 6 },
      { menuId: 'siomay-kepiting', qty: 6 },
      { menuId: 'siomay-mozzarella', qty: 6 },
    ],
  },
]

// SKUs that ARE covered by Mixes (for quick lookup)
export const MIX_COVERED_MENUS = new Set([
  'siomay-ayam', 'siomay-kepiting', 'siomay-seafood', 'siomay-udang',
  'siomay-nori', 'siomay-mozzarella',
  'lumpia-kulit-tahu-ayam', 'lumpia-kulit-tahu-udang', 'hisitkau',
])
