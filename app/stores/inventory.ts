import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { InventoryEntry } from '~/types'

export const useInventoryStore = defineStore('inventory', () => {
  const entries = ref<InventoryEntry[]>([])
  const loaded = ref(false)

  async function ensureLoaded() {
    if (loaded.value) return
    const data = await $fetch<InventoryEntry[]>('/api/inventory')
    entries.value = data.map((d: any) => ({ menuId: d.menu_id, qtyOnHand: d.qty_on_hand }))
    loaded.value = true
  }

  function getStock(menuId: string): number {
    const found = entries.value.find(e => e.menuId === menuId)
    return found ? found.qtyOnHand : 0
  }

  function getAllEntries(): InventoryEntry[] {
    return entries.value
  }

  async function setStock(menuId: string, qty: number) {
    await $fetch('/api/inventory', { method: 'PUT', body: { entries: [{ menuId, qtyOnHand: qty }] } })
    const idx = entries.value.findIndex(e => e.menuId === menuId)
    if (idx >= 0) {
      entries.value[idx] = { menuId, qtyOnHand: qty }
    } else {
      entries.value.push({ menuId, qtyOnHand: qty })
    }
  }

  async function deductStock(menuId: string, qty: number) {
    await $fetch('/api/inventory-deduct', { method: 'PUT', body: { menuId, qty } })
    const current = getStock(menuId)
    setStock(menuId, current - qty)
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

