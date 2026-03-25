import { getDailyLog, getDailyTotals, getProfile } from '@/lib/store';
import { getProteinTarget } from '@/lib/calorie-correction';

export default function TimeInsightCard() {
  const profile = getProfile();
  if (!profile) return null;

  const hour = new Date().getHours();
  const today = new Date().toISOString().split('T')[0];
  const todayLog = getDailyLog(today);
  const todayTotals = getDailyTotals(todayLog);
  const proteinTarget = getProteinTarget(profile);
  const proteinRemaining = proteinTarget - todayTotals.protein;

  // Morning insight: check yesterday's dinner
  if (hour >= 6 && hour < 11) {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayLog = getDailyLog(yesterday.toISOString().split('T')[0]);
    const dinnerMeals = yesterdayLog.meals.filter(m => m.type === 'dinner');
    const dinnerCal = dinnerMeals.reduce((s, m) => s + m.items.reduce((is, i) => is + (i.calories || 0) * (i.quantity || 1), 0), 0);
    const yesterdayTotal = getDailyTotals(yesterdayLog).eaten;

    if (yesterdayTotal > 0 && dinnerCal > yesterdayTotal * 0.4) {
      return (
        <div className="flex items-center gap-3 rounded-2xl px-4 py-3 border bg-accent/5 border-accent/15">
          <span className="text-sm">🌅</span>
          <p className="text-[11px] font-medium text-foreground">Light breakfast suggested after yesterday's large dinner.</p>
        </div>
      );
    }
  }

  // Evening insight: protein remaining
  if (hour >= 18 && proteinRemaining > 30) {
    return (
      <div className="flex items-center gap-3 rounded-2xl px-4 py-3 border bg-coral/5 border-coral/15">
        <span className="text-sm">💪</span>
        <p className="text-[11px] font-medium text-foreground">
          You still need {Math.round(proteinRemaining)}g protein — try eggs, paneer, or soya for a quick boost.
        </p>
      </div>
    );
  }

  return null;
}
