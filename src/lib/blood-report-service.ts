// ============================================
// NutriLens AI – Blood Report Service
// ============================================
// CRUD for blood reports + integration with health scoring.

import { scopedGetJSON, scopedSetJSON } from '@/lib/scoped-storage';

const BLOOD_REPORT_KEY = 'nutrilens_blood_reports';

export interface BloodReport {
  id: string;
  date: string;             // YYYY-MM-DD
  hba1c?: number;           // % (normal < 5.7, prediabetes 5.7-6.4, diabetes >= 6.5)
  vitaminD?: number;        // ng/mL (deficient < 20, insufficient 20-30, sufficient > 30)
  vitaminB12?: number;      // pg/mL (low < 200, normal 200-900)
  iron?: number;            // μg/dL (low < 60, normal 60-170)
  ferritin?: number;        // ng/mL (low < 12 women, < 30 men)
  tsh?: number;             // mIU/L (normal 0.4-4.0)
  fastingBloodSugar?: number; // mg/dL (normal < 100, prediabetes 100-125, diabetes >= 126)
  totalCholesterol?: number;  // mg/dL (desirable < 200)
  hemoglobin?: number;      // g/dL (low < 12 women, < 13.5 men)
  source: 'manual' | 'ocr';
}

export function getBloodReports(): BloodReport[] {
  return scopedGetJSON<BloodReport[]>(BLOOD_REPORT_KEY, []);
}

export function getLatestBloodReport(): BloodReport | null {
  const reports = getBloodReports();
  return reports.length > 0 ? reports[0] : null;
}

export function saveBloodReport(report: BloodReport) {
  const reports = getBloodReports().filter(r => r.id !== report.id);
  reports.unshift(report);
  scopedSetJSON(BLOOD_REPORT_KEY, reports.slice(0, 10));
}

export function deleteBloodReport(id: string) {
  const reports = getBloodReports().filter(r => r.id !== id);
  scopedSetJSON(BLOOD_REPORT_KEY, reports);
}

// ── Deficiency Detection ──

export interface Deficiency {
  marker: string;
  label: string;
  value: number;
  unit: string;
  status: 'low' | 'borderline' | 'normal' | 'high';
  emoji: string;
  suggestion: string;
}

export function analyzeDeficiencies(report: BloodReport, gender?: string): Deficiency[] {
  const deficiencies: Deficiency[] = [];

  if (report.hba1c != null) {
    const status = report.hba1c >= 6.5 ? 'high' : report.hba1c >= 5.7 ? 'borderline' : 'normal';
    if (status !== 'normal') {
      deficiencies.push({
        marker: 'hba1c', label: 'HbA1c', value: report.hba1c, unit: '%',
        status, emoji: '🩸',
        suggestion: status === 'high' ? 'Focus on low-GI foods and reduce sugar intake' : 'Monitor carbs and maintain an active lifestyle',
      });
    }
  }

  if (report.vitaminD != null) {
    const status = report.vitaminD < 20 ? 'low' : report.vitaminD < 30 ? 'borderline' : 'normal';
    if (status !== 'normal') {
      deficiencies.push({
        marker: 'vitaminD', label: 'Vitamin D', value: report.vitaminD, unit: 'ng/mL',
        status, emoji: '☀️',
        suggestion: 'Get 15 min of sunlight daily. Consider Vitamin D3 supplement (1000–2000 IU).',
      });
    }
  }

  if (report.vitaminB12 != null) {
    const status = report.vitaminB12 < 200 ? 'low' : report.vitaminB12 < 300 ? 'borderline' : 'normal';
    if (status !== 'normal') {
      deficiencies.push({
        marker: 'vitaminB12', label: 'Vitamin B12', value: report.vitaminB12, unit: 'pg/mL',
        status, emoji: '🔴',
        suggestion: 'Include eggs, dairy, or consider B12 supplement if vegetarian.',
      });
    }
  }

  if (report.iron != null) {
    const status = report.iron < 60 ? 'low' : 'normal';
    if (status === 'low') {
      deficiencies.push({
        marker: 'iron', label: 'Iron', value: report.iron, unit: 'μg/dL',
        status, emoji: '🩸',
        suggestion: 'Eat spinach, lentils, and dates. Pair with Vitamin C for better absorption.',
      });
    }
  }

  if (report.hemoglobin != null) {
    const threshold = gender === 'female' ? 12 : 13.5;
    const status = report.hemoglobin < threshold ? 'low' : 'normal';
    if (status === 'low') {
      deficiencies.push({
        marker: 'hemoglobin', label: 'Hemoglobin', value: report.hemoglobin, unit: 'g/dL',
        status, emoji: '💉',
        suggestion: 'Focus on iron-rich foods: pomegranate, beetroot, green leafy vegetables.',
      });
    }
  }

  if (report.tsh != null) {
    const status = report.tsh > 4.0 ? 'high' : report.tsh < 0.4 ? 'low' : 'normal';
    if (status !== 'normal') {
      deficiencies.push({
        marker: 'tsh', label: 'TSH', value: report.tsh, unit: 'mIU/L',
        status, emoji: '🦋',
        suggestion: status === 'high' ? 'Include iodine-rich foods; cook cruciferous veggies before eating.' : 'Consult your doctor about thyroid levels.',
      });
    }
  }

  if (report.fastingBloodSugar != null) {
    const status = report.fastingBloodSugar >= 126 ? 'high' : report.fastingBloodSugar >= 100 ? 'borderline' : 'normal';
    if (status !== 'normal') {
      deficiencies.push({
        marker: 'fastingBloodSugar', label: 'Fasting Blood Sugar', value: report.fastingBloodSugar, unit: 'mg/dL',
        status, emoji: '📊',
        suggestion: status === 'high' ? 'Strict low-GI diet recommended. Consult your doctor.' : 'Reduce refined carbs and sugary drinks.',
      });
    }
  }

  if (report.totalCholesterol != null) {
    const status = report.totalCholesterol >= 240 ? 'high' : report.totalCholesterol >= 200 ? 'borderline' : 'normal';
    if (status !== 'normal') {
      deficiencies.push({
        marker: 'totalCholesterol', label: 'Cholesterol', value: report.totalCholesterol, unit: 'mg/dL',
        status, emoji: '❤️',
        suggestion: 'Reduce fried foods; increase fiber, oats, and omega-3 intake.',
      });
    }
  }

  return deficiencies;
}

