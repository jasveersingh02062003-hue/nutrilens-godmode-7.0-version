import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { Calendar, AlertCircle } from 'lucide-react';
import { getDailyLog, getDailyTotals } from '@/lib/store';
import { syncDailyBalance } from '@/lib/calorie-correction';
import { toast } from 'sonner';

interface Props {
  open: boolean;
  onClose: () => void;
  missedDate: string;
}

export default function MorningRecoveryPrompt({ open, onClose, missedDate }: Props) {
  const navigate = useNavigate();

  const log = getDailyLog(missedDate);
  const totals = getDailyTotals(log);
  const formattedDate = new Date(missedDate + 'T12:00:00').toLocaleDateString('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
  });

  const handleForgotToLog = () => {
    onClose();
    navigate(`/log-food?date=${missedDate}&meal=breakfast`);
  };

  const handleSkippedMeals = () => {
    // Mark as acknowledged — deficit will be auto-adjusted by the correction engine
    localStorage.setItem(`nutrilens_missed_ack_${missedDate}`, 'skipped');
    syncDailyBalance();
    toast.info('Got it — today\'s target adjusted to recover the deficit 💪');
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm rounded-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Calendar className="w-4 h-4 text-primary" />
            What happened on {formattedDate}?
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground leading-relaxed">
            {totals.eaten > 0
              ? `We only see ${totals.eaten} kcal logged. Did you eat more but forget to log?`
              : 'No meals were logged. Did you eat but forget to log, or did you skip meals?'}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-2 pt-2">
          <Button onClick={handleForgotToLog} className="w-full justify-start gap-2">
            <AlertCircle className="w-4 h-4" />
            I ate but forgot to log
          </Button>
          <p className="text-[10px] text-muted-foreground px-1">→ Opens yesterday's log so you can add meals</p>

          <Button variant="outline" onClick={handleSkippedMeals} className="w-full justify-start gap-2 mt-1">
            🍽️ I didn't eat much / skipped
          </Button>
          <p className="text-[10px] text-muted-foreground px-1">→ Today's target will be adjusted to make up for it</p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
