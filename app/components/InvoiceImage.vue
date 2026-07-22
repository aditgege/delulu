<script setup lang="ts">
import { toPng } from 'html-to-image'
import type { CustomerOrder } from '~/types'
import { formatInvoiceText } from '~/utils/invoice'
import { MERCHANT_INFO } from '~/utils/invoice'

interface BakarKukusLineItem {
  menuId: string
  caraMasak: string
  name: string
  jumlahPorsi: number
  harga: number
  total: number
}

interface PackageWithQty {
  id: string
  name: string
  price: number
  qty: number
  extraChiliOil: number
}

interface Props {
  customer: CustomerOrder
  poLabel: string
  getPackageById: (id: string) => { name: string; price?: number } | undefined
  getMenuName: (id: string) => string | undefined
  getHargaPorsi?: (menuId: string, caraMasak: string) => number
}

const props = defineProps<Props>()

const invoiceEl = ref<HTMLDivElement | null>(null)

// ── Computed data from props (for HTML template) ──

const packagesWithQty = computed<PackageWithQty[]>(() => {
  return props.customer.items.map(item => {
    const pkg = props.getPackageById(item.packageId)
    return {
      id: item.packageId,
      name: pkg?.name ?? item.packageId,
      price: pkg?.price ?? 0,
      qty: item.qty,
      extraChiliOil: item.extraChiliOil ?? 0,
    }
  }).filter(p => p.qty > 0)
})

const bakarKukusLines = computed<BakarKukusLineItem[]>(() => {
  if (!props.customer.bakarKukusItems) return []
  return props.customer.bakarKukusItems
    .filter(b => b.caraMasak === 'bakar' || b.caraMasak === 'kukus')
    .map(b => {
      const harga = props.getHargaPorsi?.(b.menuId, b.caraMasak) ?? (b.caraMasak === 'bakar' ? 18000 : 16000)
      return {
        menuId: b.menuId,
        caraMasak: b.caraMasak,
        name: props.getMenuName(b.menuId) ?? b.menuId,
        jumlahPorsi: b.jumlahPorsi,
        harga,
        total: b.jumlahPorsi * harga,
      }
    })
})

const chiliCount = computed(() =>
  packagesWithQty.value.reduce((s, p) => s + p.extraChiliOil, 0),
)

const chiliTotal = computed(() => chiliCount.value * 2000)

const subtotalItems = computed(() => {
  const pkgTotal = packagesWithQty.value.reduce((s, p) => s + p.price * p.qty, 0)
  const bkTotal = bakarKukusLines.value.reduce((s, b) => s + b.total, 0)
  return pkgTotal + bkTotal + chiliTotal.value
})

const grandTotal = computed(() =>
  subtotalItems.value + (props.customer.shippingFee || 0),
)

const hasItems = computed(() =>
  packagesWithQty.value.length > 0 || bakarKukusLines.value.length > 0,
)

// ── Text output ──

const invoiceText = computed(() =>
  formatInvoiceText(props.customer, props.poLabel, props.getPackageById, props.getMenuName),
)

// ── Image generation ──

async function generateImage(): Promise<Blob | null> {
  if (!invoiceEl.value) return null
  try {
    const dataUrl = await toPng(invoiceEl.value, {
      quality: 1,
      pixelRatio: 2,
      backgroundColor: '#ffffff',
      cacheBust: true,
    })
    // dataUrl → blob
    const bin = atob(dataUrl.split(',')[1]!)
    const buf = new Uint8Array(bin.length)
    for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i)
    return new Blob([buf], { type: 'image/png' })
  } catch (err) {
    console.error('InvoiceImage: failed to generate image', err)
    return null
  }
}

defineExpose({ generateImage, invoiceText })

// ── Rp formatter ──

function rp(n: number): string {
  return 'Rp' + n.toLocaleString('id-ID')
}
</script>

