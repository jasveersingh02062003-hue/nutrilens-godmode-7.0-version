
## Problem

The calendar tap logic is working, but the popup container is not behaving like a true mobile overlay.

`DayDetailsSheet` is a custom `fixed` bottom sheet rendered inside the page, while the Progress page itself is wrapped in `PageTransition` (`framer-motion` transform / will-change). On mobile, that can make the sheet position itself relative to the long scrolling page instead of the real viewport. That is why it feels like it comes from very far below and why you end up needing to scroll down to reach it.

## Plan

### 1. Move `DayDetailsSheet` to a real portal
- Update `src/components/DayDetailsSheet.tsx` to render with `createPortal(..., document.body)`.
- Keep all current day logic, projected targets, and popup content exactly the same.
- This makes the popup attach to the phone screen itself, not the transformed Progress page.

### 2. Lock the background page while the popup is open
- Add open/close side effects in `DayDetailsSheet` to prevent the Progress page from scrolling underneath.
- Keep scrolling only inside the popup content.
- Add overscroll containment so swipe gestures feel controlled on mobile.

### 3. Make the sheet fully mobile-safe
- Keep the newer fast fade + short nudge animation.
- Replace plain viewport sizing with mobile-safe sizing (`dvh`-based max height) so browser UI on phones does not push the sheet off-screen.
- Ensure the sheet opens already visible, without needing the user to scroll the page.

### 4. Verify both places that use this sheet
- Check the Progress calendar flow: tap today / tomorrow / future dates and confirm the popup appears instantly in view.
- Check Food Archive too, because it uses the same `DayDetailsSheet`.
- Confirm nested flows still work: add meal, add supplement, add activity, close sheet.

## Files

- Main change: `src/components/DayDetailsSheet.tsx`
- No calendar business-logic change needed in `src/pages/Progress.tsx`

## Technical details

- Root cause is not the calendar data or the selected date logic.
- Root cause is `position: fixed` being trapped inside a transformed page wrapper.
- The clean fix is to portal the popup to `document.body`, which matches the existing portal-based pattern already used elsewhere and restores correct mobile behavior without changing the feature itself.
