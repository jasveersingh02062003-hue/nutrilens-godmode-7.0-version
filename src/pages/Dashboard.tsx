import { lazy, Suspense } from 'react';
import PostOnboardingTutorial from '@/components/PostOnboardingTutorial';
import { ClipboardList, X, ShieldAlert } from 'lucide-react';
import MonikaFab from '@/components/MonikaFab';
import TimeInsightCard from '@/components/TimeInsightCard';
import SmartMarketBanner from '@/components/SmartMarketBanner';
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
import SymptomReminderCard from '@/components/SymptomReminderCard';
import DailyAdjustmentSummary from '@/components/DailyAdjustmentSummary';
import RecoveryOptionsCard from '@/components/RecoveryOptionsCard';
import NextMealCard from '@/components/NextMealCard';
import UpgradeBanner from '@/components/UpgradeBanner';
import PaymentFailedBanner from '@/components/PaymentFailedBanner';
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
import EnergyTracker from '@/components/EnergyTracker';
import ProteinGapNudgeCard from '@/components/ProteinGapNudgeCard';
import SupplementUpsellCard from '@/components/SupplementUpsellCard';
import DashboardSponsoredCard from '@/components/DashboardSponsoredCard';
import SmartProductNudge from '@/components/SmartProductNudge';
import { shouldBoostWater } from '@/lib/supplement-service';

import DashboardHeader from '@/components/dashboard/DashboardHeader';
import HealthDisclaimerBanner from '@/components/HealthDisclaimerBanner';
import DashboardModals from '@/components/dashboard/DashboardModals';
import CalorieCorrectionSection from '@/components/dashboard/CalorieCorrectionSection';
import PlanBannerSection from '@/components/dashboard/PlanBannerSection';
import { useDashboardInit } from '@/hooks/useDashboardInit';
import DashboardSkeleton from '@/components/dashboard/DashboardSkeleton';
import { motion } from 'framer-motion';

// Lazy-loaded conditional cards — only fetched when needed
const GymCheckInCard = lazy(() => import('@/components/GymCheckInCard'));
const GymConsistencyCard = lazy(() => import('@/components/GymConsistencyCard'));
const GymUpsellCard = lazy(() => import('@/components/GymUpsellCard'));
const PreWorkoutCard = lazy(() => import('@/components/PreWorkoutCard'));
const PostWorkoutCard = lazy(() => import('@/components/PostWorkoutCard'));
const WeatherNudgeCard = lazy(() => import('@/components/WeatherNudgeCard'));
const SkinHealthCard = lazy(() => import('@/components/SkinHealthCard'));

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.04 } },
} as const;

const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 220, damping: 28 } },
};

