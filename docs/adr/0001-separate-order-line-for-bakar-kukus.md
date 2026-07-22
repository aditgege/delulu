# ADR 0001: Separate Order Line Array for Bakar & Kukus

**Status**: Accepted  
**Date**: 2026-07-22  
**Context**: [Grill / Domain Modeling session]

## Decision

Add a **second array `bakarKukusLines`** to the order store alongside the existing `lines` (frozen packages), rather than refactoring `OrderLine` into a unified discriminated union.

```typescript
// Existing — frozen packages, untouched
lines: OrderLine[]  // { packageId, qty }

// New — bakar & kukus fresh menu
bakarKukusLines: BakarKukusLine[]  // { varianId, caraMasak, jumlahPorsi }
```

## Consequences

### Positive
- Zero risk to the stable frozen ordering flow — no refactor of existing types, store methods, API endpoints, or PO tracking
- Can be implemented incrementally: types → store → API → UI in independent steps
- Simpler to test — frozen tests still pass without modification
- Easier to roll back if the new menu is paused

### Negative
- Some iteration duplication: total calculation, validation rules, and order presentation must loop over two arrays
- If bakar/kukus eventually becomes the dominant order type, a future unification refactor will be needed
- Slightly less elegant type discipline than a single union type

## Alternatives Considered

### Union Type (single array)
`OrderItem = { type: 'frozen' | 'bakar-kukus', … }` — architecturally cleaner but touches every file that reads or writes orders. Higher risk for an MVP addition.

### Nested items
Store bakar/kukus items inside the existing `OrderLine` via optional fields — creates implicit coupling between two different domain concepts (packaged frozen goods vs fresh-cooked portions).

## How This ADR Was Made

Decided during a `/grill-with-docs` session with the domain owner, after exploring the existing codebase and mapping all touch points affected by each option.
