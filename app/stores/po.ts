import { defineStore } from 'pinia'
import { ref } from 'vue'
import { usePackageStore } from '~/stores/packages'
import type { PurchaseOrder, CustomerOrder } from '~/types'

function nextId(): string {
  return `po_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`
}

export const usePoStore = defineStore('po', () => {
  const orders = ref<PurchaseOrder[]>([])
  const loaded = ref(false)

  async function ensureLoaded() {
    if (loaded.value) return
    const data = await $fetch<any[]>('/api/orders')
    orders.value = await Promise.all(data.map(async (o: any) => {
      const detail = await $fetch<any>(`/api/orders/${o.id}`)
      return {
        id: detail.order.id,
        label: detail.order.label,
        customers: detail.customers.map((c: any) => ({
          id: c.id,
          name: c.name,
          shippingFee: c.shippingFee ?? 0,
          discount: c.discount ?? 0,
          paid: c.paid,
          shipped: c.shipped,
          items: (c.items || []).map((i: any) => ({
            productId: i.productId,
            variant: i.variant || undefined,
            qty: i.qty,
            unitPrice: i.unitPrice || 0,
          })),
          // Backward compat: build bakarKukusItems from unified items
          bakarKukusItems: (c.items || [])
            .filter((i: any) => i.variant && ['bakar', 'kukus'].includes(i.variant.toLowerCase()))
            .map((i: any) => ({
              menuId: i.productId,
              caraMasak: i.variant.toLowerCase(),
              jumlahPorsi: i.qty,
            })),
        })),
        createdAt: detail.order.created_at,
        closed: detail.order.closed,
      } as PurchaseOrder
    }))
    loaded.value = true
  }

  function getActiveOrders(): PurchaseOrder[] {
    return orders.value.filter(o => !o.closed)
      .sort((a, b) => b.createdAt - a.createdAt)
  }

  function getOrderById(id: string): PurchaseOrder | undefined {
    return orders.value.find(o => o.id === id)
  }

  async function createOrder(label: string): Promise<PurchaseOrder> {
    const po: PurchaseOrder = {
      id: nextId(),
      label, customers: [],
      createdAt: Date.now(), closed: false,
    }
    await $fetch('/api/orders', { method: 'POST', body: po })
    orders.value = [...orders.value, po]
    return po
  }

  async function addCustomer(poId: string, name: string): Promise<CustomerOrder | null> {
    const po = orders.value.find(o => o.id === poId)
    if (!po) return null
    const customer: CustomerOrder = {
      id: nextId(), name,
      items: [], bakarKukusItems: [], shippingFee: 0, discount: 0, paid: false, shipped: false,
    }
    await $fetch(`/api/orders/${poId}/customers`, {
      method: 'POST',
      body: customer,
    })
    orders.value = orders.value.map(o =>
      o.id === poId ? { ...o, customers: [...o.customers, customer] } : o,
    )
    return customer
  }

  async function removeCustomer(poId: string, customerId: string) {
    await $fetch(`/api/orders/${poId}/customers/${customerId}`, { method: 'DELETE' })
    orders.value = orders.value.map(o =>
      o.id === poId
        ? { ...o, customers: o.customers.filter(c => c.id !== customerId) }
        : o,
    )
  }

  async function setCustomerItem(poId: string, customerId: string, productId: string, qty: number, unitPrice?: number) {
    const validQty = Math.max(0, Math.floor(qty))
    const po = orders.value.find(o => o.id === poId)
    if (!po) return
    
    const customer = po.customers.find(c => c.id === customerId)
    if (!customer) return

    const pkgStore = usePackageStore()
    const price = unitPrice ?? pkgStore.getProductPrice(productId)

    let newItems = [...customer.items]
    const idx = newItems.findIndex(i => i.productId === productId)
    if (idx >= 0) {
      if (validQty > 0) {
        newItems[idx] = { productId, qty: validQty, unitPrice: price }
      } else {
        newItems.splice(idx, 1)
      }
    } else if (validQty > 0) {
      newItems.push({ productId, qty: validQty, unitPrice: price })
    }

    await $fetch(`/api/orders/${poId}/customers/${customerId}/items`, {
      method: 'PUT',
      body: { items: newItems },
    })

    orders.value = orders.value.map(o =>
      o.id === poId
        ? { ...o, customers: o.customers.map(c =>
            c.id === customerId ? { ...c, items: newItems } : c
          )}
        : o,
    )
  }

  async function setShippingFee(poId: string, customerId: string, shippingFee: number) {
    const valid = Math.max(0, Math.floor(shippingFee))
    await $fetch(`/api/orders/${poId}/customers/${customerId}/shipping-fee`, {
      method: 'PUT',
      body: { shippingFee: valid },
    })
    orders.value = orders.value.map(o =>
      o.id === poId
        ? { ...o, customers: o.customers.map(c =>
            c.id === customerId ? { ...c, shippingFee: valid } : c
          )}
        : o,
    )
  }

  async function setDiscount(poId: string, customerId: string, discount: number) {
    const valid = Math.max(0, Math.floor(discount))
    await $fetch(`/api/orders/${poId}/customers/${customerId}/discount`, {
      method: 'PUT',
      body: { discount: valid },
    })
    orders.value = orders.value.map(o =>
      o.id === poId
        ? { ...o, customers: o.customers.map(c =>
            c.id === customerId ? { ...c, discount: valid } : c
          )}
        : o,
    )
  }

  async function togglePaid(poId: string, customerId: string) {
    await $fetch(`/api/orders/${poId}/customers/${customerId}/toggle`, {
      method: 'PUT',
      body: { field: 'paid' },
    })
    orders.value = orders.value.map(o =>
      o.id === poId
        ? { ...o, customers: o.customers.map(c =>
            c.id === customerId ? { ...c, paid: !c.paid } : c,
          )}
        : o,
    )
  }

  async function toggleShipped(poId: string, customerId: string) {
    await $fetch(`/api/orders/${poId}/customers/${customerId}/toggle`, {
      method: 'PUT',
      body: { field: 'shipped' },
    })
    orders.value = orders.value.map(o =>
      o.id === poId
        ? { ...o, customers: o.customers.map(c =>
            c.id === customerId ? { ...c, shipped: !c.shipped } : c,
          )}
        : o,
    )
  }

  function customerTotal(customer: CustomerOrder): number {
    const pkgStore = usePackageStore()
    let total = 0
    for (const item of customer.items) {
      total += item.unitPrice * item.qty
    }
    total += customer.shippingFee ?? 0
    total -= customer.discount ?? 0
    return Math.max(0, total)
  }

  function orderTotal(poId: string): number {
    const po = orders.value.find(o => o.id === poId)
    if (!po) return 0
    return po.customers.reduce((s, c) => s + customerTotal(c), 0)
  }

  async function closeOrder(id: string) {
    await $fetch(`/api/orders/${id}/close`, { method: 'PUT' })
    orders.value = orders.value.map(o =>
      o.id === id ? { ...o, closed: true } : o,
    )
  }

  async function deleteOrder(id: string) {
    await $fetch(`/api/orders/${id}/delete`, { method: 'DELETE' })
    orders.value = orders.value.filter(o => o.id !== id)
  }

  function getClosedOrders(): PurchaseOrder[] {
    return orders.value.filter(o => o.closed)
      .sort((a, b) => b.createdAt - a.createdAt)
  }

  function totalRevenue(): number {
    return getClosedOrders().reduce((s, o) => s + orderTotal(o.id), 0)
  }

  function totalCustomers(): number {
    return getClosedOrders().reduce((s, o) => s + o.customers.length, 0)
  }

  function totalPackagesSold(): number {
    return getClosedOrders().reduce((s, o) =>
      s + o.customers.reduce((sc, c) =>
        sc + c.items.reduce((si, i) => si + i.qty, 0), 0
      ), 0
    )
  }

  function totalBakarKukusPorsiSold(): number {
    return getClosedOrders().reduce((s, o) =>
      s + o.customers.reduce((sc, c) =>
        sc + (c.bakarKukusItems ?? []).reduce((si, i) => si + i.jumlahPorsi, 0), 0
      ), 0
    )
  }

  return {
    orders, loaded,
    ensureLoaded,
    getActiveOrders, getOrderById,
    createOrder, closeOrder, deleteOrder,
    addCustomer, removeCustomer,
    setCustomerItem, setShippingFee, togglePaid, toggleShipped,
    setDiscount,
    customerTotal, orderTotal,
    getClosedOrders, totalRevenue, totalCustomers, totalPackagesSold, totalBakarKukusPorsiSold,
  }
})