export default function Dashboard() {
  const d = useDashboardInit();
  const creatineBoost = d.log ? shouldBoostWater(d.log) : null;

  if (!d.profile) return <DashboardSkeleton />;

  return (
    <>
    {d.showTutorial && <PostOnboardingTutorial onDismiss={() => d.setShowTutorial(false)} />}
    {d.showPESExplanation && d.profile?.onboardingComplete && !d.showTutorial && (
      <PESExplanationCard onDismiss={() => d.setShowPESExplanation(false)} />
    )}
    <div className="min-h-screen pb-24 bg-background relative">
      {/* Ambient gradient background — reduced blur for GPU savings */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden" style={{ willChange: 'opacity' }}>
        <div className="absolute top-0 left-1/4 w-96 h-96 rounded-full bg-primary/[0.03] blur-2xl animate-ambient" />
        <div className="absolute bottom-1/3 right-0 w-80 h-80 rounded-full bg-accent/[0.03] blur-2xl animate-ambient" style={{ animationDelay: '4s' }} />
      </div>

      <motion.div
        variants={stagger}
        initial="hidden"
        animate="show"
        className="max-w-lg mx-auto px-4 pt-5 space-y-4 relative z-10"
      >
        {/* 1. Header */}
        <DashboardHeader profile={d.profile} weather={d.weather} />

        {/* Medical disclaimer (per-session dismissible) */}
        <motion.div variants={fadeUp}><HealthDisclaimerBanner surface="dashboard" /></motion.div>

        {/* Daily Plan Popup */}
        <DailyPlanCard profile={d.profile} open={d.showDailyPlan} onDismiss={() => d.setShowDailyPlan(false)} />

        {/* Budget insufficient warning */}
        {(() => {
          if (isDailyHidden('budget_warning') || !d.profile) return null;
          const unified = getUnifiedBudget();
          const bv = validateBudgetVsGoals(unified.monthly, d.profile.dailyCalories || 2000, d.profile.dailyProtein || 80);
          if (bv.severity !== 'insufficient') return null;
          return (
            <motion.div variants={fadeUp}>
              <div className="flex items-center gap-3 rounded-2xl bg-destructive/10 border border-destructive/20 px-4 py-3">
                <ShieldAlert className="w-5 h-5 text-destructive shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-foreground">Your food budget of ₹{unified.monthly}/month may not cover your nutrition goals</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">Recommended minimum: ₹{bv.minMonthly}/month</p>
                </div>
                <button onClick={() => { setDailyHidden('budget_warning'); }} className="text-muted-foreground"><X className="w-4 h-4" /></button>
              </div>
            </motion.div>
          );
        })()}

        {/* Planner setup banner */}
        {d.showPlannerBanner && (
          <motion.div variants={fadeUp}>
            <div className="flex items-center gap-3 rounded-2xl bg-primary/10 border border-primary/20 px-4 py-3">
              <ClipboardList className="w-5 h-5 text-primary shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-foreground">Complete your plan for accurate tracking</p>
              </div>
              <Button size="sm" className="shrink-0 text-xs h-8" onClick={() => d.navigate('/planner')}>
                Set Plan
              </Button>
            </div>
          </motion.div>
        )}

        <motion.div variants={fadeUp}><PaymentFailedBanner /></motion.div>
        <motion.div variants={fadeUp}><UpgradeBanner /></motion.div>
        <motion.div variants={fadeUp}><Suspense fallback={null}><WeatherNudgeCard /></Suspense></motion.div>
        <motion.div variants={fadeUp}><SymptomReminderCard /></motion.div>
        <motion.div variants={fadeUp}><NudgeBanner /></motion.div>

        {/* Survival / Recovery Mode Banner */}
        {(d.survivalMode || d.recoveryMode) && (
          <motion.div variants={fadeUp}>
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
          </motion.div>
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

        <motion.div variants={fadeUp}><DailyAdjustmentSummary /></motion.div>
        <motion.div variants={fadeUp}><RecoveryOptionsCard /></motion.div>
        <motion.div variants={fadeUp}><Suspense fallback={null}><SkinHealthCard /></Suspense></motion.div>

        {/* Dual-Sync Insight */}
        {d.dualSyncInsight && (
          <motion.div variants={fadeUp}>
            <div className={`flex items-center gap-3 rounded-2xl px-4 py-3 border ${
              d.dualSyncInsight.type === 'low_efficiency' ? 'bg-accent/10 border-accent/20' : 'bg-primary/10 border-primary/20'
            }`}>
              <span className="text-sm">{d.dualSyncInsight.emoji}</span>
              <p className="text-[11px] font-medium text-foreground">{d.dualSyncInsight.message}</p>
            </div>
          </motion.div>
        )}

        {/* Protein Priority Card */}
        <motion.div variants={fadeUp}>
          <div className="glass-card p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-coral/10 flex items-center justify-center">
              <span className="text-lg">💪</span>
            </div>
            <div className="flex-1">
            <p className="text-lg font-bold text-foreground">{Math.round(Math.max(0, getProteinTarget(d.profile) - d.totals.protein))}g <span className="text-xs font-medium text-muted-foreground">protein remaining</span></p>
              <p className="text-[10px] text-muted-foreground">Target: {Math.round(getProteinTarget(d.profile))}g · Eaten: {Math.round(d.totals.protein)}g</p>
            </div>
          </div>
        </motion.div>

        <motion.div variants={fadeUp}><ProteinRescueCard profile={d.profile} onApplied={d.refreshLog} /></motion.div>
        <motion.div variants={fadeUp}><TimeInsightCard /></motion.div>

        {/* Surplus/Deficit Live Indicator */}
        {d.dayState.totalConsumed > 0 && (
          <motion.div variants={fadeUp}>
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
          </motion.div>
        )}

        <PlanBannerSection />

        {/* Smart Market Banner */}
        <motion.div variants={fadeUp}><SmartMarketBanner /></motion.div>

        {/* Sponsored: Dashboard Smart Pick */}
        <motion.div variants={fadeUp}><DashboardSponsoredCard slot="dashboard_smart_pick" /></motion.div>

        {/* 2. Calorie Ring */}
        <motion.div variants={fadeUp}>
          <CalorieRing dayState={d.dayState} proteinRemaining={Math.round(Math.max(0, getProteinTarget(d.profile) - d.totals.protein))} />
        </motion.div>

        {/* Gym Intelligence Cards */}
        {d.profile?.gym?.goer && (
          <Suspense fallback={null}>
            <motion.div variants={fadeUp}><PreWorkoutCard /></motion.div>
            <motion.div variants={fadeUp}><GymCheckInCard onRefresh={d.refreshLog} /></motion.div>
            <motion.div variants={fadeUp}><PostWorkoutCard /></motion.div>
            <motion.div variants={fadeUp}><EnergyTracker onRefresh={d.refreshLog} /></motion.div>
            <motion.div variants={fadeUp}><GymConsistencyCard /></motion.div>
            <motion.div variants={fadeUp}><GymUpsellCard /></motion.div>
          </Suspense>
        )}

        {/* Supplement Intelligence Cards */}
        <motion.div variants={fadeUp}><ProteinGapNudgeCard onApplied={d.refreshLog} /></motion.div>
        {/* Smart Product Nudge — gap-aware sponsored recommendation */}
        <motion.div variants={fadeUp}><SmartProductNudge surface="dashboard" variant="full" /></motion.div>
        <motion.div variants={fadeUp}><DashboardSponsoredCard slot="dashboard_protein_nudge" /></motion.div>
        <motion.div variants={fadeUp}><SupplementUpsellCard /></motion.div>

        <motion.div variants={fadeUp}>
          <NextMealCard profile={d.profile} onRefresh={d.refreshLog} />
        </motion.div>

        <ProfileCompletionNudge onOpenProfile={() => d.navigate('/profile')} />

        <motion.div variants={fadeUp}>
          <ContextualTipsCard weather={d.weather ?? undefined} />
        </motion.div>

        {/* 3. Macros */}
        <motion.div variants={fadeUp} className="flex gap-2">
          <MacroCard label="Protein" current={Math.round(d.totals.protein)} goal={Math.round(getProteinTarget(d.profile))} variant="coral" icon="protein" index={0} />
          <MacroCard label="Carbs" current={Math.round(d.totals.carbs)} goal={Math.round(getCarbTarget(d.profile))} variant="primary" icon="carbs" index={1} />
          <MacroCard label="Fats" current={Math.round(d.totals.fat)} goal={Math.round(getFatTarget(d.profile))} variant="gold" icon="fat" index={2} />
        </motion.div>

        <motion.div variants={fadeUp}><BudgetSummaryCard /></motion.div>

        {/* Budget Alert Banner */}
        {d.budgetAlert && d.budgetAlert.level !== 'ok' && (
          <motion.div variants={fadeUp}>
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
          </motion.div>
        )}

        <motion.div variants={fadeUp}><DailyEfficiencyCard /></motion.div>
        <motion.div variants={fadeUp}><WeeklyFeedbackCard /></motion.div>
        <motion.div variants={fadeUp}><WeeklyReportCard /></motion.div>
        <motion.div variants={fadeUp}><CoachCard /></motion.div>
        <motion.div variants={fadeUp}><ConsistencyCard /></motion.div>

        {/* 4. Hydration + Supplements */}
        <motion.div variants={fadeUp} className="flex gap-2">
          <WaterTrackerCompact cups={d.log.waterCups} goal={d.profile.waterGoal + (creatineBoost?.extraCups || 0)} onAdd={d.handleAddWater} />
          <SupplementsCompact
            supplements={d.log.supplements || []}
            onAdd={() => { d.setEditingSupplement(null); d.setSheetOpen(true); }}
            onTap={d.handleSupplementTap}
          />
        </motion.div>
        {creatineBoost && (
          <motion.div variants={fadeUp} className="px-1">
            <div className="rounded-lg bg-primary/10 border border-primary/20 px-3 py-2 text-xs text-primary flex items-center gap-2">
              💧 {creatineBoost.message}
            </div>
          </motion.div>
        )}

        <motion.div variants={fadeUp}>
          <CaloriesBurnedCard log={d.log} weightKg={d.profile.weightKg} onRefresh={d.refreshLog} />
        </motion.div>

        <motion.div variants={fadeUp}><TodayMealPlan /></motion.div>
        <motion.div variants={fadeUp}><RepeatMealsButton onApplied={d.refreshLog} /></motion.div>
        <motion.div variants={fadeUp}>
          <TodayMeals log={d.log} onRefresh={d.refreshLog} dayState={d.dayState} />
        </motion.div>
      </motion.div>

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
