import type {
  OrderLine, Package, SKU, InventoryEntry, SupplierPack, SupplierMix,
  SkuNeed, PackOption, SkuRecommendation, PurchaseRecommendation,
  MixOption, MixSkuRecommendation, MixRecommendation,
} from '~/types'

// ——— Mix Paket Optimization ———

/**
 * Find optimal combination of Mix Pakets (A, B, C, E) to cover per-SKU needs.
 *
 * Brute-force over 4 variables. For each mix, bound = ceil(maxNeed / 6).
 * With realistic needs < 200 pcs, max ≈ 34 per mix → 34⁴ ≈ 1.3M iterations.
 */
export function optimizeMixes(
  needs: SkuNeed[],
  mixes: SupplierMix[],
): MixOption | null {
  // Build per-SKU net need map
  const needMap = new Map(needs.filter(n => n.netNeed > 0).map(n => [n.skuId, n.netNeed]))

  // Build mix "contents" matrix: for each mix, what it provides per SKU
  const mixIds = mixes.map(m => m.id)
  const mixData = mixes.map(m => {
    const prov = new Map(m.contents.map(c => [c.skuId, c.qty]))
    return { id: m.id, price: m.price, prov }
  })

  // Determine which SKUs are covered by at least one mix
  const coveredSkus = new Set<string>()
  for (const mix of mixes) {
    for (const c of mix.contents) coveredSkus.add(c.skuId)
  }

  // Only optimize SKUs that are both needed AND covered by mixes
  const relevantSkus = [...coveredSkus].filter(s => needMap.has(s))
  if (relevantSkus.length === 0) return null

  // Bound: max of each mix = ceil(max need for any relevant SKU / 6)
  const maxNeed = Math.max(...relevantSkus.map(s => needMap.get(s)!))
  const maxPerMix = Math.ceil(maxNeed / 6)

  let best: MixOption | null = null
  const counts = { 'mix-a': 0, 'mix-b': 0, 'mix-c': 0, 'mix-e': 0 }

  // Iterate
  for (let a = 0; a <= Math.min(maxPerMix, 50); a++) {
    counts['mix-a'] = a
    for (let b = 0; b <= Math.min(maxPerMix, 50); b++) {
      counts['mix-b'] = b
      for (let c = 0; c <= Math.min(maxPerMix, 50); c++) {
        counts['mix-c'] = c
        // Early prune: compute running cost
        for (let e = 0; e <= Math.min(maxPerMix, 50); e++) {
          counts['mix-e'] = e

          // Compute per-SKU provided
          const provided = new Map<string, number>()
          let totalUnits = 0
          let totalCost = 0

          for (const mix of mixData) {
            const cnt = counts[mix.id as keyof typeof counts]
            if (cnt === 0) continue
            for (const [skuId, qty] of mix.prov) {
              provided.set(skuId, (provided.get(skuId) || 0) + qty * cnt)
            }
            totalUnits += cnt * 30 // each mix is 30 pcs
            totalCost += cnt * mix.price
          }

          // Check all relevant SKUs are covered
          let allCovered = true
          const wastePerSku: Record<string, number> = {}
          let totalWaste = 0

          for (const sku of relevantSkus) {
            const need = needMap.get(sku)!
            const prov = provided.get(sku) || 0
            if (prov < need) {
              allCovered = false
              break
            }
            const waste = prov - need
            wastePerSku[sku] = waste
            totalWaste += waste
          }

          if (!allCovered) continue

          if (
            !best ||
            totalWaste < best.totalWaste ||
            (totalWaste === best.totalWaste && totalCost < best.totalCost)
          ) {
            best = { counts: { ...counts }, totalUnits, totalCost, wastePerSku, totalWaste }
          }
        }
      }
    }
  }

  return best
}

/**
 * Build Mix recommendation details from a MixOption.
 */
export function buildMixRecommendation(
  needs: SkuNeed[],
  mixes: SupplierMix[],
  mixOption: MixOption,
  packages: Package[],
): MixRecommendation {
  const needMap = new Map(needs.map(n => [n.skuId, n]))

  // Which mixes to buy
  const mixList = mixes
    .filter(m => (mixOption.counts[m.id] || 0) > 0)
    .map(m => ({
      mixId: m.id,
      name: m.name,
      price: m.price,
      qty: mixOption.counts[m.id] || 0,
    }))

  // Per-SKU detail
  const skuDetails: MixSkuRecommendation[] = []
  for (const [skuId, waste] of Object.entries(mixOption.wastePerSku)) {
    const need = needMap.get(skuId)
    if (!need || need.netNeed <= 0) continue
    // Compute provided = need + waste
    skuDetails.push({
      skuId,
      skuName: need.skuName,
      netNeed: need.netNeed,
      provided: need.netNeed + waste,
      waste,
    })
  }

  const wasteBonus = optimizeWasteToPackages(mixOption.wastePerSku, packages)

  return {
    mixes: mixList,
    skuDetails,
    wasteBonus,
    totalCost: mixOption.totalCost,
    totalWaste: mixOption.totalWaste,
  }
}

