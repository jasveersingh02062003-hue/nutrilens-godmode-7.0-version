import { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { Check } from 'lucide-react';

interface Props {
  open: boolean;
  onClose: () => void;
}

const CHEW_TARGET = 50;
const HAPTIC_INTERVAL = 10;

export default function ChewingTimerModal({ open, onClose }: Props) {
  const [count, setCount] = useState(0);
  const [completed, setCompleted] = useState(false);

  useEffect(() => {
    if (open) { setCount(0); setCompleted(false); }
  }, [open]);

  const handleChew = useCallback(() => {
    setCount(prev => {
      const next = prev + 1;
      if (next % HAPTIC_INTERVAL === 0 && navigator.vibrate) {
        navigator.vibrate(50);
      }
      if (next >= CHEW_TARGET) {
        setCompleted(true);
        if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
        // Store completion
        const key = `nutrilens_chew_${new Date().toISOString().split('T')[0]}_${Date.now()}`;
        scopedSet(key, 'done');
      }
      return next;
    });
  }, []);

  const pct = Math.min(100, (count / CHEW_TARGET) * 100);

  return (
    <Dialog open={open} onOpenChange={o => !o && onClose()}>
      <DialogContent className="rounded-2xl max-w-sm mx-auto text-center">
        <DialogHeader>
          <DialogTitle className="text-lg">🦷 Chewing Timer</DialogTitle>
          <DialogDescription className="text-xs">
            Tap for each chew — aim for {CHEW_TARGET} chews per bite
          </DialogDescription>
        </DialogHeader>

        <div className="py-6 space-y-4">
          {!completed ? (
            <>
              <motion.button
                whileTap={{ scale: 0.92 }}
                onClick={handleChew}
                className="mx-auto w-28 h-28 rounded-full bg-primary/10 border-4 border-primary flex items-center justify-center active:bg-primary/20 transition-colors"
              >
                <span className="text-3xl font-bold text-primary">{count}</span>
              </motion.button>
              <div className="w-48 mx-auto h-2 rounded-full bg-muted overflow-hidden">
                <motion.div
                  className="h-full rounded-full bg-primary"
                  animate={{ width: `${pct}%` }}
                  transition={{ type: 'spring', stiffness: 300 }}
                />
              </div>
              <p className="text-[11px] text-muted-foreground">
                {count < 10 ? 'Start chewing slowly...' : count < 30 ? 'Keep going! Mindful eating aids digestion.' : 'Almost there! Your body will thank you.'}
              </p>
            </>
          ) : (
            <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="space-y-3">
              <div className="w-16 h-16 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
                <Check className="w-8 h-8 text-primary" />
              </div>
              <p className="text-sm font-bold text-foreground">Excellent! 🎉</p>
              <p className="text-xs text-muted-foreground">
                {CHEW_TARGET} chews completed. Better digestion, better nutrient absorption.
              </p>
            </motion.div>
          )}
        </div>

        <Button onClick={onClose} variant={completed ? 'default' : 'outline'} className="w-full">
          {completed ? 'Done' : 'Skip for now'}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
