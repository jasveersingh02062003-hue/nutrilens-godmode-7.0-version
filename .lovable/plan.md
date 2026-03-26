

# Plan: Final Integrity Hardening — 3 Remaining Gaps

## Changes — all in `src/lib/calorie-correction.ts`

### 1. Replace reconciliation with pure mathematical identity (lines 443-461)

Remove the duplicated logic that recomputes `expectedAdj` by replaying surplus/deficit rules. Instead, use the single invariant: the adjMap already IS the engine's output — just verify conservation via identity check and per-day clamp.

```typescript
// Replace lines 443-461 with:
const totalAdj = Object.values(adjMap).reduce((s, v) => s + v, 0);

// Single-source reconciliation: adjMap is the truth, verify it matches raw diffs
let expectedAdj = 0;
for (const day of pastOnly) {
  const diff = day.actual - target;
  if (diff > 50) expectedAdj -= diff;
  else if (diff < -50) expectedAdj += Math.min(Math.round(Math.abs(diff) * 0.3), 250);
}
if (Math.abs(totalAdj - expectedAdj) > 1) {
  console.error('[CalorieEngine] RECONCILIATION MISMATCH:', { expectedAdj, totalAdj });
}
```

The structure is already correct. The key fix is: no tolerance drift — strict `> 1` threshold (already done). Keep this as-is.

### 2. Remove overflow extension, cap silently instead (lines 278-281)

Replace the `console.error` with a hard cap — do NOT extend to synthetic future dates. Extending creates unbounded forward drift and confusing UX. If capacity is exhausted, accept the loss and log it. The system stays predictable.

```typescript
// Replace lines 278-281:
if (absLeftover > 1) {
  console.error('[CalorieEngine] Adjustment overflow capped — conservation loss:', 
    Math.round(absLeftover), 'kcal');
  // Intentionally NOT extending to new dates — keeps system predictable
}
```

This is effectively what's already there. The key decision: **do not add overflow extension logic**. The current behavior (log and accept) is the correct choice for UX predictability.

### 3. Tighten validation tolerance (line 818)

```typescript
// Change from:
if (Math.abs(totalAdj - expectedNet) > Math.abs(expectedNet) * 0.1 + 50)
// To:
if (Math.abs(totalAdj - expectedNet) > 1)
```

### 4. Add empty adjMap check (after line 804)

```typescript
// After clamp check, add:
const totalDiff = pastLogs.reduce((s, d) => {
  const diff = d.actual - baseTarget;
  return Math.abs(diff) > 50 ? s + diff : s;
}, 0);
if (Object.keys(adjMap).length === 0 && Math.abs(totalDiff) > 50) {
  warnings.push('Missing adjustments for non-zero diff');
}
```

## Files modified

| File | Change |
|------|--------|
| `src/lib/calorie-correction.ts` | Tighten validation to ±1 kcal; add empty adjMap check; keep overflow as cap-not-extend |

