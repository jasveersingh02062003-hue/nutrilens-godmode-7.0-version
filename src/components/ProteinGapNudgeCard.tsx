import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Zap } from 'lucide-react';
import { shouldSuggestSupplement, type ProteinGapSuggestion } from '@/lib/supplement-service';
import { addSupplement, getProfile, getDailyLog, getTodayKey, type SupplementEntry } from '@/lib/store';
import { SUPPLEMENTS_DB } from '@/lib/supplements';

interface Props {
  onApplied?: () => void;
}

export default function ProteinGapNudgeCard({ onApplied }: Props) {
  const [dismissed, setDismissed] = useState(false);
  const profile = getProfile();
  if (!profile || dismissed) return null;

  const suggestion = shouldSuggestSupplement(profile);
  if (!suggestion) return null;

  const handleQuickLog = () => {
    const dbEntry = SUPPLEMENTS_DB.find(s =>
      s.name.toLowerCase().includes(suggestion.supplementName.toLowerCase().split(' ')[0])
    );

    const entry: SupplementEntry = {
      id: `supp_${Date.now()}`,
      name: suggestion.supplementName,
      brand: '',
      dosage: dbEntry?.defaultDosage || 1,
      unit: dbEntry?.defaultUnit || 'scoop',
      time: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
      calories: dbEntry?.caloriesPerUnit || 120,
      protein: suggestion.proteinPerServing,
      carbs: dbEntry?.carbsPerUnit || 3,
      fat: dbEntry?.fatPerUnit || 1,
      icon: dbEntry?.icon || '💪',
      category: dbEntry?.category || 'Protein',
    };

    addSupplement(entry);
    setDismissed(true);
    onApplied?.();
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        className="card-elevated p-4 border-l-4 border-l-primary"
      >
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <Zap className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground">
              {suggestion.gap}g protein gap
            </p>
            <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
              {suggestion.message}
            </p>
            {suggestion.costPerGramProtein > 0 && (
              <p className="text-[10px] text-muted-foreground mt-1">
                ₹{suggestion.costPerGramProtein}/g protein vs ₹{suggestion.chickenCostPerGram}/g from chicken
              </p>
            )}
            <button
              onClick={handleQuickLog}
              className="mt-2 px-4 py-1.5 rounded-full bg-primary text-primary-foreground text-xs font-semibold active:scale-95 transition-transform"
            >
              Log {suggestion.supplementName} →
            </button>
          </div>
          <button onClick={() => setDismissed(true)} className="shrink-0">
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
