import { describe, it, expect } from 'vitest'
import { findOptimalPacks, optimizeWasteToPackages, optimizeMixes, computeNeeds } from './optimizer'
import type { Package, SupplierMix, Menu, InventoryEntry, OrderLine } from '~/types'

const PACKAGES: Package[] = [
  {
    id: 'paket-halu',
    name: 'Paket Halu',
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
    bom: [
      { menuId: 'siomay-ayam', qty: 2 },
      { menuId: 'lumpia-kulit-tahu-ayam', qty: 2 },
      { menuId: 'siomay-nori', qty: 2 },
      { menuId: 'siomay-kepiting', qty: 2 },
      { menuId: 'siomay-mozzarella', qty: 2 },
    ],
  },
]

describe('findOptimalPacks', () => {
  it('need 22 → Large 24 (waste 2)', () => {
    const r = findOptimalPacks(22, 30, 24, 64000, 63000)
    expect(r).not.toBeNull()
    expect(r!.largePacks).toBe(1)
    expect(r!.mediumPacks).toBe(0)
    expect(r!.waste).toBe(2)
  })

  it('need 30 → 1 pack of size 30 (waste 0)', () => {
    const r = findOptimalPacks(30, 30, 24, 64000, 63000)
    expect(r).not.toBeNull()
    expect(r!.waste).toBe(0)
  })

  it('need 0 → zero packs', () => {
    const r = findOptimalPacks(0, 30, 24, 64000, 63000)
    expect(r).toEqual({ mediumPacks: 0, largePacks: 0, totalUnits: 0, waste: 0, totalCost: 0 })
  })
})

describe('optimizeWasteToPackages', () => {
  it('enough waste makes multiple packages', () => {
    const waste = {
      'siomay-ayam': 10,
      'lumpia-kulit-tahu-udang': 5,
      'siomay-nori': 15,
      'siomay-kepiting': 10,
      'hisitkau': 10,
      'siomay-udang': 5,
      'lumpia-kulit-tahu-ayam': 10,
      'siomay-seafood': 5,
      'siomay-mozzarella': 5,
    }
    const result = optimizeWasteToPackages(waste, PACKAGES)
    expect(result).not.toBeNull()
    expect(result!.totalPackages).toBeGreaterThan(0)
  })

  it('zero waste returns null', () => {
    expect(optimizeWasteToPackages({}, PACKAGES)).toBeNull()
  })

  it('insufficient waste makes zero packages', () => {
    const waste = { 'siomay-ayam': 1 }
    const r = optimizeWasteToPackages(waste, PACKAGES)
    if (r) expect(r.totalPackages).toBe(0)
  })

  it('handles custom package IDs not in hardcoded default (RED — bug #3)', () => {
    // A new package not in the hardcoded ['paket-halu', 'paket-when-ya', 'paket-solulu']
    const customPkg: Package = {
      id: 'paket-test',
      name: 'Paket Test',
      bom: [
        { menuId: 'siomay-ayam', qty: 2 },
        { menuId: 'siomay-nori', qty: 2 },
      ],
    }
    const waste = { 'siomay-ayam': 10, 'siomay-nori': 10 }
    const result = optimizeWasteToPackages(waste, [...PACKAGES, customPkg])
    // With the hardcoded targetIds default, customPkg is skipped.
    // After fix, it should be considered and totalPackages > 0.
    expect(result).not.toBeNull()
    expect(result!.totalPackages).toBeGreaterThan(0)
  })
})

describe('optimizeMixes — adversarial bug tests', () => {
  const MIX_A: SupplierMix = {
    id: 'mix-a',
    name: 'Mix A',
    price: 64000,
    contents: [{ menuId: 'siomay-ayam', qty: 6 }],
  }

  const MIX_Z: SupplierMix = {
    id: 'mix-z',
    name: 'Mix Z',
    price: 64000,
    contents: [{ menuId: 'siomay-test', qty: 6 }],
  }

  it('returns null for need >300 due to cap-50 (RED — bug #1)', () => {
    // 1 Menu need=400 → maxPerMix = ceil(400/6) = 67, capped at 50 → 300 pcs < 400
    const needs = [{ menuId: 'siomay-ayam', menuName: 'Siomay Ayam', grossNeed: 400, stockOnHand: 0, netNeed: 400 }]
    const result = optimizeMixes(needs, [MIX_A])
    // Currently returns null because cap-50 prevents finding 67 mixes
    // After fix, should return a valid solution
    expect(result).not.toBeNull()
    expect(result!.totalWaste).toBeGreaterThanOrEqual(0)
    expect(result!.totalUnits).toBeGreaterThanOrEqual(400)
  })

  it('handles custom mix ID not in hardcoded set (RED — bug #2)', () => {
    const needs = [{ menuId: 'siomay-test', menuName: 'Siomay Test', grossNeed: 60, stockOnHand: 0, netNeed: 60 }]
    const result = optimizeMixes(needs, [MIX_Z])
    // 'mix-z' is NOT in the hardcoded {'mix-a','mix-b','mix-c','mix-e'} — currently undefined
    // After fix, should handle any mix ID
    expect(result).not.toBeNull()
    expect(result!.totalUnits).toBeGreaterThanOrEqual(60)
  })
})
