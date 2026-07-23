import type {
  OrderLine, Product, ProductComposition, Menu, InventoryEntry, SupplierPack, SupplierMix,
  MenuNeed, PackOption, MenuRecommendation, PurchaseRecommendation,
  MixOption, MixMenuRecommendation, MixRecommendation,
} from '~/types'
import { PORSI_PCS } from '~/types'

// ——— Mix Paket Optimization ———

export function optimizeMixes(
  needs: MenuNeed[],
  mixes: SupplierMix[],
): MixOption | null {
  const needMap = new Map(needs.filter(n => n.netNeed > 0).map(n => [n.menuId, n.netNeed]))

  const mixIds = mixes.map(m => m.id)
  const mixData = mixes.map(m => {
    const prov = new Map(m.contents.map(c => [c.menuId, c.qty]))
    return { id: m.id, price: m.price, prov }
  })

  const coveredMenus = new Set<string>()
  for (const mix of mixes) {
    for (const c of mix.contents) coveredMenus.add(c.menuId)
  }

  const relevantMenus = [...coveredMenus].filter(s => needMap.has(s))
  if (relevantMenus.length === 0) return null

  const maxNeed = Math.max(...relevantMenus.map(s => needMap.get(s)!))
  const maxPerMix = Math.ceil(maxNeed / 6)
  const bound = Math.min(maxPerMix, 100)
  if (bound < maxPerMix) {
    console.warn(
      `[optimizer] mix search truncated at ${bound} per mix (need ${maxPerMix}). ` +
      `Result may under-purchase for orders >${bound * 6} pcs per Menu.`
    )
  }

  let best: MixOption | null = null
  const counts: Record<string, number> = Object.fromEntries(mixes.map(m => [m.id, 0]))

  for (let a = 0; a <= bound; a++) {
    counts[mixIds[0]!] = a
    for (let b = 0; b <= (mixIds[1] ? bound : 0); b++) {
      counts[mixIds[1]!] = b
      for (let c = 0; c <= (mixIds[2] ? bound : 0); c++) {
        counts[mixIds[2]!] = c
        for (let e = 0; e <= (mixIds[3] ? bound : 0); e++) {
          if (mixIds[3]) counts[mixIds[3]!] = e

          const provided = new Map<string, number>()
          let totalUnits = 0
          let totalCost = 0

          for (const mix of mixData) {
            const cnt = counts[mix.id] ?? 0
            if (cnt === 0) continue
            for (const [menuId, qty] of mix.prov) {
              provided.set(menuId, (provided.get(menuId) || 0) + qty * cnt)
            }
            totalUnits += cnt * 30
            totalCost += cnt * mix.price
          }

          let allCovered = true
          const wastePerMenu: Record<string, number> = {}
          let totalWaste = 0

          for (const menu of relevantMenus) {
            const need = needMap.get(menu)!
            const prov = provided.get(menu) || 0
            if (prov < need) {
              allCovered = false
              break
            }
            const waste = prov - need
            wastePerMenu[menu] = waste
            totalWaste += waste
          }

          if (!allCovered) continue

          if (
            !best ||
            totalWaste < best.totalWaste ||
            (totalWaste === best.totalWaste && totalCost < best.totalCost)
          ) {
            best = { counts: { ...counts }, totalUnits, totalCost, wastePerSku: wastePerMenu, totalWaste }
          }
        }
      }
    }
  }
  return best
}

export function buildMixRecommendation(
  needs: MenuNeed[],
  mixes: SupplierMix[],
  mixOption: MixOption,
  products: Product[],
  allCompositions: ProductComposition[],
): MixRecommendation {
  const needMap = new Map(needs.map(n => [n.menuId, n]))

  const mixList = mixes
    .filter(m => (mixOption.counts[m.id] || 0) > 0)
    .map(m => ({
      mixId: m.id,
      name: m.name,
      price: m.price,
      qty: mixOption.counts[m.id] || 0,
    }))

  const menuDetails: MixMenuRecommendation[] = []
  for (const [menuId, waste] of Object.entries(mixOption.wastePerSku)) {
    const need = needMap.get(menuId)
    if (!need || need.netNeed <= 0) continue
    menuDetails.push({
      menuId,
      menuName: need.menuName,
      netNeed: need.netNeed,
      provided: need.netNeed + waste,
      waste,
    })
  }

  const wasteBonus = optimizeWasteToPackages(mixOption.wastePerSku, products, allCompositions)

  return {
    mixes: mixList,
    skuDetails: menuDetails,
    wasteBonus,
    totalCost: mixOption.totalCost,
    totalWaste: mixOption.totalWaste,
  }
}

// ——— Waste-to-Products Optimization ———

export interface WastePackageResult {
  counts: Record<string, number>
  remainingWaste: number
  totalPackages: number
}

