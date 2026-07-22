# PROJECT KNOWLEDGE BASE

**Generated:** 2026-07-23
**Stack:** Nuxt 4.5 + Vue 3 + Nuxt UI v4 + Pinia + Tailwind v4 + Neon PostgreSQL + PWA
**Deploy:** Vercel serverless (vercel.json)

## OVERVIEW

Dimsum reseller purchase optimizer — PWA for order management (frozen + bakar/kukus menu), inventory tracking, supplier mix optimization, and invoice sharing via WhatsApp.

## STRUCTURE

```
delulul/
├── app/             # Nuxt 4 app source (pages, components, stores, utils)
├── server/          # Nitro server (API routes, DB, auth middleware)
├── docs/adr/        # Architecture Decision Records
├── public/          # Static assets (icons, favicon)
├── nuxt.config.ts   # Framework config
├── vitest.config.ts # Test config
└── vercel.json      # Deployment
```

## WHERE TO LOOK

| Task | Location | Notes |
|------|----------|-------|
| Core business logic | `app/utils/optimizer.ts` | Purchase optimization, mix/pack algorithms |
| Invoice formatting | `app/utils/invoice.ts` | Columns-aligned monospace + merchant info |
| UI components | `app/components/` | 6 SFCs, auto-imported |
| Pages/routes | `app/pages/` | index (order), rekomendasi, settings, login |
| State (ephemeral) | `app/stores/orders.ts` | Session order lines |
| State (persisted PO) | `app/stores/po.ts` | Purchase order CRUD via API |
| State (cache) | `app/stores/packages.ts` | Menus, packages, supplier data |
| State (inventory) | `app/stores/inventory.ts` | Stock on hand |
| Auth composable | `app/composables/usePwaAuth.ts` | PIN-based cookie auth |
| Optimizer composable | `app/composables/usePurchaseOptimizer.ts` | Wraps optimizer logic |
| API routes | `server/api/` | 33 file-based Nitro endpoints |
| DB schema | `server/db/schema.sql` | 13 tables |
| Auth middleware | `server/middleware/auth.ts` | Cookie guard for /api/* |
| DB connection | `server/utils/db.ts` | Neon serverless singleton |
| Domain glossary | `CONTEXT.md` | Business terms & pricing rules |
| Types | `app/types.ts` | All domain interfaces |
| Seed data | `app/data/seed.ts` | TS seed (server/db/seed.sql is dead) |
| Tests | `app/utils/optimizer.test.ts` | Only test file (7 tests) |

## CONVENTIONS

- **Naming**: `server/api/resource.action.httpMethod.ts` — e.g. `packages.get.ts`, `customers/[id]/shipping-fee.put.ts`
- **Handler pattern**: `defineEventHandler(async (event) => { const sql = useDb(); ... return { status: 'ok' } })`
- **State pattern**: Pinia setup-function syntax with `$fetch` API calls. Optimistic local updates after mutation.
- **Auth**: Cookie-based (`delulul_auth='authenticated'`). PIN validated server-side. No JWT.
- **DB Raw SQL**: `@neondatabase/serverless` tagged templates (`sql\`...\``). No ORM.
- **Styles**: Tailwind v4 CSS config (`@theme` in `main.css`). No JS config files.
- **Invoice**: Pair of `formatInvoiceText()` (text) + `InvoiceImage.vue` (PNG via html-to-image).
- **Pricing hardcoded**: Bakar 18K/porsi, Kukus 16K/porsi, chili oil 2K/pc.

## ANTI-PATTERNS (THIS PROJECT)

- **`any` type poisoning** — 14 sites across 5 files. Server SQL rows untyped → `$fetch<any>` in stores.
- **Missing bakar/kukus in PO detail** — `GET /api/orders/:poId` does NOT fetch `order_bakar_kukus_items`.
- **Self-healing DDL** — `bakar-kukus-items.put.ts` creates its table at runtime. Only `_migrate.ts` should do DDL.
- **Mixed SQL styles** — `sql.query('...', [$1])` in some handlers vs tagged templates everywhere else.
- **RED-marked bugs** — 3 known optimizer bugs tracked in tests (cap-50 truncation, hardcoded mix/pkg IDs).
- **POManager.vue 724 lines** — share modal duplicates `InvoiceImage.vue`; customer card should extract; logic belongs in store.
- **`.env` committed** — live Neon credentials in repo.
- **`CaraMasakId` includes `'goreng'`** — stale type; CONTEXT.md says goreng/rebus removed.

## UNIQUE STYLES

- Hardcoded column-width monospace invoice format (`No.`, product, qty, price, total columns).
- Optimization via brute-force 4-nested-loop (up to 100 iterations per mix variable).
- PWA with Workbox runtime caching for API responses (NetworkFirst, 24h TTL).
- Mobile-first layout (max-w-lg container, glassmorphism, sticky bottom nav).

## COMMANDS

```bash
npm run dev          # Nuxt 4 dev server (HMR)
npm run build        # Production build (SSR)
npm test             # Vitest run
npm run typecheck    # vue-tsc --noEmit
npm run generate     # Static generation
npm run preview      # Preview production build
```

## NOTES

- No ESLint, Prettier, or biome. Only `vue-tsc` for quality.
- No CI/CD pipeline. Deploy manually to Vercel.
- `--max-depth=3` — project has 9 depth levels only in `server/api/orders/[poId]/customers/[customerId]`.
- DB migration runs on first client page load (`usePackageStore.ensureLoaded()` → `GET /api/_migrate`).
- No `layouts/` dir — `app.vue` IS the layout (no default layout used).
- No `error.vue` — errors fallback to Nuxt default.
