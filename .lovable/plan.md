

## Grocery Mode: "₹ → Max Protein Survival Kit"

### What it does
Adds a "Build Survival Kit" button to the Groceries tab that generates a single optimized shopping list maximizing protein efficiency (PES) within the user's remaining budget. Uses the existing 50-food PES database, respects dietary restrictions and health conditions, and outputs one decisive list with a "Lock This Plan" action.

### Changes (3 files)

**File 1: New `src/lib/grocery-survival.ts`** — Core Engine

- `generateSurvivalKit(budget, user)` → returns `{ items, totalCost, totalProtein, proteinCoverage, savings, mode }`
- Algorithm:
  1. Filter `foodDatabase` (from pes-engine) by diet (veg/non-veg), allergies, health conditions (reuse `HEALTH_AVOID_TAGS` pattern)
  2. Sort by `proteinPerRupee` descending
  3. If budget < ₹300: "Survival Mode" — only top-5 PES staples (soya, eggs, dal, rice, peanuts), scale quantities to fill budget
  4. If budget ₹300-1500: "Standard Mode" — greedily pick items from PES-sorted list, compute weekly quantities (7 days × servings), stop when budget filled
  5. If budget > ₹1500: "Comfort Mode" — include moderate-PES items (paneer, chicken) for variety after covering protein floor
  6. Post-optimization: if `proteinCoverage < 80%`, add more soya/eggs if budget allows
  7. Compute `savings` = what user would waste on lowest-PES items vs this optimized list
- `SurvivalItem` type: `{ id, name, quantity, unit, cost, protein, calories, pes, category }`
- Uses `getProfile()` for allergies/dietaryPrefs/healthConditions, `getBudgetSettings()` for budget

**File 2: New `src/components/SurvivalKitSheet.tsx`** — Full-screen modal UI

- Triggered from Groceries tab button
- States: `idle` → `loading` (1.5s fake delay for effect) → `result` → `locked`
- Budget input pre-filled from `getBudgetSettings().weeklyBudget`, editable
- Result card:
  - List of items with name, quantity, cost, protein per item, PES color dot
  - Summary bar: Total Cost | Total Protein | Coverage % (with progress ring)
  - Impact statement: "Saved ₹XX, gained +ZZg protein vs average"
  - Mode badge: "Survival" / "Standard" / "Comfort"
- "Lock This Plan" button → saves to localStorage key `nutrilens_survival_kit`
- "Copy List" button → clipboard
- Uses Sheet component from ui/sheet

**File 3: Update `src/components/MealPlannerTabs.tsx`** — Add button to Groceries tab

- In `GroceriesTab`, add a prominent button above the grocery list: "🛒 Build Survival Kit — Max protein for your budget"
- Opens `SurvivalKitSheet`
- If a locked kit exists, show a banner: "Active Survival Kit — ₹X for Yg protein" with "View" and "Reset" actions

### Data Flow
```text
User taps "Build Survival Kit" in Groceries tab
  → SurvivalKitSheet opens
  → Pre-filled budget from settings
  → User confirms/edits budget → Generate
  → generateSurvivalKit() runs:
      reads profile (diet, allergies, health)
      filters foodDatabase
      greedy PES-sorted selection
      quantity scaling to fill budget
  → Shows single optimized list
  → "Lock This Plan" saves to localStorage
```

### Edge Cases Handled
- Very low budget (<₹300): forces Survival Mode with only cheapest staples
- Vegetarian/Vegan: filters out non-veg and dairy
- Allergies: excludes matching items by tag
- No profile: uses defaults (veg, no allergies, ₹2000/week)

### What stays unchanged
- Existing Groceries tab (meal-plan-based grocery list)
- PES engine, food database, budget settings
- All other tabs and features

