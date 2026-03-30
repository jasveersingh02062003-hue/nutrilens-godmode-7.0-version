// ============================================
// NutriLens AI – Daily Adjustment Summary Card
// ============================================

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, BookmarkPlus } from 'lucide-react';
import {
  getYesterdayAdjustments,
  wasSummaryShown,
  markSummaryShown,
  getRedistributionPrefs,
  saveRedistributionPrefs,
} from '@/lib/redistribution-service';
import { toast } from 'sonner';
import { isPremium } from '@/lib/subscription-service';
import { toLocalDateStr } from '@/lib/date-utils';

export default function DailyAdjustmentSummary() {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yKey = toLocalDateStr(yesterday);

  const [dismissed, setDismissed] = useState(wasSummaryShown(yKey));
  const adjustments = getYesterdayAdjustments();

  if (dismissed || adjustments.length === 0 || !isPremium()) return null;

  const handleDismiss = () => {
    markSummaryShown(yKey);
    setDismissed(true);
  };

  const handleSavePreference = () => {
    const prefs = getRedistributionPrefs();
    prefs.autoDistribute = true;
    saveRedistributionPrefs(prefs);
    toast.success('Auto-redistribution preference saved!');
    handleDismiss();
  };

  return (
    <AnimatePresence>
      {!dismissed && (
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          className="bg-primary/5 border border-primary/20 rounded-2xl p-4 relative"
        >
          <button
            onClick={handleDismiss}
            className="absolute top-3 right-3 w-6 h-6 rounded-full bg-muted flex items-center justify-center"
          >
            <X className="w-3 h-3 text-muted-foreground" />
          </button>

          <div className="flex items-start gap-2 mb-3">
            <span className="text-lg">📊</span>
            <div>
              <p className="text-xs font-bold text-foreground">Yesterday's Adjustments</p>
              <p className="text-[10px] text-muted-foreground">Here's how we handled your missed meals</p>
            </div>
          </div>

          <div className="space-y-2 mb-3">
            {adjustments.map((adj, i) => (
              <div key={i} className="bg-card border border-border rounded-xl p-2.5">
                <p className="text-[11px] font-semibold text-foreground mb-1">
                  Missed {adj.missedLabel}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {adj.allocations.filter(a => a.addedCalories > 0).map((a, j) => (
                    <span key={j} className="text-[10px] px-2 py-0.5 rounded-lg bg-primary/10 text-primary font-medium">
                      +{a.addedCalories} kcal → {a.label}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <p className="text-[10px] text-muted-foreground mb-2">
            Great job staying on track! 💪
          </p>

          <div className="flex gap-2">
            <button
              onClick={handleSavePreference}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-primary/10 text-primary text-[11px] font-semibold active:scale-[0.98] transition-transform"
            >
              <BookmarkPlus className="w-3 h-3" /> Save as preference
            </button>
            <button
              onClick={handleDismiss}
              className="px-3 py-2 rounded-xl bg-muted text-muted-foreground text-[11px] font-semibold"
            >
              Got it
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
