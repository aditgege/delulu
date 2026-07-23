import { describe, it, expect } from 'vitest'
import {
  computeNeeds, optimizeMixes, buildMixRecommendation,
  computeFullRecommendation, findOptimalPacks, buildMenuRecommendations,
  optimizeWasteToPackages,
} from './optimizer'
import { PORSI_PCS } from '~/types'
import type {
  Package, SupplierMix, Menu, InventoryEntry, OrderLine, BakarKukusLine,
  SupplierPack, MenuNeed,
} from '~/types'

// ─── Fixtures: 9 core menus ───
const MENUS: Menu[] = [
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

const mem = (id: string) => MENUS.find(m => m.id === id)!

// ─── Fixtures: 3 frozen packages ───
const PACKAGES: Package[] = [
  {
    id: 'paket-halu', name: 'Paket Halu', price: 35000,
    bom: [
      { menuId: 'siomay-ayam', qty: 2 }, { menuId: 'lumpia-kulit-tahu-udang', qty: 2 },
      { menuId: 'siomay-nori', qty: 2 }, { menuId: 'siomay-kepiting', qty: 2 },
      { menuId: 'hisitkau', qty: 2 },
    ],
  },
  {
    id: 'paket-when-ya', name: 'Paket When Ya', price: 35000,
    bom: [
      { menuId: 'siomay-udang', qty: 2 }, { menuId: 'lumpia-kulit-tahu-ayam', qty: 2 },
      { menuId: 'siomay-nori', qty: 2 }, { menuId: 'siomay-seafood', qty: 2 },
      { menuId: 'hisitkau', qty: 2 },
    ],
  },
  {
    id: 'paket-solulu', name: 'Paket Solulu', price: 35000,
    bom: [
      { menuId: 'siomay-ayam', qty: 2 }, { menuId: 'lumpia-kulit-tahu-ayam', qty: 2 },
      { menuId: 'siomay-nori', qty: 2 }, { menuId: 'siomay-kepiting', qty: 2 },
      { menuId: 'siomay-mozzarella', qty: 2 },
    ],
  },
]

// ─── Fixtures: 3 supplier mixes ───
const MIXES: SupplierMix[] = [
  {
    id: 'mix-a', name: 'Mix A', price: 64000,
    contents: [
      { menuId: 'siomay-ayam', qty: 6 }, { menuId: 'lumpia-kulit-tahu-udang', qty: 6 },
      { menuId: 'siomay-nori', qty: 6 }, { menuId: 'siomay-kepiting', qty: 6 },
      { menuId: 'hisitkau', qty: 6 },
    ],
  },
  {
    id: 'mix-b', name: 'Mix B', price: 64000,
    contents: [
      { menuId: 'siomay-udang', qty: 6 }, { menuId: 'lumpia-kulit-tahu-ayam', qty: 6 },
      { menuId: 'siomay-nori', qty: 6 }, { menuId: 'siomay-seafood', qty: 6 },
      { menuId: 'hisitkau', qty: 6 },
    ],
  },
  {
    id: 'mix-e', name: 'Mix E', price: 64000,
    contents: [
      { menuId: 'siomay-ayam', qty: 6 }, { menuId: 'lumpia-kulit-tahu-ayam', qty: 6 },
      { menuId: 'siomay-nori', qty: 6 }, { menuId: 'siomay-kepiting', qty: 6 },
      { menuId: 'siomay-mozzarella', qty: 6 },
    ],
  },
]

// ─── Fixtures: supplier packs (Medium 30pcs, Large 24pcs) ───
const SUPPLIER_PACKS: SupplierPack[] = [
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

// ─── Fixtures: inventory (user's seed data) ───
const INVENTORY: InventoryEntry[] = [
  { menuId: 'hisitkau', qtyOnHand: 8 },
  { menuId: 'lumpia-kulit-tahu-ayam', qtyOnHand: 20 },
  { menuId: 'lumpia-kulit-tahu-udang', qtyOnHand: 0 },
  { menuId: 'siomay-ayam', qtyOnHand: 6 },
  { menuId: 'siomay-kepiting', qtyOnHand: 10 },
  { menuId: 'siomay-mozzarella', qtyOnHand: 6 },
  { menuId: 'siomay-nori', qtyOnHand: 18 },
  { menuId: 'siomay-seafood', qtyOnHand: 6 },
  { menuId: 'siomay-udang', qtyOnHand: 8 },
]

// ─── Scenario: 10 frozen (Halu 3, When Ya 4, Solulu 3) + 8 porsi matang ───
const SCENARIO_FROZEN_LINES: OrderLine[] = [
  { packageId: 'paket-halu', qty: 3 },
  { packageId: 'paket-when-ya', qty: 4 },
  { packageId: 'paket-solulu', qty: 3 },
]

const SCENARIO_BAKAR_KUKUS_LINES: BakarKukusLine[] = [
  { menuId: 'siomay-nori', caraMasak: 'bakar', jumlahPorsi: 2 },
  { menuId: 'siomay-mozzarella', caraMasak: 'bakar', jumlahPorsi: 2 },
  { menuId: 'siomay-ayam', caraMasak: 'kukus', jumlahPorsi: 2 },
  { menuId: 'lumpia-kulit-tahu-ayam', caraMasak: 'bakar', jumlahPorsi: 1 },
  { menuId: 'siomay-mozzarella', caraMasak: 'kukus', jumlahPorsi: 1 },
]

// ============================================================================
// TEST 1: computeNeeds — grossNeed per menu
// ============================================================================
describe('computeNeeds — scenario 10 frozen + 8 matang', () => {
  const needs = computeNeeds(SCENARIO_FROZEN_LINES, SCENARIO_BAKAR_KUKUS_LINES, PACKAGES, MENUS, INVENTORY)

  it('total grossNeed = 132 pcs', () => {
    const total = needs.reduce((s, n) => s + n.grossNeed, 0)
    expect(total).toBe(132)
  })

  // Frozen: Halu(6+6+6+6+6)*3=90, When Ya(6+6+6+6+6)*4=120, Solulu(6+6+6+6+6)*3=90
  // Matang: Nori 2*4+ Mozza 2*4 + Ayam 2*4 + LKT Ayam 1*4 + Mozza 1*4 = 8+8+8+4+4=32
  // Total: 90+120+90+32=332? Wait that's wrong.
  // Actually: each menu from frozen: Halu x3 = Ayam 6+Udang 6+Nori 6+Kepiting 6+Hisitkau 6 = 30 each menu
  // When Ya x4 = Udang 8+Seafood 8+Nori 8+Hisitkau 8+LKT Ayam 8 = 40 each menu
  // Solulu x3 = Ayam 6+Kepiting 6+Nori 6+Mozza 6+LKT Ayam 6
  // Matang = Nori 8 + Mozza 8 + Ayam 8 + LKT Ayam 4 + Mozza 4
  // Totals:
  // Hisitkau = 6+8+0 = 14
  // LKT Ayam = 0+8+6+4(from matang) = 18
  // LKT Udang = 6+0+0 = 6
  // Ayam = 6+0+6+8 = 20
  // Kepiting = 6+0+6 = 12
  // Mozza = 0+0+6+8+4 = 18
  // Nori = 6+8+6+8 = 28
  // Seafood = 0+8+0 = 8
  // Udang = 0+8+0 = 8
  // Total = 14+18+6+20+12+18+28+8+8 = 132 ✓

  it('Hisitkau grossNeed = 14', () => {
    const n = needs.find(x => x.menuId === 'hisitkau')!
    expect(n.grossNeed).toBe(14)
    expect(n.stockOnHand).toBe(8)
    expect(n.netNeed).toBe(6)
  })

  it('LKT Ayam grossNeed = 18', () => {
    const n = needs.find(x => x.menuId === 'lumpia-kulit-tahu-ayam')!
    expect(n.grossNeed).toBe(18)
    expect(n.stockOnHand).toBe(20)
    expect(n.netNeed).toBe(0) // cukup
  })

  it('LKT Udang grossNeed = 6', () => {
    const n = needs.find(x => x.menuId === 'lumpia-kulit-tahu-udang')!
    expect(n.grossNeed).toBe(6)
    expect(n.stockOnHand).toBe(0)
    expect(n.netNeed).toBe(6)
  })

  it('Siomay Ayam grossNeed = 20', () => {
    const n = needs.find(x => x.menuId === 'siomay-ayam')!
    expect(n.grossNeed).toBe(20)
    expect(n.stockOnHand).toBe(6)
    expect(n.netNeed).toBe(14)
  })

  it('Siomay Kepiting grossNeed = 12', () => {
    const n = needs.find(x => x.menuId === 'siomay-kepiting')!
    expect(n.grossNeed).toBe(12)
    expect(n.stockOnHand).toBe(10)
    expect(n.netNeed).toBe(2)
  })

  it('Siomay Mozzarella grossNeed = 18', () => {
    const n = needs.find(x => x.menuId === 'siomay-mozzarella')!
    expect(n.grossNeed).toBe(18)
    expect(n.stockOnHand).toBe(6)
    expect(n.netNeed).toBe(12)
  })

  it('Siomay Nori grossNeed = 28', () => {
    const n = needs.find(x => x.menuId === 'siomay-nori')!
    expect(n.grossNeed).toBe(28)
    expect(n.stockOnHand).toBe(18)
    expect(n.netNeed).toBe(10)
  })

  it('Siomay Seafood grossNeed = 8', () => {
    const n = needs.find(x => x.menuId === 'siomay-seafood')!
    expect(n.grossNeed).toBe(8)
    expect(n.stockOnHand).toBe(6)
    expect(n.netNeed).toBe(2)
  })

  it('Siomay Udang grossNeed = 8', () => {
    const n = needs.find(x => x.menuId === 'siomay-udang')!
    expect(n.grossNeed).toBe(8)
    expect(n.stockOnHand).toBe(8)
    expect(n.netNeed).toBe(0) // cukup
  })
})

// ============================================================================
// TEST 2: optimizeMixes — harus nemu Mix A×1 + Mix B×1 + Mix E×2
// ============================================================================
describe('optimizeMixes — scenario 10 frozen + 8 matang', () => {
  const needs = computeNeeds(SCENARIO_FROZEN_LINES, SCENARIO_BAKAR_KUKUS_LINES, PACKAGES, MENUS, INVENTORY)
  const mixOption = optimizeMixes(needs, MIXES)

  it('finds a valid mix combination', () => {
    expect(mixOption).not.toBeNull()
  })

  it('Mix A = 1, Mix B = 1, Mix E = 2', () => {
    expect(mixOption!.counts['mix-a']).toBe(1)
    expect(mixOption!.counts['mix-b']).toBe(1)
    expect(mixOption!.counts['mix-e']).toBe(2)
  })

  it('total cost = 64K × 4 = 256.000', () => {
    expect(mixOption!.totalCost).toBe(256000)
  })

  it('total units = 4 × 30 = 120 pcs', () => {
    expect(mixOption!.totalUnits).toBe(120)
  })

  // Verify provision per menu from Mix A×1 + B×1 + E×2:
  // Ayam: A:6 + E:6×2=12 → 18
  // Kepiting: A:6 + E:12 → 18
  // Nori: A:6 + B:6 + E:12 → 24
  // Hisitkau: A:6 + B:6 → 12
  // LKT Udang: A:6 → 6
  // Udang: B:6 → 6
  // Seafood: B:6 → 6
  // LKT Ayam: B:6 + E:12 → 18
  // Mozza: E:12 → 12

  it('Siomay Ayam provision = 18 (from A×1 + E×2)', () => {
    // Mix A = Ayam 6, Mix E×2 = Ayam 12 → 18
    const mixRec = buildMixRecommendation(needs, MIXES, mixOption!, PACKAGES)
    const ayam = mixRec.skuDetails.find(d => d.menuId === 'siomay-ayam')
    expect(ayam).toBeDefined()
    expect(ayam!.provided).toBe(18) // 6(A) + 12(E)
  })

  it('Siomay Nori provision = 24 (from A×1 + B×1 + E×2)', () => {
    const mixRec = buildMixRecommendation(needs, MIXES, mixOption!, PACKAGES)
    const nori = mixRec.skuDetails.find(d => d.menuId === 'siomay-nori')
    expect(nori).toBeDefined()
    expect(nori!.provided).toBe(24) // 6(A) + 6(B) + 12(E)
    expect(nori!.waste).toBe(14) // 24 - netNeed 10
  })
})

// ============================================================================
// TEST 3: computeFullRecommendation — end-to-end
// ============================================================================
describe('computeFullRecommendation — end-to-end', () => {
  const result = computeFullRecommendation(
    SCENARIO_FROZEN_LINES, SCENARIO_BAKAR_KUKUS_LINES,
    PACKAGES, MENUS, INVENTORY, SUPPLIER_PACKS, MIXES,
  )

  it('mix recommendation exists', () => {
    expect(result.mixRecommendation).not.toBeNull()
  })

  it('mixes are Mix A×1 + Mix B×1 + Mix E×2', () => {
    const m = result.mixRecommendation!
    expect(m.mixes.length).toBe(3)
    const mixA = m.mixes.find(mx => mx.mixId === 'mix-a')!
    const mixB = m.mixes.find(mx => mx.mixId === 'mix-b')!
    const mixE = m.mixes.find(mx => mx.mixId === 'mix-e')!
    expect(mixA.qty).toBe(1)
    expect(mixB.qty).toBe(1)
    expect(mixE.qty).toBe(2)
  })

  it('mix total cost = 256.000', () => {
    expect(result.mixRecommendation!.totalCost).toBe(256000)
  })

  it('no individual recommendations needed (mixes cover all)', () => {
    // Mix A+B+E×2 covers all 9 menus. No singles should be needed.
    expect(result.individualRecommendations.length).toBe(0)
  })

  it('grand total = 256.000', () => {
    expect(result.grandTotalCost).toBe(256000)
  })

  it('waste is acceptable (>0, leftovers are good)', () => {
    // Waste = extra pcs beyond net need
    expect(result.totalWaste).toBeGreaterThan(0)
    // Verify waste for Nori: provision 24 - netNeed 10 = 14
    const noriWaste = result.mixRecommendation!.skuDetails.find(d => d.menuId === 'siomay-nori')!.waste
    expect(noriWaste).toBe(14)
  })
})

// ============================================================================
// TEST 4: sisaPerMenu = stockOnHand + provision - grossNeed (mirror of UI)
// ============================================================================
describe('sisa per menu (stock + provision - grossNeed)', () => {
  const needs = computeNeeds(SCENARIO_FROZEN_LINES, SCENARIO_BAKAR_KUKUS_LINES, PACKAGES, MENUS, INVENTORY)
  const mixOption = optimizeMixes(needs, MIXES)!

  // Build provision map
  const mixProv = new Map<string, number>()
  for (const [mixId, qty] of Object.entries(mixOption.counts)) {
    if (qty === 0) continue
    const mix = MIXES.find(m => m.id === mixId)!
    for (const c of mix.contents) {
      mixProv.set(c.menuId, (mixProv.get(c.menuId) || 0) + c.qty * qty)
    }
  }

  it('Hisitkau: stock 8 + mix 12 - need 14 = 6', () => {
    const need = needs.find(n => n.menuId === 'hisitkau')!
    const sisa = need.stockOnHand + (mixProv.get('hisitkau') || 0) - need.grossNeed
    expect(sisa).toBe(6)  // 8 + 12 - 14
  })

  it('Siomay Ayam: stock 6 + mix 18 - need 20 = 4', () => {
    const need = needs.find(n => n.menuId === 'siomay-ayam')!
    const sisa = need.stockOnHand + (mixProv.get('siomay-ayam') || 0) - need.grossNeed
    expect(sisa).toBe(4)  // 6 + 18 - 20
  })

  it('Siomay Mozzarella: stock 6 + mix 12 - need 18 = 0', () => {
    const need = needs.find(n => n.menuId === 'siomay-mozzarella')!
    const sisa = need.stockOnHand + (mixProv.get('siomay-mozzarella') || 0) - need.grossNeed
    expect(sisa).toBe(0)  // 6 + 12 - 18
  })

  it('Siomay Kepiting: stock 10 + mix 18 - need 12 = 16', () => {
    const need = needs.find(n => n.menuId === 'siomay-kepiting')!
    const sisa = need.stockOnHand + (mixProv.get('siomay-kepiting') || 0) - need.grossNeed
    expect(sisa).toBe(16) // 10 + 18 - 12
  })

  it('Siomay Nori: stock 18 + mix 24 - need 28 = 14', () => {
    const need = needs.find(n => n.menuId === 'siomay-nori')!
    const sisa = need.stockOnHand + (mixProv.get('siomay-nori') || 0) - need.grossNeed
    expect(sisa).toBe(14) // 18 + 24 - 28
  })

  it('Siomay Seafood: stock 6 + mix 6 - need 8 = 4', () => {
    const need = needs.find(n => n.menuId === 'siomay-seafood')!
    const sisa = need.stockOnHand + (mixProv.get('siomay-seafood') || 0) - need.grossNeed
    expect(sisa).toBe(4)  // 6 + 6 - 8
  })

  it('Siomay Udang: stock 8 + mix 6 - need 8 = 6', () => {
    const need = needs.find(n => n.menuId === 'siomay-udang')!
    const sisa = need.stockOnHand + (mixProv.get('siomay-udang') || 0) - need.grossNeed
    expect(sisa).toBe(6)  // 8 + 6 - 8
  })

  it('LKT Ayam: stock 20 + mix 18 - need 18 = 20', () => {
    const need = needs.find(n => n.menuId === 'lumpia-kulit-tahu-ayam')!
    const sisa = need.stockOnHand + (mixProv.get('lumpia-kulit-tahu-ayam') || 0) - need.grossNeed
    expect(sisa).toBe(20) // 20 + 18 - 18
  })

  it('LKT Udang: stock 0 + mix 6 - need 6 = 0', () => {
    const need = needs.find(n => n.menuId === 'lumpia-kulit-tahu-udang')!
    const sisa = need.stockOnHand + (mixProv.get('lumpia-kulit-tahu-udang') || 0) - need.grossNeed
    expect(sisa).toBe(0)  // 0 + 6 - 6
  })
})

// ============================================================================
// TEST 5: buildMenuRecommendations (individual packs)
// ============================================================================
describe('buildMenuRecommendations', () => {
  it('skips menus covered by mixes', () => {
    const needs: MenuNeed[] = [
      { menuId: 'siomay-ayam', menuName: 'Siomay Ayam', grossNeed: 30, stockOnHand: 0, netNeed: 30 },
    ]
    const skip = new Set(['siomay-ayam'])
    const recs = buildMenuRecommendations(needs, SUPPLIER_PACKS, skip)
    expect(recs.length).toBe(0) // skipped
  })

  it('picks cheapest pack for uncovered menu', () => {
    const needs: MenuNeed[] = [
      { menuId: 'siomay-ayam', menuName: 'Siomay Ayam', grossNeed: 10, stockOnHand: 0, netNeed: 10 },
    ]
    const recs = buildMenuRecommendations(needs, SUPPLIER_PACKS, new Set())
    expect(recs.length).toBe(1)
    expect(recs[0]!.chosenPack.totalUnits).toBeGreaterThanOrEqual(10)
    expect(recs[0]!.chosenPack.totalCost).toBeGreaterThan(0)
  })
})

// ============================================================================
// TEST 6: edge cases
// ============================================================================
describe('edge cases', () => {
  it('frozen only — mix still works', () => {
    const lines: OrderLine[] = [{ packageId: 'paket-halu', qty: 5 }]
    const needs = computeNeeds(lines, [], PACKAGES, MENUS, INVENTORY)
    const mix = optimizeMixes(needs, MIXES)
    expect(mix).not.toBeNull()
    expect(mix!.counts['mix-a']).toBeGreaterThan(0)
  })

  it('kukus only — mix still works', () => {
    const lines: BakarKukusLine[] = [
      { menuId: 'siomay-ayam', caraMasak: 'kukus', jumlahPorsi: 5 },
    ]
    const needs = computeNeeds([], lines, PACKAGES, MENUS, INVENTORY)
    const mix = optimizeMixes(needs, MIXES)
    expect(mix).not.toBeNull()
    // Mix A×3 or Mix E×3 — either covers netNeed 14 (stock 6, need 20)
    const totalAyam = (mix!.counts['mix-a'] || 0) * 6 + (mix!.counts['mix-e'] || 0) * 6
    expect(totalAyam).toBeGreaterThanOrEqual(14)
  })

  it('zero orders → all netNeed = 0', () => {
    const needs = computeNeeds([], [], PACKAGES, MENUS, INVENTORY)
    const totalNet = needs.reduce((s, n) => s + n.netNeed, 0)
    expect(totalNet).toBe(0)
  })

  it('stock covers everything → empty mix reco', () => {
    // Give huge stock
    const hugeInv: InventoryEntry[] = INVENTORY.map(i => ({ ...i, qtyOnHand: 999 }))
    const result = computeFullRecommendation(
      SCENARIO_FROZEN_LINES, SCENARIO_BAKAR_KUKUS_LINES,
      PACKAGES, MENUS, hugeInv, SUPPLIER_PACKS, MIXES,
    )
    expect(result.mixRecommendation).toBeNull()
    expect(result.individualRecommendations.length).toBe(0)
    expect(result.grandTotalCost).toBe(0)
  })
})
