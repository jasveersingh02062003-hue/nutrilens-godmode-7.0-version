import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { getPlanProgress, getActivePlan, clearActivePlan, getPlanById, setActivePlan, type ActivePlan } from '@/lib/event-plan-service';
import { startReverseDiet } from '@/lib/reverse-diet-service';
import { getProfile } from '@/lib/store';
import ConfettiCelebration from '@/components/ConfettiCelebration';
import { Trophy, RotateCcw, ArrowRight, RefreshCw } from 'lucide-react';

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function PlanCompletionModal({ open, onClose }: Props) {
  const [showConfetti, setShowConfetti] = useState(false);
  const plan = getActivePlan();
  const progress = getPlanProgress();
  const meta = plan ? getPlanById(plan.planId) : null;

  useEffect(() => {
    if (open) setShowConfetti(true);
    else setShowConfetti(false);
  }, [open]);

  const handleReturnToNormal = () => {
    clearActivePlan();
    onClose();
  };

  const handleExtend = () => {
    if (!plan) return;
    const newPlan: ActivePlan = {
      ...plan,
      duration: plan.duration + 7,
    };
    setActivePlan(newPlan);
    onClose();
  };

  const handleStartReverseDiet = () => {
    if (!plan) return;
    const profile = getProfile();
    if (!profile) return;
    const actMultiplier = profile.tdee && profile.bmr ? profile.tdee / profile.bmr : 1.4;
    startReverseDiet(
      profile.weightKg || 70,
      profile.heightCm || 170,
      profile.age || 30,
      profile.gender || 'male',
      actMultiplier,
      plan.planId
    );
    clearActivePlan();
    onClose();
  };

  const isMadhavan = plan?.planId === 'madhavan_21_day';

  if (!plan || !meta) return null;

  return (
    <>
      <ConfettiCelebration show={showConfetti} />
      <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
        <DialogContent className="rounded-2xl max-w-sm mx-auto">
          <DialogHeader className="text-center">
            <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-3">
              <Trophy className="w-8 h-8 text-primary" />
            </div>
            <DialogTitle className="text-xl">
              {meta.emoji} Plan Complete!
            </DialogTitle>
            <DialogDescription className="text-sm">
              You completed the {meta.name}!
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-4">
            <div className="bg-muted rounded-xl p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Duration</span>
                <span className="font-semibold">{plan.duration} days</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Daily Target</span>
                <span className="font-semibold">{plan.dailyCalories} kcal</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Target Weight</span>
                <span className="font-semibold">{plan.targetWeight} kg</span>
              </div>
            </div>

            {isMadhavan && (
              <div className="bg-accent/5 border border-accent/20 rounded-xl p-3">
                <p className="text-xs font-semibold text-foreground mb-1">🔄 Reverse Diet Recommended</p>
                <p className="text-[10px] text-muted-foreground">
                  Gradually increase calories over 3 weeks to prevent weight regain and stabilize metabolism.
                </p>
              </div>
            )}

            <p className="text-xs text-center text-muted-foreground">
              {isMadhavan ? 'Start reverse dieting for a smooth transition back to maintenance.' : 'Great discipline! Your regular targets will resume now.'}
            </p>
          </div>

          <div className="flex flex-col gap-2">
            {isMadhavan && (
              <Button onClick={handleStartReverseDiet} className="w-full gap-1.5">
                <RefreshCw className="w-4 h-4" />
                Start 3-Week Reverse Diet
              </Button>
            )}
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleExtend} className="flex-1 gap-1.5">
                <RotateCcw className="w-4 h-4" />
                +7 Days
              </Button>
              <Button variant={isMadhavan ? 'outline' : 'default'} onClick={handleReturnToNormal} className="flex-1 gap-1.5">
                <ArrowRight className="w-4 h-4" />
                Done
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
