

## Weekly Feedback Engine (Push-Based Behavior System)

### What exists already
- `WeeklyReportCard` in Dashboard — shows on Mondays only, basic meals/protein/hydration stats from `coach.ts`
- `adherence-service.ts` — meal plan adherence scoring (cooked vs planned)
- `behavior-stats.ts` — weekly behavioral stats (consistency, logging habits, overspend tendency)
- `notifications.ts` — toast + browser push notification system
- `budget-service.ts` — budget summaries, per-meal alerts
- `weight-history.ts` — weight entries with dates
- `expense-store.ts` — expenses by date/range
- `meal-plan-generator.ts` — generates week plans with scoring

### What's missing
No unified weekly summary with adherence score combining meals+protein+budget+weight. No dominant insight generation. No "Fix Next Week Plan" auto-adjustment. No persistent weekly summary history. No hook card on Dashboard/Home. No Sunday notification trigger.

### Changes (4 files)

**File 1: New `src/lib/weekly-feedback.ts`** — Core engine

- `WeeklySummary` type: `{ weekStart, weekEnd, adherenceScore, mealsLogged, mealsPlanned, proteinConsumed, proteinTarget, spent, budget, weightChange, insight, dominantMetric, autoFixApplied }`
- `generateWeeklySummary()`:
  - Aggregates last 7 days from `getRecentLogs(7)` — sums protein, calories per day
  - Computes meals logged vs `profile.mealsPerDay * 7` (from planner profile or default 3)
  - Sums expenses via `getExpensesForRange()` vs weekly budget from `getBudgetSettings()`
  - Gets weight change from `getWeightHistory()` first/last entries in the week
  - Score: `(mealAdherence * 0.3) + (proteinAdherence * 0.3) + (budgetAdherence * 0.3) + (weightProgress * 0.1)`
  - Picks worst metric → generates one sharp insight string
- `getInsight(dominantMetric, data)` — rule-based: protein low → "You missed protein by Xg"; overspend → "You wasted ₹X on low-protein food"; low logging → "You skipped logging X% of meals"; weight gain on loss goal → "You gained Xkg"
- `autoFixNextWeek(summary, profile)` — based on dominant metric:
  - Protein: adjusts planner profile `dailyProtein` up by deficit/7
  - Budget: reduces `adjustedDailyBudget` and swaps expensive items
  - Returns `{ changes: string[], applied: boolean }`
- `getWeeklySummaries()` / `saveWeeklySummary()` — localStorage `nutrilens_weekly_summaries`
- `shouldGenerateSummary()` — checks if current week's summary doesn't exist yet and it's Sunday or later
- `scheduleWeeklyNotification()` — uses existing `sendBrowserNotification` from notifications.ts for Sunday 7 PM push

**File 2: New `src/components/WeeklyFeedbackCard.tsx`** — Dashboard hook card + full breakdown

- Shows on Dashboard when a new summary exists (current week or last week if not dismissed)
- **Hook mode** (collapsed): Big insight text + adherence score pill + "See why →" button
- **Expanded mode**: Full breakdown with animated progress bars (meals, protein, budget, weight), adherence score gauge, dominant insight highlighted
- "Fix Next Week Plan" button → calls `autoFixNextWeek()` → shows toast with changes → marks `autoFixApplied`
- "Share" button → copies text summary to clipboard
- "Dismiss" button → hides until next week
- Colors: score ≥80 teal, 60-79 amber, <60 coral
- Progress bars animate from 0 to value on mount (CSS transition 0.6s)

**File 3: Update `src/pages/Dashboard.tsx`** — Add WeeklyFeedbackCard + auto-generate trigger

- Import and render `WeeklyFeedbackCard` above `WeeklyReportCard`
- In mount `useEffect`: call `shouldGenerateSummary()` → if true, `generateWeeklySummary()` and save
- Also call `scheduleWeeklyNotification()` if notification permission granted

**File 4: Update `src/pages/Progress.tsx`** — Weekly summary history section

- Import `getWeeklySummaries` from weekly-feedback
- Add a "Weekly Summaries" section after OverviewStats with most recent summary card prominently displayed
- Render list of past summaries (scrollable, most recent first) with score pills and insight text
- Each card shows: week range, score, 4 metric bars, insight

### Auto-Fix Logic
```text
dominantMetric === 'protein':
  → Increase dailyProtein target by (deficit / 7) rounded up
  → Toast: "Protein target increased to Xg/day"

dominantMetric === 'budget':
  → Reduce adjustedDailyBudget by overshoot / remaining days
  → Toast: "Budget adjusted to ₹X/day"

dominantMetric === 'meals':
  → Enable meal reminders in notification settings
  → Toast: "Meal reminders turned on"

dominantMetric === 'weight':
  → Reduce daily calories by 5%
  → Toast: "Calories reduced to X kcal/day"
```

### Notification
Uses existing `sendBrowserNotification()` from notifications.ts. On Dashboard mount, if Sunday and summary exists, triggers push: "You wasted ₹X this week. See why." Uses the insight text as notification body.

### What stays unchanged
- Existing `WeeklyReportCard` (Monday coach report — different purpose)
- All budget, meal plan, adherence, behavior-stats logic
- Progress page calendar, achievements, weight tracking

