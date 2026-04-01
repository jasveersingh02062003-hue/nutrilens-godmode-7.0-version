

# Allergen Safety System — Current State vs Spec Gap Analysis

## Already Fully Implemented

The allergen safety system is **already built and production-hardened** across all 6 gaps identified in the previous plan. Here is what exists:

| Requirement from Spec | Status | Implementation |
|---|---|---|
| User profile `allergens: string[]` | Done | `store.ts` + cloud sync via `conditions` JSON |
| Onboarding allergen step | Done | Multi-select chips in `Onboarding.tsx` |
| Profile allergen management | Done | `EditProfileSheet.tsx` section |
| Keyword mapping (10 categories, regional languages) | Done | `allergen-tags.ts` — 73 lines, includes hing/asafoetida, Tamil/Telugu/Kannada terms |
| Explicit `allergens[]` on `IndianFood` interface | Done | ~150 foods tagged with explicit allergen arrays |
| `checkAllergens()` engine with explicit + keyword fallback | Done | `allergen-engine.ts` — checks explicit tags first, then keywords |
| `hasSevereAllergen()` for nuts/peanuts/shellfish | Done | Returns true for life-threatening allergens |
| Swap engine allergen filter | Done | `swap-engine.ts` filters candidates via `checkAllergens()` |
| AddFoodSheet red badges + confirmation + "Find Alternative" | Done | 3-option dialog with severe allergy double confirmation (3s delay) |
| QuickLogSheet toast warnings | Done | Red toast on allergen conflict |
| Camera scan allergen banner | Done | Red banner with ShieldAlert, per-item remove buttons |
| MealDetailSheet + MealPlanDashboard badges | Done | Warning icons on flagged items/cards |

## Remaining Gaps (from the new spec)

Comparing the extensive 200+ food spec against current implementation, there are **3 incremental improvements** worth making:

### Gap A: Expand Regional Language Keywords

The spec provides additional terms not yet in `allergen-tags.ts`:
- **dairy**: `mawa`, `makkhan`, `paal aadai`, `paal kova`, `meegada`, `venna`, `benne`, `doode`, `toop`, `loni`, `chakka`, `mosaru`
- **nuts**: `mundhiri`, `jeedi pappu`, `geru`, `chilgoza`
- **peanuts**: `nilakkadalai`, `veru senaga pappu`, `palli`, `kadale kai beeja`
- **gluten**: `godhuma maavu`, `perungayam`, `godhuma pindi`, `inguva`, `godhi hittu`, `hingu`, `gahu pith`, `seviyan`
- **eggs**: `ande`
- **mustard**: `mohri`
- **sesame**: `ellu`, `nuvvulu`, `teel`
- **fish**: `machchhi`, `chepa`, `meenu`, `maasa`
- **shellfish**: `yera`, `nandu`, `royyalu`, `peeta`, `sigadi`, `kurli`, `kolambi`

**Files**: `src/lib/allergen-tags.ts`

### Gap B: Tag Additional Foods with Explicit Allergens

The spec lists ~200 foods. Current database has ~150 tagged. Missing explicit tags for items like:
- Sabudana Khichdi/Vada → `['peanuts']`
- Pongal → `['dairy', 'nuts']`
- Methi Thepla → `['gluten', 'dairy']`
- Various sweets (Sheer Khurma → `['dairy', 'nuts', 'gluten']`, Falooda → `['dairy', 'nuts', 'gluten']`)
- Snacks (Dahi Puri → `['dairy', 'gluten', 'peanuts']`, Papdi Chaat → `['gluten', 'dairy']`)
- Regional dishes (Undhiyu → `['nuts', 'peanuts', 'mustard']`, Bisi Bele Bath → `['peanuts', 'dairy']`)

Cross-reference existing foods in `indian-foods.ts` that lack tags but should have them based on the spec.

**Files**: `src/lib/indian-foods.ts`

### Gap C: Culinary-Aware Safe Swap Mappings

The spec describes intelligent swaps (e.g., Palak Paneer → Tofu Palak, Naan → Bajra Roti). Currently the swap engine filters by allergen but doesn't have hardcoded culinary-aware mappings. This is a nice-to-have enhancement.

**Files**: `src/lib/swap-engine.ts` (add a `SAFE_SWAP_MAP` lookup)

## Implementation Plan

### Step 1: Expand `allergen-tags.ts` keywords
Add ~40 regional language terms across all 10 categories from the spec's multi-lingual lexicon.

### Step 2: Tag remaining foods in `indian-foods.ts`
Cross-reference existing entries against the spec's 200-item matrix and add missing `allergens` arrays. Focus on items where keyword detection alone would miss the allergen (composite dishes like Malai Kofta, Korma, Reshmi Kebab).

### Step 3: Add culinary swap mappings (optional)
Add a `SAFE_SWAP_SUGGESTIONS` map in `swap-engine.ts` with ~10 high-value mappings (Paneer→Tofu, Naan→Bajra Roti, etc.) that the "Find Alternative" flow can prioritize.

## Files to Modify

| File | Change |
|---|---|
| `src/lib/allergen-tags.ts` | Add ~40 regional language keywords |
| `src/lib/indian-foods.ts` | Add/update allergen tags on ~30-50 more foods |
| `src/lib/swap-engine.ts` | Add optional `SAFE_SWAP_SUGGESTIONS` map |

No new files needed. No database changes. No UI changes — the existing warning system will automatically benefit from the expanded data.

