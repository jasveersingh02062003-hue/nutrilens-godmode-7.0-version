

# Dedicated Gym Settings Page

## What We're Building

A full-screen Gym Settings sheet accessible from **Profile → Gym Settings** (new row), with 3 tabs: **Summary**, **Settings**, and **Reports**. This centralizes all gym configuration and analytics in one place, replacing the scattered gym fields currently buried inside EditProfileSheet.

## User Flow

```text
Profile page
  └─ "Gym Settings" row (Dumbbell icon, dynamic subtitle)
       └─ GymSettingsPage (full-screen sheet, 3 tabs)
            ├─ Summary tab
            │    ├─ Stats cards (workouts, calories, streak, best streak, consistency %)
            │    ├─ Monthly attendance calendar (heatmap with intensity colors)
            │    ├─ 12-week consistency bars
            │    └─ Energy trend (gym days vs rest days comparison)
            ├─ Settings tab
            │    ├─ Gym goer toggle
            │    ├─ Days/week slider
            │    ├─ Duration (30/45/60 min)
            │    ├─ Intensity (light/moderate/intense)
            │    ├─ Goal (fat loss/muscle/general)
            │    ├─ Time of day + specific hour
            │    ├─ Work hours, sleep schedule, shift type
            │    ├─ Fasted training toggle
            │    └─ Weekend schedule + weekend hour
            └─ Reports tab
                 ├─ Period filter (This Month / Last 30 / 60 / 90 days)
                 ├─ Filtered stats summary
                 └─ Download PDF button
```

## File Changes

| File | Action | What |
|------|--------|------|
| `src/components/GymSettingsPage.tsx` | **NEW** | Full sheet with 3 tabs (Summary, Settings, Reports) |
| `src/pages/Profile.tsx` | Edit | Add `showGymSettings` state, new "Gym Settings" row with Dumbbell icon and dynamic subtitle (e.g. "3 days/week · 12 day streak"), render `<GymSettingsPage>` |
| `src/components/EditProfileSheet.tsx` | Edit | Remove all detailed gym fields (lines 501-621), replace with a "Manage in Gym Settings →" link button. Keep only the gym goer toggle for quick access |
| `src/components/GymPDFExport.tsx` | Edit | Accept `startDate` and `endDate` props, filter data within range, add period label to PDF title |

## Implementation Details

### GymSettingsPage.tsx

- Uses `Sheet` component (same pattern as PlansPage/SkinConcernsSheet)
- `Tabs` component with Summary / Settings / Reports
- **Summary tab**: Reuses computation logic from `GymProgressSection` (monthly calendar, weekly bars) plus `EnergyTrendCard` data (gym vs rest energy). Stats cards show totalWorkouts, totalCaloriesBurned, currentStreak, bestStreak, consistencyPercent from `profile.gym.stats`
- **Settings tab**: All gym preference fields moved from EditProfileSheet. Local state for each field, single "Save" button that calls `saveProfile()` with updated gym object
- **Reports tab**: Period picker (pills: "This Month", "30 Days", "60 Days", "90 Days"), filtered stats display, and `<GymPDFExport startDate={...} endDate={...} />` button

### Profile.tsx Changes

- Add import for `Dumbbell` icon and `GymSettingsPage`
- Add `showGymSettings` state
- Insert new settings row after "Skin Health":
  - Icon: Dumbbell
  - Label: "Gym Settings"
  - Sub: dynamic — if gym goer, show "X days/week · Y day streak"; else "Set up gym tracking"
  - Action: `() => setShowGymSettings(true)`

### EditProfileSheet Cleanup

- Keep the "Gym Goer" toggle (line 498-500)
- Remove lines 501-621 (all detailed gym settings)
- Add a simple link: "Open Gym Settings for full configuration →"

### GymPDFExport Enhancement

- New optional props: `startDate?: string`, `endDate?: string`
- When provided, filter the day loop to only include days within range
- Update PDF title to show the period (e.g. "Gym Report — Last 60 Days")

