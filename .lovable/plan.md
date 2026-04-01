
# Allergen Safety System — FULLY IMPLEMENTED (Production-Hardened)

## What Was Built

### Phase 1 (Initial)
- `src/lib/allergen-tags.ts` — Keyword→allergen mapping for 6 categories
- `src/lib/allergen-engine.ts` — `checkAllergens()` detection engine
- Onboarding allergen selection step
- EditProfileSheet allergen management
- AddFoodSheet red badges + confirmation dialog
- QuickLogSheet toast warnings
- MealDetailSheet + MealPlanDashboard allergen badges
- Cloud sync via `conditions` JSON column

### Phase 2 (Production Hardening)

#### Gap 1: Regional Keywords & Hing Mapping ✅
- Added `hing`, `asafoetida`, `heeng` → gluten keywords
- Added Hindi/Tamil/regional terms: `doodh`, `muttai`, `verkadalai`, `sarson`, etc.
- Added new allergen categories: `mustard`, `peanuts`, `sesame`, `fish`

#### Gap 2: Explicit Allergen Tags on Foods ✅
- Added `allergens?: string[]` to `IndianFood` interface
- Tagged 80+ high-risk foods with explicit allergen arrays
- Covers: cereals (gluten/dairy), paneer dishes (dairy), sweets (dairy/nuts/gluten), snacks, non-veg (eggs/fish), protein items (soy)

#### Gap 3: Swap Engine Allergen Filter ✅
- `getSwapAlternatives()` now filters out candidates that conflict with user allergens
- Uses `checkAllergens()` on each candidate recipe name

#### Gap 4: "Find Safe Alternative" Button ✅
- AddFoodSheet allergen dialog now has 3 options: Find Safe Alternative, Log Anyway, Cancel
- "Find Safe Alternative" clears pending item and sets search to food's category

#### Gap 5: Camera/AI Scan Allergen Warning ✅
- Red banner in confirm step shows allergen conflicts for detected items
- Severe allergens (nuts/shellfish) get animated pulsing ShieldAlert icon
- Per-item "Remove" buttons for quick deselection of flagged foods

#### Gap 6: Severe Allergy Double Confirmation ✅
- For `nuts`, `peanuts`, `shellfish` → second confirmation modal
- 3-second delay before "Log Anyway" button becomes clickable
- Explicit risk warning text with ShieldAlert animation

### Phase 3 (Spec Alignment & Data Hardening)

#### Gap A: Expanded Regional Language Keywords ✅
- Added ~40 new regional terms across all 10 categories
- Tamil: `mundhiri`, `muttai`, `verkadalai`, `nilakkadalai`, `kadugu`, `ellu`, `meen`, `yera`, `nandu`, `godhuma maavu`, `perungayam`
- Telugu: `jeedi pappu`, `veru senaga pappu`, `nuvvulu`, `chepa`, `royyalu`, `godhuma pindi`, `inguva`
- Kannada: `geru`, `kadale kai beeja`, `sasive`, `meenu`, `sigadi`, `godhi hittu`, `hingu`
- Marathi: `mohri`, `teel`, `maasa`, `kolambi`, `gahu pith`
- Other: `mawa`, `makkhan`, `paal aadai`, `paal kova`, `meegada`, `venna`, `benne`, `doode`, `toop`, `loni`, `chakka`, `mosaru`, `chilgoza`, `palli`, `seviyan`, `ande`, `peeta`, `kurli`

#### Gap B: Additional Food Allergen Tags ✅
- Tagged 40+ more foods with explicit allergen arrays
- Non-veg: Prawn Masala/Curry/Crab → `shellfish`; Fish Fry/Tikka/Pomfret/Goan/Molee → `fish`; Rogan Josh → `dairy`; Korma → `dairy, nuts`; Shammi Kebab → `eggs`; Malai Tikka → `dairy, nuts`; Nihari → `gluten`; Boiled Egg/Omelette/Bhurji → `eggs`; Chicken Lollipop → `eggs, soy, gluten`
- South Indian: Pongal/Ven Pongal → `dairy, nuts`; Bisi Bele Bath → `peanuts, dairy`; Rava Dosa → `gluten`; Pulihora → `peanuts, mustard`
- Snacks: Dhokla → `mustard`; Khandvi → `mustard, sesame`
- Beverages: Thandai/Badam Milk → `dairy, nuts`
- Fast Food: Noodles/Manchurian/Spring Roll → `gluten, soy`; Paneer Chilli → `dairy, soy, gluten`; Burgers → `gluten`; Pizza → `gluten, dairy`; Sandwiches → `gluten, dairy`
- Breakfast: Aloo/Gobi Paratha/Thepla → `gluten, dairy`; Curd Rice → `dairy`
- Undhiyu → `nuts, peanuts, mustard`

#### Gap C: Culinary-Aware Safe Swap Mappings ✅
- Added `SAFE_SWAP_SUGGESTIONS` map in `swap-engine.ts` with 12 high-value dish mappings
- Covers: Paneer→Tofu, Naan/Roti→Millet breads, Korma→Coconut/Chettinad, Samosa→Bonda/Vada, Upma→Poha/Idli, Biryani→Lemon/Tomato Rice, Lassi→Coconut Water/Nimbu Pani

### Files Modified/Created

| File | Change |
|------|--------|
| `src/lib/allergen-tags.ts` | Expanded to 10 categories, 110+ keywords, comprehensive regional terms |
| `src/lib/allergen-engine.ts` | Accepts explicit `allergens[]`, `hasSevereAllergen()` function |
| `src/lib/indian-foods.ts` | `allergens?: string[]` on interface, 120+ foods tagged with explicit allergen arrays |
| `src/lib/swap-engine.ts` | Allergen filter in candidate selection + `SAFE_SWAP_SUGGESTIONS` map |
| `src/components/AddFoodSheet.tsx` | Find Alternative button, severe allergy double confirm |
| `src/pages/CameraHome.tsx` | Allergen warning banner in confirm step |
