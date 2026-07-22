# ADR 0002: Invoice Sharing per Customer

**Status**: Accepted  
**Date**: 2026-07-22  
**Context**: [Grill / Domain Modeling session]

## Decisions

### 1. Shipping Fee as Direct Field on CustomerOrder

Add `shippingFee` (integer) to `CustomerOrder` instead of treating it as a flexible fee table or an extra line item.

```typescript
interface CustomerOrder {
  id: string
  name: string
  items: OrderItem[]
  bakarKukusItems?: CustomerBakarKukusItem[]
  shippingFee: number      // ← added, default 0
  paid: boolean
  shipped: boolean
}
```

**Rationale**: Shipping fee is per-customer (different locations = different fees), single scalar, always present. Extra table for a single integer is over-engineering. Keeping it as a synthetic line item in invoice text is fragile and duplicates calculation.

### 2. Hardcode Merchant Info

Store info (BCA account, address, phone, IG, tagline) hardcoded in a single config object within the app, not in DB.

**Rationale**: These values change ~never. DB storage adds migration + settings UI cost for zero benefit. One source file is trivially editable when (if) needed.

### 3. Generate Invoice Image Client-Side with `html-to-image`

Render a hidden Vue component to a PNG canvas using `html-to-image`, then share via Web Share API or clipboard.

**Rationale**: 
- No server-side rendering dependency
- Layout is defined in Vue template (familiar, easy to iterate)
- `html-to-image` is lightweight, well-maintained, handles responsive sizing
- PNG image fits WhatsApp sharing flow (image + text caption)

Alternatives considered:
- **Canvas 2D draw**: Manual pixel positioning, hard to maintain
- **Server-side Puppeteer**: Too heavy for a small app
- **PDF**: Overkill for chat sharing

### 4. Invoice Text via Clipboard + WhatsApp Intent

Copy formatted invoice text to clipboard, then open `wa.me` URL. Both text and image available for the user to paste/send.

**Rationale**: No WhatsApp API key needed. User controls who they send to. Works on mobile and desktop.

### 5. Share Trigger: Per-Customer Button

Single "Share" button on each customer card in POManager. No bulk share for now.

## Consequences

### Positive
- Shipping fee is consistently calculated in `customerTotal()` with no special cases
- Invoice generation uses existing types — no DB migration for merchant data
- Image layout is easy to iterate (Vue template, not canvas math)
- Zero server-side changes for sharing

### Negative
- `html-to-image` adds ~15KB to client bundle
- Web Share API not supported on desktop Firefox/Safari — fallback to clipboard + manual share
- Merchant info requires code edit if changed

## How This ADR Was Made

Decided during a `/grill-with-docs` session with the domain owner, after mapping the current data model, UI flow, and sharing constraints.