<template>
  <div
    ref="invoiceEl"
    style="position: absolute; left: 0; top: 0; z-index: -999; opacity: 0; pointer-events: none; background: white; width: 420px; padding: 28px; border-radius: 8px; font-family: system-ui, -apple-system, sans-serif;"
  >
    <!-- Header -->
    <div style="text-align: center; margin-bottom: 20px;">
      <div style="font-size: 11px; color: #888;">{{ MERCHANT_INFO.brand }}</div>
      <div style="font-size: 20px; font-weight: 700; color: #1a1a1a;">{{ MERCHANT_INFO.name }}</div>
      <div
        style="margin-top: 8px; font-size: 13px; font-weight: 600; color: #444; letter-spacing: 2px; border-top: 1px dashed #ddd; border-bottom: 1px dashed #ddd; padding: 6px 0;"
      >
        {{ MERCHANT_INFO.title }}
      </div>
    </div>

    <!-- Customer info -->
    <div style="font-size: 12px; color: #555; margin-bottom: 16px; line-height: 1.8;">
      <div>Nama Pembeli: <strong style="color: #1a1a1a;">{{ customer.name }}</strong></div>
      <div>Tanggal: <strong style="color: #1a1a1a;">{{ poLabel }}</strong></div>
    </div>

    <!-- Items table -->
    <table v-if="hasItems" style="width: 100%; font-size: 11px; border-collapse: collapse;">
      <thead>
        <tr style="border-bottom: 2px solid #1a1a1a; color: #555; font-weight: 600;">
          <td style="padding: 6px 4px;">No.</td>
          <td style="padding: 6px 4px;">Produk</td>
          <td style="padding: 6px 4px; text-align: center;">Qty</td>
          <td style="padding: 6px 4px; text-align: right;">Harga</td>
          <td style="padding: 6px 4px; text-align: right;">Total</td>
        </tr>
      </thead>
      <tbody>
        <!-- Frozen packages -->
        <tr
          v-for="(pkg, i) in packagesWithQty"
          :key="pkg.id"
          style="border-bottom: 1px solid #eee;"
        >
          <td style="padding: 6px 4px; color: #888;">{{ i + 1 }}</td>
          <td style="padding: 6px 4px; font-weight: 600; color: #1a1a1a;">{{ pkg.name }}</td>
          <td style="padding: 6px 4px; text-align: center;">{{ pkg.qty }}</td>
          <td style="padding: 6px 4px; text-align: right; color: #555;">{{ rp(pkg.price) }}</td>
          <td style="padding: 6px 4px; text-align: right; font-weight: 600;">{{ rp(pkg.qty * pkg.price) }}</td>
        </tr>
        <!-- Bakar/Kukus items -->
        <tr
          v-for="item in bakarKukusLines"
          :key="item.menuId + item.caraMasak"
          style="border-bottom: 1px solid #eee;"
        >
          <td style="padding: 6px 4px; color: #888;"></td>
          <td style="padding: 6px 4px; font-weight: 600; color: #1a1a1a;">
            {{ item.name }} ({{ item.caraMasak === 'bakar' ? 'Bakar' : 'Kukus' }})
          </td>
          <td style="padding: 6px 4px; text-align: center;">{{ item.jumlahPorsi }} porsi</td>
          <td style="padding: 6px 4px; text-align: right; color: #555;">{{ rp(item.harga) }}</td>
          <td style="padding: 6px 4px; text-align: right; font-weight: 600;">{{ rp(item.total) }}</td>
        </tr>
        <!-- Chili oil note -->
        <tr v-if="chiliCount > 0">
          <td colspan="5" style="padding: 4px; font-size: 10px; color: #d97706; text-align: right;">
            🌶️ +{{ chiliCount }} chili oil extra ({{ rp(chiliTotal) }})
          </td>
        </tr>
        <!-- Shipping fee -->
        <tr v-if="customer.shippingFee > 0" style="border-bottom: 1px solid #eee;">
          <td style="padding: 6px 4px; color: #888;"></td>
          <td style="padding: 6px 4px; font-weight: 600; color: #1a1a1a;" colspan="2">Ongkir</td>
          <td style="padding: 6px 4px; text-align: right; color: #555;"></td>
          <td style="padding: 6px 4px; text-align: right; font-weight: 600;">{{ rp(customer.shippingFee) }}</td>
        </tr>
      </tbody>
    </table>

    <!-- Total -->
    <div
      v-if="hasItems"
      style="margin-top: 12px; border-top: 2px solid #1a1a1a; padding-top: 8px; text-align: right; font-size: 16px; font-weight: 700;"
    >
      TOTAL: {{ rp(grandTotal) }}
    </div>

    <!-- Payment info -->
    <div style="margin-top: 20px; font-size: 11px; color: #555; line-height: 1.8;">
      <div style="font-weight: 600; color: #1a1a1a;">Transfer</div>
      <div>{{ MERCHANT_INFO.bank }} &nbsp; {{ MERCHANT_INFO.accountNumber }}</div>
      <div>a.n. {{ MERCHANT_INFO.accountName }}</div>
    </div>

    <!-- Contact -->
    <div
      style="margin-top: 16px; font-size: 10px; color: #888; line-height: 1.8; border-top: 1px dashed #ddd; padding-top: 12px;"
    >
      <div>{{ MERCHANT_INFO.phone1 }} / {{ MERCHANT_INFO.phone2 }}</div>
      <div>{{ MERCHANT_INFO.ig }}</div>
      <div>{{ MERCHANT_INFO.address }}</div>
    </div>

    <!-- Footer -->
    <div style="margin-top: 16px; text-align: center; font-size: 11px; color: #aaa; font-style: italic;">
      {{ MERCHANT_INFO.footer }} 🥟
    </div>
  </div>
</template>
