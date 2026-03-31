import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Flame, Beef, Wallet, UtensilsCrossed } from 'lucide-react';
import { getDailyPlanData } from '@/lib/daily-plan-message';
import { setDailyHidden } from '@/lib/daily-visibility';
import { getGreeting } from '@/lib/nutrition';
import { validateBudgetVsGoals, getUnifiedBudget } from '@/lib/budget-engine';
import { AlertTriangle } from 'lucide-react';
import type { UserProfile } from '@/lib/store';

interface DailyPlanCardProps {
  profile: UserProfile;
  open: boolean;
  onDismiss: () => void;
}

const MEAL_EMOJIS: Record<string, string> = {
  breakfast: '🌅',
  lunch: '☀️',
  snack: '🍪',
  dinner: '🌙',
};

export default function DailyPlanCard({ profile, open, onDismiss }: DailyPlanCardProps) {
  const navigate = useNavigate();
  const plan = useMemo(() => getDailyPlanData(profile), [profile]);
  const budgetValidation = useMemo(() => {
    const unified = getUnifiedBudget();
    return validateBudgetVsGoals(unified.monthly, profile.dailyCalories || 2000, profile.dailyProtein || 80);
  }, [profile]);

  if (!plan) return null;

  const handleDismiss = () => {
    setDailyHidden('daily_plan');
    onDismiss();
  };

  const greeting = getGreeting();

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleDismiss(); }}>
      <DialogContent className="max-w-sm mx-auto rounded-2xl border-primary/20 bg-gradient-to-br from-primary/5 via-background to-accent/5 p-5 gap-0">
        <DialogTitle className="sr-only">Daily Plan</DialogTitle>

        <div className="mb-4">
          <h3 className="text-lg font-bold text-foreground">{greeting} ☀️</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Here's your plan for today</p>
        </div>

        <div className="grid grid-cols-3 gap-2 mb-4">
          <div className="flex items-center gap-1.5 rounded-xl bg-card border border-border px-2.5 py-2">
            <Flame className="w-3.5 h-3.5 text-coral" />
            <div>
              <p className="text-xs font-bold text-foreground">{plan.adjustedCalories}</p>
              <p className="text-[10px] text-muted-foreground">kcal</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 rounded-xl bg-card border border-border px-2.5 py-2">
            <Beef className="w-3.5 h-3.5 text-primary" />
            <div>
              <p className="text-xs font-bold text-foreground">{plan.proteinTarget}g</p>
              <p className="text-[10px] text-muted-foreground">protein</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 rounded-xl bg-card border border-border px-2.5 py-2">
            <Wallet className="w-3.5 h-3.5 text-accent" />
            <div>
              <p className="text-xs font-bold text-foreground">{plan.currency}{plan.remainingBudget}</p>
              <p className="text-[10px] text-muted-foreground">budget</p>
            </div>
          </div>
        </div>

        {budgetValidation.severity !== 'ok' && (
          <div className={`rounded-xl px-3 py-2 mb-3 flex items-start gap-2 text-[11px] font-medium ${
            budgetValidation.severity === 'insufficient'
              ? 'bg-destructive/10 text-destructive'
              : 'bg-amber-500/10 text-amber-700 dark:text-amber-400'
          }`}>
            <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
            <span>
              {budgetValidation.severity === 'insufficient'
                ? `Budget too low for your goals. Recommended: ${plan?.currency || '₹'}${budgetValidation.minMonthly}/month`
                : 'Budget is tight — high-PES meals prioritized'}
            </span>
          </div>
        )}

        <div className="space-y-1.5 mb-4">
          {plan.meals.map(meal => (
            <div
              key={meal.type}
              className="flex items-center gap-2 rounded-lg bg-card/60 border border-border/50 px-3 py-2"
            >
              <span className="text-sm">{MEAL_EMOJIS[meal.type] || '🍽️'}</span>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-foreground">{meal.label}</p>
                {meal.suggestion ? (
                  <p className="text-[10px] text-muted-foreground truncate">Try: {meal.suggestion}</p>
                ) : (
                  <p className="text-[10px] text-muted-foreground">Plan your meal</p>
                )}
              </div>
              <div className="text-right shrink-0">
                <p className="text-[10px] font-medium text-foreground">{meal.targetCal} kcal</p>
                <p className="text-[10px] text-muted-foreground">{plan.currency}{meal.budget}</p>
              </div>
            </div>
          ))}
        </div>

        <Button
          size="sm"
          className="w-full text-xs h-9"
          onClick={() => { handleDismiss(); navigate('/planner'); }}
        >
          <UtensilsCrossed className="w-3.5 h-3.5 mr-1.5" />
          View Full Plan
        </Button>
      </DialogContent>
    </Dialog>
  );
}
