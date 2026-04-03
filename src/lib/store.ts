export interface UserProfile {
  name: string;
  gender: string;
  occupation: string;
  jobType: string;
  workActivity: string;
  exerciseRoutine: string;
  sleepHours: string;
  stressLevel: string;
  cookingHabits: string;
  eatingOut: string;
  caffeine: string;
  alcohol: string;
  activityLevel: string;
  heightCm: number;
  weightKg: number;
  dob: string;
  age: number;
  goal: string;
  targetWeight: number;
  goalSpeed: number;
  dietaryPrefs: string[];
  healthConditions: string[];
  womenHealth: string[];
  menHealth: { prostateConcerns?: boolean; testosteroneConcerns?: boolean };
  medications: string;
  mealTimes: { breakfast: string; lunch: string; dinner: string; snacks: string };
  waterGoal: number;
  onboardingComplete: boolean;
  dailyCalories: number;
  originalDailyCalories?: number; // Set once during onboarding, never mutated by plateau/adaptation
  trackingMode?: 'flex' | 'strict';
  dailyProtein: number;
  dailyCarbs: number;
  dailyFat: number;
  bmi: number;
  bmr: number;
  tdee: number;
  joinDate?: string; // YYYY-MM-DD, set once during onboarding
  allergens?: string[]; // e.g. ['dairy', 'gluten', 'nuts']
  skinConcerns?: {
    oily?: boolean;
    dry?: boolean;
    acne?: boolean;
    dull?: boolean;
    pigmentation?: boolean;
    sensitive?: boolean;
    severity?: number;
    seasonalChanges?: boolean;
    winterDry?: boolean;
    summerOily?: boolean;
    diagnosedConditions?: string[];
  };
  // Context Intelligence fields
  travelFrequency?: 'never' | 'sometimes' | 'often';
  kitchenAppliances?: string[];
  workplaceFacilities?: string[];
  carriesFood?: 'always' | 'sometimes' | 'never';
  livingSituation?: 'alone' | 'family' | 'shared';
}

export interface FoodItem {
  id: string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber?: number;
  quantity: number;
  unit: string;
  emoji?: string;
  estimatedWeightGrams?: number;
  itemCost?: number;
  itemSource?: MealSourceCategory;
  /** Confidence score (0–1): camera=0.7, manual=0.9, voice=0.6 */
  confidenceScore?: number;
  /** Per-100g base values for unit conversion recalculation */
  per100g?: { calories: number; protein: number; carbs: number; fat: number; fiber?: number };
  /** Available unit options for this food item */
  unitOptions?: import('@/lib/unit-conversion').UnitOption[];
}

export type MealSourceCategory = 'home' | 'restaurant' | 'street_food' | 'packaged' | 'fast_food' | 'office' | 'friends' | 'other';
export type MealLocation = 'home' | 'office' | 'restaurant_place' | 'outdoors' | 'travel';
export type MealCompanion = 'alone' | 'family' | 'friends' | 'colleagues';
export type MealOccasion = 'regular' | 'celebration' | 'cheat_day' | 'stress';
export type MealMood = 'happy' | 'stressed' | 'tired' | 'bored';
export type CookingMethod = 'fried' | 'air_fried' | 'grilled' | 'baked' | 'boiled_steamed' | 'sauteed' | 'raw';

export interface MealCost {
  amount: number;
  currency?: string;
}

export interface MealSource {
  category: MealSourceCategory;
  customLabel?: string | null;
  location?: MealLocation | null;
  companions?: MealCompanion[];
  occasion?: MealOccasion | null;
  mood?: MealMood | null;
}

export interface MealEntry {
  id: string;
  type: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  items: FoodItem[];
  totalCalories: number;
  totalProtein: number;
  totalCarbs: number;
  totalFat: number;
  time: string;
  source?: MealSource | null;
  cost?: MealCost | null;
  restaurantName?: string | null;
  cookingMethod?: CookingMethod | null;
  photo?: string | null;
  caption?: string | null;
}

export interface SupplementEntry {
  id: string;
  name: string;
  brand?: string;
  dosage: number;
  unit: string;
  time: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  icon: string;
  category: string;
}

export interface ActivityEntry {
  id: string;
  type: string;
  duration: number; // minutes
  intensity: 'light' | 'moderate' | 'intense';
  calories: number;
  met: number;
  source: 'manual' | 'google_fit';
  time: string;
}

export interface BurnedData {
  steps: number;        // calories from steps
  stepsCount: number;   // actual step count
  activities: ActivityEntry[];
  total: number;        // computed sum
}

export interface ProgressPhoto {
  id: string;
  dataUrl: string;           // base64 data URL stored in IndexedDB
  type: 'front' | 'side' | 'back' | 'other';
  caption: string;
  date: string;              // YYYY-MM-DD
}

