// ============================================
// Gym Attendance Tracking Service
// Pure logic functions for gym tracking, consistency, and calorie bonuses
// ============================================

import { getDailyLog, getProfile, getRecentLogs, saveDailyLog, saveProfile, type UserProfile, type DailyLog, toLocalDateKey } from './store';

// ── Types ──

export interface GymProfile {
  goer: boolean;
  daysPerWeek: number;
  durationMinutes: number;
  intensity: 'light' | 'moderate' | 'intense';
  goal: 'fat_loss' | 'muscle_gain' | 'general';
  schedule: string[];
  stats: GymStats;
}

export interface GymStats {
  totalWorkouts: number;
  totalCaloriesBurned: number;
  currentStreak: number;
  bestStreak: number;
  consistencyPercent: number;
}

export interface GymDayLog {
  attended: boolean;
  durationMinutes: number;
  caloriesBurned: number;
  intensity: string;
}

// ── MET values ──
const MET_VALUES: Record<string, number> = { light: 4, moderate: 6, intense: 8 };

// ── Schedule inference ──

const DAY_NAMES = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

export function inferSchedule(daysPerWeek: number): string[] {
  if (daysPerWeek <= 0) return [];
  if (daysPerWeek >= 7) return DAY_NAMES.slice(1).concat(['sunday']); // Mon-Sun
  
  const patterns: Record<number, string[]> = {
    1: ['monday'],
    2: ['monday', 'thursday'],
    3: ['monday', 'wednesday', 'friday'],
    4: ['monday', 'tuesday', 'thursday', 'friday'],
    5: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
    6: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'],
  };
  return patterns[daysPerWeek] || patterns[3];
}

// ── Day check ──

export function isGymDay(profile: UserProfile | null, date?: string): boolean {
  if (!profile?.gym?.goer || !profile.gym.schedule?.length) return false;
  const d = date ? new Date(date + 'T00:00:00') : new Date();
  const dayName = DAY_NAMES[d.getDay()];
  return profile.gym.schedule.includes(dayName);
}

// ── Check-in status ──

export function getGymCheckInStatus(date?: string): { attended: boolean | null; log: GymDayLog | null } {
  const dateStr = date || toLocalDateKey(new Date());
  const log = getDailyLog(dateStr);
  if (!log.gym) return { attended: null, log: null };
  return { attended: log.gym.attended, log: log.gym as GymDayLog };
}

// ── Calorie estimation ──

export function estimateCaloriesBurned(weightKg: number, durationMinutes: number, intensity: string): number {
  const met = MET_VALUES[intensity] || MET_VALUES.moderate;
  return Math.round(durationMinutes * met * (weightKg / 60));
}

// ── Save check-in ──

export function saveGymCheckIn(
  date: string,
  attended: boolean,
  durationMinutes?: number,
  intensity?: string
): void {
  const profile = getProfile();
  const weightKg = profile?.weightKg || 70;
  const dur = durationMinutes || profile?.gym?.durationMinutes || 45;
  const int = intensity || profile?.gym?.intensity || 'moderate';
  const cals = attended ? estimateCaloriesBurned(weightKg, dur, int) : 0;

  const log = getDailyLog(date);
  const updatedLog: DailyLog = {
    ...log,
    gym: {
      attended,
      durationMinutes: dur,
      caloriesBurned: cals,
      intensity: int,
    },
  };
  saveDailyLog(date, updatedLog);

  // Update profile stats
  if (profile?.gym) {
    const allLogs = getRecentLogs(90);
    const stats = computeGymStats(profile, allLogs);
    const updatedProfile: UserProfile = {
      ...profile,
      gym: { ...profile.gym, stats },
    };
    saveProfile(updatedProfile);
  }

  window.dispatchEvent(new Event('nutrilens:update'));
}

// ── Weekly consistency ──

