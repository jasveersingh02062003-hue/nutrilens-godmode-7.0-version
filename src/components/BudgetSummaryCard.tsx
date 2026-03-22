import { useMemo } from 'react';
import { ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getBudgetSummary } from '@/lib/budget-service';
import { getExpensesForDate } from '@/lib/expense-store';

export default function BudgetSummaryCard() {
  const navigate = useNavigate();
  const summary = useMemo(() => getBudgetSummary(), []);

  const today = new Date().toISOString().split('T')[0];
  const todayExpenses = useMemo(() => getExpensesForDate(today), [today]);
  const todaySpent = todayExpenses.reduce((s, e) => s + e.amount, 0);

  const dailyBudget = summary.budget > 0
    ? Math.round(summary.budget / (summary.period === 'week' ? 7 : 30))
    : 0;

  if (dailyBudget <= 0) return null;

  const dailyPct = dailyBudget > 0 ? Math.min(150, Math.round((todaySpent / dailyBudget) * 100)) : 0;
  const dailyRemaining = Math.max(0, dailyBudget - todaySpent);

  // Ring colors
  const ringColor = dailyPct > 100 ? 'hsl(var(--destructive))' : dailyPct > 80 ? 'hsl(var(--accent))' : 'hsl(var(--primary))';
  const ringTrack = 'hsl(var(--muted))';

  // SVG ring
  const size = 72;
  const stroke = 6;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.min(1, dailyPct / 100);
  const offset = circumference * (1 - progress);

  return (
    <button
      onClick={() => navigate('/planner')}
      className="w-full card-subtle p-3.5 text-left active:scale-[0.98] transition-transform"
    >
      <div className="flex items-center gap-3">
        {/* Budget Ring */}
        <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
          <svg width={size} height={size} className="-rotate-90">
            <circle cx={size/2} cy={size/2} r={radius} fill="none" stroke={ringTrack} strokeWidth={stroke} />
            <circle
              cx={size/2} cy={size/2} r={radius} fill="none"
              stroke={ringColor} strokeWidth={stroke}
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              style={{ transition: 'stroke-dashoffset 0.8s cubic-bezier(0.16,1,0.3,1)' }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-xs font-bold text-foreground">₹{todaySpent}</span>
            <span className="text-[8px] text-muted-foreground">/ ₹{dailyBudget}</span>
          </div>
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-foreground">Today's Budget</p>
          <p className={`text-[11px] font-bold mt-0.5 ${dailyPct > 100 ? 'text-destructive' : dailyPct > 80 ? 'text-accent' : 'text-primary'}`}>
            {dailyPct > 100 ? `Over by ₹${todaySpent - dailyBudget}` : `₹${dailyRemaining} remaining`}
          </p>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            {summary.period === 'week' ? 'Weekly' : 'Monthly'}: ₹{summary.spent} / ₹{summary.budget}
          </p>
        </div>

        <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
      </div>
    </button>
  );
}