export function optimizeWasteToPackages(
  wastePerSku: Record<string, number>,
  products: Product[],
  allCompositions: ProductComposition[],
  targetIds?: string[],
): WastePackageResult | null {
  const bundleIds = targetIds
    ? products.filter(p => targetIds.includes(p.id) && p.type === 'bundle').map(p => p.id)
    : products.filter(p => p.type === 'bundle').map(p => p.id)

  const bundles = bundleIds.map(id => ({
    id,
    bom: allCompositions.filter(c => c.productId === id),
  }))

  if (bundles.length === 0) return null

  const startWaste = Object.values(wastePerSku).reduce((s, n) => s + n, 0)
  if (startWaste === 0) return null

  const maxPerPkg = bundles.map(pkg => {
    let max = Infinity
    for (const b of pkg.bom) {
      const avail = wastePerSku[b.menuId] || 0
      const canMake = Math.floor(avail / b.qty)
      if (canMake < max) max = canMake
    }
    return { id: pkg.id, max: Math.min(max, 20) }
  })

  let best: WastePackageResult | null = null

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
      const newRemaining = { ...remaining }
      const pkgDef = bundles.find(p => p.id === pkg.id)
      if (pkgDef) {
        for (const b of pkgDef.bom) {
          newRemaining[b.menuId] = (newRemaining[b.menuId] || 0) - n * b.qty
        }
      }
      let valid = true
      for (const v of Object.values(newRemaining)) {
        if (v < 0) { valid = false; break }
      }
      if (!valid) continue

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

// ——— Individual Pack Optimization ———

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

export function buildMenuRecommendations(
  needs: MenuNeed[],
  supplierPacks: SupplierPack[],
  skipMenus: Set<string>,
): MenuRecommendation[] {
  const packMap = new Map<string, SupplierPack[]>()
  for (const pack of supplierPacks) {
    if (!packMap.has(pack.menuId)) packMap.set(pack.menuId, [])
    packMap.get(pack.menuId)!.push(pack)
  }

  const recommendations: MenuRecommendation[] = []
  for (const need of needs) {
    if (need.netNeed <= 0) continue
    if (skipMenus.has(need.menuId)) continue

    const packs = packMap.get(need.menuId)
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
      recommendations.push({ menuId: need.menuId, menuName: need.menuName, netNeed: need.netNeed, chosenPack: chosen })
    }
  }
  return recommendations
}

// ——— Per-Menu Need Computation (unified items) ———

export function computeNeeds(
  items: OrderLine[],
  compositions: ProductComposition[],
  menus: Menu[],
  inventory: InventoryEntry[],
): MenuNeed[] {
  const invMap = new Map(inventory.map(i => [i.menuId, i.qtyOnHand]))
  const menuMap = new Map(menus.map(s => [s.id, s]))

  // Build BOM lookup: for each productId → its menu breakdown
  const bomMap = new Map<string, ProductComposition[]>()
  for (const c of compositions) {
    if (!bomMap.has(c.productId)) bomMap.set(c.productId, [])
    bomMap.get(c.productId)!.push(c)
  }

  const grossMap = new Map<string, number>()
  const bkVariants = new Set(['bakar', 'kukus'])

  for (const item of items) {
    const bom = bomMap.get(item.productId)
    const variant = item.variant?.toLowerCase()

    if (bom) {
      // Bundle frozen — explode BOM
      for (const b of bom) {
        grossMap.set(b.menuId, (grossMap.get(b.menuId) || 0) + b.qty * item.qty)
      }
    } else if (variant && bkVariants.has(variant)) {
      // Bakar/kukus — qty is jumlahPorsi, convert to pcs
      const pcsNeed = item.qty * PORSI_PCS
      grossMap.set(item.productId, (grossMap.get(item.productId) || 0) + pcsNeed)
    } else {
      // Single/addon — qty as-is
      grossMap.set(item.productId, (grossMap.get(item.productId) || 0) + item.qty)
    }
  }

  const needs: MenuNeed[] = []
  for (const menu of menus) {
    const grossNeed = grossMap.get(menu.id) || 0
    const stockOnHand = invMap.get(menu.id) || 0
    const netNeed = Math.max(0, grossNeed - stockOnHand)
    needs.push({ menuId: menu.id, menuName: menu.name, grossNeed, stockOnHand, netNeed })
  }
  return needs
}

// ——— Full Computation (unified items) ———

export function computeFullRecommendation(
  items: OrderLine[],
  products: Product[],
  allCompositions: ProductComposition[],
  menus: Menu[],
  inventory: InventoryEntry[],
  supplierPacks: SupplierPack[],
  mixes: SupplierMix[],
): PurchaseRecommendation {
  const needs = computeNeeds(items, allCompositions, menus, inventory)

  const mixCoveredMenus = new Set<string>()
  for (const mix of mixes) {
    for (const c of mix.contents) mixCoveredMenus.add(c.menuId)
  }

  const mixOption = optimizeMixes(needs, mixes)
  let mixRecommendation: MixRecommendation | null = null
  if (mixOption) {
    mixRecommendation = buildMixRecommendation(needs, mixes, mixOption, products, allCompositions)
  } else {
    mixCoveredMenus.clear()
  }

  const individualRecommendations = buildMenuRecommendations(needs, supplierPacks, mixCoveredMenus)

  const grandTotalCost =
    (mixRecommendation?.totalCost || 0) +
    individualRecommendations.reduce((s, r) => s + r.chosenPack.totalCost, 0)

  const totalWaste =
    (mixRecommendation?.totalWaste || 0) +
    individualRecommendations.reduce((s, r) => s + r.chosenPack.waste, 0)

  return {
    lines: items,
    needs,
    mixRecommendation,
    individualRecommendations,
    grandTotalCost,
    totalWaste,
  }
}
