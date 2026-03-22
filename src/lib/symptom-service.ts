// ============================================
// NutriLens AI – Symptom Tracking Service
// ============================================
// CRUD for daily symptom logs + correlation analysis.

import { getDailyLog } from '@/lib/store';

const SYMPTOM_KEY = 'nutrilens_symptoms';

export interface SymptomLog {
  date: string;            // YYYY-MM-DD
  energy?: 1 | 2 | 3 | 4 | 5;
  mood?: 1 | 2 | 3 | 4 | 5;
  bloating?: 1 | 2 | 3 | 4 | 5;
  skin?: 1 | 2 | 3 | 4 | 5;
  hunger?: 1 | 2 | 3 | 4 | 5;
  sleep?: number;
  notes?: string;
}

export function getSymptomLogs(): SymptomLog[] {
  const data = localStorage.getItem(SYMPTOM_KEY);
  return data ? JSON.parse(data) : [];
}

export function getSymptomLog(date: string): SymptomLog | null {
  return getSymptomLogs().find(s => s.date === date) || null;
}

export function saveSymptomLog(log: SymptomLog) {
  const logs = getSymptomLogs().filter(s => s.date !== log.date);
  logs.push(log);
  // Keep last 90 days
  logs.sort((a, b) => b.date.localeCompare(a.date));
  localStorage.setItem(SYMPTOM_KEY, JSON.stringify(logs.slice(0, 90)));
}

export function deleteSymptomLog(date: string) {
  const logs = getSymptomLogs().filter(s => s.date !== date);
  localStorage.setItem(SYMPTOM_KEY, JSON.stringify(logs));
}

// ── Correlation Analysis ──

export interface SymptomInsight {
  text: string;
  emoji: string;
  type: 'warning' | 'positive' | 'info';
}

export function getSymptomInsights(days: number = 7): SymptomInsight[] {
  const insights: SymptomInsight[] = [];
  const logs = getSymptomLogs().slice(0, days);

  if (logs.length < 3) return []; // need enough data

  // Bloating correlation with high-carb meals
  const bloatingDays = logs.filter(s => (s.bloating || 0) >= 4);
  if (bloatingDays.length >= 2) {
    let highCarbOnBloating = 0;
    for (const day of bloatingDays) {
      const mealLog = getDailyLog(day.date);
      const totalCarbs = mealLog.meals.reduce((s: number, m: any) => s + m.totalCarbs, 0);
      if (totalCarbs > 150) highCarbOnBloating++;
    }
    if (highCarbOnBloating >= Math.ceil(bloatingDays.length * 0.6)) {
      insights.push({
        text: `You reported bloating on ${bloatingDays.length} days. Those days had higher carb intake. Try reducing refined carbs.`,
        emoji: '💨',
        type: 'warning',
      });
    }
  }

  // Low energy correlation with low protein
  const lowEnergyDays = logs.filter(s => (s.energy || 3) <= 2);
  if (lowEnergyDays.length >= 2) {
    let lowProteinOnTired = 0;
    for (const day of lowEnergyDays) {
      const mealLog = getDailyLog(day.date);
      const totalProtein = mealLog.meals.reduce((s: number, m: any) => s + m.totalProtein, 0);
      if (totalProtein < 50) lowProteinOnTired++;
    }
    if (lowProteinOnTired >= Math.ceil(lowEnergyDays.length * 0.6)) {
      insights.push({
        text: `Low energy days correlated with low protein intake. Adding protein-rich meals could boost your energy.`,
        emoji: '😴',
        type: 'info',
      });
    }
  }

  // Good mood on balanced days
  const goodMoodDays = logs.filter(s => (s.mood || 3) >= 4);
  if (goodMoodDays.length >= 3) {
    insights.push({
      text: `Great mood on ${goodMoodDays.length} of ${logs.length} days this week! Keep up the balanced eating.`,
      emoji: '😊',
      type: 'positive',
    });
  }

  // Sleep pattern
  const sleepLogs = logs.filter(s => s.sleep != null);
  if (sleepLogs.length >= 3) {
    const avgSleep = sleepLogs.reduce((s, l) => s + (l.sleep || 0), 0) / sleepLogs.length;
    if (avgSleep < 6) {
      insights.push({
        text: `You're averaging ${avgSleep.toFixed(1)} hours of sleep. Aim for 7-8 hours for better metabolism.`,
        emoji: '🌙',
        type: 'warning',
      });
    } else if (avgSleep >= 7) {
      insights.push({
        text: `Great sleep pattern — averaging ${avgSleep.toFixed(1)} hours! This supports your health goals.`,
        emoji: '💤',
        type: 'positive',
      });
    }
  }

  return insights;
}
