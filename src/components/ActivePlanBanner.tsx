import { motion, AnimatePresence } from 'framer-motion';
import { Zap, X, ChevronDown, ChevronUp, Download } from 'lucide-react';
import { getActivePlan, getPlanProgress, getPlanById, clearActivePlan } from '@/lib/event-plan-service';
import { getAdjustedDailyTarget, getProteinTarget, getCarbTarget, getFatTarget } from '@/lib/calorie-correction';
import { getProfile } from '@/lib/store';
import { useState } from 'react';
import { toast } from 'sonner';

export default function ActivePlanBanner() {
  const [dismissed, setDismissed] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const plan = getActivePlan();
  const progress = getPlanProgress();

  if (!plan || !progress || dismissed) return null;

  const meta = getPlanById(plan.planId);
  const profile = getProfile();

  const handleCancel = () => {
    if (!confirm('Are you sure you want to cancel this plan? Your targets will return to normal.')) return;
    clearActivePlan();
    setDismissed(true);
    toast.success('Plan cancelled. Targets restored to normal.');
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-primary/20 bg-primary/5 overflow-hidden"
    >
      {/* Collapsed banner */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full p-3 flex items-center gap-3 text-left"
      >
        <div className="text-lg">{meta?.emoji || '🎯'}</div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-bold text-foreground truncate">{meta?.name}</p>
          <p className="text-[10px] text-muted-foreground">
            Day {progress.dayNumber}/{progress.totalDays} · {progress.daysLeft} days left
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-bold text-primary">{progress.percentComplete}%</span>
          <div className="w-10 h-1.5 bg-muted rounded-full overflow-hidden">
            <div className="h-full bg-primary rounded-full" style={{ width: `${progress.percentComplete}%` }} />
          </div>
          {expanded ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />}
        </div>
      </button>

      {/* Expanded details */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="px-3 pb-3 space-y-3 border-t border-primary/10 pt-3">
              {/* Daily targets */}
              <div className="grid grid-cols-4 gap-2">
                {[
                  { label: 'Calories', value: `${plan.dailyCalories}`, unit: 'kcal' },
                  { label: 'Protein', value: `${plan.dailyProtein}`, unit: 'g' },
                  { label: 'Carbs', value: `${plan.dailyCarbs}`, unit: 'g' },
                  { label: 'Fat', value: `${plan.dailyFat}`, unit: 'g' },
                ].map(t => (
                  <div key={t.label} className="text-center">
                    <p className="text-sm font-bold text-foreground">{t.value}</p>
                    <p className="text-[9px] text-muted-foreground">{t.unit}</p>
                    <p className="text-[8px] text-muted-foreground mt-0.5">{t.label}</p>
                  </div>
                ))}
              </div>

              {/* Rules */}
              {meta?.rules && (
                <div className="flex flex-wrap gap-1">
                  {meta.rules.map((rule, i) => (
                    <span key={i} className="px-2 py-0.5 rounded-full bg-primary/10 text-[9px] font-medium text-primary">
                      {rule}
                    </span>
                  ))}
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2">
                <button
                  onClick={handleCancel}
                  className="flex-1 py-2 rounded-xl border border-destructive/30 text-destructive text-[11px] font-semibold hover:bg-destructive/5 transition-colors"
                >
                  Cancel Plan
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
