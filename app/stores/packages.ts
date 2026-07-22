import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { Package, SKU, SupplierPack, SupplierMix } from '~/types'

export const usePackageStore = defineStore('packages', () => {
  const packages = ref<Package[]>([])
  const skus = ref<SKU[]>([])
  const supplierPacks = ref<SupplierPack[]>([])
  const mixes = ref<SupplierMix[]>([])
  const loaded = ref(false)

  async function ensureLoaded() {
    if (loaded.value) return
    // Auto-migrate if first load — will seed DB if empty
    await $fetch('/api/_migrate', { method: 'GET' }).catch(() => {})
    
    const [pkgData, skuData, packData, mixData] = await Promise.all([
      $fetch<Package[]>('/api/packages'),
      $fetch<SKU[]>('/api/skus'),
      $fetch<SupplierPack[]>('/api/supplier-packs'),
      $fetch<SupplierMix[]>('/api/mixes'),
    ])
    
    packages.value = pkgData
    skus.value = skuData
    supplierPacks.value = packData
    mixes.value = mixData
    loaded.value = true
  }

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

  async function addPackage(pkg: Package) {
    await $fetch('/api/packages', { method: 'POST', body: pkg })
    packages.value.push(pkg)
  }

  async function updatePackage(id: string, updates: Partial<Package>) {
    const existing = packages.value.find(p => p.id === id)
    if (!existing) return
    const updated = { ...existing, ...updates, id, bom: updates.bom || existing.bom }
    await $fetch('/api/packages', { method: 'PUT', body: updated })
    const idx = packages.value.findIndex(p => p.id === id)
    if (idx >= 0) packages.value[idx] = updated
  }

  async function removePackage(id: string) {
    await $fetch('/api/packages', { method: 'DELETE', body: { id } })
    packages.value = packages.value.filter(p => p.id !== id)
  }

  async function resetToSeed() {
    await $fetch('/api/_migrate', { method: 'GET' })
    await ensureLoaded()
  }

  return {
    packages, skus, supplierPacks, mixes, loaded,
    ensureLoaded,
    getPackageById, getAllPackages, getSkuById, getSupplierPack,
    getAllSkus, getAllSupplierPacks, getAllMixes, getMixById,
    addPackage, updatePackage, removePackage, resetToSeed,
  }
})
