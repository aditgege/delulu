import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { Menu, SupplierPack, SupplierMix, Product, ProductVariant, ProductComposition } from '~/types'

export const usePackageStore = defineStore('packages', () => {
  const packages = ref<Product[]>([])
  const menus = ref<Menu[]>([])
  const supplierPacks = ref<SupplierPack[]>([])
  const mixes = ref<SupplierMix[]>([])
  const variants = ref<ProductVariant[]>([])
  const compositions = ref<ProductComposition[]>([])
  const loaded = ref(false)

  async function ensureLoaded() {
    if (loaded.value) return
    await $fetch('/api/_migrate', { method: 'GET' }).catch(() => {})

    const raw = await Promise.all([
      $fetch<any[]>('/api/products'),
      $fetch<any[]>('/api/menus'),
      $fetch<any[]>('/api/supplier-packs'),
      $fetch<any[]>('/api/mixes'),
      $fetch<any[]>('/api/product-variants'),
      $fetch<any[]>('/api/product-compositions'),
    ])

    packages.value = raw[0].map((p: any) => ({ id: p.id, name: p.name, unit: p.unit, type: p.type, basePrice: p.base_price, hpp: p.hpp }))
    menus.value = raw[1].map((m: any) => ({ id: m.id, name: m.name, unit: m.unit, category: m.category, basePrice: m.base_price }))
    supplierPacks.value = raw[2].map((p: any) => ({ menuId: p.menu_id, label: p.label, sizePcs: p.size_pcs, price: p.price }))
    mixes.value = raw[3]
    variants.value = raw[4].map((v: any) => ({ id: v.id, productId: v.product_id, name: v.name, price: v.price }))
    compositions.value = raw[5].map((c: any) => ({ productId: c.product_id, menuId: c.menu_id, qty: c.qty }))
    loaded.value = true
  }

  // ── Product queries ──
  function getProductById(id: string): Product | undefined {
    return packages.value.find(p => p.id === id)
  }

  function getAllPackages(): Product[] {
    return packages.value
  }

  function getVariants(productId: string): ProductVariant[] {
    return variants.value.filter(v => v.productId === productId)
  }

  function getProductPrice(productId: string, variant?: string): number {
    if (variant) {
      const v = variants.value.find(v => v.productId === productId && v.name.toLowerCase() === variant.toLowerCase())
      if (v) return v.price
    }
    return getProductById(productId)?.basePrice ?? 0
  }

  function getProductHpp(productId: string, variant?: string): number {
    if (variant) {
      const v = variants.value.find(v => v.productId === productId && v.name.toLowerCase() === variant.toLowerCase())
      if (v && v.hpp) return v.hpp
    }
    return getProductById(productId)?.hpp ?? 0
  }

  function getCompositions(productId: string): ProductComposition[] {
    return compositions.value.filter(c => c.productId === productId)
  }

  // ── Menu queries ──
  function getMenuById(id: string): Menu | undefined {
    return menus.value.find(s => s.id === id)
  }

  function getAllMenus(): Menu[] {
    return menus.value
  }

  // ── Supplier queries ──
  function getSupplierPack(menuId: string): SupplierPack[] {
    return supplierPacks.value.filter(p => p.menuId === menuId)
  }

  function getAllSupplierPacks(): SupplierPack[] {
    return supplierPacks.value
  }

  function getAllMixes(): SupplierMix[] {
    return mixes.value
  }

  function getMixById(id: string): SupplierMix | undefined {
    return mixes.value.find(m => m.id === id)
  }

  function getMenuCaraMasak(menuId: string, caraMasakId?: string): { menuId: string; caraMasakId: string; hargaPorsi: number } | undefined {
    if (!caraMasakId) return undefined
    const product = getProductById(menuId)
    if (!product) return undefined
    // Look up variant price
    const v = getVariants(menuId).find(v => v.name.toLowerCase() === caraMasakId.toLowerCase())
    if (v) return { menuId, caraMasakId, hargaPorsi: v.price }
    // Fallback
    return { menuId, caraMasakId, hargaPorsi: product.basePrice }
  }

  return {
    packages, menus, supplierPacks, mixes, loaded, variants, compositions,
    ensureLoaded,
    getProductById, getAllPackages, getVariants, getProductPrice, getCompositions,
    getMenuById, getAllMenus, getSupplierPack,
    getAllSupplierPacks, getAllMixes, getMixById,
    getMenuCaraMasak, getProductHpp,
  }
})
