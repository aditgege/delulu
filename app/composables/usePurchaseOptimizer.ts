import { usePackageStore } from '~/stores/packages'
import { useInventoryStore } from '~/stores/inventory'
import { useOrderStore } from '~/stores/orders'
import type { PurchaseRecommendation } from '~/types'

export function usePurchaseOptimizer(): {
  result: Ref<PurchaseRecommendation | null>
  loading: Ref<boolean>
  error: Ref<string | null>
  compute: () => void
} {
  const pkgStore = usePackageStore()
  const invStore = useInventoryStore()
  const orderStore = useOrderStore()

  const result = ref<PurchaseRecommendation | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  function compute(): void {
    loading.value = true
    error.value = null

    try {
      const orderLines = orderStore.getOrderLines()
      const packages = pkgStore.getAllPackages()
      const skus = pkgStore.getAllSkus()
      const inventory = invStore.getAllEntries()
      const supplierPacks = pkgStore.getAllSupplierPacks()
      const mixes = pkgStore.getAllMixes()

      if (orderLines.length === 0) {
        error.value = 'Belum ada pesanan. Silakan isi pesanan terlebih dahulu.'
        loading.value = false
        return
      }

      result.value = computeFullRecommendation(
        orderLines, packages, skus, inventory, supplierPacks, mixes,
      )
    } catch (e) {
      error.value = `Terjadi kesalahan: ${e instanceof Error ? e.message : 'Unknown error'}`
    } finally {
      loading.value = false
    }
  }

  return { result, loading, error, compute }
}
