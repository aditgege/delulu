import { usePackageStore } from '~/stores/packages'
import { useInventoryStore } from '~/stores/inventory'
import { useOrderStore } from '~/stores/orders'
import type { PurchaseRecommendation, BakarKukusLine } from '~/types'

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
      const bakarKukusLines = orderStore.getBakarKukusLines()
      const packages = pkgStore.getAllPackages()
      const skus = pkgStore.getAllMenus()
      const inventory = invStore.getAllEntries()
      const supplierPacks = pkgStore.getAllSupplierPacks()
      const mixes = pkgStore.getAllMixes()

      if (orderLines.length === 0 && bakarKukusLines.length === 0) {
        error.value = 'Belum ada pesanan. Silakan isi pesanan terlebih dahulu.'
        loading.value = false
        return
      }

      result.value = computeFullRecommendation(
        orderLines, bakarKukusLines, packages, skus, inventory, supplierPacks, mixes,
      )
    } catch (e) {
      error.value = `Terjadi kesalahan: ${e instanceof Error ? e.message : 'Unknown error'}`
    } finally {
      loading.value = false
    }
  }

  // Auto-recompute when orders or inventory change
  watch(
    () => [
      orderStore.getOrderLines(),
      orderStore.getBakarKukusLines(),
      invStore.getAllEntries(),
      pkgStore.getAllMenus(),
      pkgStore.getAllPackages(),
    ],
    () => { compute() },
    { deep: true },
  )

  return { result, loading, error, compute }
}
