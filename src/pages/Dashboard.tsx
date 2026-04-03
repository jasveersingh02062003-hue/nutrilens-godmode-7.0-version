import PostOnboardingTutorial from '@/components/PostOnboardingTutorial';
import { ClipboardList, X, ShieldAlert } from 'lucide-react';
import MonikaFab from '@/components/MonikaFab';
import TimeInsightCard from '@/components/TimeInsightCard';
import ProteinRescueCard from '@/components/ProteinRescueCard';
import RepeatMealsButton from '@/components/RepeatMealsButton';
import CalorieRing from '@/components/CalorieRing';
import MacroCard from '@/components/MacroCard';
import TodayMeals from '@/components/TodayMeals';
import WaterTrackerCompact from '@/components/WaterTrackerCompact';
import SupplementsCompact from '@/components/SupplementsCompact';
import CaloriesBurnedCard from '@/components/CaloriesBurnedCard';
import { recalculateDay } from '@/lib/calorie-engine';
import TodayMealPlan from '@/components/TodayMealPlan';
import ConsistencyCard from '@/components/ConsistencyCard';
import CoachCard from '@/components/CoachCard';
import WeeklyReportCard from '@/components/WeeklyReportCard';
import BudgetSummaryCard from '@/components/BudgetSummaryCard';
import DailyEfficiencyCard from '@/components/DailyEfficiencyCard';
import NudgeBanner from '@/components/NudgeBanner';
import WeatherNudgeCard from '@/components/WeatherNudgeCard';
import SymptomReminderCard from '@/components/SymptomReminderCard';
import DailyAdjustmentSummary from '@/components/DailyAdjustmentSummary';
import SkinHealthCard from '@/components/SkinHealthCard';
import RecoveryOptionsCard from '@/components/RecoveryOptionsCard';
import NextMealCard from '@/components/NextMealCard';
import UpgradeBanner from '@/components/UpgradeBanner';
import { Button } from '@/components/ui/button';
import DailyPlanCard from '@/components/DailyPlanCard';
import { isDailyHidden, setDailyHidden } from '@/lib/daily-visibility';
import { validateBudgetVsGoals, getUnifiedBudget } from '@/lib/budget-engine';
import PESExplanationCard from '@/components/PESExplanationCard';
import WeeklyFeedbackCard from '@/components/WeeklyFeedbackCard';
import { getProteinTarget, getCarbTarget, getFatTarget } from '@/lib/calorie-correction';
import { clearLatestBudgetAlert } from '@/lib/budget-service';
import ProfileCompletionNudge from '@/components/ProfileCompletionNudge';
import ContextualTipsCard from '@/components/ContextualTipsCard';
import GymCheckInCard from '@/components/GymCheckInCard';
import GymConsistencyCard from '@/components/GymConsistencyCard';
import GymUpsellCard from '@/components/GymUpsellCard';
import ProteinGapNudgeCard from '@/components/ProteinGapNudgeCard';
import SupplementUpsellCard from '@/components/SupplementUpsellCard';

import DashboardHeader from '@/components/dashboard/DashboardHeader';
import DashboardModals from '@/components/dashboard/DashboardModals';
import CalorieCorrectionSection from '@/components/dashboard/CalorieCorrectionSection';
import PlanBannerSection from '@/components/dashboard/PlanBannerSection';
import { useDashboardInit } from '@/hooks/useDashboardInit';

