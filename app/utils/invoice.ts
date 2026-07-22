import type { CustomerOrder, CustomerBakarKukusItem } from '~/types'

// ─── Merchant Info ───

export const MERCHANT_INFO = {
  bank: 'BCA',
  accountNumber: '2802430397',
  accountName: 'LUSIANA ARLAN',
  brand: 'Love at first bite',
  name: 'Delulu Dimsum',
  title: 'NOTA PEMBELIAN',
  phone1: '082129897952',
  phone2: '082116815427',
  ig: '@dimsumlulu',
  address: 'Jl Saluyu III no.33',
  footer: 'Have a sweet day!',
} as const

// ─── Helpers ───

const CHILI_OIL_PRICE = 2000

/** Format number as Rupiah string, e.g. 35000 → "Rp35.000" */
function rp(n: number): string {
  return 'Rp' + n.toLocaleString('id-ID')
}

/** Left-pad string to width */
function padL(s: string, w: number): string {
  return s.length >= w ? s : ' '.repeat(w - s.length) + s
}

/** Right-pad string to width */
function padR(s: string, w: number): string {
  return s.length >= w ? s : s + ' '.repeat(w - s.length)
}

// ─── Column widths ───
const W_NO = 5       // "1.   "
const W_PROD = 20    // product / item name
const W_QTY = 6      // qty / porsi
const W_PRICE = 12   // price per unit (e.g. "   Rp18.000")
const W_TOTAL = 14   // line total (e.g. "    Rp350.000")

/** Build a single item line with consistent column widths */
function itemLine(no: string, name: string, qty: string, price: string, total: string): string {
  return (
    padR(no, W_NO) +
    padR(name, W_PROD) +
    padL(qty, W_QTY) +
    padL(price, W_PRICE) +
    padL(total, W_TOTAL)
  )
}

function headerLine(col2: string): string {
  return itemLine('No.', col2, 'Qty', 'Harga', 'Total')
}

const ITEM_BODY_WIDTH = W_NO + W_PROD + W_QTY + W_PRICE

function separator(): string {
  return ' '.repeat(ITEM_BODY_WIDTH) + '─'.repeat(W_TOTAL)
}

// ─── Main formatter ───

export function formatInvoiceText(
  customer: CustomerOrder,
  poLabel: string,
  getPackageById: (id: string) => { name: string; price?: number } | undefined,
  getMenuName: (id: string) => string | undefined,
  getHargaPorsi?: (menuId: string, caraMasak: string) => number,
): string {
  const lines: string[] = []

  // ── Header ──
  lines.push(MERCHANT_INFO.brand)
  lines.push(MERCHANT_INFO.name)
  lines.push(MERCHANT_INFO.title)
  lines.push('')

  // Bank info
  lines.push(MERCHANT_INFO.bank)
  lines.push(MERCHANT_INFO.accountNumber)
  lines.push(MERCHANT_INFO.accountName)
  lines.push('')

  // Customer & delivery
  lines.push(`Nama Pembeli: ${customer.name}`)
  lines.push(`Tanggal Pengiriman: ${poLabel}`)
  lines.push('')

  // ── Items ──
  let hasItems = false
  let total = 0
  let itemNo = 0
  let totalChiliOil = 0

  // Frozen packages
  if (customer.items.length > 0) {
    lines.push(headerLine('Produk'))
    for (const item of customer.items) {
      const pkg = getPackageById(item.packageId)
      if (!pkg) continue
      const price = pkg.price ?? 0
      const qty = item.qty
      const lineTotal = price * qty
      total += lineTotal
      itemNo++
      hasItems = true
      lines.push(itemLine(
        `${itemNo}.`,
        pkg.name,
        String(qty),
        rp(price),
        rp(lineTotal),
      ))

      // Extra chili oil per package
      if (item.extraChiliOil && item.extraChiliOil > 0) {
        const chiliTotal = item.extraChiliOil * CHILI_OIL_PRICE
        totalChiliOil += chiliTotal
      }
    }
  }

  // Bakar & Kukus items
  const bkItems = (customer.bakarKukusItems ?? []).filter(
    (b: CustomerBakarKukusItem) => b.caraMasak === 'bakar' || b.caraMasak === 'kukus',
  )
  if (bkItems.length > 0) {
    if (!hasItems) {
      // No frozen items shown yet, need header
      lines.push(headerLine('Produk'))
    }
    for (const b of bkItems) {
      const menuName = getMenuName(b.menuId) ?? b.menuId
      const caraLabel = b.caraMasak === 'bakar' ? 'Bakar' : 'Kukus'
      const price = getHargaPorsi?.(b.menuId, b.caraMasak) ?? (b.caraMasak === 'bakar' ? 18000 : 16000)
      const lineTotal = b.jumlahPorsi * price
      total += lineTotal
      hasItems = true
      lines.push(itemLine(
        '', // no number for bakar/kukus
        `${menuName} (${caraLabel})`,
        `${b.jumlahPorsi} porsi`,
        rp(price),
        rp(lineTotal),
      ))
    }
  }

  // Chili oil line (if any)
  if (totalChiliOil > 0) {
    total += totalChiliOil
    const totalChiliItems = (customer.items ?? []).reduce(
      (s, i) => s + (i.extraChiliOil ?? 0), 0,
    )
    lines.push(itemLine(
      '',
      '+ Minyak Cabai',
      String(totalChiliItems),
      rp(CHILI_OIL_PRICE),
      rp(totalChiliOil),
    ))
  }

  // ── Totals ──
  if (hasItems) {
    // Shipping fee
    if (customer.shippingFee > 0) {
      total += customer.shippingFee
      lines.push(itemLine('', 'Ongkir', '', '', rp(customer.shippingFee)))
    }

    lines.push(separator())
    // TOTAL aligned left, amount right-aligned at total column
    lines.push('TOTAL' + ' '.repeat(ITEM_BODY_WIDTH - 'TOTAL'.length) + padL(rp(total), W_TOTAL))
  }

  // ── Footer ──
  lines.push('')
  lines.push('Transfer')
  lines.push(`${MERCHANT_INFO.bank} ${MERCHANT_INFO.accountNumber}`)
  lines.push(`a.n. ${MERCHANT_INFO.accountName}`)
  lines.push('')
  lines.push(`${MERCHANT_INFO.phone1} / ${MERCHANT_INFO.phone2}`)
  lines.push(MERCHANT_INFO.ig)
  lines.push(MERCHANT_INFO.address)
  lines.push('')
  lines.push(MERCHANT_INFO.footer)

  return lines.join('\n')
}