export interface DailyLog {
  date: string;
  meals: MealEntry[];
  supplements: SupplementEntry[];
  waterCups: number;
  caloriesBurned: number;
  burned: BurnedData;
  weight?: number | null;
  weightUnit?: 'kg' | 'lbs';
  progressPhotoIds?: string[];
  journal?: string;
}

import { scopedGet, scopedSet, scopedGetJSON, scopedSetJSON, scopedRemove } from '@/lib/scoped-storage';

const PROFILE_KEY = 'nutrilens_profile';
const LOG_KEY_PREFIX = 'nutrilens_log_';
const PHOTOS_KEY = 'nutrilens_progress_photos';

export function getProfile(): UserProfile | null {
  // Profile stays global — overwritten on login from cloud
  const data = localStorage.getItem(PROFILE_KEY);
  if (!data) return null;
  try {
    return JSON.parse(data);
  } catch (e) {
    console.warn('[store] Corrupted profile JSON, returning null:', e);
    return null;
  }
}

/** Get dynamically computed age from DOB (falls back to stored age) */
export function getComputedAge(profile: UserProfile): number {
  if (profile.dob) {
    const dob = new Date(profile.dob + 'T00:00:00');
    const today = new Date();
    let age = today.getFullYear() - dob.getFullYear();
    const monthDiff = today.getMonth() - dob.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
      age--;
    }
    return age;
  }
  return profile.age;
}

export function saveProfile(profile: UserProfile) {
  localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
  // Dispatch event so UserProfileContext auto-syncs to cloud
  window.dispatchEvent(new CustomEvent('nutrilens:profile-updated'));
}

export function getTodayKey(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

/** Normalize any Date to local YYYY-MM-DD */
export function toLocalDateKey(d: Date = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function getDailyLog(date?: string): DailyLog {
  const key = date || getTodayKey();
  const data = scopedGet(LOG_KEY_PREFIX + key);
  const defaultBurned: BurnedData = { steps: 0, stepsCount: 0, activities: [], total: 0 };
  if (data) {
    try {
      const parsed = JSON.parse(data);
      return {
        ...parsed,
        supplements: parsed.supplements || [],
        burned: parsed.burned || defaultBurned,
        weight: parsed.weight ?? null,
        weightUnit: parsed.weightUnit || 'kg',
        progressPhotoIds: parsed.progressPhotoIds || [],
      };
    } catch {
      // Corrupted data — return default
    }
  }
  return { date: key, meals: [], supplements: [], waterCups: 0, caloriesBurned: 0, burned: defaultBurned, weight: null, weightUnit: 'kg', progressPhotoIds: [] };
}

export function saveDailyLog(log: DailyLog) {
  scopedSet(LOG_KEY_PREFIX + log.date, JSON.stringify(log));
  // Fire-and-forget cloud sync
  import('@/lib/daily-log-sync').then(m => m.syncDailyLogToCloud(log)).catch(() => {});
  // Centralized recompute + UI refresh after every mutation
  import('@/lib/calorie-correction').then(m => m.recomputeCalorieEngine()).catch(() => {});
}

export function logWeight(date: string, weight: number, unit: 'kg' | 'lbs' = 'kg') {
  const log = getDailyLog(date);
  log.weight = weight;
  log.weightUnit = unit;
  saveDailyLog(log);
  // Fire-and-forget cloud sync to weight_logs
  import('@/integrations/supabase/client').then(({ supabase }) => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session?.user) return;
      supabase.from('weight_logs').upsert({
        user_id: session.user.id, log_date: date, weight, unit,
      } as any, { onConflict: 'user_id,log_date' } as any).then(({ error }: any) => {
        if (error) console.error('[store] weight_logs sync failed:', error.message);
      });
    });
  }).catch(() => {});
  return log;
}

export function getWeightHistory(days: number = 30): Array<{ date: string; weight: number; unit: string }> {
  const entries: Array<{ date: string; weight: number; unit: string }> = [];
  for (let i = 0; i < days; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = toLocalDateKey(d);
    const log = getDailyLog(key);
    if (log.weight != null && log.weight > 0) {
      entries.push({ date: log.date, weight: log.weight, unit: log.weightUnit || 'kg' });
    }
  }
  return entries.reverse();
}

export function addMealToLog(meal: MealEntry) {
  const log = getDailyLog();
  log.meals.push(meal);
  saveDailyLog(log);
  return log;
}

export function addWater() {
  const log = getDailyLog();
  log.waterCups += 1;
  saveDailyLog(log);
  // Fire-and-forget cloud sync
  import('@/integrations/supabase/client').then(({ supabase }) => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session?.user) return;
      supabase.from('water_logs').upsert({
        user_id: session.user.id, log_date: log.date, cups: log.waterCups,
      } as any, { onConflict: 'user_id,log_date' } as any).then(({ error }: any) => {
        if (error) console.error('[store] water_logs sync failed:', error.message);
      });
    });
  }).catch(() => {});
  return log;
}

