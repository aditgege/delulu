import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { Package, Menu, SupplierPack, SupplierMix } from '~/types'

export const usePackageStore = defineStore('packages', () => {
  const packages = ref<Package[]>([])
  const menus = ref<Menu[]>([])
  const supplierPacks = ref<SupplierPack[]>([])
  const mixes = ref<SupplierMix[]>([])
  const loaded = ref(false)

  async function ensureLoaded() {
    if (loaded.value) return
    await $fetch('/api/_migrate', { method: 'GET' }).catch(() => {})

    const [pkgData, menuData, packData, mixData] = await Promise.all([
      $fetch<Package[]>('/api/packages'),
      $fetch<Menu[]>('/api/menus'),
      $fetch<SupplierPack[]>('/api/supplier-packs'),
      $fetch<SupplierMix[]>('/api/mixes'),
    ])

    packages.value = pkgData
    menus.value = menuData
    supplierPacks.value = packData
    mixes.value = mixData
    loaded.value = true

    // Pre-load cara masak prices too
    await ensureCaraMasakLoaded().catch(() => {})
  }

  function getPackageById(id: string): Package | undefined {
    return packages.value.find(p => p.id === id)
  }

  function getAllPackages(): Package[] {
    return packages.value
  }

  function getMenuById(id: string): Menu | undefined {
    return menus.value.find(s => s.id === id)
  }

  function getSupplierPack(menuId: string): SupplierPack[] {
    return supplierPacks.value.filter(p => p.menuId === menuId)
  }

  function getAllMenus(): Menu[] {
    return menus.value
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

  // New methods
  const caraMasaks = ref<import('~/types').CaraMasak[]>([])
  const menuCaraMasaks = ref<import('~/types').MenuCaraMasak[]>([])

  async function ensureCaraMasakLoaded() {
    if (caraMasaks.value.length > 0) return
    const [cmData, mcmData] = await Promise.all([
      $fetch<import('~/types').CaraMasak[]>('/api/cara-masak'),
      $fetch<import('~/types').MenuCaraMasak[]>('/api/menu-cara-masak'),
    ])
    caraMasaks.value = cmData
    menuCaraMasaks.value = mcmData
  }

  function getCaraMasak(): import('~/types').CaraMasak[] {
    ensureCaraMasakLoaded()
    return caraMasaks.value
  }

  function getMenuCaraMasak(menuId: string): import('~/types').MenuCaraMasak | undefined {
    ensureCaraMasakLoaded()
    return menuCaraMasaks.value.find(m => m.menuId === menuId)
  }

  return {
    packages, menus, supplierPacks, mixes, loaded,
    ensureLoaded,
    getPackageById, getAllPackages, getMenuById, getSupplierPack,
    getAllMenus, getAllSupplierPacks, getAllMixes, getMixById,
    addPackage, updatePackage, removePackage, resetToSeed,
    getCaraMasak, getMenuCaraMasak,
  }
})
