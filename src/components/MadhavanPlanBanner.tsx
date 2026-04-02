import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronUp, Download, X, Clock, Droplets, UtensilsCrossed } from 'lucide-react';
import { getActivePlan, getPlanProgress, getPlanById, clearActivePlan, type MadhavanSettings } from '@/lib/event-plan-service';
import { getProfile } from '@/lib/store';
import { toast } from 'sonner';
import { exportPlanPDF } from '@/lib/plan-pdf-export';
import { hasTodayJournal } from '@/components/BodyAwarenessJournal';
import BodyAwarenessJournal from '@/components/BodyAwarenessJournal';

export default function MadhavanPlanBanner() {
  const [dismissed, setDismissed] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [journalOpen, setJournalOpen] = useState(false);
  const plan = getActivePlan();
  const progress = getPlanProgress();

  if (!plan || !progress || dismissed || plan.planId !== 'madhavan_21_day') return null;

  const meta = getPlanById(plan.planId);
  const profile = getProfile();
  const settings = plan.customSettings;

  // Eating window status
  const now = new Date();
  const hour = now.getHours();
  const minute = now.getMinutes();
  const currentTime = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
  const windowOpen = settings
    ? currentTime >= settings.eatingWindowStart && currentTime <= settings.eatingWindowEnd
    : hour >= 7 && hour < 19;

  // Hydration goal
  const weightKg = profile?.weightKg || 70;
  const waterMultiplier = settings?.waterMultiplier || 40;
  const hydrationGoalMl = Math.min(5000, Math.max(3000, Math.round(weightKg * waterMultiplier)));

  const journalDone = hasTodayJournal();

  const handleCancel = () => {
    if (!confirm('Cancel the Madhavan 21-Day plan? Your targets will return to normal.')) return;
    clearActivePlan();
    setDismissed(true);
    toast.success('Plan cancelled. Targets restored.');
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/5 to-accent/5 overflow-hidden"
      >
        <button onClick={() => setExpanded(!expanded)} className="w-full p-3 flex items-center gap-3 text-left">
          <div className="text-lg">{meta?.emoji || '🧘'}</div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-foreground truncate">Madhavan 21-Day Reset</p>
            <p className="text-[10px] text-muted-foreground">
              Day {progress.dayNumber}/{progress.totalDays} · {progress.daysLeft} left
            </p>
          </div>
          <div className="flex items-center gap-2">
            {/* Window status pill */}
            <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
              windowOpen ? 'bg-primary/10 text-primary' : 'bg-destructive/10 text-destructive'
            }`}>
              {windowOpen ? '🟢 Eat' : '🔴 Fast'}
            </span>
            <span className="text-xs font-bold text-primary">{progress.percentComplete}%</span>
            {expanded ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />}
          </div>
        </button>

        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="px-3 pb-3 space-y-3 border-t border-primary/10 pt-3">
                {/* Status row */}
                <div className="grid grid-cols-3 gap-2">
                  <div className="card-subtle p-2 text-center">
                    <Clock className="w-3.5 h-3.5 mx-auto text-muted-foreground mb-1" />
                    <p className="text-[10px] font-semibold text-foreground">
                      {settings?.eatingWindowStart || '07:00'} – {settings?.eatingWindowEnd || '19:00'}
                    </p>
                    <p className="text-[8px] text-muted-foreground">Eating window</p>
                  </div>
                  <div className="card-subtle p-2 text-center">
                    <Droplets className="w-3.5 h-3.5 mx-auto text-secondary mb-1" />
                    <p className="text-[10px] font-semibold text-foreground">{hydrationGoalMl}ml</p>
                    <p className="text-[8px] text-muted-foreground">Water goal</p>
                  </div>
                  <div className="card-subtle p-2 text-center">
                    <UtensilsCrossed className="w-3.5 h-3.5 mx-auto text-accent mb-1" />
                    <p className="text-[10px] font-semibold text-foreground">{settings?.chewCount || 50}×</p>
                    <p className="text-[8px] text-muted-foreground">Chew count</p>
                  </div>
                </div>

                {/* Targets */}
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { label: 'Calories', value: `${plan.dailyCalories}`, unit: 'kcal' },
                    { label: 'Protein', value: `${plan.dailyProtein}`, unit: 'g' },
                    { label: 'Carbs', value: `${plan.dailyCarbs}`, unit: 'g' },
                    { label: 'Fat', value: `${plan.dailyFat}`, unit: 'g' },
                  ].map(t => (
                    <div key={t.label} className="text-center">
                      <p className="text-sm font-bold text-foreground">{t.value}</p>
                      <p className="text-[8px] text-muted-foreground">{t.label}</p>
                    </div>
                  ))}
                </div>

                {/* Rules */}
                <div className="flex flex-wrap gap-1">
                  {meta?.rules?.map((rule, i) => (
                    <span key={i} className="px-2 py-0.5 rounded-full bg-primary/10 text-[9px] font-medium text-primary">
                      {rule}
                    </span>
                  ))}
                </div>

                {/* Journal prompt */}
                {hour >= 18 && !journalDone && (
                  <button
                    onClick={() => setJournalOpen(true)}
                    className="w-full py-2 rounded-xl bg-accent/10 border border-accent/20 text-accent text-[11px] font-semibold"
                  >
                    🧘 Complete today's Body Awareness Journal
                  </button>
                )}

                {/* Actions */}
                <div className="flex gap-2">
                  <button
                    onClick={() => { exportPlanPDF(); toast.success('Opening plan PDF...'); }}
                    className="flex-1 py-2 rounded-xl border border-primary/30 text-primary text-[11px] font-semibold hover:bg-primary/5 transition-colors flex items-center justify-center gap-1"
                  >
                    <Download className="w-3.5 h-3.5" /> Download PDF
                  </button>
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

      <BodyAwarenessJournal open={journalOpen} onClose={() => setJournalOpen(false)} />
    </>
  );
}
