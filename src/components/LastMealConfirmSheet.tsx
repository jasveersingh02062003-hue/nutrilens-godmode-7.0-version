import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Moon, ArrowRight } from 'lucide-react';
import { useState } from 'react';
import { getDailyLog, getDailyTotals, getProfile } from '@/lib/store';
import { getDinnerNotificationSummary, syncDailyBalance } from '@/lib/calorie-correction';

interface Props {
  open: boolean;
  onClose: () => void;
  todayKey: string;
}

export default function LastMealConfirmSheet({ open, onClose, todayKey }: Props) {
  const [confirmed, setConfirmed] = useState(false);

  const profile = getProfile();
  const log = getDailyLog(todayKey);
  const totals = getDailyTotals(log);
  const baseTarget = profile?.dailyCalories || 1600;
  const diff = totals.eaten - baseTarget;
  const summary = getDinnerNotificationSummary(todayKey, totals.eaten, baseTarget);

  const handleConfirmLastMeal = () => {
    // Mark day as finalized
    localStorage.setItem(`nutrilens_day_finalized_${todayKey}`, '1');
    syncDailyBalance();
    setConfirmed(true);
  };

  const handleDismiss = () => {
    setConfirmed(false);
    onClose();
  };

  return (
    <Sheet open={open} onOpenChange={(o) => !o && handleDismiss()}>
      <SheetContent side="bottom" className="rounded-t-3xl px-5 pb-8">
        <SheetHeader className="text-left">
          <SheetTitle className="flex items-center gap-2 text-base">
            <Moon className="w-4 h-4 text-primary" />
            {confirmed ? 'Day wrapped up! ✅' : 'Is this your last meal today?'}
          </SheetTitle>
          <SheetDescription className="text-sm text-muted-foreground">
            {confirmed
              ? 'Your plan for tomorrow has been adjusted.'
              : 'Confirming helps us calculate tomorrow\'s target accurately.'}
          </SheetDescription>
        </SheetHeader>

        {!confirmed ? (
          <div className="space-y-4 pt-4">
            {/* Today's summary */}
            <div className="rounded-2xl bg-muted/50 p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Eaten today</span>
                <span className="font-bold text-foreground">{totals.eaten} kcal</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Target</span>
                <span className="font-medium text-foreground">{baseTarget} kcal</span>
              </div>
              <div className="border-t border-border pt-2 flex justify-between text-sm">
                <span className="text-muted-foreground">Balance</span>
                <span className={`font-bold ${diff > 0 ? 'text-destructive' : diff < -50 ? 'text-accent' : 'text-primary'}`}>
                  {diff > 0 ? '+' : ''}{Math.round(diff)} kcal
                </span>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <Button onClick={handleConfirmLastMeal} className="w-full">
                Yes, wrap up today
              </Button>
              <Button variant="ghost" onClick={handleDismiss} className="w-full text-muted-foreground">
                No, I might eat more
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4 pt-4">
            {/* Tomorrow's preview */}
            {summary && (
              <div className="rounded-2xl bg-primary/5 border border-primary/20 p-4 space-y-2">
                <p className="text-xs font-medium text-foreground whitespace-pre-line">{summary.message}</p>
                <div className="flex items-center gap-2 pt-1">
                  <ArrowRight className="w-3.5 h-3.5 text-primary" />
                  <span className="text-sm font-bold text-primary">Tomorrow: ~{summary.tomorrowTarget} kcal</span>
                </div>
              </div>
            )}
            {!summary && (
              <div className="rounded-2xl bg-primary/5 border border-primary/20 p-4">
                <p className="text-xs font-medium text-foreground">Great balance today! Tomorrow's target stays the same.</p>
              </div>
            )}
            <Button onClick={handleDismiss} className="w-full">
              Got it 👍
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
