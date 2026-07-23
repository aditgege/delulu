import type { SupplierPack } from '~/types'

/**
 * Compute HPP (cost per piece) for each menu from supplier_packs.
 * HPP = MIN(price / size_pcs) across all available packs for that menu.
 * Returns the best (cheapest) cost per piece.
 */
export function computeHppPerPcs(supplierPacks: SupplierPack[]): number {
  if (supplierPacks.length === 0) return 0
  return Math.min(...supplierPacks.map(p => p.price / p.sizePcs))
}

/**
 * Compute per-menu HPP as a Map<menuId, hppPerPcs>
 */
export function computeHppPerMenu(supplierPacks: SupplierPack[]): Map<string, number> {
  const perMenu = new Map<string, number[]>()
  for (const pack of supplierPacks) {
    const arr = perMenu.get(pack.menuId) || []
    arr.push(pack.price / pack.sizePcs)
    perMenu.set(pack.menuId, arr)
  }
  const result = new Map<string, number>()
  for (const [menuId, values] of perMenu) {
    result.set(menuId, Math.min(...values))
  }
  return result
}

/**
 * Compute HPP for a bundle product from its compositions + menu HPP data.
 * HPP per unit = SUM(menu_hpp[menuId] * qty)
 */
export function computeBundleHpp(
  menuHpp: Map<string, number>,
  compositions: Array<{ menuId: string; qty: number }>,
): number {
  let total = 0
  for (const comp of compositions) {
    total += (menuHpp.get(comp.menuId) ?? 0) * comp.qty
  }
  return total
}
