import { z } from 'zod'

// Menu (raw material)
export const menuSchema = z.object({
  id: z.string().min(1).max(50).regex(/^[a-z0-9-]+$/),
  name: z.string().min(1).max(100),
  unit: z.string().default('pcs'),
  category: z.enum(['dimsum', 'bento', 'condiment', 'other']).optional(),
  base_price: z.number().int().min(0).optional(),
})

// Product (sellable)
export const productSchema = z.object({
  id: z.string().min(1).max(50).regex(/^[a-z0-9-]+$/),
  name: z.string().min(1).max(100),
  unit: z.string().default('pcs'),
  type: z.enum(['bundle', 'single', 'addon']),
  base_price: z.number().int().min(0),
})

// Product Variant
export const productVariantSchema = z.object({
  id: z.string().min(1).max(50).optional(),
  product_id: z.string().min(1),
  name: z.string().min(1),
  price: z.number().int().min(0),
})

// Product Composition (BOM)
export const productCompositionSchema = z.object({
  product_id: z.string().min(1),
  menu_id: z.string().min(1),
  qty: z.number().int().min(1),
})

// Supplier Mix
export const supplierMixSchema = z.object({
  id: z.string().min(1).max(50).regex(/^[a-z0-9-]+$/),
  name: z.string().min(1).max(100),
  price: z.number().int().min(0),
  contents: z.array(z.object({
    menuId: z.string().min(1),
    qty: z.number().int().min(1),
  })).min(1),
})

// Supplier Pack
export const supplierPackSchema = z.object({
  menu_id: z.string().min(1),
  label: z.string().min(1).max(50),
  size_pcs: z.number().int().min(1),
  price: z.number().int().min(0),
})

// App Config
export const appConfigSchema = z.record(z.string(), z.string())

// Inferred input types
export type MenuInput = z.input<typeof menuSchema>
export type ProductInput = z.input<typeof productSchema>
export type ProductVariantInput = z.input<typeof productVariantSchema>
export type ProductCompositionInput = z.input<typeof productCompositionSchema>
export type SupplierMixInput = z.input<typeof supplierMixSchema>
export type SupplierPackInput = z.input<typeof supplierPackSchema>
export type AppConfigInput = z.input<typeof appConfigSchema>
