

# Upgrade Supplement Engine: Relative Gaps, Behavior History, Multi-Trigger Upsells

## What Changes

### 1. Relative Protein Gap (not absolute)

**File:** `src/lib/supplement-service.ts` — `shouldSuggestSupplement()`

Current: `gap > 20 && hour >= 14` (same for everyone).

New logic:
```
gapPercent = (gap / targetProtein) * 100
if (gapPercent > 25 && hour >= 14) → suggest
if (gapPercent > 40 && hour >= 11) → strong push
```

### 2. Protein Miss Streak (behavior history)

**File:** `src/lib/supplement-service.ts` — new `getProteinMissStreak(profile, days = 5)`

- Look back 3-5 days, count days where protein consumed < 75% of target
- Return `missStreak` count
- In `shouldSuggestSupplement()`: if `missStreak >= 3`, lower the time threshold (show from 10 AM) and add `urgency: 'high'` to suggestion
- Update `ProteinGapSuggestion` type to include `urgency: 'low' | 'medium' | 'high'`

### 3. Cost-Weighted Decision Scoring

**File:** `src/lib/supplement-service.ts` — `shouldSuggestSupplement()`

Use existing `getSupplementCostEfficiency()` to boost priority:
```
if (suppCostPerGram < wholeFoodCostPerGram * 0.8):
  → add cost savings message: "35% cheaper than chicken"
```
Add `savingsMessage?: string` to `ProteinGapSuggestion`.

### 4. Multi-Trigger Upsell System

**File:** `src/lib/supplement-service.ts` — replace `shouldShowSupplementUpsell()` with `getUpsellTrigger()`

Three independent triggers (return first match):
- **Problem-based:** `proteinMissStreak >= 3` → "You've missed protein 3 days straight. Get a personalized fix."
- **Efficiency-based:** `suppCostPerGram > wholeFoodCostPerGram * 1.2` → "You're overspending on protein. Optimize your stack."
- **Behavior-based:** (existing) `adherence.streak >= 7 && items >= 2` → "Unlock advanced stacking guide."

Return `{ trigger: string; headline: string; body: string }` or `null`.

**File:** `src/components/SupplementUpsellCard.tsx` — use `getUpsellTrigger()` instead of `shouldShowSupplementUpsell()`, render dynamic headline/body.

### 5. Time-Pressure Signal

**File:** `src/lib/supplement-service.ts` — `shouldSuggestSupplement()`

Check `profile.cookingHabits` and `profile.occupation`/`profile.jobType`:
- If cooking = 'rarely' or 'never', or jobType = 'shift' → `timeConstrained = true`
- If `timeConstrained`: lower gap threshold by 10% (e.g., 25% becomes 15%) and add "No time to cook? Fix protein in 10 seconds" to message

### 6. Outcome-Driven Nudge Copy

**File:** `src/components/ProteinGapNudgeCard.tsx`

Replace generic copy with urgency-aware messaging:
- **Low urgency:** "You'll miss today's muscle target. Fix in 10 seconds →"
- **High urgency (miss streak):** "You're losing progress — 3 days of low protein. Quick fix available ⚡"
- Button text: "Fix Protein Now ⚡" instead of "Log Whey →"
- Use `suggestion.urgency` and `suggestion.savingsMessage` from service

### 7. One-Tap Friction Killer

Already implemented — `handleQuickLog()` does log + dismiss in one tap. Enhance:
- After logging, call `onApplied()` which triggers Dashboard refresh (already wired)
- Add a brief toast: "Whey logged. Meals adjusted." via existing toast system

---

## Files Modified

| File | Change |
|------|--------|
| `src/lib/supplement-service.ts` | Relative gap %, miss streak, cost-weighted scoring, multi-trigger upsell, time-pressure signal |
| `src/components/ProteinGapNudgeCard.tsx` | Outcome-driven copy, urgency levels, "Fix Protein Now" CTA, toast feedback |
| `src/components/SupplementUpsellCard.tsx` | Dynamic trigger-based content from `getUpsellTrigger()` |

No new files. No data model changes. No migration needed.