// ——— Waste-to-Packages Optimization ———

export interface WastePackageResult {
  /** How many of each package can be assembled from waste */
  counts: Record<string, number>
  /** Remaining waste after assembling those packages */
  remainingWaste: number
  /** Total packages assembled */
  totalPackages: number
}

/**
 * Given leftover pieces from Mix purchases, find how many Halu/When Ya/Solulu
 * can be assembled. Brute force 3 variables × ~max 15 each = ~3375 iterations.
 */
export function optimizeWasteToPackages(
  wastePerSku: Record<string, number>,
  packages: Package[],
  targetIds: string[] = ['paket-halu', 'paket-when-ya', 'paket-solulu'],
): WastePackageResult | null {
  const pkgs = packages.filter(p => targetIds.includes(p.id))
  if (pkgs.length === 0) return null

  // Compute max per package
  const maxPerPkg = pkgs.map(pkg => {
    let max = Infinity
    for (const b of pkg.bom) {
      const avail = wastePerSku[b.skuId] || 0
      const canMake = Math.floor(avail / b.qty)
      if (canMake < max) max = canMake
    }
    return { id: pkg.id, max: Math.min(max, 20) }
  })

  const startWaste = Object.values(wastePerSku).reduce((s, n) => s + n, 0)
  if (startWaste === 0) return null

  let best: WastePackageResult | null = null
  const totals: Record<string, number> = { 'paket-halu': 0, 'paket-when-ya': 0, 'paket-solulu': 0 }

  for (let h = 0; h <= maxPerPkg[0]!.max; h++) {
    totals['paket-halu'] = h
    for (let w = 0; w <= maxPerPkg[1]!.max; w++) {
      totals['paket-when-ya'] = w
      for (let s = 0; s <= maxPerPkg[2]!.max; s++) {
        totals['paket-solulu'] = s

        // Compute remaining waste
        const remaining = { ...wastePerSku }
        for (const pkg of pkgs) {
          const count = totals[pkg.id] || 0
          if (count === 0) continue
          for (const b of pkg.bom) {
            remaining[b.skuId] = (remaining[b.skuId] || 0) - count * b.qty
          }
        }

        // Check negative
        let valid = true
        for (const v of Object.values(remaining)) {
          if (v < 0) { valid = false; break }
        }
        if (!valid) continue

        // Prune: if total waste already >= best and total packages <= best, skip
        const remainingTotal = Object.values(remaining).reduce((s, n) => s + n, 0)
        const totalPkgs = h + w + s
        if (best && remainingTotal >= best.remainingWaste && totalPkgs <= best.totalPackages) continue

        if (!best ||
            remainingTotal < best.remainingWaste ||
            (remainingTotal === best.remainingWaste && totalPkgs > best.totalPackages)) {
          best = { counts: { ...totals }, remainingWaste: remainingTotal, totalPackages: totalPkgs }
        }
      }
    }
  }

  return best
}

// ——— Individual Pack Optimization (original, for non-Mix SKUs) ———

export function findOptimalPacks(
  need: number,
  sizeA: number,
  sizeB: number,
  priceA: number,
  priceB: number,
): PackOption | null {
  if (need <= 0) {
    return { mediumPacks: 0, largePacks: 0, totalUnits: 0, waste: 0, totalCost: 0 }
  }
  let best: PackOption | null = null
  const maxA = Math.ceil(need / sizeA)
  for (let m = 0; m <= maxA; m++) {
    const remaining = Math.max(0, need - m * sizeA)
    const l = Math.ceil(remaining / sizeB)
    const totalUnits = m * sizeA + l * sizeB
    const waste = totalUnits - need
    const totalCost = m * priceA + l * priceB
    if (!best || waste < best.waste || (waste === best.waste && totalCost < best.totalCost)) {
      best = { mediumPacks: m, largePacks: l, totalUnits, waste, totalCost }
    }
  }
  return best
}

