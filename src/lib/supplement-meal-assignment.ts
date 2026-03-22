// Time-sensitive meal assignment for supplements

interface MealTimeWindow {
  type: 'breakfast' | 'lunch' | 'snack' | 'dinner';
  start: number; // hour
  end: number;   // hour (exclusive)
}

const DEFAULT_WINDOWS: MealTimeWindow[] = [
  { type: 'breakfast', start: 5, end: 11 },
  { type: 'lunch', start: 11, end: 16 },
  { type: 'snack', start: 16, end: 19 },
  { type: 'dinner', start: 19, end: 24 },
];

/**
 * Given a time string (HH:MM 24h format), return the best meal type.
 * Falls back to 'snack' for edge cases (e.g., midnight–5 AM).
 */
export function getMealTypeForTime(time: string): 'breakfast' | 'lunch' | 'snack' | 'dinner' {
  const match = time.match(/(\d+):(\d+)/);
  if (!match) return 'snack';
  const hour = parseInt(match[1]);

  for (const w of DEFAULT_WINDOWS) {
    if (hour >= w.start && hour < w.end) return w.type;
  }
  // Late night (0–4 AM) → snack
  return 'snack';
}

/**
 * Auto-detect meal type from the current device time.
 */
export function getCurrentMealType(): 'breakfast' | 'lunch' | 'snack' | 'dinner' {
  const now = new Date();
  const time = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  return getMealTypeForTime(time);
}
