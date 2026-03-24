

## Merge Survival Kit Items into Groceries Tab List

### Problem
When the user locks a Survival Kit, the grocery list below still shows only the meal-plan-based items. The survival kit items are not merged into the visible checklist, so the user sees two disconnected things.

### What we'll change (1 file: `src/components/MealPlannerTabs.tsx`)

**In `GroceriesTab`:**

1. When a `savedKit` exists, merge its items into the grocery list by converting survival kit items into the same `{ name, quantity, checked, category }` format used by the grocery list
2. Group survival kit items by their `category` field and prepend them to the existing meal-plan grocery categories (or merge into matching categories)
3. Add a visual indicator — survival kit items get a small "⚡" badge or green-tinted background so the user can distinguish kit items from meal-plan items
4. When the kit is cleared (X button), remove the kit items from the list and revert to meal-plan-only groceries
5. Update the `initialList` logic: if `savedKit` exists, combine `generateShoppingList(plan)` + kit items; if not, just use the plan list
6. The count (`0/62`) and progress bar will automatically reflect the combined total

### How it works
```text
savedKit exists?
  YES → merge kit items (by category) into groceryList
        kit items show with ⚡ prefix or highlight
        progress bar counts all items (plan + kit)
  NO  → show only meal-plan grocery list (current behavior)
```

### What stays unchanged
- SurvivalKitSheet UI and generation logic
- The "Build Survival Kit" button and "Active Kit" banner
- The meal-plan-based grocery generation
- Manual item adding

