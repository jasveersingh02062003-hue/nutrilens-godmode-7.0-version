import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Zap, AlertTriangle, TrendingDown } from 'lucide-react';
import { shouldSuggestSupplement, type ProteinGapSuggestion } from '@/lib/supplement-service';
import { addSupplement, getProfile, type SupplementEntry } from '@/lib/store';
import { SUPPLEMENTS_DB } from '@/lib/supplements';
import { toast } from 'sonner';

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
    toast.success(`${suggestion.supplementName} logged. Meals adjusted.`);
    onApplied?.();
  };

  const UrgencyIcon = suggestion.urgency === 'high' ? AlertTriangle 
    : suggestion.urgency === 'medium' ? TrendingDown 
    : Zap;

  const borderColor = suggestion.urgency === 'high' ? 'border-l-destructive'
    : suggestion.urgency === 'medium' ? 'border-l-orange-500'
    : 'border-l-primary';

  const iconBg = suggestion.urgency === 'high' ? 'bg-destructive/10'
    : suggestion.urgency === 'medium' ? 'bg-orange-500/10'
    : 'bg-primary/10';

  const iconColor = suggestion.urgency === 'high' ? 'text-destructive'
    : suggestion.urgency === 'medium' ? 'text-orange-500'
    : 'text-primary';

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        className={`card-elevated p-4 border-l-4 ${borderColor}`}
      >
        <div className="flex items-start gap-3">
          <div className={`w-10 h-10 rounded-xl ${iconBg} flex items-center justify-center shrink-0`}>
            <UrgencyIcon className={`w-5 h-5 ${iconColor}`} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground">
              {suggestion.urgency === 'high'
                ? `You're losing progress — ${suggestion.gap}g short`
                : `${suggestion.gap}g protein gap (${suggestion.gapPercent}% of target)`}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
              {suggestion.message}
            </p>
            {suggestion.savingsMessage && (
              <p className="text-[10px] text-emerald-600 dark:text-emerald-400 mt-1 font-medium">
                💰 {suggestion.savingsMessage}
              </p>
            )}
            {suggestion.costPerGramProtein > 0 && !suggestion.savingsMessage && (
              <p className="text-[10px] text-muted-foreground mt-1">
                ₹{suggestion.costPerGramProtein}/g protein vs ₹{suggestion.chickenCostPerGram}/g from chicken
              </p>
            )}
            <button
              onClick={handleQuickLog}
              className="mt-2 px-4 py-1.5 rounded-full bg-primary text-primary-foreground text-xs font-semibold active:scale-95 transition-transform"
            >
              Fix Protein Now ⚡
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
