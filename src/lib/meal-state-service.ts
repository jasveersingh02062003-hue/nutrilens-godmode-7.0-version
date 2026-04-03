import { scopedGet, scopedSet, scopedRemove } from "./scoped-storage";
// ============================================
// NutriLens AI – Meal Visual State Service
// Handles state computation, delay logic, and status display
// ============================================

export type MealState = 'ontrack' | 'slightly-high' | 'slightly-low' | 'high' | 'low' | 'pending' | 'empty';

export interface MealStateInfo {
  state: MealState;
  label: string;
  icon: string;
  colorClass: string;       // text color
  bgClass: string;          // background tint
  borderClass: string;      // left border
  progressClass: string;    // progress bar indicator color
  pillClass: string;        // status pill styling
}

const DELAY_KEY = 'nutrilens_meal_pending_';
const DELAY_MS = 10 * 60 * 1000; // 10 minutes

// ── State Computation ──

export function computeMealState(loggedCalories: number, targetCalories: number, itemCount: number): MealState {
  if (itemCount === 0) return 'empty';
  
  // Check if still in pending window
  const pct = targetCalories > 0 ? (loggedCalories / targetCalories) * 100 : 0;
  
  if (pct >= 90 && pct <= 110) return 'ontrack';
  if (pct > 110 && pct <= 130) return 'slightly-high';
  if (pct >= 70 && pct < 90) return 'slightly-low';
  if (pct > 130) return 'high';
  if (pct < 70 && pct > 0) return 'low';
  return 'empty';
}

export function getMealStateInfo(state: MealState): MealStateInfo {
  switch (state) {
    case 'ontrack':
      return {
        state,
        label: 'Balanced',
        icon: '✓',
        colorClass: 'text-status-ontrack',
        bgClass: 'bg-status-ontrack/10',
        borderClass: 'border-l-status-ontrack',
        progressClass: '[&>div]:bg-status-ontrack',
        pillClass: 'bg-status-ontrack/15 text-status-ontrack border-status-ontrack/30',
      };
    case 'slightly-high':
      return {
        state,
        label: 'Slightly high',
        icon: '↑',
        colorClass: 'text-status-warning',
        bgClass: 'bg-status-warning/10',
        borderClass: 'border-l-status-warning',
        progressClass: '[&>div]:bg-status-warning',
        pillClass: 'bg-status-warning/15 text-status-warning border-status-warning/30',
      };
    case 'slightly-low':
      return {
        state,
        label: 'Slightly low',
        icon: '↓',
        colorClass: 'text-status-warning',
        bgClass: 'bg-status-warning/10',
        borderClass: 'border-l-status-warning',
        progressClass: '[&>div]:bg-status-warning',
        pillClass: 'bg-status-warning/15 text-status-warning border-status-warning/30',
      };
    case 'high':
      return {
        state,
        label: 'High',
        icon: '↑↑',
        colorClass: 'text-status-danger',
        bgClass: 'bg-status-danger/10',
        borderClass: 'border-l-status-danger',
        progressClass: '[&>div]:bg-status-danger',
        pillClass: 'bg-status-danger/15 text-status-danger border-status-danger/30',
      };
    case 'low':
      return {
        state,
        label: 'Low',
        icon: '↓↓',
        colorClass: 'text-status-danger',
        bgClass: 'bg-status-danger/10',
        borderClass: 'border-l-status-danger',
        progressClass: '[&>div]:bg-status-danger',
        pillClass: 'bg-status-danger/15 text-status-danger border-status-danger/30',
      };
    case 'pending':
      return {
        state,
        label: 'Pending',
        icon: '⏳',
        colorClass: 'text-status-pending',
        bgClass: 'bg-status-pending/5',
        borderClass: 'border-l-status-pending',
        progressClass: '[&>div]:bg-status-pending/40',
        pillClass: 'bg-status-pending/10 text-status-pending border-status-pending/20',
      };
    default:
      return {
        state: 'empty',
        label: '',
        icon: '',
        colorClass: 'text-muted-foreground',
        bgClass: '',
        borderClass: 'border-l-transparent',
        progressClass: '[&>div]:bg-muted-foreground/30',
        pillClass: '',
      };
  }
}

// ── Delay Logic ──

export function markMealPending(date: string, mealType: string) {
  const key = DELAY_KEY + date + '_' + mealType;
  scopedSet(key, Date.now().toString());
}

export function resetMealPending(date: string, mealType: string) {
  const key = DELAY_KEY + date + '_' + mealType;
  scopedSet(key, Date.now().toString());
}

export function isMealPending(date: string, mealType: string): boolean {
  const key = DELAY_KEY + date + '_' + mealType;
  const ts = scopedGet(key);
  if (!ts) return false;
  return Date.now() - parseInt(ts) < DELAY_MS;
}

export function clearMealPending(date: string, mealType: string) {
  const key = DELAY_KEY + date + '_' + mealType;
  scopedRemove(key);
}

// ── Full state resolver (combines delay + computation) ──

export function resolveMealVisualState(
  loggedCalories: number,
  targetCalories: number,
  itemCount: number,
  date: string,
  mealType: string
): MealStateInfo {
  if (itemCount === 0) return getMealStateInfo('empty');
  
  if (isMealPending(date, mealType)) {
    return getMealStateInfo('pending');
  }
  
  const state = computeMealState(loggedCalories, targetCalories, itemCount);
  return getMealStateInfo(state);
}

// ── Calorie Ring gradient helpers ──

export function getRingGradientColors(progressPct: number): [string, string] {
  if (progressPct > 130) return ['hsl(var(--status-warning))', 'hsl(var(--status-danger))'];
  if (progressPct > 100) return ['hsl(var(--status-ontrack))', 'hsl(var(--status-warning))'];
  if (progressPct >= 70) return ['hsl(var(--status-warning))', 'hsl(var(--status-ontrack))'];
  return ['hsl(var(--status-warning))', 'hsl(var(--status-warning))'];
}

export function getRingStatusLabel(progressPct: number): { label: string; colorClass: string } {
  if (progressPct > 130) return { label: 'Over target', colorClass: 'text-status-danger' };
  if (progressPct > 110) return { label: 'Slightly over', colorClass: 'text-status-warning' };
  if (progressPct >= 90) return { label: 'On track', colorClass: 'text-status-ontrack' };
  if (progressPct >= 70) return { label: 'Getting there', colorClass: 'text-status-warning' };
  if (progressPct > 0) return { label: 'Below target', colorClass: 'text-status-danger' };
  return { label: 'Not started', colorClass: 'text-muted-foreground' };
}
