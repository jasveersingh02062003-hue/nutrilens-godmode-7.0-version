// ==========================================
// NutriLens AI – Verified Weight History
// Separate from daily log. Stores weight
// entries with optional verified photos.
// ==========================================

import { toLocalDateStr } from './date-utils';

export interface WeightEntry {
  id: string;
  date: string;          // YYYY-MM-DD
  weekStart: string;     // Monday of that week (YYYY-MM-DD)
  weight: number;
  unit: 'kg' | 'lbs';
  photo: string | null;  // base64 watermarked image (or null)
  verified: boolean;     // true = live capture, false = gallery
  note: string;
  timestamp: string;     // ISO datetime of capture
}

const HISTORY_KEY = 'nutrilens_weight_history';

function getAll(): WeightEntry[] {
  const data = localStorage.getItem(HISTORY_KEY);
  return data ? JSON.parse(data) : [];
}

function saveAll(entries: WeightEntry[]) {
  localStorage.setItem(HISTORY_KEY, JSON.stringify(entries));
}

/** Get Monday of the week for a given date */
export function getWeekStart(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  const day = d.getDay(); // 0=Sun, 1=Mon...
  const diff = day === 0 ? 6 : day - 1; // days since Monday
  d.setDate(d.getDate() - diff);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function addWeightEntry(entry: WeightEntry) {
  const all = getAll();
  all.push(entry);
  saveAll(all);
}

export function getWeightEntries(): WeightEntry[] {
  return getAll().sort((a, b) => a.date.localeCompare(b.date));
}

export function deleteWeightEntry(id: string) {
  saveAll(getAll().filter(e => e.id !== id));
}

/** Get weekly entries (one per week, latest in each week) for last N weeks */
export function getWeeklyWeightEntries(weeks: number = 12): Array<{
  weekStart: string;
  entry: WeightEntry | null;
}> {
  const all = getAll();
  const result: Array<{ weekStart: string; entry: WeightEntry | null }> = [];
  const today = new Date();

  for (let i = 0; i < weeks; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i * 7);
    const ws = getWeekStart(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`);

    // Find entries for this week
    const weekEntries = all.filter(e => e.weekStart === ws);
    // Pick the latest verified one, or latest overall
    const verified = weekEntries.filter(e => e.verified).sort((a, b) => b.date.localeCompare(a.date));
    const best = verified[0] || weekEntries.sort((a, b) => b.date.localeCompare(a.date))[0] || null;

    result.push({ weekStart: ws, entry: best });
  }

  return result.reverse(); // oldest first
}

/** Calculate streak of consecutive weeks with verified entries */
export function getWeightStreak(): number {
  const all = getAll().filter(e => e.verified);
  if (all.length === 0) return 0;

  // Get unique weeks with verified entries
  const verifiedWeeks = new Set(all.map(e => e.weekStart));

  // Walk backward from current week
  const today = new Date();
  let streak = 0;

  for (let i = 0; i < 52; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i * 7);
    const ws = getWeekStart(toLocalDateStr(d));

    if (verifiedWeeks.has(ws)) {
      streak++;
    } else if (i === 0) {
      // Current week not logged yet — don't break, just skip
      continue;
    } else {
      break;
    }
  }

  return streak;
}

/** Get weight entries suitable for chart (last N days) */
export function getWeightChartData(days: number = 30): Array<{
  date: string;
  weight: number;
  unit: string;
  verified: boolean;
  hasPhoto: boolean;
}> {
  const all = getAll();
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  const cutoffStr = cutoff.toISOString().split('T')[0];

  return all
    .filter(e => e.date >= cutoffStr)
    .sort((a, b) => a.date.localeCompare(b.date))
    .map(e => ({
      date: e.date,
      weight: e.weight,
      unit: e.unit,
      verified: e.verified,
      hasPhoto: !!e.photo,
    }));
}
