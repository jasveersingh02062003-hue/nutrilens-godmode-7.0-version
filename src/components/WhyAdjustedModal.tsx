import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { getAdjustmentPlan, getDailyBalances, getCalorieBankSummary } from '@/lib/calorie-correction';
import { format } from 'date-fns';

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function WhyAdjustedModal({ open, onClose }: Props) {
  const plan = getAdjustmentPlan();
  const balances = getDailyBalances().slice(-7);
  const summary = getCalorieBankSummary();

  // Find the most recent surplus/deficit day that triggered the plan
  const triggerDay = balances.filter(b => Math.abs(b.diff) > 50).slice(-1)[0];

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-base">Why your target changed</DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            {summary.message}
          </DialogDescription>
        </DialogHeader>

        {triggerDay && (
          <div className="rounded-xl bg-muted/50 p-3 space-y-1">
            <p className="text-xs font-semibold text-foreground">
              {triggerDay.diff > 0 ? '📈' : '📉'} On {format(new Date(triggerDay.date + 'T00:00:00'), 'EEEE')}, you ate{' '}
              {triggerDay.diff > 0 ? `+${triggerDay.diff}` : `${triggerDay.diff}`} kcal {triggerDay.diff > 0 ? 'over' : 'under'} target.
            </p>
            {plan.length > 0 && (
              <p className="text-[11px] text-muted-foreground">
                We're spreading this across {plan.length} day{plan.length !== 1 ? 's' : ''} to keep things smooth.
              </p>
            )}
          </div>
        )}

        {plan.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Adjustment Plan</p>
            {plan.map((entry) => (
              <div key={entry.date} className="flex items-center justify-between rounded-lg bg-card border border-border px-3 py-2">
                <span className="text-xs text-foreground">
                  {format(new Date(entry.date + 'T00:00:00'), 'EEE, MMM d')}
                </span>
                <span className={`text-xs font-bold ${entry.adjust < 0 ? 'text-coral' : 'text-primary'}`}>
                  {entry.adjust > 0 ? '+' : ''}{entry.adjust} kcal
                </span>
              </div>
            ))}
          </div>
        )}

        <div className="flex items-center gap-2 rounded-xl bg-primary/5 border border-primary/10 px-3 py-2">
          <span className="text-sm">💪</span>
          <p className="text-[11px] text-foreground">Your protein target stays the same — always protected.</p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
