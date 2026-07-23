# SERVER — Nitro API Layer

**33 route handlers, Neon PostgreSQL, PIN cookie auth. Raw SQL. No ORM.**

## STRUCTURE

```
server/
├── api/                 # File-based Nitro routes
│   ├── auth/            # login.put + session check
│   ├── cara-masak/      # cooking method get/post + [id].delete
│   ├── inventory/       # stock get/put + deduct/reset
│   ├── menus/           # menu get/post/put + [id].delete + menu-harga
│   ├── menu-harga/      # pricing get/put
│   ├── orders/          # PO index + [poId] CRUD (9-deep nesting)
│   │   └── [poId]/customers/[customerId]/
│   │       ├── items.put.ts          # order line items
│   │       ├── bakar-kukus-items.put.ts  # self-healing DDL
│   │       ├── shipping-fee.put.ts
│   │       └── toggle.put.ts
│   ├── packages/        # frozen package CRUD + supplier-packs
│   ├── _migrate.ts      # runs DDL on first client load
│   ├── mixes.get.ts     # supplier mixes
│   └── supplier-packs.get.ts
├── db/                  # schema.sql (13 tables)
├── middleware/auth.ts   # Cookie guard — blocks /api/* if no delulul_auth
└── utils/db.ts          # Neon singleton — useDb() returns sql tagged template
```

## WHERE TO LOOK

| Resource | File pattern |
|----------|-------------|
| PO orders | `orders/index.{get,post}.ts`, `orders/[poId].get.ts` |
| Customer lines | `orders/[poId]/customers/{post,put,delete}.ts` |
| Order items | `orders/[...]/items.put.ts`, `bakar-kukus-items.put.ts` |
| Frozen packages | `packages.{get,post,put,delete}.ts` |
| Inventory | `inventory.{get,put}.ts`, `inventory-{deduct,reset}.put.ts` |
| Menus + pricing | `menus.{get,post,put}.ts`, `menu-harga.{get,put}.ts` |
| Cooking methods | `cara-masak.{get,post}.ts` |

## CONVENTIONS

- **File naming**: `resource.action.httpMethod.ts` — e.g. `packages.get.ts`, `customers/[id]/shipping-fee.put.ts`
- **Handler**: `defineEventHandler(async (event) => { const sql = useDb(); ... })`
- **Route params**: `getRouterParam(event, 'name')`
- **Response shape**: `{ status: 'ok' }` for mutations, data object for reads
- **DB**: `@neondatabase/serverless` tagged templates (`sql\`...\``). No ORM.
- **Auth**: `delulul_auth='authenticated'` cookie validated in middleware. PIN checked server-side in `auth.put.ts`.
- **Migration**: `_migrate.ts` runs on first client page load via `usePackageStore.ensureLoaded()`.

## ANTI-PATTERNS

- **Missing bakar/kukus in PO GET** — `orders/[poId].get.ts` does NOT fetch `order_bakar_kukus_items`. Detail view incomplete.
- **Self-healing DDL** — `bakar-kukus-items.put.ts` `CREATE TABLE IF NOT EXISTS` at runtime. Only `_migrate.ts` should create tables.
- **Mixed SQL styles** — some handlers use `sql.query('SELECT ...', [$1])` instead of tagged template literals.
- **Inconsistent param style** — `packages.delete.ts` reads id from `readBody`, not `getRouterParam(event, 'id')`. Other deletes use route params.
- **`any` type poison** — SQL rows return untyped; client stores use `$fetch<any>`. 14+ sites across server handlers.
- **No input validation** — zero Zod/Joi schemas. Request bodies consumed raw via `readBody()`.
- **Seed lives in** `app/data/seed.ts` (SQL seed deleted).
