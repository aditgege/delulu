# app/utils — Domain Logic

## OVERVIEW
Pure business logic for purchase optimization and invoice formatting, isolated from UI and server layers.

## FILES

| File | Purpose |
|------|---------|
| `invoice.ts` | Format purchase orders as monospace text for WhatsApp sharing |
| `optimizer.ts` | Brute-force algorithm for supplier-mix optimization (4 nested loops, up to 100 iterations) |
| `optimizer.test.ts` | 7 Vitest tests covering pack, waste, and mix optimization paths |

## KEY EXPORTS

**invoice.ts** — `formatInvoiceText()` (returns column-aligned monospace string), `MERCHANT_INFO` (constant object).

**optimizer.ts** — `computeFullRecommendation()`, `computeNeeds()`, `optimizeMixes()`, `findOptimalPacks()`, `optimizeWasteToPackages()`, `buildMixRecommendation()`, `buildMenuRecommendations()`.

**optimizer.test.ts** — 3 describe blocks: `findOptimalPacks`, `optimizeWasteToPackages`, `optimizeMixes`.

## CONVENTIONS
- Pure functions only. No side effects except `console.warn` in optimizer (self-diagnostic).
- No store, composable, or API dependencies. All data passed as arguments.
- Tests co-located next to source (single `.test.ts` file).
- Inline test fixtures (no shared factories or seed files).
- Price constants hardcoded at module level: `BAKAR_PRICE = 18000`, `KUKUS_PRICE = 16000`, `CHILI_OIL_PRICE = 2000`.

## ANTI-PATTERNS
- 3 RED-marked known bugs in optimizer test: cap-50 truncation edge case, hardcoded mix/package IDs.
- `console.warn` in optimizer for unreachable branches (acceptable — algorithmic warnings, not logging).
- Price constants duplicated across `orders.ts` and `invoice.ts` — drift risk when prices change.
