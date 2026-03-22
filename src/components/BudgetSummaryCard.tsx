import { useMemo } from 'react';
import { IndianRupee, ChevronRight, TrendingUp } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getBudgetSummary } from '@/lib/budget-service';
import { getExpensesForDate } from '@/lib/expense-store';

export default function BudgetSummaryCard() {
  const navigate = useNavigate();
  const summary = useMemo(() => getBudgetSummary(), []);

  // Daily budget & today's spend
  const today = new Date().toISOString().split('T')[0];
  const todayExpenses = useMemo(() => getExpensesForDate(today), [today]);
  const todaySpent = todayExpenses.reduce((s, e) => s + e.amount, 0);

  // Calculate daily budget from weekly
  const dailyBudget = summary.budget > 0
    ? Math.round(summary.budget / (summary.period === 'week' ? 7 : 30))
    : 0;

  const dailyPct = dailyBudget > 0 ? Math.min(100, Math.round((todaySpent / dailyBudget) * 100)) : 0;
  const dailyBarColor = dailyPct > 90 ? 'bg-destructive' : dailyPct > 70 ? 'bg-accent' : 'bg-primary';
  const dailyRemaining = Math.max(0, dailyBudget - todaySpent);

  const pct = Math.min(100, summary.percentage);
  const barColor = pct > 90 ? 'bg-destructive' : pct > 70 ? 'bg-accent' : 'bg-primary';
  const textColor = pct > 90 ? 'text-destructive' : pct > 70 ? 'text-accent' : 'text-primary';

  return (
    <button
      onClick={() => navigate('/planner')}
      className="w-full card-subtle p-3.5 text-left active:scale-[0.98] transition-transform space-y-3"
    >
      {/* Daily budget */}
      {dailyBudget > 0 && (
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-accent/10 flex items-center justify-center flex-shrink-0">
            <TrendingUp className="w-4 h-4 text-accent" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-semibold text-foreground">Today's Budget</span>
              <span className={`text-[10px] font-bold ${dailyPct > 90 ? 'text-destructive' : 'text-accent'}`}>
                ₹{dailyRemaining} left
              </span>
            </div>
            <div className="h-1.5 rounded-full bg-muted overflow-hidden">
              <div className={`h-full rounded-full ${dailyBarColor} transition-all`} style={{ width: `${dailyPct}%` }} />
            </div>
            <p className="text-[10px] text-muted-foreground mt-1">
              ₹{todaySpent} / ₹{dailyBudget}
            </p>
          </div>
        </div>
      )}

      {/* Weekly/Monthly budget */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
          <IndianRupee className="w-4 h-4 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-semibold text-foreground">
              {summary.period === 'week' ? 'Weekly' : 'Monthly'} Budget
            </span>
            <span className={`text-[10px] font-bold ${textColor}`}>{pct}%</span>
          </div>
          <div className="h-1.5 rounded-full bg-muted overflow-hidden">
            <div className={`h-full rounded-full ${barColor} transition-all`} style={{ width: `${pct}%` }} />
          </div>
          <p className="text-[10px] text-muted-foreground mt-1">
            {summary.currency}{summary.spent} / {summary.currency}{summary.budget}
          </p>
        </div>
        <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
      </div>
    </button>
  );
}