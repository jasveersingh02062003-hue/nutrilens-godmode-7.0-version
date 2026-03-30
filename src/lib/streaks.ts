import { getDailyLog, getDailyTotals, getProfile } from '@/lib/store';

// ─── Types ───

export interface StreakData {
  current: number;
  longest: number;
  lastLogDate: string | null;
  graceUsed: boolean;
}

export interface AllStreaks {
  nutrition: StreakData;
  hydration: StreakData;
}

export type StreakType = keyof AllStreaks;

export interface StreakMilestone {
  target: number;
  label: string;
  emoji: string;
}

// ─── Constants ───

const STREAKS_KEY = 'nutrilens_streaks';

export const MILESTONES: StreakMilestone[] = [
  { target: 3, label: '3 Day Starter', emoji: '🌱' },
  { target: 7, label: '1 Week Strong', emoji: '💪' },
  { target: 14, label: '2 Week Warrior', emoji: '⚡' },
  { target: 30, label: '30 Day Champion', emoji: '🏆' },
  { target: 60, label: '60 Day Legend', emoji: '🔥' },
  { target: 90, label: '90 Day Master', emoji: '👑' },
];

// ─── Storage ───

function defaultStreak(): StreakData {
  return { current: 0, longest: 0, lastLogDate: null, graceUsed: false };
}

export function getStreaks(): AllStreaks {
  const data = localStorage.getItem(STREAKS_KEY);
  if (data) {
    const parsed = JSON.parse(data);
    return {
      nutrition: { ...defaultStreak(), ...parsed.nutrition },
      hydration: { ...defaultStreak(), ...parsed.hydration },
    };
  }
  return { nutrition: defaultStreak(), hydration: defaultStreak() };
}

export function saveStreaks(streaks: AllStreaks) {
  localStorage.setItem(STREAKS_KEY, JSON.stringify(streaks));
}

// ─── Date helpers ───

function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function getYesterday(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00');
  d.setDate(d.getDate() - 1);
  return toDateStr(d);
}

function daysBetween(a: string, b: string): number {
  const da = new Date(a + 'T12:00:00');
  const db = new Date(b + 'T12:00:00');
  return Math.round((db.getTime() - da.getTime()) / (1000 * 60 * 60 * 24));
}

// ─── Streak update logic ───

function updateSingleStreak(streak: StreakData, conditionMet: boolean, currentDate: string): { updated: StreakData; milestoneReached?: StreakMilestone } {
  if (!conditionMet) return { updated: streak };

  const s = { ...streak };
  const yesterday = getYesterday(currentDate);

  if (s.lastLogDate === currentDate) {
    // Already counted today
    return { updated: s };
  }

  if (s.lastLogDate === yesterday) {
    // Consecutive
    s.current += 1;
    s.graceUsed = false;
  } else if (s.lastLogDate === null) {
    // First ever
    s.current = 1;
    s.graceUsed = false;
  } else {
    const gap = daysBetween(s.lastLogDate, currentDate);
    if (gap === 2 && !s.graceUsed) {
      // 1 missed day, use grace
      s.current += 1;
      s.graceUsed = true;
    } else {
      // Streak broken
      s.current = 1;
      s.graceUsed = false;
    }
  }

  s.lastLogDate = currentDate;
  if (s.current > s.longest) s.longest = s.current;

  // Check milestone
  const milestone = MILESTONES.find(m => m.target === s.current);

  return { updated: s, milestoneReached: milestone };
}

// ─── Public API ───

export function checkAndUpdateStreaks(): { streaks: AllStreaks; milestones: Array<{ type: StreakType; milestone: StreakMilestone }> } {
  const today = toDateStr(new Date());
  const profile = getProfile();
  const log = getDailyLog(today);
  const totals = getDailyTotals(log);
  const streaks = getStreaks();

  const milestones: Array<{ type: StreakType; milestone: StreakMilestone }> = [];

  // Nutrition: has any meal logged
  const nutritionMet = log.meals.length > 0;
  const nutResult = updateSingleStreak(streaks.nutrition, nutritionMet, today);
  streaks.nutrition = nutResult.updated;
  if (nutResult.milestoneReached) milestones.push({ type: 'nutrition', milestone: nutResult.milestoneReached });

  // Hydration: met water goal
  const waterGoal = profile?.waterGoal || 8;
  const hydrationMet = log.waterCups >= waterGoal;
  const hydResult = updateSingleStreak(streaks.hydration, hydrationMet, today);
  streaks.hydration = hydResult.updated;
  if (hydResult.milestoneReached) milestones.push({ type: 'hydration', milestone: hydResult.milestoneReached });

  saveStreaks(streaks);
  return { streaks, milestones };
}

export function checkStreakBreaks(): AllStreaks {
  const today = toDateStr(new Date());
  const yesterday = getYesterday(today);
  const streaks = getStreaks();

  for (const key of ['nutrition', 'hydration'] as StreakType[]) {
    const s = streaks[key];
    if (s.lastLogDate && s.lastLogDate < yesterday) {
      const gap = daysBetween(s.lastLogDate, today);
      if (gap > 2 || (gap === 2 && s.graceUsed)) {
        s.current = 0;
        s.graceUsed = false;
      }
    }
  }

  saveStreaks(streaks);
  return streaks;
}

export function getNextMilestone(current: number): StreakMilestone | null {
  return MILESTONES.find(m => m.target > current) || null;
}

export function getMilestoneProgress(current: number): { current: number; target: number; pct: number } {
  const next = getNextMilestone(current);
  if (!next) return { current, target: current, pct: 100 };
  const prev = MILESTONES.filter(m => m.target <= current).pop();
  const base = prev?.target || 0;
  const range = next.target - base;
  const progress = current - base;
  return { current: progress, target: range, pct: Math.round((progress / range) * 100) };
}

export const STREAK_META: Record<StreakType, { label: string; emoji: string; color: string }> = {
  nutrition: { label: 'Nutrition', emoji: '🍽️', color: 'primary' },
  hydration: { label: 'Hydration', emoji: '💧', color: 'accent' },
};
