# app/ — Client-Side Source

**Scope:** UI shell, pages, components, state, types, seed data, client middleware.

## STRUCTURE

```
app/
├── app.vue                # Root layout: header + NuxtPage + sticky bottom nav
├── types.ts               # 18 domain interfaces + PORSI_PCS constant
├── assets/css/main.css    # Tailwind v4 @theme tokens (no JS config)
├── components/            # 6 SFCs — auto-imported by Nuxt
│   ├── POManager.vue      # Purchase order CRUD (724 lines — oversized)
│   ├── InvoiceImage.vue   # PNG invoice via html-to-image
│   ├── InventoryInput.vue # Stock-on-hand form
│   ├── CostSummary.vue    # Per-supplier cost breakdown
│   ├── PurchaseTable.vue  # Order items table
│   └── SkuBreakdownTable.vue # SKU-level row expansion
├── composables/           # 2 composables
│   ├── usePurchaseOptimizer.ts  # Wraps optimizer.ts
│   └── usePwaAuth.ts            # PIN cookie auth
├── data/seed.ts           # TS seed data
├── middleware/             # Client-side auth guard
│   └── auth.global.ts     # Redirects to /login if no cookie
├── pages/                 # 4 file-based routes
│   ├── index.vue          # Order entry (default)
│   ├── login.vue          # PIN gate
│   ├── rekomendasi.vue    # Purchase recommendation results
│   └── settings.vue       # Supplier/price config
├── plugins/pinia.ts       # Pinia install
└── stores/                # 4 Pinia stores (setup-function syntax)
    ├── orders.ts          # Session order lines (ephemeral)
    ├── po.ts              # Purchase order CRUD via API
    ├── packages.ts        # Menu/package/supplier cache
    └── inventory.ts       # Stock on hand
```

## WHERE TO LOOK

| Concern | File | Notes |
|---------|------|-------|
| App shell | `app.vue` | Header, `<NuxtPage/>`, bottom nav bar |
| Routes | `pages/` | 4 pages: order entry, login, results, settings |
| Order state | `stores/orders.ts` | Session-local, not persisted |
| PO persistence | `stores/po.ts` | CRUD via `$fetch` to `/api/orders` |
| Package cache | `stores/packages.ts` | Ensures DB migration on first load |
| Inventory | `stores/inventory.ts` | Stock-on-hand mutations |
| Auth | `composables/usePwaAuth.ts` | PIN validation, cookie set/clear |
| Optimizer | `composables/usePurchaseOptimizer.ts` | Calls `optimizer.ts` logic |
| Seed data | `data/seed.ts` | TS seed (the SQL seed is dead) |

## CONVENTIONS

- **Pinia setup-function syntax** — `defineStore('x', () => { ... })` with `$fetch` for API calls and optimistic local updates.
- **Auto-imported components** — Nuxt scans `components/`; import is implicit.
- **Path alias** — `~/` maps to `app/`.
- **Types** — All domain interfaces in `types.ts`; no per-file types.
- **Tailwind v4 tokens** — Defined in `main.css` `@theme` block, no JS config.

## ANTI-PATTERNS

- **`$fetch<any>` in stores** — `po.ts` and `inventory.ts` (4 call sites) skip response typing. Server returns untyped rows.
- **Constants in types.ts** — `PORSI_PCS` mixed into domain interfaces.
- **POManager.vue 724 lines** — share modal duplicates `InvoiceImage.vue`; customer card should extract; logic belongs in store.
- **Seed source** — `data/seed.ts` only (SQL seed deleted).
