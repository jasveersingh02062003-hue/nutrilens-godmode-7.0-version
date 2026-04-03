import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Pause, Play, X, Download, FileText, ShoppingCart, Clock, Target, Flame, Archive } from 'lucide-react';
import { getActivePlanRaw, getPlanProgress, getPlanById, pauseActivePlan, resumeActivePlan, cancelActivePlan, getPlanHistory, type ActivePlan } from '@/lib/event-plan-service';
import { exportPlanPDF, exportGroceryList } from '@/lib/plan-pdf-export';
import { getProfile } from '@/lib/store';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface Props {
  onBrowse?: () => void;
}

export default function CurrentPlansTab({ onBrowse }: Props) {
  const [plan, setPlan] = useState<ActivePlan | null>(getActivePlanRaw());
  const [cancelOpen, setCancelOpen] = useState(false);
  const [history] = useState(() => getPlanHistory());
  const profile = getProfile();

  const refresh = () => setPlan(getActivePlanRaw());

  const handlePause = () => {
    pauseActivePlan();
    refresh();
    toast.success('Plan paused — your normal targets are restored');
  };

  const handleResume = () => {
    resumeActivePlan();
    refresh();
    toast.success('Plan resumed — plan targets are active again');
  };

  const handleCancel = () => {
    cancelActivePlan();
    setCancelOpen(false);
    refresh();
    toast.success('Plan cancelled and archived');
  };

  if (!plan) {
    return (
      <div className="flex flex-col items-center justify-center py-16 space-y-4">
        <span className="text-5xl">🎯</span>
        <p className="text-sm font-semibold text-foreground">No active plan</p>
        <p className="text-xs text-muted-foreground text-center max-w-[250px]">
          Browse transformation plans to start your journey
        </p>
        {onBrowse && (
          <Button onClick={onBrowse} size="sm" className="mt-2">
            Browse Plans
          </Button>
        )}
      </div>
    );
  }

  const meta = getPlanById(plan.planId);
  const progress = getPlanProgress(plan);
  const status = plan.status || 'active';
  const isActive = status === 'active';

  const endDate = new Date(plan.startDate);
  endDate.setDate(endDate.getDate() + plan.duration);

  const weightDiff = profile ? Math.abs((profile.weightKg || 0) - plan.targetWeight) : 0;

  return (
    <div className="space-y-4">
      {/* Status + Plan Name */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl border border-border bg-card p-5 space-y-4"
      >
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-2xl">
              {meta?.emoji || '🎯'}
            </div>
            <div>
              <h3 className="text-sm font-bold text-foreground">{meta?.name || 'Active Plan'}</h3>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                {new Date(plan.startDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} → {endDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
              </p>
            </div>
          </div>
          <Badge variant={isActive ? 'default' : 'secondary'} className={`text-[10px] ${isActive ? 'bg-primary' : 'bg-accent text-accent-foreground'}`}>
            {isActive ? '● Active' : '⏸ Paused'}
          </Badge>
        </div>

        {/* Progress */}
        {progress && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-[10px]">
              <span className="text-muted-foreground">Day {progress.dayNumber} of {progress.totalDays}</span>
              <span className="font-bold text-primary">{progress.percentComplete}%</span>
            </div>
            <Progress value={progress.percentComplete} className="h-2" />
            <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
              <Clock className="w-3 h-3" />
              <span>{progress.daysLeft} days remaining</span>
            </div>
          </div>
        )}

        {/* Targets Grid */}
        <div className="grid grid-cols-4 gap-2">
          {[
            { label: 'Calories', value: `${plan.dailyCalories}`, unit: 'kcal' },
            { label: 'Protein', value: `${plan.dailyProtein}g`, unit: '' },
            { label: 'Carbs', value: `${plan.dailyCarbs}g`, unit: '' },
            { label: 'Fat', value: `${plan.dailyFat}g`, unit: '' },
          ].map(t => (
            <div key={t.label} className="rounded-xl bg-muted/50 p-2.5 text-center">
              <p className="text-xs font-bold text-foreground">{t.value}</p>
              <p className="text-[9px] text-muted-foreground">{t.label}</p>
            </div>
          ))}
        </div>

        {/* Weight Progress */}
        {profile && (
          <div className="flex items-center gap-3 rounded-xl bg-muted/30 p-3">
            <Target className="w-4 h-4 text-primary shrink-0" />
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-muted-foreground">Current: {profile.weightKg} kg</span>
                <span className="text-[10px] text-muted-foreground">Target: {plan.targetWeight} kg</span>
              </div>
              <p className="text-xs font-semibold text-foreground mt-0.5">{weightDiff.toFixed(1)} kg to go</p>
            </div>
          </div>
        )}

        {/* Paused info */}
        {!isActive && plan.pausedAt && (
          <div className="flex items-center gap-2 rounded-xl bg-accent/10 border border-accent/20 p-3">
            <Pause className="w-4 h-4 text-accent-foreground" />
            <p className="text-[10px] text-muted-foreground">
              Paused on {new Date(plan.pausedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-2">
          {isActive ? (
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={handlePause}
              className="flex items-center justify-center gap-2 rounded-xl bg-accent/10 border border-accent/20 py-2.5 text-xs font-semibold text-accent-foreground"
            >
              <Pause className="w-3.5 h-3.5" /> Pause Plan
            </motion.button>
          ) : (
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={handleResume}
              className="flex items-center justify-center gap-2 rounded-xl bg-primary/10 border border-primary/20 py-2.5 text-xs font-semibold text-primary"
            >
              <Play className="w-3.5 h-3.5" /> Resume Plan
            </motion.button>
          )}
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={() => setCancelOpen(true)}
            className="flex items-center justify-center gap-2 rounded-xl bg-destructive/10 border border-destructive/20 py-2.5 text-xs font-semibold text-destructive"
          >
            <X className="w-3.5 h-3.5" /> Cancel Plan
          </motion.button>
        </div>

        {/* Download Buttons */}
        <div className="grid grid-cols-2 gap-2">
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={() => { exportPlanPDF(); toast.success('PDF opened for printing'); }}
            className="flex items-center justify-center gap-2 rounded-xl bg-muted py-2.5 text-xs font-medium text-foreground"
          >
            <FileText className="w-3.5 h-3.5" /> Download PDF
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={() => { exportGroceryList(); toast.success('Grocery list opened'); }}
            className="flex items-center justify-center gap-2 rounded-xl bg-muted py-2.5 text-xs font-medium text-foreground"
          >
            <ShoppingCart className="w-3.5 h-3.5" /> Grocery List
          </motion.button>
        </div>
      </motion.div>

      {/* Plan History */}
      {history.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
            <Archive className="w-3.5 h-3.5" /> Past Plans
          </h4>
          {history.slice(-5).reverse().map((h, i) => {
            const hMeta = getPlanById(h.planId);
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: i * 0.05 }}
                className="rounded-xl border border-border bg-card/50 p-3 flex items-center gap-3"
              >
                <span className="text-lg">{hMeta?.emoji || '📋'}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-foreground truncate">{hMeta?.name || h.planId}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {h.duration} days · {new Date(h.startDate).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}
                  </p>
                </div>
                <Badge variant="outline" className="text-[9px]">
                  {h.cancelledAt ? 'Cancelled' : 'Completed'}
                </Badge>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Cancel Confirmation */}
      <Dialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Cancel Plan?</DialogTitle>
            <DialogDescription>
              This will stop the plan and revert to your normal calorie targets. The plan will be archived to your history.
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-2 mt-2">
            <Button variant="outline" onClick={() => setCancelOpen(false)} className="flex-1">Keep Plan</Button>
            <Button variant="destructive" onClick={handleCancel} className="flex-1">Cancel Plan</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
