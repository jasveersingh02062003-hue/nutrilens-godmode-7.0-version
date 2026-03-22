// ============================================
// NutriLens AI – End-of-Day Recovery Card (v2)
// Single primary action + secondary behind "More options"
// ============================================

import { useState, useMemo } from 'react';
import { X, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  getDailyOverage,
  getRecoveryOptions,
  isRecoveryDismissed,
  dismissRecovery,
  applyOverageCarryForward,
  isFreshStart,
  dismissFreshStart,
} from '@/lib/smart-adjustment';
import { getTodayKey } from '@/lib/store';
import { toast } from 'sonner';
import { isPremium } from '@/lib/subscription-service';

export default function RecoveryOptionsCard() {
  const todayKey = getTodayKey();
  const [dismissed, setDismissed] = useState(() => isRecoveryDismissed(todayKey));
  const [freshStartDismissed, setFreshStartDismissed] = useState(false);
  const [showMore, setShowMore] = useState(false);
  const overage = useMemo(() => getDailyOverage(todayKey), [todayKey]);
  const recoveryData = useMemo(() => getRecoveryOptions(overage), [overage]);
  const freshStart = useMemo(() => isFreshStart(todayKey), [todayKey]);

  // Only show for premium users
  if (!isPremium()) return null;

  // Fresh start message (carry-forward expired)
  if (freshStart && !freshStartDismissed) {
    return (
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative rounded-2xl border border-primary/15 bg-primary/5 px-4 py-3"
      >
        <button
          onClick={() => { dismissFreshStart(todayKey); setFreshStartDismissed(true); }}
          className="absolute top-2 right-2 w-5 h-5 rounded-full bg-background/60 flex items-center justify-center"
        >
          <X className="w-3 h-3 text-muted-foreground" />
        </button>
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <span className="text-sm">🌟</span>
          </div>
          <div>
            <p className="text-xs font-semibold text-foreground">Fresh start!</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Yesterday's adjustments are reset. Let's focus on today. 👍
            </p>
          </div>
        </div>
      </motion.div>
    );
  }

  if (dismissed || !recoveryData) return null;

  const { primary, secondary } = recoveryData;

  const handleDismiss = () => {
    dismissRecovery(todayKey);
    setDismissed(true);
  };

  const handleOption = (id: string) => {
    if (id === 'carry_forward') {
      applyOverageCarryForward(overage);
      toast.success(`Tomorrow's meals reduced by ${Math.min(overage, 150)} kcal (max 2 days)`);
    } else if (id === 'walk') {
      toast.success('Great choice! Log your walk in the activity tracker.');
    } else if (id === 'light_meal') {
      toast.success('Good plan! Go for soup, salad, or fruit.');
    }
    handleDismiss();
  };

  return (
    <AnimatePresence>
      {!dismissed && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="relative rounded-2xl border border-amber-500/20 bg-amber-500/5 px-4 py-3"
        >
          <button
            onClick={handleDismiss}
            className="absolute top-2 right-2 w-5 h-5 rounded-full bg-background/60 flex items-center justify-center"
          >
            <X className="w-3 h-3 text-muted-foreground" />
          </button>

          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0 mt-0.5">
              <span className="text-sm">👍</span>
            </div>
            <div className="flex-1 pr-4">
              <p className="text-xs font-semibold text-foreground">
                Over by {overage} kcal today. That's okay!
              </p>

              {/* Primary action */}
              <button
                onClick={() => handleOption(primary.id)}
                className="mt-2 flex items-center gap-1.5 px-3 py-2 rounded-lg bg-primary/10 text-primary text-[11px] font-semibold border border-primary/20 hover:bg-primary/15 active:scale-[0.97] transition-all w-full"
              >
                <span>{primary.emoji}</span>
                <span>{primary.label}</span>
              </button>

              {/* Secondary options — hidden behind "More" */}
              {secondary.length > 0 && (
                <>
                  <button
                    onClick={() => setShowMore(!showMore)}
                    className="flex items-center gap-1 mt-1.5 text-[10px] font-medium text-muted-foreground"
                  >
                    More options <ChevronDown className={`w-3 h-3 transition-transform ${showMore ? 'rotate-180' : ''}`} />
                  </button>
                  <AnimatePresence>
                    {showMore && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="flex flex-wrap gap-1.5 mt-1.5">
                          {secondary.map(opt => (
                            <button
                              key={opt.id}
                              onClick={() => handleOption(opt.id)}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-card border border-border text-[10px] font-semibold text-foreground hover:bg-primary/5 hover:border-primary/20 active:scale-[0.97] transition-all"
                            >
                              <span>{opt.emoji}</span>
                              <span>{opt.label}</span>
                            </button>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}