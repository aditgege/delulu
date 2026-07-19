import { defineStore } from 'pinia'
import { useLocalStorage } from '@vueuse/core'
import { SEED_SKUS } from '~/data/seed'
import type { InventoryEntry, SKU } from '~/types'

export const useInventoryStore = defineStore('inventory', () => {
  function defaultInventory(): InventoryEntry[] {
    return SEED_SKUS.map((sku: SKU) => ({ skuId: sku.id, qtyOnHand: 0 }))
  }

  const entries = useLocalStorage<InventoryEntry[]>('delulul:inventory', defaultInventory())

  function getStock(skuId: string): number {
    const found = entries.value.find(e => e.skuId === skuId)
    return found ? found.qtyOnHand : 0
  }

  function getAllEntries(): InventoryEntry[] {
    return entries.value
  }

  function setStock(skuId: string, qty: number): void {
    const idx = entries.value.findIndex(e => e.skuId === skuId)
    const validQty = Math.max(0, qty)
    if (idx >= 0) {
      entries.value[idx] = { skuId, qtyOnHand: validQty }
    } else {
      entries.value.push({ skuId, qtyOnHand: validQty })
    }
  }

  function deductStock(skuId: string, qty: number): void {
    const current = getStock(skuId)
    setStock(skuId, Math.max(0, current - qty))
  }

  function resetAll(): void {
    entries.value = defaultInventory()
  }

  return {
    entries,
    getStock, getAllEntries,
    setStock, deductStock, resetAll,
  }
})
