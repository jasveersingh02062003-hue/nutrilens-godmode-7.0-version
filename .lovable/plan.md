

# Plan: Remove Try Demo & Demo Data

## Changes

### 1. `src/pages/Auth.tsx`
- Remove `import { seedDemoData }` and `FlaskConical` icon import
- Remove `handleDemo` function (lines ~106-110)
- Remove the "Try Demo" button JSX (lines ~152-155)

### 2. `src/lib/seed-demo-data.ts`
- Delete the entire file — it's only imported by Auth.tsx

No other files reference `seedDemoData`. The "Try Demo Scan" in `ScannerOnboardingScreen.tsx` is unrelated (it's a scanner demo, not the data seeder).

