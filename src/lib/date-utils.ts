// ============================================
// NutriLens AI – Shared Date Utilities
// Single source of truth for local date keys.
// All date-to-string conversions MUST use these.
// ============================================

/** Convert a Date to local YYYY-MM-DD string. Defaults to now. */
export function toLocalDateStr(d: Date = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Get yesterday's date as local YYYY-MM-DD */
export function getYesterdayStr(fromDate?: Date): string {
  const d = new Date(fromDate || new Date());
  d.setDate(d.getDate() - 1);
  return toLocalDateStr(d);
}

/** Get a future date string by adding days to a reference date string */
export function addDaysToDateStr(dateStr: string, days: number): string {
  const d = new Date(dateStr + 'T12:00:00');
  d.setDate(d.getDate() + days);
  return toLocalDateStr(d);
}

/** Safe date arithmetic: always use T12:00:00 to avoid DST issues */
export function parseDateStr(dateStr: string): Date {
  return new Date(dateStr + 'T12:00:00');
}

/** Days between two YYYY-MM-DD strings */
export function daysBetweenDates(a: string, b: string): number {
  const da = parseDateStr(a);
  const db = parseDateStr(b);
  return Math.round((db.getTime() - da.getTime()) / (1000 * 60 * 60 * 24));
}
