// ============================================
// Sugar Detection Service for Sugar Cut Plan
// ============================================

import { getActivePlan } from './event-plan-service';

// Comprehensive sugar keywords — covers Indian sweets, common sweeteners, packaged items
const SUGAR_KEYWORDS = [
  // Direct sweeteners
  'sugar', 'sucrose', 'glucose', 'fructose', 'dextrose', 'maltose',
  'high fructose corn syrup', 'corn syrup', 'agave', 'maple syrup',
  'honey', 'shahad', 'madhu',
  'jaggery', 'gur', 'gud', 'shakkar', 'misri', 'rock candy',
  'molasses', 'treacle',
  // Artificial / processed
  'candy', 'toffee', 'caramel', 'marshmallow', 'nougat',
  'chocolate', 'cocoa butter', 'white chocolate',
  'ice cream', 'kulfi', 'sundae', 'gelato',
  'cake', 'pastry', 'brownie', 'muffin', 'cupcake', 'donut', 'doughnut',
  'cookie', 'biscuit', 'wafer',
  'jam', 'marmalade', 'preserve', 'jelly',
  'condensed milk', 'sweetened',
  // Indian sweets (mithai)
  'mithai', 'sweet', 'meetha', 'meethi',
  'gulab jamun', 'rasgulla', 'rasmalai', 'sandesh', 'cham cham',
  'jalebi', 'imarti', 'ghevar',
  'ladoo', 'laddu', 'laddoo', 'besan ladoo', 'motichoor',
  'barfi', 'burfi', 'kaju katli', 'kaju barfi', 'peda',
  'halwa', 'halva', 'gajar halwa', 'sooji halwa', 'moong dal halwa',
  'kheer', 'payasam', 'phirni', 'seviyan', 'vermicelli pudding',
  'rabri', 'rabdi', 'malpua', 'shrikhand',
  'chikki', 'gajak', 'til patti',
  'petha', 'bal mithai', 'kalakand', 'mysore pak',
  'modak', 'puran poli', 'mawa cake',
  // Beverages
  'soda', 'cola', 'pepsi', 'coke', 'fanta', 'sprite', 'mirinda',
  'energy drink', 'red bull', 'monster',
  'sweetened tea', 'sweet lassi', 'thandai',
  'rooh afza', 'sharbat', 'squash',
  'milkshake', 'frappe', 'frappuccino',
  // Sauces & condiments
  'ketchup', 'barbecue sauce', 'sweet chili', 'honey mustard',
  'chutney', 'sweet chutney',
];

// High-sugar food patterns (sugar is the primary component)
const HIGH_SUGAR_PATTERNS = [
  'gulab jamun', 'jalebi', 'rasgulla', 'rasmalai', 'barfi', 'burfi',
  'ladoo', 'laddu', 'halwa', 'kheer', 'payasam', 'rabri',
  'mithai', 'sweet', 'candy', 'chocolate', 'cake', 'ice cream',
  'soda', 'cola', 'energy drink', 'jam', 'condensed milk',
];

export interface SugarDetectionResult {
  hasSugar: boolean;
  severity: 'high' | 'moderate' | 'low';
  keywords: string[];
  message: string;
}

/**
 * Detect if a food item contains sugar.
 * @param foodName - Name of the food
 * @param sugarGrams - Optional sugar content in grams (from nutrition data)
 */
export function detectSugar(foodName: string, sugarGrams?: number): SugarDetectionResult {
  const name = foodName.toLowerCase();
  const matchedKeywords: string[] = [];

  for (const kw of SUGAR_KEYWORDS) {
    if (name.includes(kw)) {
      matchedKeywords.push(kw);
    }
  }

  // Check sugar grams threshold
  const hasHighSugarGrams = sugarGrams !== undefined && sugarGrams > 5;
  const hasModSugarGrams = sugarGrams !== undefined && sugarGrams > 2;

  if (matchedKeywords.length === 0 && !hasHighSugarGrams && !hasModSugarGrams) {
    return { hasSugar: false, severity: 'low', keywords: [], message: '' };
  }

  // Determine severity
  const isHighPattern = HIGH_SUGAR_PATTERNS.some(p => name.includes(p));
  let severity: SugarDetectionResult['severity'] = 'low';

  if (isHighPattern || hasHighSugarGrams || matchedKeywords.length >= 2) {
    severity = 'high';
  } else if (matchedKeywords.length >= 1 || hasModSugarGrams) {
    severity = 'moderate';
  }

  const messages: Record<typeof severity, string> = {
    high: `🚫 Sugar Cut Active! "${foodName}" contains significant sugar. Logging this will break your streak.`,
    moderate: `⚠️ Sugar Cut: "${foodName}" may contain added sugar. Check ingredients carefully.`,
    low: `ℹ️ "${foodName}" might have trace sugar. Proceed with caution.`,
  };

  return {
    hasSugar: true,
    severity,
    keywords: matchedKeywords,
    message: messages[severity],
  };
}

/**
 * Check if sugar detection should be active (Sugar Cut or Celebrity plan is active).
 */
export function isSugarDetectionActive(): boolean {
  const plan = getActivePlan();
  if (!plan) return false;
  return plan.planId === 'sugar_cut' || plan.planId === 'celebrity_transformation';
}

/**
 * Get sugar warning messages formatted for AnimatedWarningBanner.
 */
export function getSugarWarnings(foodItems: Array<{ name: string; id?: string }>): {
  hasWarnings: boolean;
  severity: SugarDetectionResult['severity'];
  messages: Array<{ icon: string; text: string; itemName: string; itemId?: string }>;
} {
  if (!isSugarDetectionActive()) {
    return { hasWarnings: false, severity: 'low', messages: [] };
  }

  const warnings: Array<{ icon: string; text: string; itemName: string; itemId?: string }> = [];
  let maxSeverity: SugarDetectionResult['severity'] = 'low';

  for (const item of foodItems) {
    const result = detectSugar(item.name);
    if (result.hasSugar) {
      warnings.push({
        icon: result.severity === 'high' ? '🚫' : '⚠️',
        text: `${item.name}: ${result.keywords.slice(0, 2).join(', ')} detected`,
        itemName: item.name,
        itemId: item.id,
      });
      if (result.severity === 'high') maxSeverity = 'high';
      else if (result.severity === 'moderate' && maxSeverity !== 'high') maxSeverity = 'moderate';
    }
  }

  return { hasWarnings: warnings.length > 0, severity: maxSeverity, messages: warnings };
}
