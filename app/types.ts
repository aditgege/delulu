// ——— Core domain ———

export interface Package {
  id: string
  name: string
  bom: BomLine[]
  price?: number      // retail selling price per pack (e.g. 35000)
}

export interface BomLine {
  skuId: string
  qty: number
}

export type SkuCategory = 'kukus' | 'goreng' | 'rebus' | 'bento' | 'condiment' | 'other'

export interface SKU {
  id: string
  name: string
  unit: string
  category?: SkuCategory
}

// ——— Supplier Mix Paket (bundle of multiple SKUs) ———

export interface SupplierMix {
  id: string
  name: string
  price: number
  contents: BomLine[] // what SKUs and how many are in one Mix
}

// ——— Individual supplier packs (for items like Chili Oil) ———

export interface SupplierPack {
  skuId: string
  label: string
  sizePcs: number
  price: number
}

// ——— Inventory ———

export interface InventoryEntry {
  skuId: string
  qtyOnHand: number
}

// ——— Orders ———

export interface OrderLine {
  packageId: string
  qty: number
}

// ——— Results ———

export interface SkuNeed {
  skuId: string
  skuName: string
  grossNeed: number
  stockOnHand: number
  netNeed: number
}

export interface MixOption {
  /** How many of each Mix Paket to buy */
  counts: Record<string, number>
  /** Total pieces bought across all Mixes */
  totalUnits: number
  /** Total cost */
  totalCost: number
  /** Waste per SKU */
  wastePerSku: Record<string, number>
  /** Total waste (pieces bought but not used) */
  totalWaste: number
}

export interface MixSkuRecommendation {
  skuId: string
  skuName: string
  netNeed: number
  provided: number
  waste: number
}

export interface MixRecommendation {
  /** Which Mix Pakets to buy and how many */
  mixes: Array<{ mixId: string; name: string; price: number; qty: number }>
  /** Per-SKU detail */
  skuDetails: MixSkuRecommendation[]
  /** Packages that can be assembled from waste — bonus info */
  wasteBonus: {
    counts: Record<string, number>
    remainingWaste: number
    totalPackages: number
  } | null
  totalCost: number
  totalWaste: number
}

// ——— Individual packs for items not covered by Mix ———

export interface PackOption {
  mediumPacks: number
  largePacks: number
  totalUnits: number
  waste: number
  totalCost: number
}

export interface SkuRecommendation {
  skuId: string
  skuName: string
  netNeed: number
  chosenPack: PackOption
}

export interface PurchaseRecommendation {
  lines: OrderLine[]
  needs: SkuNeed[]
  mixRecommendation: MixRecommendation | null
  /** Individual SKU purchases for items outside Mix system */
  individualRecommendations: SkuRecommendation[]
  grandTotalCost: number
  totalWaste: number
}

// ——— PO (Purchase Order) Tracking ———

export interface OrderItem {
  packageId: string
  qty: number
  extraChiliOil?: number  // extra chili oil bottles (separate from included)
}

export interface CustomerOrder {
  id: string
  name: string               // customer name
  items: OrderItem[]
  paid: boolean
  shipped: boolean
}

export interface PurchaseOrder {
  id: string
  label: string              // e.g. "PO #4 — 25 Juli 2026"
  customers: CustomerOrder[]
  createdAt: number
  closed: boolean
}
