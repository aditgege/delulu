import { defineStore } from 'pinia'
import { useLocalStorage } from '@vueuse/core'
import type { OrderLine } from '~/types'

export const useOrderStore = defineStore('orders', () => {
  const lines = useLocalStorage<OrderLine[]>('delulul:orders', [])

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

  function clearAll(): void {
    lines.value = []
  }

  return {
    lines,
    getOrderLines, getQty, hasOrders, getTotalPackages,
    setQty, clearAll,
  }
})
