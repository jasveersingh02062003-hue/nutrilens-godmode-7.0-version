import { motion } from 'framer-motion';
import { Zap, X } from 'lucide-react';
import { getActivePlan, getPlanProgress, getPlanById, clearActivePlan } from '@/lib/event-plan-service';
import { useState } from 'react';

export default function ActivePlanBanner() {
  const [dismissed, setDismissed] = useState(false);
  const plan = getActivePlan();
  const progress = getPlanProgress();

  if (!plan || !progress || dismissed) return null;

  const meta = getPlanById(plan.planId);

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-primary/20 bg-primary/5 p-3 flex items-center gap-3"
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
      </div>
    </motion.div>
  );
}
