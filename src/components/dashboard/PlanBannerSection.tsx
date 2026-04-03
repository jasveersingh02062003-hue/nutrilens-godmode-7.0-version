import { Button } from '@/components/ui/button';
import { getActivePlan, getActivePlanRaw, getPlanProgress, getPlanById, resumeActivePlan } from '@/lib/event-plan-service';
import { isReverseDietActive, getReverseDietWeek } from '@/lib/reverse-diet-service';
import ActivePlanBanner from '@/components/ActivePlanBanner';
import MadhavanPlanBanner from '@/components/MadhavanPlanBanner';
import PlanPromoCard from '@/components/PlanPromoCard';
import BoostersChecklist from '@/components/BoostersChecklist';
import ActivityTracker from '@/components/ActivityTracker';
import TummyInsightCard from '@/components/TummyInsightCard';

export default function PlanBannerSection() {
  const raw = getActivePlanRaw();
  const ap = getActivePlan();

  return (
    <>
      {/* Paused Plan Banner */}
      {raw && raw.status === 'paused' && (() => {
        const meta = getPlanById(raw.planId);
        return (
          <div className="animate-fade-in">
            <div className="flex items-center gap-3 rounded-2xl px-4 py-3 border bg-accent/10 border-accent/20">
              <span className="text-sm">⏸</span>
              <div className="flex-1">
                <p className="text-xs font-semibold text-foreground">{meta?.name || 'Plan'} is paused</p>
                <p className="text-[10px] text-muted-foreground">Your normal targets are active. Resume anytime.</p>
              </div>
              <Button size="sm" className="h-7 text-[10px]" onClick={() => { resumeActivePlan(); window.location.reload(); }}>
                Resume
              </Button>
            </div>
          </div>
        );
      })()}

      {/* Active Plan Banner */}
      {(() => {
        if (!ap) return <ActivePlanBanner />;
        if (ap.planId === 'madhavan_21_day') return <MadhavanPlanBanner />;
        if (ap.planId === 'event_based' && ap.eventSettings) {
          const prog = getPlanProgress();
          return (
            <div className="animate-fade-in space-y-3">
              <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">🎯</span>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <p className="text-sm font-bold text-foreground">
                          {prog?.daysLeft ?? 0} days until your {ap.eventSettings.eventType}!
                        </p>
                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-primary/15 text-[8px] font-bold text-primary">
                          🔒 Locked
                        </span>
                      </div>
                      <p className="text-[10px] text-muted-foreground">
                        Day {prog?.dayNumber ?? 1} of {prog?.totalDays ?? ap.duration}
                      </p>
                      {ap.eventSettings.motivation && (
                        <p className="text-[9px] text-primary/80 italic mt-0.5">"{ap.eventSettings.motivation}"</p>
                      )}
                    </div>
                  </div>
                  <span className="text-lg font-bold text-primary">{prog?.percentComplete ?? 0}%</span>
                </div>
                <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${prog?.percentComplete ?? 0}%` }} />
                </div>
                <div className="flex gap-2 text-center">
                  <div className="flex-1 rounded-xl bg-card p-2">
                    <p className="text-xs font-bold text-foreground">{ap.dailyCalories}</p>
                    <p className="text-[9px] text-muted-foreground">kcal/day</p>
                  </div>
                  <div className="flex-1 rounded-xl bg-card p-2">
                    <p className="text-xs font-bold text-foreground">{ap.dailyProtein}g</p>
                    <p className="text-[9px] text-muted-foreground">protein</p>
                  </div>
                  <div className="flex-1 rounded-xl bg-card p-2">
                    <p className="text-xs font-bold text-foreground">{ap.targetWeight} kg</p>
                    <p className="text-[9px] text-muted-foreground">target</p>
                  </div>
                </div>
              </div>
              {ap.eventSettings.goalType === 'tummy' && <TummyInsightCard />}
              {ap.eventSettings.boosters.length > 0 && (
                <BoostersChecklist activeBoosters={ap.eventSettings.boosters} />
              )}
              <ActivityTracker exerciseTime={ap.eventSettings.exerciseTime} planStartDate={ap.startDate} />
            </div>
          );
        }
        return <ActivePlanBanner />;
      })()}
      {!ap && <PlanPromoCard />}

      {/* Reverse Diet Banner */}
      {isReverseDietActive() && !ap && (
        <div className="animate-fade-in">
          <div className="flex items-center gap-3 rounded-2xl px-4 py-3 border bg-accent/10 border-accent/20">
            <span className="text-sm">🔄</span>
            <div className="flex-1">
              <p className="text-xs font-semibold text-foreground">Reverse Diet — Week {getReverseDietWeek()}/3</p>
              <p className="text-[10px] text-muted-foreground">Gradually returning to maintenance calories</p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
