import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { OrderLine, BakarKukusLine, CaraMasakId } from '~/types'
import { PORSI_PCS } from '~/types'
import { usePackageStore } from '~/stores/packages'

// Orders are ephemeral / session-based — keep in memory only
export const useOrderStore = defineStore('orders', () => {
  const lines = ref<OrderLine[]>([])
  const linesBakarKukus = ref<BakarKukusLine[]>([])

  function getOrderLines(): OrderLine[] {
    return lines.value
  }

  function getQty(packageId: string): number {
    const found = lines.value.find(l => l.packageId === packageId)
    return found ? found.qty : 0
  }

  function hasOrders(): boolean {
    return lines.value.some(l => l.qty > 0)
  }

  function getTotalPackages(): number {
    return lines.value.reduce((s, l) => s + l.qty, 0)
  }

  function setQty(packageId: string, qty: number): void {
    const idx = lines.value.findIndex(l => l.packageId === packageId)
    const validQty = Math.max(0, Math.floor(qty))
    if (idx >= 0) {
      if (validQty > 0) {
        lines.value[idx] = { packageId, qty: validQty }
      } else {
        lines.value.splice(idx, 1)
      }
    } else if (validQty > 0) {
      lines.value.push({ packageId, qty: validQty })
    }
  }

  // ——— Bakar/Kukus methods ———

  function getBakarKukusLines(): BakarKukusLine[] {
    return linesBakarKukus.value
  }

  /** Set jumlahPorsi for a specific varian + CaraMasakId combo. Removes line if <= 0. */
  function setBakarKukus(menuId: string, caraMasak: CaraMasakId, jumlahPorsi: number): void {
    const valid = Math.max(0, Math.floor(jumlahPorsi))
    const idx = linesBakarKukus.value.findIndex(l => l.menuId === menuId && l.caraMasak === caraMasak)
    if (idx >= 0) {
      if (valid > 0) {
        linesBakarKukus.value[idx] = { menuId, caraMasak, jumlahPorsi: valid }
      } else {
        linesBakarKukus.value.splice(idx, 1)
      }
    } else if (valid > 0) {
      linesBakarKukus.value.push({ menuId, caraMasak, jumlahPorsi: valid })
    }
  }

  function getBakarKukusPorsi(menuId: string, caraMasak: CaraMasakId): number {
    const found = linesBakarKukus.value.find(l => l.menuId === menuId && l.caraMasak === caraMasak)
    return found ? found.jumlahPorsi : 0
  }

  function hasBakarKukusOrders(): boolean {
    return linesBakarKukus.value.some(l => l.jumlahPorsi > 0)
  }

  function getTotalPorsi(): number {
    return linesBakarKukus.value.reduce((s, l) => s + l.jumlahPorsi, 0)
  }

  function getSubtotalBakar(): number {
    const pkgStore = usePackageStore()
    return linesBakarKukus.value
      .filter(l => l.caraMasak === 'bakar')
      .reduce((s, l) => {
        const mcm = pkgStore.getMenuCaraMasak(l.menuId, 'bakar')
        return s + l.jumlahPorsi * (mcm?.hargaPorsi ?? 18000)
      }, 0)
  }

  function getSubtotalKukus(): number {
    const pkgStore = usePackageStore()
    return linesBakarKukus.value
      .filter(l => l.caraMasak === 'kukus')
      .reduce((s, l) => {
        const mcm = pkgStore.getMenuCaraMasak(l.menuId, 'kukus')
        return s + l.jumlahPorsi * (mcm?.hargaPorsi ?? 16000)
      }, 0)
  }

  function getSubtotalFrozen(): number {
    const pkgStore = usePackageStore()
    return lines.value.reduce((s, l) => {
      const pkg = pkgStore.getPackageById(l.packageId)
      return s + l.qty * (pkg?.price ?? 0)
    }, 0)
  }

  function getGrandTotal(shippingFee: number): number {
    return getSubtotalBakar() + getSubtotalKukus() + getSubtotalFrozen() + shippingFee
  }

  function clearAll(): void {
    lines.value = []
    linesBakarKukus.value = []
  }

  return {
    lines, linesBakarKukus,
    getOrderLines, getQty, hasOrders, getTotalPackages,
    setQty, clearAll,
    getBakarKukusLines, setBakarKukus, getBakarKukusPorsi,
    hasBakarKukusOrders, getTotalPorsi,
    getSubtotalBakar, getSubtotalKukus, getSubtotalFrozen, getGrandTotal,
  }
})


