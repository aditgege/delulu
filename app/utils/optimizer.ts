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

  // Performance guard: cap at 100 per mix to prevent browser freeze
  const bound = Math.min(maxPerMix, 100)
  if (bound < maxPerMix) {
    console.warn(
      `[optimizer] mix search truncated at ${bound} per mix (need ${maxPerMix}). ` +
      `Result may under-purchase for orders >${bound * 6} pcs per SKU.`
    )
  }

  let best: MixOption | null = null
  const counts: Record<string, number> = Object.fromEntries(mixes.map(m => [m.id, 0]))

  // Iterate — dynamically iterate over all mixes
  for (let a = 0; a <= bound; a++) {
    counts[mixIds[0]!] = a
    for (let b = 0; b <= (mixIds[1] ? bound : 0); b++) {
      counts[mixIds[1]!] = b
      for (let c = 0; c <= (mixIds[2] ? bound : 0); c++) {
        counts[mixIds[2]!] = c
        for (let e = 0; e <= (mixIds[3] ? bound : 0); e++) {
          if (mixIds[3]) counts[mixIds[3]!] = e

          // Compute per-SKU provided
          const provided = new Map<string, number>()
          let totalUnits = 0
          let totalCost = 0

          for (const mix of mixData) {
            const cnt = counts[mix.id] ?? 0
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
 * Given leftover pieces from Mix purchases, find how many retail packages
 * can be assembled from waste. Dynamic — supports any number of packages.
 * Brute-force with depth = package count, each bounded by max 20.
 */
export function optimizeWasteToPackages(
  wastePerSku: Record<string, number>,
  packages: Package[],
  targetIds?: string[],
): WastePackageResult | null {
  const pkgs = targetIds
    ? packages.filter(p => targetIds.includes(p.id))
    : packages
  if (pkgs.length === 0) return null

  const startWaste = Object.values(wastePerSku).reduce((s, n) => s + n, 0)
  if (startWaste === 0) return null

  // Compute max per package (cap at 20 to keep brute-force bounded)
  const maxPerPkg = pkgs.map(pkg => {
    let max = Infinity
    for (const b of pkg.bom) {
      const avail = wastePerSku[b.skuId] || 0
      const canMake = Math.floor(avail / b.qty)
      if (canMake < max) max = canMake
    }
    return { id: pkg.id, max: Math.min(max, 20) }
  })

  let best: WastePackageResult | null = null

  // Recursive brute-force over N packages
  function recurse(index: number, counts: Record<string, number>, remaining: Record<string, number>): void {
    if (index >= maxPerPkg.length) {
      const remainingTotal = Object.values(remaining).reduce((s, n) => s + n, 0)
      const totalPkgs = Object.values(counts).reduce((s, n) => s + n, 0)
      if (
        !best ||
        remainingTotal < best.remainingWaste ||
        (remainingTotal === best.remainingWaste && totalPkgs > best.totalPackages)
      ) {
        best = { counts: { ...counts }, remainingWaste: remainingTotal, totalPackages: totalPkgs }
      }
      return
    }

    const pkg = maxPerPkg[index]!
    for (let n = 0; n <= pkg.max; n++) {
      // Apply this package n times
      const newRemaining = { ...remaining }
      const pkgDef = pkgs.find(p => p.id === pkg.id)
      if (pkgDef) {
        for (const b of pkgDef.bom) {
          newRemaining[b.skuId] = (newRemaining[b.skuId] || 0) - n * b.qty
        }
      }
      // If any negative, skip
      let valid = true
      for (const v of Object.values(newRemaining)) {
        if (v < 0) { valid = false; break }
      }
      if (!valid) continue

      // Prune: if remaining >= best.remaining and totalPkgs <= best, skip
      const remainingTotal = Object.values(newRemaining).reduce((s, n) => s + n, 0)
      const currentPkgs = Object.values(counts).reduce((s, n) => s + n, 0) + n
      if (best && remainingTotal >= best.remainingWaste && currentPkgs <= best.totalPackages) continue

      counts[pkg.id] = n
      recurse(index + 1, counts, newRemaining)
    }
    delete counts[pkg.id]
  }

  recurse(0, {}, { ...wastePerSku })
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
  } else {
    // If optimizer fails (cap truncation), don't block individual packs for mix-covered SKUs
    mixCoveredSkus.clear()
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