// SAFETY: Always recompute totals from items (item.value * item.quantity) instead
// of trusting stored meal.totalCalories, which may have been written by older buggy code.
export function getDailyTotals(log: DailyLog) {
  let eaten = 0, protein = 0, carbs = 0, fat = 0;
  for (const meal of log.meals) {
    // Recompute from items to avoid stale/incorrect stored totals
    const mealCal = meal.items.reduce((s, i) => s + (i.calories || 0) * (i.quantity || 1), 0);
    const mealP = meal.items.reduce((s, i) => s + (i.protein || 0) * (i.quantity || 1), 0);
    const mealC = meal.items.reduce((s, i) => s + (i.carbs || 0) * (i.quantity || 1), 0);
    const mealF = meal.items.reduce((s, i) => s + (i.fat || 0) * (i.quantity || 1), 0);
    eaten += mealCal;
    protein += mealP;
    carbs += mealC;
    fat += mealF;
  }
  for (const supp of (log.supplements || [])) {
    eaten += supp.calories || 0;
    protein += supp.protein || 0;
    carbs += supp.carbs || 0;
    fat += supp.fat || 0;
  }
  const burned = log.burned?.total || log.caloriesBurned || 0;
  return { eaten, protein, carbs, fat, burned };
}

export function addSupplement(entry: SupplementEntry) {
  const log = getDailyLog();
  log.supplements = log.supplements || [];
  log.supplements.push(entry);
  saveDailyLog(log);
  // Fire-and-forget cloud sync
  import('@/integrations/supabase/client').then(({ supabase }) => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session?.user) return;
      supabase.from('supplement_logs').upsert({
        user_id: session.user.id, log_date: log.date, supplements: log.supplements as any,
      } as any, { onConflict: 'user_id,log_date' } as any).then(({ error }: any) => {
        if (error) console.error('[store] supplement_logs sync failed:', error.message);
      });
    });
  }).catch(() => {});
  return log;
}

export function updateSupplement(id: string, entry: Partial<SupplementEntry>) {
  const log = getDailyLog();
  log.supplements = (log.supplements || []).map(s => s.id === id ? { ...s, ...entry } : s);
  saveDailyLog(log);
  return log;
}

export function deleteSupplement(id: string) {
  const log = getDailyLog();
  log.supplements = (log.supplements || []).filter(s => s.id !== id);
  saveDailyLog(log);
  return log;
}

// Get logs for past N days
export function getRecentLogs(days: number): DailyLog[] {
  const logs: DailyLog[] = [];
  for (let i = 0; i < days; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = toLocalDateKey(d);
    logs.push(getDailyLog(key));
  }
  return logs;
}

// Activity tracking
export function addActivity(entry: ActivityEntry) {
  const log = getDailyLog();
  log.burned = log.burned || { steps: 0, stepsCount: 0, activities: [], total: 0 };
  log.burned.activities.push(entry);
  log.burned.total = log.burned.steps + log.burned.activities.reduce((s, a) => s + a.calories, 0);
  log.caloriesBurned = log.burned.total;
  saveDailyLog(log);
  return log;
}

export function deleteActivity(id: string) {
  const log = getDailyLog();
  if (!log.burned) return log;
  const deleted = log.burned.activities.find(a => a.id === id);
  log.burned.activities = log.burned.activities.filter(a => a.id !== id);
  log.burned.total = log.burned.steps + log.burned.activities.reduce((s, a) => s + a.calories, 0);
  log.caloriesBurned = log.burned.total;
  saveDailyLog(log);
  // Revert exercise meal adjustments (lazy import to avoid circular dependency)
  if (deleted) {
    import('./exercise-adjustment').then(({ revertExerciseAdjustment }) => {
      revertExerciseAdjustment(id, deleted.type, deleted.calories, getTodayKey());
    });
  }
  return log;
}

export function updateSteps(stepsCount: number, weightKg: number) {
  const log = getDailyLog();
  log.burned = log.burned || { steps: 0, stepsCount: 0, activities: [], total: 0 };
  log.burned.stepsCount = stepsCount;
  log.burned.steps = Math.round(stepsCount * weightKg * 0.00057);
  log.burned.total = log.burned.steps + log.burned.activities.reduce((s, a) => s + a.calories, 0);
  log.caloriesBurned = log.burned.total;
  saveDailyLog(log);
  return log;
}

// ─── Date-aware helpers ───

export function addMealToLogForDate(date: string, meal: MealEntry) {
  const log = getDailyLog(date);
  log.meals.push(meal);
  saveDailyLog(log);
  return log;
}

