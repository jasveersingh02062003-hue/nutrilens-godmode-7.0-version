// ============================================
// NutriLens AI – Learning Engine & Nudge Service
// ============================================
// Tracks user behavior, adapts scoring, generates proactive nudges.

import { getRecentLogs, getDailyTotals } from './store';
import { getSymptomLogs } from './symptom-service';
import { userHasHealthConditions } from './health-score';
import type { UserProfile } from './store';
import { toLocalDateStr } from './date-utils';

const LEARNING_KEY = 'nutrilens_learning';
const NUDGE_SEEN_KEY = 'nutrilens_nudges_seen';

// ── Learning Data ──

export interface LearningData {
  ignoredWarnings: { warningType: string; count: number }[];
  warningSensitivity: number;  // 1–5, default 3
  lastUpdated: string;
}

export function getLearningData(): LearningData {
  const data = scopedGet(LEARNING_KEY);
  if (data) return safeJsonParse(data, { ignoredWarnings: [], warningSensitivity: 3, lastUpdated: new Date().toISOString() });
  return { ignoredWarnings: [], warningSensitivity: 3, lastUpdated: new Date().toISOString() };
}

export function saveLearningData(data: LearningData) {
  data.lastUpdated = new Date().toISOString();
  scopedSet(LEARNING_KEY, JSON.stringify(data));
}

export function recordIgnoredWarning(warningType: string) {
  const data = getLearningData();
  const existing = data.ignoredWarnings.find(w => w.warningType === warningType);
  if (existing) existing.count++;
  else data.ignoredWarnings.push({ warningType, count: 1 });
  saveLearningData(data);
}

export function setWarningSensitivity(level: number) {
  const data = getLearningData();
  data.warningSensitivity = Math.max(1, Math.min(5, level));
  saveLearningData(data);
}

// ── Nudge Service ──

export interface Nudge {
  id: string;
  message: string;
  emoji: string;
  type: 'suggestion' | 'warning' | 'celebration';
  action?: string;   // e.g., 'open_planner', 'log_symptom'
}

function getSeenNudges(): Record<string, string> {
  const data = scopedGet(NUDGE_SEEN_KEY);
  return data ? safeJsonParse(data, {}) : {};
}

function markNudgeSeen(id: string) {
  const seen = getSeenNudges();
  seen[id] = new Date().toISOString();
  scopedSet(NUDGE_SEEN_KEY, JSON.stringify(seen));
}

function wasNudgeSeenRecently(id: string, hoursAgo: number = 24): boolean {
  const seen = getSeenNudges();
  if (!seen[id]) return false;
  const seenAt = new Date(seen[id]).getTime();
  return Date.now() - seenAt < hoursAgo * 60 * 60 * 1000;
}

export function dismissNudge(id: string) {
  markNudgeSeen(id);
}

export function getActiveNudges(profile: UserProfile | null): Nudge[] {
  if (!profile) return [];
  const nudges: Nudge[] = [];
  const logs = getRecentLogs(7);

  // Check patterns
  const daysWithMeals = logs.filter(l => l.meals.length > 0);

  // 1. Consecutive high-GI days
  const highGIKeywords = ['rice', 'bread', 'naan', 'paratha', 'biryani', 'pulao', 'potato'];
  let highGIDays = 0;
  for (const log of daysWithMeals.slice(0, 3)) {
    const hasHighGI = log.meals.some(m =>
      m.items.some(i => highGIKeywords.some(kw => i.name.toLowerCase().includes(kw)))
    );
    if (hasHighGI) highGIDays++;
  }
  if (highGIDays >= 3 && !wasNudgeSeenRecently('high_gi_streak', 72)) {
    nudges.push({
      id: 'high_gi_streak',
      message: "You've had high-GI foods for 3 days straight. Want to try a low-GI meal plan this week?",
      emoji: '📈',
      type: 'suggestion',
      action: 'open_planner',
    });
  }

  // 2. Skipped breakfast
  let skippedBreakfast = 0;
  for (const log of daysWithMeals.slice(0, 5)) {
    if (!log.meals.some(m => m.type === 'breakfast')) skippedBreakfast++;
  }
  if (skippedBreakfast >= 3 && !wasNudgeSeenRecently('skipped_breakfast', 72)) {
    nudges.push({
      id: 'skipped_breakfast',
      message: "You've skipped breakfast 3 times this week. A protein-rich breakfast could boost your energy!",
      emoji: '🌅',
      type: 'suggestion',
    });
  }

  // 3. Low protein consistently
  let lowProteinDays = 0;
  for (const log of daysWithMeals.slice(0, 5)) {
    const totals = getDailyTotals(log);
    if (totals.protein < (profile.dailyProtein || 50) * 0.7) lowProteinDays++;
  }
  if (lowProteinDays >= 3 && !wasNudgeSeenRecently('low_protein', 72)) {
    nudges.push({
      id: 'low_protein',
      message: "Your protein intake has been below target. Try adding eggs, dal, or paneer to your meals.",
      emoji: '💪',
      type: 'warning',
    });
  }

  // 4. Great streak celebration
  if (daysWithMeals.length >= 7 && !wasNudgeSeenRecently('week_streak', 168)) {
    nudges.push({
      id: 'week_streak',
      message: "Amazing! You've logged meals every day this week. Keep up the consistency! 🔥",
      emoji: '🎉',
      type: 'celebration',
    });
  }

  // 5. Symptom logging reminder
  const symptoms = getSymptomLogs();
  const todayKey = toLocalDateStr();
  const loggedToday = symptoms.some((s: any) => s.date === todayKey);
  if (!loggedToday && daysWithMeals.length > 0 && !wasNudgeSeenRecently('symptom_reminder', 24)) {
    nudges.push({
      id: 'symptom_reminder',
      message: "Don't forget to log how you're feeling today. Tracking symptoms helps find food triggers!",
      emoji: '📝',
      type: 'suggestion',
      action: 'log_symptom',
    });
  }

  return nudges.slice(0, 2); // Max 2 nudges at a time
}