// ── Supplement suggestions based on deficiencies ──

export interface SupplementSuggestion {
  name: string;
  dosage: string;
  reason: string;
  emoji: string;
  forDeficiency: string;
  disclaimer: string;
}

export function getSupplementSuggestions(report: BloodReport | null, conditions: any): SupplementSuggestion[] {
  if (!report) return getConditionBasedSuggestions(conditions);
  
  const suggestions: SupplementSuggestion[] = [];
  const deficiencies = analyzeDeficiencies(report);

  for (const d of deficiencies) {
    if (d.marker === 'vitaminD' && (d.status === 'low' || d.status === 'borderline')) {
      suggestions.push({
        name: 'Vitamin D3', dosage: '1000–2000 IU/day', reason: `Your Vitamin D is ${d.status} (${d.value} ${d.unit})`,
        emoji: '☀️', forDeficiency: 'vitaminD', disclaimer: 'Consult your doctor before starting any supplement.',
      });
    }
    if (d.marker === 'vitaminB12' && (d.status === 'low' || d.status === 'borderline')) {
      suggestions.push({
        name: 'Vitamin B12', dosage: '1000 mcg/day', reason: `Your B12 is ${d.status} (${d.value} ${d.unit})`,
        emoji: '🔴', forDeficiency: 'vitaminB12', disclaimer: 'Consult your doctor before starting any supplement.',
      });
    }
    if (d.marker === 'iron' && d.status === 'low') {
      suggestions.push({
        name: 'Iron + Vitamin C', dosage: '65 mg iron with 200 mg Vitamin C', reason: `Your iron is low (${d.value} ${d.unit})`,
        emoji: '🩸', forDeficiency: 'iron', disclaimer: 'Take on an empty stomach. Consult your doctor.',
      });
    }
  }

  // Add condition-based supplements
  suggestions.push(...getConditionBasedSuggestions(conditions));

  // Deduplicate
  const seen = new Set<string>();
  return suggestions.filter(s => { if (seen.has(s.name)) return false; seen.add(s.name); return true; });
}

function getConditionBasedSuggestions(conditions: any): SupplementSuggestion[] {
  const suggestions: SupplementSuggestion[] = [];

  if (conditions?.pcos?.has) {
    suggestions.push({
      name: 'Inositol', dosage: '2000 mg Myo-Inositol + 50 mg D-Chiro', reason: 'May improve insulin sensitivity in PCOS',
      emoji: '💜', forDeficiency: 'pcos', disclaimer: 'Consult your gynecologist before starting.',
    });
    suggestions.push({
      name: 'Omega-3 Fish Oil', dosage: '1000 mg/day', reason: 'Anti-inflammatory support for PCOS',
      emoji: '🐟', forDeficiency: 'pcos', disclaimer: 'Consult your doctor before starting any supplement.',
    });
  }

  if (conditions?.diabetes?.has) {
    suggestions.push({
      name: 'Chromium', dosage: '200 mcg/day', reason: 'May support blood sugar regulation',
      emoji: '🩸', forDeficiency: 'diabetes', disclaimer: 'Consult your doctor, especially if on medication.',
    });
  }

  if (conditions?.hypertension?.has) {
    suggestions.push({
      name: 'Magnesium', dosage: '200–400 mg/day', reason: 'May help lower blood pressure',
      emoji: '🧲', forDeficiency: 'hypertension', disclaimer: 'Consult your doctor before starting any supplement.',
    });
  }

  return suggestions;
}
