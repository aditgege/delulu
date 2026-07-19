import { defineStore } from 'pinia'
import { useLocalStorage } from '@vueuse/core'
import { SEED_SKUS, SEED_PACKAGES, SEED_SUPPLIER_PACKS, SEED_MIXES, EXTRA_SUPPLIER_PACKS, CHILI_OIL_SKUS } from '~/data/seed'
import type { Package, SKU, SupplierPack, SupplierMix } from '~/types'

export const usePackageStore = defineStore('packages', () => {
  const packages = useLocalStorage<Package[]>('delulul:packages', [...SEED_PACKAGES])
  const skus = useLocalStorage<SKU[]>('delulul:skus', [...SEED_SKUS, ...CHILI_OIL_SKUS])
  const supplierPacks = useLocalStorage<SupplierPack[]>('delulul:supplierPacks', [...SEED_SUPPLIER_PACKS, ...EXTRA_SUPPLIER_PACKS])
  const mixes = useLocalStorage<SupplierMix[]>('delulul:mixes', [...SEED_MIXES])

  function getPackageById(id: string): Package | undefined {
    return packages.value.find(p => p.id === id)
  }

  function getAllPackages(): Package[] {
    return packages.value
  }

  function getSkuById(id: string): SKU | undefined {
    return skus.value.find(s => s.id === id)
  }

  function getSupplierPack(skuId: string): SupplierPack[] {
    return supplierPacks.value.filter(p => p.skuId === skuId)
  }

  function getAllSkus(): SKU[] {
    return skus.value
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

  function addPackage(pkg: Package): void {
    packages.value.push(pkg)
  }

  function updatePackage(id: string, updates: Partial<Package>): void {
    const idx = packages.value.findIndex(p => p.id === id)
    if (idx >= 0) {
      const existing = packages.value[idx]!
      packages.value[idx] = { id: existing.id, name: existing.name, bom: existing.bom, ...updates }
    }
  }

  function removePackage(id: string): void {
    packages.value = packages.value.filter(p => p.id !== id)
  }

  function resetToSeed(): void {
    packages.value = [...SEED_PACKAGES]
    skus.value = [...SEED_SKUS, ...CHILI_OIL_SKUS]
    supplierPacks.value = [...SEED_SUPPLIER_PACKS, ...EXTRA_SUPPLIER_PACKS]
    mixes.value = [...SEED_MIXES]
  }

  return {
    packages, skus, supplierPacks, mixes,
    getPackageById, getAllPackages, getSkuById, getSupplierPack,
    getAllSkus, getAllSupplierPacks, getAllMixes, getMixById,
    addPackage, updatePackage, removePackage, resetToSeed,
  }
})
