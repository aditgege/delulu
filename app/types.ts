// ——— Core domain ———

export interface Package {
  id: string
  name: string
  bom: BomLine[]
  price?: number      // retail selling price per pack (e.g. 35000)
}

export interface BomLine {
  menuId: string     // was skuId
  qty: number
}

export type MenuCategory = 'dimsum' | 'bento' | 'condiment' | 'other'

export interface Menu {
  id: string
  name: string
  unit: string
  category?: MenuCategory
}

// ——— Cara Masak (cooking methods) ———

export type CaraMasakId = 'bakar' | 'kukus'

export interface CaraMasak {
  id: CaraMasakId
  label: string       // display name: Bakar, Kukus, Goreng
}

export interface MenuCaraMasak {
  menuId: string
  caraMasakId: CaraMasakId
  hargaPorsi: number
}

// ——— Supplier Mix Paket (bundle of multiple menu items) ———

export interface SupplierMix {
  id: string
  name: string
  price: number
  contents: BomLine[] // what menus and how many are in one Mix
}

// ——— Individual supplier packs ———

export interface SupplierPack {
  menuId: string      // was skuId
  label: string
  sizePcs: number
  price: number
}

// ——— Inventory ———

export interface InventoryEntry {
  menuId: string      // was skuId
  qtyOnHand: number
}

// ——— Orders ———

/** 1 porsi bakar/kukus = 4 pcs menu yang sama */
export const PORSI_PCS = 4

/** Satu line item untuk menu bakar/kukus: 1 porsi = 4 pcs menu yang sama */
export interface BakarKukusLine {
  menuId: string           // was varianId
  caraMasak: CaraMasakId
  jumlahPorsi: number
}

export interface OrderLine {
  packageId: string
  qty: number
}

// ——— Results ———

export interface MenuNeed {   // was SkuNeed
  menuId: string
  menuName: string
  grossNeed: number
  stockOnHand: number
  netNeed: number
}

export interface MixOption {
  counts: Record<string, number>
  totalUnits: number
  totalCost: number
  wastePerSku: Record<string, number>
  totalWaste: number
}

export interface MixMenuRecommendation {   // was MixSkuRecommendation
  menuId: string
  menuName: string
  netNeed: number
  provided: number
  waste: number
}

export interface MixRecommendation {
  mixes: Array<{ mixId: string; name: string; price: number; qty: number }>
  skuDetails: MixMenuRecommendation[]
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

export interface MenuRecommendation {   // was SkuRecommendation
  menuId: string
  menuName: string
  netNeed: number
  chosenPack: PackOption
}

export interface PurchaseRecommendation {
  lines: OrderLine[]
  needs: MenuNeed[]   // was SkuNeed[]
  mixRecommendation: MixRecommendation | null
  individualRecommendations: MenuRecommendation[]   // was SkuRecommendation[]
  grandTotalCost: number
  totalWaste: number
}

// ——— PO (Pre-Order) Tracking ———

export interface OrderItem {
  packageId: string
  qty: number
  extraChiliOil?: number
}

export interface CustomerBakarKukusItem {
  menuId: string              // was varianId
  caraMasak: CaraMasakId
  jumlahPorsi: number
}

export interface CustomerOrder {
  id: string
  name: string
  items: OrderItem[]
  bakarKukusItems?: CustomerBakarKukusItem[]
  shippingFee: number
  paid: boolean
  shipped: boolean
}

export interface PurchaseOrder {
  id: string
  label: string
  customers: CustomerOrder[]
  createdAt: number
  closed: boolean
}
