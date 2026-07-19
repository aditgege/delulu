import { describe, it, expect } from 'vitest'
import { findOptimalPacks, optimizeWasteToPackages } from './optimizer'
import type { Package } from '~/types'

const PACKAGES: Package[] = [
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
      'lumpia-tahu-udang': 5,
      'siomay-nori': 15,
      'siomay-kepiting': 10,
      'shisitkau': 10,
      'siomay-udang': 5,
      'lumpia-tahu-ayam': 10,
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
})