

# Plan: Delete All User Data (Local + Cloud)

## What gets deleted

**Cloud database (2 tables):**
- `profiles` — 3 rows (all users)
- `daily_logs` — 5 rows (all logs)

**localStorage:**
- All keys starting with `nutrilens_*` (profile, daily logs, frozen targets, weight history, streaks, meal plans, budget, coach, learning, behavior stats, etc.)
- Tutorial/onboarding flags: `tutorial_seen`, `pes_explanation_seen`, `planner_modal_dismissed`

## What stays untouched
- All source code, schema, migrations, edge functions
- Auth users in `auth.users` (login accounts remain)
- App logic, UI components, libraries

## Steps

### 1. Delete cloud data via SQL
Run two DELETE statements against the public tables:
```sql
DELETE FROM daily_logs;
DELETE FROM profiles;
```

### 2. Clear localStorage via browser
Navigate to the app and run a script that removes all `nutrilens_*` keys plus the tutorial flags — same pattern the existing `logout` function uses, but also covering non-prefixed keys like `tutorial_seen`.

This is a one-time data wipe operation — no code changes needed.

