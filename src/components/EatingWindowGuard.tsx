import { useState, useEffect } from 'react';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Clock } from 'lucide-react';

interface Props {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  windowStart: string; // "07:00"
  windowEnd: string;   // "19:00"
}

export default function EatingWindowGuard({ open, onClose, onConfirm, windowStart, windowEnd }: Props) {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    if (open) {
      setEnabled(false);
      const t = setTimeout(() => setEnabled(true), 3000);
      return () => clearTimeout(t);
    }
  }, [open]);

  return (
    <AlertDialog open={open} onOpenChange={v => !v && onClose()}>
      <AlertDialogContent className="rounded-2xl max-w-sm">
        <AlertDialogHeader>
          <div className="w-12 h-12 mx-auto mb-2 rounded-full bg-accent/10 flex items-center justify-center">
            <Clock className="w-6 h-6 text-accent" />
          </div>
          <AlertDialogTitle className="text-center">⏰ Outside Eating Window</AlertDialogTitle>
          <AlertDialogDescription className="text-center">
            Your Madhavan plan eating window is <span className="font-bold text-foreground">{windowStart} – {windowEnd}</span>.
            <br /><br />
            Eating outside this window reduces the circadian benefits of your plan.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-col gap-2 sm:flex-col">
          <button
            onClick={onClose}
            className="w-full px-4 py-2.5 rounded-md bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors"
          >
            ✅ I'll wait — close
          </button>
          <button
            onClick={onConfirm}
            disabled={!enabled}
            className={`w-full px-4 py-2.5 rounded-md text-sm font-semibold transition-all ${
              enabled
                ? 'bg-muted text-foreground hover:bg-muted/80'
                : 'bg-muted text-muted-foreground cursor-not-allowed opacity-50'
            }`}
          >
            {enabled ? 'Log anyway' : 'Please wait (3s)...'}
          </button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
