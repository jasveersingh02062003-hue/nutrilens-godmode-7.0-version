import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { shouldPromptWeightCheckin, submitWeightCheckin, type WeightFeedback } from '@/lib/weekly-weight-checkin';
import { detectPlateau, applyPlateauAdjustment } from '@/lib/plateau-handler';
import { toast } from 'sonner';
import { Scale, TrendingDown, TrendingUp, CheckCircle } from 'lucide-react';

interface Props {
  defaultWeight?: number;
  onDone: () => void;
}

export default function WeeklyWeightCheckIn({ defaultWeight, onDone }: Props) {
  const [open, setOpen] = useState(() => shouldPromptWeightCheckin());
  const [weight, setWeight] = useState(String(defaultWeight || ''));
  const [feedback, setFeedback] = useState<WeightFeedback | null>(null);

  if (!open) return null;

  const handleSubmit = () => {
    const w = parseFloat(weight);
    if (!w || w < 20 || w > 300) {
      toast.error('Please enter a valid weight');
      return;
    }

    const fb = submitWeightCheckin(w);
    setFeedback(fb);

    // Check plateau after weight submission
    const plateau = detectPlateau();
    if (plateau.detected) {
      const adjustment = applyPlateauAdjustment();
      if (adjustment) {
        toast.info(`📊 Plateau detected (${plateau.daysSinceChange} days). Calories adjusted from ${adjustment.previousTarget} → ${adjustment.newTarget} kcal.`);
      }
    }
  };

  const handleClose = () => {
    setOpen(false);
    onDone();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); }}>
      <DialogContent className="max-w-sm rounded-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Scale className="w-4 h-4 text-primary" />
            Weekly Check-In
          </DialogTitle>
          <DialogDescription className="text-sm">
            Quick 10-second check — how's your weight this week?
          </DialogDescription>
        </DialogHeader>

        {!feedback ? (
          <div className="space-y-4 pt-2">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Weight (kg)</label>
              <Input
                type="number"
                step="0.1"
                placeholder="e.g. 64.5"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                className="text-lg font-bold"
                autoFocus
              />
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" className="flex-1" onClick={handleClose}>Skip</Button>
              <Button className="flex-1" onClick={handleSubmit}>Log Weight</Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4 pt-2">
            <div className="text-center py-4">
              <span className="text-4xl">{feedback.emoji}</span>
              <p className="text-sm font-semibold text-foreground mt-3">{feedback.message}</p>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-xl bg-muted/50 p-3 text-center">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <TrendingDown className="w-3 h-3 text-primary" />
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase">Expected</p>
                </div>
                <p className="text-lg font-bold text-foreground">{feedback.expectedLoss} kg</p>
              </div>
              <div className="rounded-xl bg-muted/50 p-3 text-center">
                <div className="flex items-center justify-center gap-1 mb-1">
                  {feedback.actualChange >= 0 ? (
                    <TrendingDown className="w-3 h-3 text-primary" />
                  ) : (
                    <TrendingUp className="w-3 h-3 text-destructive" />
                  )}
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase">Actual</p>
                </div>
                <p className="text-lg font-bold text-foreground">{feedback.actualChange} kg</p>
              </div>
            </div>

            <Button className="w-full" onClick={handleClose}>
              <CheckCircle className="w-4 h-4 mr-1" /> Done
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