export function buildSingleSkuRecommendations(
  needs: SkuNeed[],
  supplierPacks: SupplierPack[],
  skipSkus: Set<string>,
): SkuRecommendation[] {
  const packMap = new Map<string, SupplierPack[]>()
  for (const pack of supplierPacks) {
    if (!packMap.has(pack.skuId)) packMap.set(pack.skuId, [])
    packMap.get(pack.skuId)!.push(pack)
  }

  const recommendations: SkuRecommendation[] = []

  for (const need of needs) {
    if (need.netNeed <= 0) continue
    if (skipSkus.has(need.skuId)) continue // handled by Mixes

    const packs = packMap.get(need.skuId)
    if (!packs || packs.length === 0) continue

    let chosen: PackOption | null = null

    if (packs.length === 1) {
      const pack: SupplierPack = packs[0]!
      const count = Math.ceil(need.netNeed / pack.sizePcs)
      const totalUnits = count * pack.sizePcs
      chosen = {
        mediumPacks: 0,
        largePacks: count,
        totalUnits,
        waste: totalUnits - need.netNeed,
        totalCost: count * pack.price,
      }
    } else {
      const a: SupplierPack = packs[0]!
      const b: SupplierPack = packs[1]!
      const sizeA = Math.min(a.sizePcs, b.sizePcs)
      const sizeB = Math.max(a.sizePcs, b.sizePcs)
      const priceA = a.sizePcs <= b.sizePcs ? a.price : b.price
      const priceB = a.sizePcs <= b.sizePcs ? b.price : a.price
      chosen = findOptimalPacks(need.netNeed, sizeA, sizeB, priceA, priceB)
    }

    if (chosen) {
      recommendations.push({
        skuId: need.skuId,
        skuName: need.skuName,
        netNeed: need.netNeed,
        chosenPack: chosen,
      })
    }
  }

  return recommendations
}

// ——— Per-SKU Need Computation ———

export function computeNeeds(
  orderLines: OrderLine[],
  packages: Package[],
  skus: SKU[],
  inventory: InventoryEntry[],
): SkuNeed[] {
  const invMap = new Map(inventory.map(i => [i.skuId, i.qtyOnHand]))
  const pkgMap = new Map(packages.map(p => [p.id, p]))
  const skuMap = new Map(skus.map(s => [s.id, s]))

  const grossMap = new Map<string, number>()
  for (const line of orderLines) {
    const pkg = pkgMap.get(line.packageId)
    if (!pkg) continue
    for (const bom of pkg.bom) {
      grossMap.set(bom.skuId, (grossMap.get(bom.skuId) || 0) + bom.qty * line.qty)
    }
  }

  const needs: SkuNeed[] = []
  for (const sku of skus) {
    const grossNeed = grossMap.get(sku.id) || 0
    const stockOnHand = invMap.get(sku.id) || 0
    const netNeed = Math.max(0, grossNeed - stockOnHand)
    needs.push({ skuId: sku.id, skuName: sku.name, grossNeed, stockOnHand, netNeed })
  }
  return needs
}

// ——— Full Computation ———

export function computeFullRecommendation(
  orderLines: OrderLine[],
  packages: Package[],
  skus: SKU[],
  inventory: InventoryEntry[],
  supplierPacks: SupplierPack[],
  mixes: SupplierMix[],
): PurchaseRecommendation {
  const needs = computeNeeds(orderLines, packages, skus, inventory)

  // Which SKUs are covered by Mixes?
  const mixCoveredSkus = new Set<string>()
  for (const mix of mixes) {
    for (const c of mix.contents) mixCoveredSkus.add(c.skuId)
  }

  // 1. Mix optimization
  const mixOption = optimizeMixes(needs, mixes)
  let mixRecommendation: MixRecommendation | null = null
  if (mixOption) {
    mixRecommendation = buildMixRecommendation(needs, mixes, mixOption, packages)
  }

  // 2. Individual packs for non-Mix SKUs
  const individualRecommendations = buildSingleSkuRecommendations(needs, supplierPacks, mixCoveredSkus)

  const grandTotalCost =
    (mixRecommendation?.totalCost || 0) +
    individualRecommendations.reduce((s, r) => s + r.chosenPack.totalCost, 0)

  const totalWaste =
    (mixRecommendation?.totalWaste || 0) +
    individualRecommendations.reduce((s, r) => s + r.chosenPack.waste, 0)

  return {
    lines: orderLines,
    needs,
    mixRecommendation,
    individualRecommendations,
    grandTotalCost,
    totalWaste,
  }
}
