// ============================================
// NutriLens AI – Full Data Export Service
// Exports all user data as downloadable JSON.
// ============================================

import { getProfile, getDailyLog, toLocalDateKey } from './store';
import { getWeightEntries } from './weight-history';
import { getProgressPhotos } from './photo-store';

interface ExportData {
  version: string;
  exportDate: string;
  profile: any;
  weightHistory: any[];
  dailyLogs: Record<string, any>;
  progressPhotos: any[];
}

/** Gather all user data for export */
export function gatherExportData(daysBack: number = 365): ExportData {
  const profile = getProfile();
  const weightHistory = getWeightEntries();
  const photos = getProgressPhotos();

  // Collect daily logs
  const dailyLogs: Record<string, any> = {};
  const today = new Date();
  for (let i = 0; i < daysBack; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = toLocalDateKey(d);
    const log = getDailyLog(key);
    if (log.meals.length > 0 || log.waterCups > 0 || log.weight) {
      dailyLogs[key] = log;
    }
  }

  return {
    version: '1.0',
    exportDate: toLocalDateKey(),
    profile: profile ? { ...profile } : null,
    weightHistory: weightHistory.map(w => ({ ...w, photo: w.photo ? '[photo]' : null })),
    dailyLogs,
    progressPhotos: photos.map(p => ({
      id: p.id,
      date: p.date,
      caption: p.caption,
      // Don't include full base64 — just metadata
    })),
  };
}

/** Download export data as JSON file */
export function downloadExportJson(data?: ExportData): void {
  const exportData = data || gatherExportData();
  const json = JSON.stringify(exportData, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `nutrilens-backup-${toLocalDateKey()}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

/** Download export data as CSV (meals only) */
export function downloadMealsCSV(daysBack: number = 90): void {
  const today = new Date();
  const rows: string[] = ['Date,Meal Type,Food Name,Calories,Protein(g),Carbs(g),Fat(g),Quantity,Unit'];

  for (let i = 0; i < daysBack; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = toLocalDateKey(d);
    const log = getDailyLog(key);
    for (const meal of log.meals) {
      for (const item of meal.items) {
        rows.push([
          key,
          meal.type,
          `"${(item.name || '').replace(/"/g, '""')}"`,
          Math.round((item.calories || 0) * (item.quantity || 1)),
          Math.round((item.protein || 0) * (item.quantity || 1)),
          Math.round((item.carbs || 0) * (item.quantity || 1)),
          Math.round((item.fat || 0) * (item.quantity || 1)),
          item.quantity || 1,
          item.unit || 'serving',
        ].join(','));
      }
    }
  }

  const csv = rows.join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `nutrilens-meals-${toLocalDateKey()}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