export function getWeeklyConsistency(profile: UserProfile | null, date?: string): number {
  if (!profile?.gym?.goer || !profile.gym.daysPerWeek) return 0;
  
  const endDate = date ? new Date(date + 'T00:00:00') : new Date();
  let attended = 0;
  
  for (let i = 0; i < 7; i++) {
    const d = new Date(endDate);
    d.setDate(d.getDate() - i);
    const dateStr = toLocalDateKey(d);
    const log = getDailyLog(dateStr);
    if (log.gym?.attended) attended++;
  }
  
  return profile.gym.daysPerWeek > 0 ? attended / profile.gym.daysPerWeek : 0;
}

// ── Gym bonus calculation ──

export function getGymBonus(
  profile: UserProfile | null,
  weeklyConsistency: number,
  isScheduledGymDay: boolean
): { bonus: number; reduceBase: boolean } {
  if (!profile?.gym?.goer || !isScheduledGymDay) return { bonus: 0, reduceBase: false };
  
  const dur = profile.gym.durationMinutes || 45;
  const factor = MET_VALUES[profile.gym.intensity] || MET_VALUES.moderate;
  const baseBonus = Math.round(dur * factor * 0.6);
  
  if (weeklyConsistency >= 0.8) {
    return { bonus: baseBonus, reduceBase: false };
  } else if (weeklyConsistency >= 0.5) {
    return { bonus: Math.round(baseBonus * 0.75), reduceBase: false };
  } else {
    return { bonus: 0, reduceBase: true }; // caller subtracts 5% from base
  }
}

// ── Stats computation ──

export function computeGymStats(profile: UserProfile | null, allLogs: DailyLog[]): GymStats {
  let totalWorkouts = 0;
  let totalCaloriesBurned = 0;
  let currentStreak = 0;
  let bestStreak = 0;
  let tempStreak = 0;

  // Sort logs by date ascending
  const sorted = [...allLogs]
    .filter(l => l.gym)
    .sort((a, b) => a.date.localeCompare(b.date));

  for (const log of sorted) {
    if (log.gym?.attended) {
      totalWorkouts++;
      totalCaloriesBurned += log.gym.caloriesBurned || 0;
      tempStreak++;
      bestStreak = Math.max(bestStreak, tempStreak);
    } else {
      tempStreak = 0;
    }
  }

  // Current streak: count backwards from today
  currentStreak = 0;
  const today = new Date();
  for (let i = 0; i < 90; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = toLocalDateKey(d);
    const log = getDailyLog(dateStr);
    if (log.gym?.attended) {
      currentStreak++;
    } else if (isGymDay(profile, dateStr)) {
      break; // missed a scheduled day
    }
    // Skip non-gym days
  }

  // Consistency: last 12 weeks average
  const weeks = 12;
  let totalPlanned = 0;
  let totalAttended = 0;
  const daysPerWeek = profile?.gym?.daysPerWeek || 3;
  
  for (let w = 0; w < weeks; w++) {
    totalPlanned += daysPerWeek;
    for (let d = 0; d < 7; d++) {
      const date = new Date(today);
      date.setDate(date.getDate() - (w * 7 + d));
      const log = getDailyLog(toLocalDateKey(date));
      if (log.gym?.attended) totalAttended++;
    }
  }

  const consistencyPercent = totalPlanned > 0 ? Math.round((totalAttended / totalPlanned) * 100) : 0;

  return { totalWorkouts, totalCaloriesBurned, currentStreak, bestStreak: Math.max(bestStreak, currentStreak), consistencyPercent };
}

// ── Update stats on profile ──

export function updateGymStats(profile: UserProfile): GymStats {
  const allLogs = getRecentLogs(90);
  const stats = computeGymStats(profile, allLogs);
  const updated: UserProfile = {
    ...profile,
    gym: { ...profile.gym!, stats },
  };
  saveProfile(updated);
  return stats;
}

// ── Get sessions in last N days ──

export function getGymSessionsInDays(days: number): number {
  let count = 0;
  const today = new Date();
  for (let i = 0; i < days; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const log = getDailyLog(toLocalDateKey(d));
    if (log.gym?.attended) count++;
  }
  return count;
}
