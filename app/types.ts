// ——— Raw Materials (bahan baku, buat stock & supplier) ———

export type MenuCategory = 'dimsum' | 'bento' | 'condiment' | 'other'

export interface Menu {
  id: string
  name: string
  unit: string
  category?: MenuCategory
  basePrice?: number
}

// ——— Selling Products ———

export type ProductType = 'bundle' | 'single' | 'addon'

export interface Product {
  id: string
  name: string
  unit: string
  type: ProductType
  basePrice: number
  hpp?: number
}

export interface ProductVariant {
  id: string
  productId: string
  name: string
  price: number
  hpp?: number
}

export interface ProductComposition {
  productId: string
  menuId: string
  qty: number
}

// ——— Cara Masak (keep CaraMasakId for variant identification) ———

export type CaraMasakId = 'bakar' | 'kukus'

// ——— Supplier ———

export interface SupplierMix {
  id: string
  name: string
  price: number
  contents: BomLine[]
}

export interface SupplierPack {
  menuId: string
  label: string
  sizePcs: number
  price: number
}

export interface BomLine {
  menuId: string
  qty: number
}

// ——— Inventory ———

export interface InventoryEntry {
  menuId: string
  qtyOnHand: number
}

// ——— Orders ———

/** 1 porsi bakar/kukus = 4 pcs menu yang sama */
export const PORSI_PCS = 4

export interface OrderLine {
  productId: string
  variant?: string
  qty: number
  unitPrice: number
}

export interface CustomerOrder {
  id: string
  name: string
  items: OrderLine[]
  bakarKukusItems?: { menuId: string; caraMasak: CaraMasakId; jumlahPorsi: number }[]
  shippingFee: number
  discount: number
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

// ——— Optimization Results ———

export interface MenuNeed {
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

export interface PackOption {
  mediumPacks: number
  largePacks: number
  totalUnits: number
  waste: number
  totalCost: number
}

export interface MenuRecommendation {
  menuId: string
  menuName: string
  netNeed: number
  chosenPack: PackOption
}

export interface MixMenuRecommendation {
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

export interface PurchaseRecommendation {
  lines: OrderLine[]
  needs: MenuNeed[]
  mixRecommendation: MixRecommendation | null
  individualRecommendations: MenuRecommendation[]
  grandTotalCost: number
  totalWaste: number
}


