import { useState, useMemo } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Star, Check, Calendar, Target, Flame, AlertTriangle } from 'lucide-react';
import { motion } from 'framer-motion';
import { type PlanMeta, calculatePlanTargets, setActivePlan } from '@/lib/event-plan-service';
import { useUserProfile } from '@/contexts/UserProfileContext';
import { toast } from 'sonner';

interface PlanDetailSheetProps {
  plan: PlanMeta;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function PlanDetailSheet({ plan, open, onOpenChange }: PlanDetailSheetProps) {
  const { profile } = useUserProfile();
  const [duration, setDuration] = useState(plan.defaultDuration);
  const [targetWeight, setTargetWeight] = useState(() =>
    profile?.targetWeight || (profile?.weightKg ? profile.weightKg - 3 : 65)
  );
  const [startDate, setStartDate] = useState(() => new Date().toISOString().split('T')[0]);

  const targets = useMemo(() => {
    if (!profile) return null;
    return calculatePlanTargets(
      profile.weightKg || 70,
      targetWeight,
      duration,
      profile.tdee || 2000,
      plan.id
    );
  }, [profile, targetWeight, duration, plan.id]);

  const handleUnlock = () => {
    if (!targets || !profile) return;
    if (!targets.feasible) {
      toast.error('This target is not safe. Please adjust duration or target weight.');
      return;
    }
    setActivePlan({
      planId: plan.id,
      startDate,
      duration,
      targetWeight,
      dailyCalories: targets.dailyCalories,
      dailyProtein: targets.dailyProtein,
      dailyCarbs: targets.dailyCarbs,
      dailyFat: targets.dailyFat,
      dailyDeficit: targets.dailyDeficit,
      activatedAt: new Date().toISOString(),
    });
    toast.success(`${plan.name} activated! 🎉`, {
      description: `${duration} days starting ${startDate}`,
    });
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[85vh] rounded-t-3xl overflow-y-auto">
        <SheetHeader className="text-center pb-2">
          <div className="text-4xl mb-2">{plan.emoji}</div>
          <SheetTitle className="text-lg">{plan.name}</SheetTitle>
          <p className="text-xs text-muted-foreground">{plan.description}</p>
          <div className="flex items-center justify-center gap-1 mt-1">
            <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
            <span className="text-xs font-bold">{plan.rating}</span>
            <span className="text-[10px] text-muted-foreground">({plan.reviewCount} reviews)</span>
          </div>
        </SheetHeader>

        <div className="space-y-5 px-1 pb-6">
          {/* What's Included */}
          <div>
            <h4 className="text-xs font-bold text-foreground uppercase tracking-wider mb-2">What's Included</h4>
            <div className="space-y-1.5">
              {plan.includes.map(item => (
                <div key={item} className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full bg-primary/10 flex items-center justify-center">
                    <Check className="w-2.5 h-2.5 text-primary" />
                  </div>
                  <span className="text-xs text-foreground">{item}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Duration Picker */}
          <div>
            <h4 className="text-xs font-bold text-foreground uppercase tracking-wider mb-2">
              <Calendar className="w-3 h-3 inline mr-1" /> Duration
            </h4>
            <div className="flex gap-2">
              {plan.durationOptions.map(d => (
                <button
                  key={d}
                  onClick={() => setDuration(d)}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${
                    duration === d
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {d}d
                </button>
              ))}
            </div>
          </div>

          {/* Target Weight */}
          <div>
            <h4 className="text-xs font-bold text-foreground uppercase tracking-wider mb-2">
              <Target className="w-3 h-3 inline mr-1" /> Target Weight
            </h4>
            <div className="flex items-center gap-3">
              <input
                type="number"
                value={targetWeight}
                onChange={e => setTargetWeight(Number(e.target.value))}
                className="flex-1 px-3 py-2.5 rounded-xl bg-muted text-sm font-semibold text-foreground outline-none focus:ring-2 focus:ring-primary/20"
                step={0.5}
              />
              <span className="text-xs text-muted-foreground">kg</span>
            </div>
            <p className="text-[10px] text-muted-foreground mt-1">
              Current: {profile?.weightKg || '—'} kg → Target: {targetWeight} kg
            </p>
          </div>

          {/* Start Date */}
          <div>
            <h4 className="text-xs font-bold text-foreground uppercase tracking-wider mb-2">Start Date</h4>
            <input
              type="date"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
              min={new Date().toISOString().split('T')[0]}
              className="w-full px-3 py-2.5 rounded-xl bg-muted text-sm font-semibold text-foreground outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>

          {/* Live Preview */}
          {targets && (
            <div>
              <h4 className="text-xs font-bold text-foreground uppercase tracking-wider mb-2">
                <Flame className="w-3 h-3 inline mr-1" /> Your Plan Preview
              </h4>

              {targets.warning && (
                <div className={`rounded-xl p-3 mb-3 flex items-start gap-2 ${
                  targets.feasible ? 'bg-amber-500/10 border border-amber-500/20' : 'bg-destructive/10 border border-destructive/20'
                }`}>
                  <AlertTriangle className={`w-4 h-4 flex-shrink-0 mt-0.5 ${targets.feasible ? 'text-amber-500' : 'text-destructive'}`} />
                  <p className={`text-[10px] ${targets.feasible ? 'text-amber-700' : 'text-destructive'}`}>{targets.warning}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-2">
                <div className="card-subtle p-3 text-center">
                  <p className="text-lg font-bold text-foreground">{targets.dailyCalories}</p>
                  <p className="text-[9px] text-muted-foreground">kcal / day</p>
                </div>
                <div className="card-subtle p-3 text-center">
                  <p className="text-lg font-bold text-foreground">{targets.dailyProtein}g</p>
                  <p className="text-[9px] text-muted-foreground">protein / day</p>
                </div>
                <div className="card-subtle p-3 text-center">
                  <p className="text-lg font-bold text-foreground">{targets.dailyCarbs}g</p>
                  <p className="text-[9px] text-muted-foreground">carbs / day</p>
                </div>
                <div className="card-subtle p-3 text-center">
                  <p className="text-lg font-bold text-foreground">{targets.dailyFat}g</p>
                  <p className="text-[9px] text-muted-foreground">fat / day</p>
                </div>
              </div>

              <div className="mt-2 rounded-xl bg-muted p-3 text-center">
                <p className="text-xs text-muted-foreground">
                  {targets.dailyDeficit > 0 ? (
                    <>Daily deficit: <span className="font-bold text-primary">{targets.dailyDeficit} kcal</span> · ~{targets.weeklyLoss.toFixed(1)} kg/week</>
                  ) : (
                    <>Daily surplus: <span className="font-bold text-primary">{Math.abs(targets.dailyDeficit)} kcal</span> for lean gains</>
                  )}
                </p>
              </div>
            </div>
          )}

          {/* Reviews */}
          <div className="rounded-xl border border-border p-3">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Top Review</p>
            <div className="flex items-center gap-1 mb-1">
              {Array(5).fill(0).map((_, i) => (
                <Star key={i} className="w-2.5 h-2.5 fill-amber-400 text-amber-400" />
              ))}
            </div>
            <p className="text-[10px] text-muted-foreground leading-relaxed">
              "This plan completely changed my approach to eating. The daily targets were realistic and the alerts kept me on track. Highly recommend!"
            </p>
            <p className="text-[10px] font-semibold text-foreground mt-1">— Verified User</p>
          </div>

          {/* CTA */}
          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={handleUnlock}
            disabled={targets ? !targets.feasible : true}
            className="w-full py-4 rounded-2xl bg-primary text-primary-foreground font-bold text-sm flex items-center justify-center gap-2 shadow-fab disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Unlock Plan — ₹{plan.price}
          </motion.button>
          <p className="text-[9px] text-muted-foreground text-center">One-time purchase · No recurring charges</p>
        </div>
      </SheetContent>
    </Sheet>
  );
}
