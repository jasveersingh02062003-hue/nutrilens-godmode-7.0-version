import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { X, Flame, Beef, Wallet, UtensilsCrossed } from 'lucide-react';
import { getDailyPlanData } from '@/lib/daily-plan-message';
import { setDailyHidden } from '@/lib/daily-visibility';
import { getGreeting } from '@/lib/nutrition';
import type { UserProfile } from '@/lib/store';

interface DailyPlanCardProps {
  profile: UserProfile;
  onDismiss: () => void;
}

const MEAL_EMOJIS: Record<string, string> = {
  breakfast: '🌅',
  lunch: '☀️',
  snack: '🍪',
  dinner: '🌙',
};

export default function DailyPlanCard({ profile, onDismiss }: DailyPlanCardProps) {
  const navigate = useNavigate();
  const plan = useMemo(() => getDailyPlanData(profile), [profile]);

  if (!plan) return null;

  const handleDismiss = () => {
    setDailyHidden('daily_plan');
    onDismiss();
  };

  const greeting = getGreeting();

  return (
    <Card className="animate-fade-in border-primary/20 bg-gradient-to-br from-primary/5 to-accent/5 shadow-md">
      <CardContent className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div>
            <h3 className="text-base font-bold text-foreground">{greeting} ☀️</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Here's your plan for today</p>
          </div>
          <button
            onClick={handleDismiss}
            className="p-1 rounded-lg hover:bg-muted/50 text-muted-foreground"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Summary metrics */}
        <div className="grid grid-cols-3 gap-2 mb-3">
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

        {/* Meal breakdown */}
        <div className="space-y-1.5">
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

        {/* CTA */}
        <Button
          size="sm"
          className="w-full mt-3 text-xs h-9"
          onClick={() => navigate('/planner')}
        >
          <UtensilsCrossed className="w-3.5 h-3.5 mr-1.5" />
          View Full Plan
        </Button>
      </CardContent>
    </Card>
  );
}