export default function Dashboard() {
  const d = useDashboardInit();

  if (!d.profile) return null;

  return (
    <>
    {d.showTutorial && <PostOnboardingTutorial onDismiss={() => d.setShowTutorial(false)} />}
    {d.showPESExplanation && d.profile?.onboardingComplete && !d.showTutorial && (
      <PESExplanationCard onDismiss={() => d.setShowPESExplanation(false)} />
    )}
    <div className="min-h-screen pb-24 bg-background">
      <div className="max-w-lg mx-auto px-4 pt-5 space-y-4">
        {/* 1. Header */}
        <DashboardHeader profile={d.profile} weather={d.weather} />

        {/* Daily Plan Popup */}
        <DailyPlanCard profile={d.profile} open={d.showDailyPlan} onDismiss={() => d.setShowDailyPlan(false)} />

        {/* Budget insufficient warning */}
        {(() => {
          if (isDailyHidden('budget_warning') || !d.profile) return null;
          const unified = getUnifiedBudget();
          const bv = validateBudgetVsGoals(unified.monthly, d.profile.dailyCalories || 2000, d.profile.dailyProtein || 80);
          if (bv.severity !== 'insufficient') return null;
          return (
            <div className="animate-fade-in">
              <div className="flex items-center gap-3 rounded-2xl bg-destructive/10 border border-destructive/20 px-4 py-3">
                <ShieldAlert className="w-5 h-5 text-destructive shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-foreground">Your food budget of ₹{unified.monthly}/month may not cover your nutrition goals</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">Recommended minimum: ₹{bv.minMonthly}/month</p>
                </div>
                <button onClick={() => { setDailyHidden('budget_warning'); }} className="text-muted-foreground"><X className="w-4 h-4" /></button>
              </div>
            </div>
          );
        })()}

        {/* Planner setup banner */}
        {d.showPlannerBanner && (
          <div className="animate-fade-in">
            <div className="flex items-center gap-3 rounded-2xl bg-primary/10 border border-primary/20 px-4 py-3">
              <ClipboardList className="w-5 h-5 text-primary shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-foreground">Complete your plan for accurate tracking</p>
              </div>
              <Button size="sm" className="shrink-0 text-xs h-8" onClick={() => d.navigate('/planner')}>
                Set Plan
              </Button>
            </div>
          </div>
        )}

        <div className="animate-fade-in"><UpgradeBanner /></div>
        <div className="animate-fade-in"><WeatherNudgeCard /></div>
        <div className="animate-fade-in"><SymptomReminderCard /></div>
        <div className="animate-fade-in"><NudgeBanner /></div>

        {/* Survival / Recovery Mode Banner */}
        {(d.survivalMode || d.recoveryMode) && (
          <div className="animate-fade-in">
            <div className={`flex items-center gap-3 rounded-2xl px-4 py-3 border ${
              d.survivalMode ? 'bg-destructive/10 border-destructive/20' : 'bg-primary/10 border-primary/20'
            }`}>
              <ShieldAlert className={`w-4 h-4 shrink-0 ${d.survivalMode ? 'text-destructive' : 'text-primary'}`} />
              <p className="text-xs font-medium text-foreground">
                {d.survivalMode
                  ? '🔴 Survival mode: focusing on filling, affordable meals'
                  : '🔄 Recovery mode: budget-friendly meals for the next few days'}
              </p>
            </div>
          </div>
        )}

        <CalorieCorrectionSection
          showCorrectionBadge={d.showCorrectionBadge}
          setShowCorrectionBadge={d.setShowCorrectionBadge}
          setWhyModalOpen={d.setWhyModalOpen}
          adherenceScore={d.adherenceScore}
          balanceStreak={d.balanceStreak}
          currentDayType={d.currentDayType}
          setCurrentDayType={d.setCurrentDayType}
        />

        <div className="animate-fade-in"><DailyAdjustmentSummary /></div>
        <div className="animate-fade-in"><RecoveryOptionsCard /></div>
        <div className="animate-fade-in"><SkinHealthCard /></div>

        {/* Dual-Sync Insight */}
        {d.dualSyncInsight && (
          <div className="animate-fade-in">
            <div className={`flex items-center gap-3 rounded-2xl px-4 py-3 border ${
              d.dualSyncInsight.type === 'low_efficiency' ? 'bg-accent/10 border-accent/20' : 'bg-primary/10 border-primary/20'
            }`}>
              <span className="text-sm">{d.dualSyncInsight.emoji}</span>
              <p className="text-[11px] font-medium text-foreground">{d.dualSyncInsight.message}</p>
            </div>
          </div>
        )}

        {/* Protein Priority Card */}
        <div className="animate-scale-in">
          <div className="card-elevated p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-coral/10 flex items-center justify-center">
              <span className="text-lg">💪</span>
            </div>
            <div className="flex-1">
            <p className="text-lg font-bold text-foreground">{Math.round(Math.max(0, getProteinTarget(d.profile) - d.totals.protein))}g <span className="text-xs font-medium text-muted-foreground">protein remaining</span></p>
              <p className="text-[10px] text-muted-foreground">Target: {Math.round(getProteinTarget(d.profile))}g · Eaten: {Math.round(d.totals.protein)}g</p>
            </div>
          </div>
        </div>

        <div className="animate-fade-in"><ProteinRescueCard profile={d.profile} onApplied={d.refreshLog} /></div>
        <div className="animate-fade-in"><TimeInsightCard /></div>

        {/* Surplus/Deficit Live Indicator */}
        {d.dayState.totalConsumed > 0 && (
          <div className="animate-fade-in">
            <div className={`flex items-center justify-center gap-2 rounded-2xl px-4 py-2.5 border ${
              d.dayState.remaining >= 0
                ? 'bg-primary/5 border-primary/15'
                : 'bg-destructive/5 border-destructive/15'
            }`}>
              <span className="text-sm">{d.dayState.remaining >= 0 ? '🟢' : '🔴'}</span>
              <span className={`text-sm font-bold ${d.dayState.remaining >= 0 ? 'text-primary' : 'text-destructive'}`}>
                {d.dayState.remaining >= 0 ? `${Math.round(d.dayState.remaining)} kcal remaining` : `+${Math.abs(Math.round(d.dayState.remaining))} kcal over target`}
              </span>
            </div>
          </div>
        )}

        <PlanBannerSection />

        {/* 2. Calorie Ring */}
        <div className="animate-scale-in">
          <CalorieRing dayState={d.dayState} proteinRemaining={Math.round(Math.max(0, getProteinTarget(d.profile) - d.totals.protein))} />
        </div>

        {/* Gym Cards */}
        {d.profile?.gym?.goer && (
          <>
            <div className="animate-fade-in"><GymCheckInCard /></div>
            <div className="animate-fade-in"><GymConsistencyCard /></div>
            <div className="animate-fade-in"><GymUpsellCard /></div>
          </>
        )}

        {/* Supplement Intelligence Cards */}
        <div className="animate-fade-in"><ProteinGapNudgeCard onApplied={d.refreshLog} /></div>
        <div className="animate-fade-in"><SupplementUpsellCard /></div>

        <div className="animate-slide-up" style={{ animationDelay: '0.03s' }}>
          <NextMealCard profile={d.profile} onRefresh={d.refreshLog} />
        </div>

        <ProfileCompletionNudge onOpenProfile={() => d.navigate('/profile')} />

        <div className="animate-slide-up" style={{ animationDelay: '0.035s' }}>
          <ContextualTipsCard weather={d.weather ?? undefined} />
        </div>

        {/* 3. Macros */}
        <div className="flex gap-2 animate-slide-up">
          <MacroCard label="Protein" current={Math.round(d.totals.protein)} goal={Math.round(getProteinTarget(d.profile))} variant="coral" icon="protein" />
          <MacroCard label="Carbs" current={Math.round(d.totals.carbs)} goal={Math.round(getCarbTarget(d.profile))} variant="primary" icon="carbs" />
          <MacroCard label="Fats" current={Math.round(d.totals.fat)} goal={Math.round(getFatTarget(d.profile))} variant="gold" icon="fat" />
        </div>

        <div className="animate-slide-up" style={{ animationDelay: '0.05s' }}><BudgetSummaryCard /></div>

        {/* Budget Alert Banner */}
        {d.budgetAlert && d.budgetAlert.level !== 'ok' && (
          <div className="animate-fade-in">
            <div className={`flex items-center gap-3 rounded-2xl px-4 py-3 border ${
              d.budgetAlert.level === 'warning'
                ? 'bg-accent/10 border-accent/20'
                : 'bg-destructive/10 border-destructive/20'
            }`}>
              <span className="text-sm">
                {d.budgetAlert.level === 'warning' ? '⚠️' : d.budgetAlert.level === 'overspend' ? '🚫' : '⛔'}
              </span>
              <p className="text-[11px] font-medium text-foreground flex-1">{d.budgetAlert.message}</p>
              <button onClick={() => { clearLatestBudgetAlert(); d.setBudgetAlert(null); }} className="shrink-0">
                <X className="w-3.5 h-3.5 text-muted-foreground" />
              </button>
            </div>
          </div>
        )}

        <div className="animate-slide-up" style={{ animationDelay: '0.055s' }}><DailyEfficiencyCard /></div>
        <div className="animate-slide-up" style={{ animationDelay: '0.053s' }}><WeeklyFeedbackCard /></div>
        <div className="animate-slide-up" style={{ animationDelay: '0.06s' }}><WeeklyReportCard /></div>
        <div className="animate-slide-up" style={{ animationDelay: '0.07s' }}><CoachCard /></div>
        <div className="animate-slide-up" style={{ animationDelay: '0.09s' }}><ConsistencyCard /></div>

        {/* 4. Hydration + Supplements */}
        <div className="flex gap-2 animate-slide-up" style={{ animationDelay: '0.1s' }}>
          <WaterTrackerCompact cups={d.log.waterCups} goal={d.profile.waterGoal} onAdd={d.handleAddWater} />
          <SupplementsCompact
            supplements={d.log.supplements || []}
            onAdd={() => { d.setEditingSupplement(null); d.setSheetOpen(true); }}
            onTap={d.handleSupplementTap}
          />
        </div>

        <div className="animate-slide-up" style={{ animationDelay: '0.12s' }}>
          <CaloriesBurnedCard log={d.log} weightKg={d.profile.weightKg} onRefresh={d.refreshLog} />
        </div>

        <div className="animate-slide-up" style={{ animationDelay: '0.15s' }}><TodayMealPlan /></div>
        <div className="animate-slide-up" style={{ animationDelay: '0.17s' }}><RepeatMealsButton onApplied={d.refreshLog} /></div>
        <div className="animate-slide-up" style={{ animationDelay: '0.18s' }}>
          <TodayMeals log={d.log} onRefresh={d.refreshLog} dayState={d.dayState} />
        </div>
      </div>

      <MonikaFab onDashboardRefresh={d.refreshLog} />

      <DashboardModals
        whyModalOpen={d.whyModalOpen} setWhyModalOpen={d.setWhyModalOpen}
        missedPromptOpen={d.missedPromptOpen} setMissedPromptOpen={d.setMissedPromptOpen}
        missedDate={d.missedDate}
        dropOffModal={d.dropOffModal} setDropOffModal={d.setDropOffModal}
        hardBoundaryModal={d.hardBoundaryModal} setHardBoundaryModal={d.setHardBoundaryModal}
        showPlanComplete={d.showPlanComplete} setShowPlanComplete={d.setShowPlanComplete}
        expiredEventPlan={d.expiredEventPlan}
        showEventFeedback={d.showEventFeedback} setShowEventFeedback={d.setShowEventFeedback}
        eventExtendSheet={d.eventExtendSheet} setEventExtendSheet={d.setEventExtendSheet}
        showPlannerModal={d.showPlannerModal} setShowPlannerModal={d.setShowPlannerModal}
        plannerDismissKey={d.plannerDismissKey}
        sheetOpen={d.sheetOpen} setSheetOpen={d.setSheetOpen}
        editModalOpen={d.editModalOpen} setEditModalOpen={d.setEditModalOpen}
        selectedSupplement={d.selectedSupplement}
        editingSupplement={d.editingSupplement} setEditingSupplement={d.setEditingSupplement}
        handleEditSupplement={d.handleEditSupplement}
        refreshLog={d.refreshLog} refreshProfile={d.refreshProfile}
        defaultWeight={d.profile.weightKg}
      />
    </div>
    </>
  );
}
