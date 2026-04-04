

# Reorder Progress Page Sections

## Change
Single file edit in `src/pages/Progress.tsx` — move the render order of sections in the JSX return block (lines ~293-374).

### Current Order (lines 293-374):
```
Gym Progress (294)
Supplement Consistency (297)
Calendar (300-362)
Food Story Strip (365)
Food Archive (368)
Budget Insights (371)
Monthly Savings (374)
```

### New Order:
```
Calendar
Food Story Strip (food memories)
Food Archive
Budget Insights
Monthly Savings
Gym Progress
Supplement Consistency
```

## File
`src/pages/Progress.tsx` — Move the Calendar block (lines 299-362) above Gym Progress (line 294), and move Gym Progress + Supplement Consistency blocks to after Monthly Savings (line 374).

No logic changes. Pure JSX reorder.

