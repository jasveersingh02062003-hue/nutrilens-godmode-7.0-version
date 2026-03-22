// AI Correction tracking for learning from user adjustments

export interface CorrectionRecord {
  id: string;
  original: { name: string; quantity: number; unit: string; confidence?: number };
  corrected: { name: string; quantity: number; unit: string };
  timestamp: string;
}

const CORRECTIONS_KEY = 'nutrilens_corrections';
const CONSENT_KEY = 'nutrilens_ai_learning_consent';

export function getAILearningConsent(): boolean {
  return localStorage.getItem(CONSENT_KEY) === 'true';
}

export function setAILearningConsent(consent: boolean) {
  localStorage.setItem(CONSENT_KEY, consent ? 'true' : 'false');
}

export function hasAskedConsent(): boolean {
  return localStorage.getItem(CONSENT_KEY) !== null;
}

export function getCorrections(): CorrectionRecord[] {
  const data = localStorage.getItem(CORRECTIONS_KEY);
  return data ? JSON.parse(data) : [];
}

export function addCorrection(record: CorrectionRecord) {
  const corrections = getCorrections();
  corrections.push(record);
  // Keep only last 200 corrections
  if (corrections.length > 200) corrections.splice(0, corrections.length - 200);
  localStorage.setItem(CORRECTIONS_KEY, JSON.stringify(corrections));
}

export function clearCorrections() {
  localStorage.removeItem(CORRECTIONS_KEY);
}

export function trackCorrections(
  originalItems: Array<{ id: string; name: string; quantity: number; unit: string; confidence?: number }>,
  adjustedItems: Array<{ id: string; name: string; quantity: number; unit: string }>
) {
  for (const adjusted of adjustedItems) {
    const original = originalItems.find(o => o.id === adjusted.id);
    if (!original) continue;
    
    const changed = original.name !== adjusted.name || 
                    original.quantity !== adjusted.quantity || 
                    original.unit !== adjusted.unit;
    
    if (changed) {
      addCorrection({
        id: Date.now().toString() + Math.random().toString(36).slice(2, 5),
        original: { name: original.name, quantity: original.quantity, unit: original.unit, confidence: original.confidence },
        corrected: { name: adjusted.name, quantity: adjusted.quantity, unit: adjusted.unit },
        timestamp: new Date().toISOString(),
      });
    }
  }
}
