import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { InventoryEntry } from '~/types'

export const useInventoryStore = defineStore('inventory', () => {
  const entries = ref<InventoryEntry[]>([])
  const loaded = ref(false)

  async function ensureLoaded() {
    if (loaded.value) return
    const data = await $fetch<InventoryEntry[]>('/api/inventory')
    entries.value = data.map((d: any) => ({ skuId: d.sku_id, qtyOnHand: d.qty_on_hand }))
    loaded.value = true
  }

  function getStock(skuId: string): number {
    const found = entries.value.find(e => e.skuId === skuId)
    return found ? found.qtyOnHand : 0
  }

  function getAllEntries(): InventoryEntry[] {
    return entries.value
  }

  async function setStock(skuId: string, qty: number) {
    await $fetch('/api/inventory', { method: 'PUT', body: { entries: [{ skuId, qtyOnHand: qty }] } })
    const idx = entries.value.findIndex(e => e.skuId === skuId)
    if (idx >= 0) {
      entries.value[idx] = { skuId, qtyOnHand: qty }
    } else {
      entries.value.push({ skuId, qtyOnHand: qty })
    }
  }

  async function deductStock(skuId: string, qty: number) {
    await $fetch('/api/inventory-deduct', { method: 'PUT', body: { skuId, qty } })
    const current = getStock(skuId)
    setStock(skuId, current - qty)
  }

  async function resetAll() {
    await $fetch('/api/inventory-reset', { method: 'PUT' })
    entries.value = entries.value.map(e => ({ ...e, qtyOnHand: 0 }))
  }

  return {
    entries, loaded,
    ensureLoaded,
    getStock, getAllEntries,
    setStock, deductStock, resetAll,
  }
})