export function deleteMealFromLog(date: string, mealId: string) {
  const log = getDailyLog(date);
  log.meals = log.meals.filter(m => m.id !== mealId);
  saveDailyLog(log);
  return log;
}

export function addWaterForDate(date: string) {
  const log = getDailyLog(date);
  log.waterCups += 1;
  saveDailyLog(log);
  // Sync to water_logs table
  import('@/integrations/supabase/client').then(({ supabase }) => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session?.user) return;
      supabase.from('water_logs').upsert({
        user_id: session.user.id, log_date: date, cups: log.waterCups,
      } as any, { onConflict: 'user_id,log_date' } as any).then(({ error }: any) => {
        if (error) console.error('[store] water_logs sync failed:', error.message);
      });
    });
  }).catch(() => {});
  return log;
}

export function removeWaterForDate(date: string) {
  const log = getDailyLog(date);
  log.waterCups = Math.max(0, log.waterCups - 1);
  saveDailyLog(log);
  // Sync to water_logs table
  import('@/integrations/supabase/client').then(({ supabase }) => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session?.user) return;
      supabase.from('water_logs').upsert({
        user_id: session.user.id, log_date: date, cups: log.waterCups,
      } as any, { onConflict: 'user_id,log_date' } as any).then(({ error }: any) => {
        if (error) console.error('[store] water_logs sync failed:', error.message);
      });
    });
  }).catch(() => {});
  return log;
}

export function addSupplementForDate(date: string, entry: SupplementEntry) {
  const log = getDailyLog(date);
  log.supplements = log.supplements || [];
  log.supplements.push(entry);
  saveDailyLog(log);
  // Sync to supplement_logs table
  import('@/integrations/supabase/client').then(({ supabase }) => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session?.user) return;
      supabase.from('supplement_logs').upsert({
        user_id: session.user.id, log_date: date, supplements: log.supplements as any,
      } as any, { onConflict: 'user_id,log_date' } as any).then(() => {});
    });
  }).catch(() => {});
  return log;
}

export function deleteSupplementFromLog(date: string, id: string) {
  const log = getDailyLog(date);
  log.supplements = (log.supplements || []).filter(s => s.id !== id);
  saveDailyLog(log);
  // Sync to supplement_logs table
  import('@/integrations/supabase/client').then(({ supabase }) => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session?.user) return;
      supabase.from('supplement_logs').upsert({
        user_id: session.user.id, log_date: date, supplements: log.supplements as any,
      } as any, { onConflict: 'user_id,log_date' } as any).then(() => {});
    });
  }).catch(() => {});
  return log;
}

export function addActivityForDate(date: string, entry: ActivityEntry) {
  const log = getDailyLog(date);
  log.burned = log.burned || { steps: 0, stepsCount: 0, activities: [], total: 0 };
  log.burned.activities.push(entry);
  log.burned.total = log.burned.steps + log.burned.activities.reduce((s, a) => s + a.calories, 0);
  log.caloriesBurned = log.burned.total;
  saveDailyLog(log);
  return log;
}

export function deleteActivityFromLog(date: string, id: string) {
  const log = getDailyLog(date);
  if (!log.burned) return log;
  const deleted = log.burned.activities.find(a => a.id === id);
  log.burned.activities = log.burned.activities.filter(a => a.id !== id);
  log.burned.total = log.burned.steps + log.burned.activities.reduce((s, a) => s + a.calories, 0);
  log.caloriesBurned = log.burned.total;
  saveDailyLog(log);
  // Revert exercise meal adjustments (lazy import to avoid circular dependency)
  if (deleted) {
    import('./exercise-adjustment').then(({ revertExerciseAdjustment }) => {
      revertExerciseAdjustment(id, deleted.type, deleted.calories, date);
    });
  }
  return log;
}

export function saveJournalNote(date: string, note: string) {
  const log = getDailyLog(date);
  log.journal = note;
  saveDailyLog(log);
  return log;
}

export function getAllLogDates(): string[] {
  const dates: string[] = [];
  // Scan for both scoped and legacy un-scoped log keys
  const scopedPrefix = (() => {
    const { getScopedUserId } = require('@/lib/scoped-storage');
    const uid = getScopedUserId();
    return uid ? `u_${uid.slice(0, 8)}_${LOG_KEY_PREFIX}` : null;
  })();

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key) continue;
    // Check scoped keys first
    if (scopedPrefix && key.startsWith(scopedPrefix)) {
      dates.push(key.replace(scopedPrefix, ''));
    } else if (key.startsWith(LOG_KEY_PREFIX) && !key.startsWith('u_')) {
      // Legacy un-scoped keys (for migration period)
      dates.push(key.replace(LOG_KEY_PREFIX, ''));
    }
  }
  return [...new Set(dates)]; // deduplicate
}
