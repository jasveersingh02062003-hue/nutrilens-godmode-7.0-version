import { scopedGet, scopedSet, scopedRemove } from "./scoped-storage";
import { safeJsonParse } from "./safe-json";
// Reverse Diet Service — graduated calorie transition after plan completion

const STORAGE_KEY = 'nutrilens_reverse_diet';

export interface ReverseDietState {
  active: boolean;
  startDate: string; // YYYY-MM-DD
  newTDEE: number;
  weeklyTargets: number[]; // 3 weeks of graduated targets
  originalPlanId: string;
}

export function startReverseDiet(newWeight: number, heightCm: number, age: number, gender: string, activityMultiplier: number, planId: string): void {
  // Mifflin-St Jeor
  const bmr = gender === 'female'
    ? 10 * newWeight + 6.25 * heightCm - 5 * age - 161
    : 10 * newWeight + 6.25 * heightCm - 5 * age + 5;
  const newTDEE = Math.round(bmr * activityMultiplier);

  const state: ReverseDietState = {
    active: true,
    startDate: new Date().toISOString().split('T')[0],
    newTDEE,
    weeklyTargets: [
      Math.round(newTDEE - 200), // Week 1
      Math.round(newTDEE - 100), // Week 2
      newTDEE,                    // Week 3
    ],
    originalPlanId: planId,
  };
  scopedSet(STORAGE_KEY, JSON.stringify(state));
}

export function getReverseDietState(): ReverseDietState | null {
  try {
    const raw = scopedGet(STORAGE_KEY);
    if (!raw) return null;
    const state = JSON.parse(raw) as ReverseDietState;
    if (!state.active) return null;
    // Auto-expire after 3 weeks
    const start = new Date(state.startDate);
    const now = new Date();
    const daysPassed = Math.ceil((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    if (daysPassed > 21) {
      clearReverseDiet();
      return null;
    }
    return state;
  } catch {
    return null;
  }
}

export function getReverseDietTarget(): number | null {
  const state = getReverseDietState();
  if (!state) return null;
  const week = getReverseDietWeek();
  if (week === null || week < 1 || week > 3) return null;
  return state.weeklyTargets[week - 1];
}

export function getReverseDietWeek(): number | null {
  const state = getReverseDietState();
  if (!state) return null;
  const start = new Date(state.startDate);
  const now = new Date();
  const daysPassed = Math.ceil((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  return Math.min(3, Math.ceil(daysPassed / 7));
}

export function isReverseDietActive(): boolean {
  return getReverseDietState() !== null;
}

export function clearReverseDiet(): void {
  const raw = scopedGet(STORAGE_KEY);
  if (raw) {
    try {
      const state = JSON.parse(raw);
      state.active = false;
      scopedSet(STORAGE_KEY, JSON.stringify(state));
    } catch {
      scopedRemove(STORAGE_KEY);
    }
  }
}
