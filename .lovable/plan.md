

# Redesign CompareTab: Side-by-Side Layout with Camera, Mic & Enhanced Nutrition

## What Changes

Completely redesign `CompareTab.tsx` from a vertical (stacked) layout to a true **side-by-side** layout where:
- Two item cards sit **left and right** with a "VS" divider in the middle
- Each card has its own **search input + camera + mic** input methods
- Comparison metrics display as **horizontal rows** spanning both columns with winner highlighting
- Extended nutrition data: add **Iron, Calcium, Vitamin C** (available on IndianFood) alongside existing macros
- Smooth staggered animations on every element

## Layout Structure

```text
┌─────────────────────────────────────────┐
│         ⚖️ SIDE-BY-SIDE COMPARE         │
├──────────────┬──┬───────────────────────┤
│  [📷][🎤][🔍] │VS│ [🔍][🎤][📷]          │
│  Search...    │  │  Search...           │
├──────────────┤  ├───────────────────────┤
│  Item 1 Card │  │  Item 2 Card         │
│  (image+name)│  │  (image+name)        │
├──────────────┴──┴───────────────────────┤
│  Comparison Rows (side by side)         │
│  Price:    ₹45  ✅ │ ₹82               │
│  Calories: 280     │ 350               │
│  Protein:  18g  ✅ │ 12g               │
│  Carbs:    32g     │ 28g  ✅           │
│  Fat:      8g   ✅ │ 14g               │
│  Fiber:    4g      │ 6g   ✅           │
│  Iron:     2mg  ✅ │ 1mg               │
│  Calcium:  45mg    │ 80mg ✅           │
│  Vit C:    5mg     │ 12mg ✅           │
│  ─── PES Score ───                      │
│  7.2  ⭐           │ 5.8               │
│  ─── Verdict ───                        │
│  "Item 1 wins on value"                 │
└─────────────────────────────────────────┘
```

## File Changes

### 1. `src/lib/compare-helpers.ts`
- Add `iron`, `calcium`, `vitC` to the `CompareItem` interface
- Update `buildFromFood()` to include iron/calcium/vitC (scaled by serving factor)
- Update `buildFromRecipe()` to include iron/calcium/vitC from recipe data (or 0 defaults)
- Add Iron, Calcium, Vitamin C to `COMPARE_METRICS` array

### 2. `src/components/CompareTab.tsx` — Full Rewrite
**Search Slot redesign:**
- Each slot becomes a compact card with 3 input method buttons: Camera (📷), Mic (🎤), Search (🔍)
- Search: existing text input with dropdown (same fuzzy search)
- Camera: opens device camera, captures photo, calls `analyze-food` edge function, converts response to `CompareItem`
- Mic: uses Web Speech API (`webkitSpeechRecognition`) to transcribe voice → feeds into search → auto-selects top result
- Side-by-side grid layout: `grid grid-cols-[1fr_auto_1fr]` with VS divider

**Selected item display:**
- Each side shows item image, name, type badge, quick stats in a bordered card

**Comparison table:**
- Horizontal rows with label in center, values on left and right
- Winner gets green background + checkmark animation
- Extended rows for Iron, Calcium, Vitamin C
- PES score row with star animation for winner
- Pantry match row (if recipes)
- Verdict banner at bottom

**Animations:**
- Cards slide in from left/right (`translateX`) when items are selected
- Comparison rows stagger in with `framer-motion` (delay per row)
- Winner badges scale-in with spring animation
- VS divider pulses when both items are selected
- Verdict banner scales up with bounce

### 3. No other files need changes
- `analyze-food` edge function already exists and returns nutrition data
- `VoiceWaveform` component already exists for mic visualization
- `buildFromFood` / `buildFromRecipe` already in compare-helpers

## Camera Flow (per slot)
1. User taps 📷 → open camera via `navigator.mediaDevices.getUserMedia`
2. Show live preview in a small overlay within the card
3. User taps capture → send to `analyze-food` edge function
4. Response parsed → first food item converted to `CompareItem` via new `buildFromAnalyzed()` helper
5. Camera closes, item populates the slot

## Mic Flow (per slot)
1. User taps 🎤 → start `webkitSpeechRecognition`
2. Show `VoiceWaveform` animation in the card
3. On result → feed transcript into `searchIndianFoods()` → auto-select top match
4. Convert to `CompareItem` and populate slot

## Effort
~250 lines rewrite of CompareTab + ~15 lines additions to compare-helpers.

