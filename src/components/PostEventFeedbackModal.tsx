import { scopedGet, scopedSet, scopedRemove } from '@/lib/scoped-storage';
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { clearActivePlan, type ActivePlan } from '@/lib/event-plan-service';
import { getProfile, saveProfile } from '@/lib/store';
import { toast } from 'sonner';

interface Props {
  open: boolean;
  onClose: () => void;
  expiredPlan: ActivePlan;
  onExtend: () => void;
}

export default function PostEventFeedbackModal({ open, onClose, expiredPlan, onExtend }: Props) {
  const [newWeight, setNewWeight] = useState(expiredPlan.targetWeight.toString());
  const [choice, setChoice] = useState<'resume' | 'update' | 'extend' | null>(null);

  const handleDone = () => {
    const weight = parseFloat(newWeight);
    if (isNaN(weight) || weight < 30 || weight > 250) {
      toast.error('Please enter a valid weight');
      return;
    }

    // Mark feedback as collected
    scopedSet(`nutrilens_event_feedback_${expiredPlan.startDate}`, 'done');

    const profile = getProfile();
    if (profile) {
      profile.weightKg = weight;
      saveProfile(profile);
    }

    if (choice === 'resume' || choice === 'update') {
      clearActivePlan();
      scopedRemove('nutrilens_active_plan');
      toast.success(choice === 'resume' ? 'Returned to original plan' : 'Goals updated with new weight');
    } else if (choice === 'extend') {
      clearActivePlan();
      onExtend();
    }

    onClose();
    window.dispatchEvent(new Event('nutrilens:update'));
  };

  const eventName = expiredPlan.eventSettings?.eventType || 'event';

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-sm rounded-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <span>🎉</span> Your {eventName} plan ended!
          </DialogTitle>
          <DialogDescription className="text-sm">
            How did it go? Let's update your progress.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          <div>
            <label className="text-xs font-semibold text-foreground mb-1 block">Current weight (kg)</label>
            <Input
              type="number"
              value={newWeight}
              onChange={(e) => setNewWeight(e.target.value)}
              placeholder="Enter weight"
              step="0.1"
            />
            {expiredPlan.targetWeight && (
              <p className="text-[10px] text-muted-foreground mt-1">
                Target was {expiredPlan.targetWeight} kg
              </p>
            )}
          </div>

          <div className="space-y-2">
            <p className="text-xs font-semibold text-foreground">What next?</p>
            <Button
              variant={choice === 'resume' ? 'default' : 'outline'}
              className="w-full justify-start text-left h-auto py-3"
              onClick={() => setChoice('resume')}
            >
              <div>
                <p className="text-xs font-semibold">🔄 Resume original plan</p>
                <p className="text-[9px] text-muted-foreground">Go back to your long-term goals</p>
              </div>
            </Button>
            <Button
              variant={choice === 'update' ? 'default' : 'outline'}
              className="w-full justify-start text-left h-auto py-3"
              onClick={() => setChoice('update')}
            >
              <div>
                <p className="text-xs font-semibold">📝 Update goals with new weight</p>
                <p className="text-[9px] text-muted-foreground">Recalculate targets using today's weight</p>
              </div>
            </Button>
            <Button
              variant={choice === 'extend' ? 'default' : 'outline'}
              className="w-full justify-start text-left h-auto py-3"
              onClick={() => setChoice('extend')}
            >
              <div>
                <p className="text-xs font-semibold">🔁 Extend this plan</p>
                <p className="text-[9px] text-muted-foreground">Set a new deadline with same settings</p>
              </div>
            </Button>
          </div>

          <Button className="w-full" disabled={!choice} onClick={handleDone}>
            Continue
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
