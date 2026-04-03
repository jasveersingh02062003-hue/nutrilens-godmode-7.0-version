// ============================================
// NutriLens AI – Safe JSON Parse Utility
// ============================================
// Wraps JSON.parse with error handling to prevent
// crashes from corrupted localStorage data.

/**
 * Safely parse a JSON string, returning a fallback on failure.
 * Use instead of raw JSON.parse(localStorage.getItem(...)).
 */
export function safeJsonParse<T>(raw: string | null, fallback: T): T {
  if (raw === null || raw === undefined) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch (e) {
    console.warn('[safeJsonParse] Corrupted JSON, using fallback:', e);
    return fallback;
  }
}
