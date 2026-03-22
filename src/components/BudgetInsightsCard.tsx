import { useMemo } from 'react';
import { IndianRupee, TrendingDown, PieChart, Lightbulb, Zap } from 'lucide-react';
import { getBudgetSummary, getNutritionalEconomics, CATEGORY_CONFIG } from '@/lib/budget-service';
import { getBurnRateProjection } from '@/lib/budget-alerts';

export default function BudgetInsightsCard({ refreshKey }: { refreshKey?: number }) {
  const weekly = useMemo(() => getBudgetSummary('week'), [refreshKey]);
  const monthly = useMemo(() => getBudgetSummary('month'), [refreshKey]);
  const projection = useMemo(() => getBurnRateProjection(), [refreshKey]);
  const economics = useMemo(() => getNutritionalEconomics('month'), [refreshKey]);

  const categories = Object.entries(monthly.byCategory).sort((a, b) => b[1] - a[1]);
  const totalSpent = categories.reduce((s, [, v]) => s + v, 0);

  // Generate savings tips
  const tips = useMemo(() => {
    const t: string[] = [];
    const outsideSpend = (monthly.byCategory['restaurant'] || 0) + (monthly.byCategory['street_food'] || 0);
    if (outsideSpend > totalSpent * 0.4 && totalSpent > 0) {
      t.push('Reduce outside food to save ~₹' + Math.round(outsideSpend * 0.3) + '/month');
    }
    if (projection && projection.suggestedDailyBudget > 0) {
      t.push(`Try to spend ≤₹${projection.suggestedDailyBudget}/day for the rest of this ${weekly.period}`);
    }
    if (categories.length > 0) {
      t.push(`Your top spend: ${CATEGORY_CONFIG[categories[0][0]]?.label || categories[0][0]}`);
    }
    if (t.length === 0) t.push('Start logging expenses to get personalized tips');
    return t;
  }, [monthly, projection, totalSpent]);

  if (weekly.budget === 0 && totalSpent === 0) return null;

  const weekPct = Math.min(100, weekly.percentage);
  const monthPct = Math.min(100, monthly.percentage);

  return (
    <div className="card-elevated p-4 space-y-4">
      <div className="flex items-center gap-2">
        <IndianRupee className="w-4 h-4 text-primary" />
        <h3 className="font-semibold text-sm text-foreground">Budget Insights</h3>
      </div>

      {/* Weekly/Monthly bars */}
      <div className="space-y-3">
        {[
          { label: 'This Week', pct: weekPct, spent: weekly.spent, budget: weekly.budget, currency: weekly.currency },
          { label: 'This Month', pct: monthPct, spent: monthly.spent, budget: monthly.budget, currency: monthly.currency },
        ].map(b => (
          <div key={b.label} className="space-y-1">
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-semibold text-foreground">{b.label}</span>
              <span className="text-muted-foreground">
                {b.currency}{b.spent.toLocaleString()} / {b.currency}{b.budget.toLocaleString()}
              </span>
            </div>
            <div className="h-2 rounded-full bg-muted overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${b.pct > 90 ? 'bg-destructive' : b.pct > 70 ? 'bg-accent' : 'bg-primary'}`}
                style={{ width: `${b.pct}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Protein Efficiency Analytics */}
      {economics.avgCostPerProteinGram > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground">
            <Zap className="w-3 h-3" /> Protein Efficiency
          </div>
          <div className="flex gap-2">
            <div className="flex-1 rounded-xl bg-muted p-2.5 text-center">
              <p className="text-lg font-extrabold text-foreground">₹{economics.avgCostPerProteinGram}</p>
              <p className="text-[9px] text-muted-foreground">per gram protein</p>
            </div>
            {economics.bestProteinValue && (
              <div className="flex-1 rounded-xl bg-primary/5 border border-primary/10 p-2.5 text-center">
                <p className="text-[10px] font-bold text-primary">Best Value</p>
                <p className="text-xs font-semibold text-foreground mt-0.5 truncate">{economics.bestProteinValue.name.split(',')[0]}</p>
                <p className="text-[9px] text-muted-foreground">₹{economics.bestProteinValue.costPerGram.toFixed(1)}/g</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Category breakdown (compact) */}
      {categories.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground">
            <PieChart className="w-3 h-3" /> Spending by Category
          </div>
          <div className="flex flex-wrap gap-1.5">
            {categories.slice(0, 5).map(([cat, amount]) => {
              const cfg = CATEGORY_CONFIG[cat] || CATEGORY_CONFIG.other;
              const pct = totalSpent > 0 ? Math.round((amount / totalSpent) * 100) : 0;
              return (
                <div
                  key={cat}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-muted text-[10px]"
                >
                  <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: cfg.color }} />
                  <span className="font-medium text-foreground">{cfg.emoji} {cfg.label}</span>
                  <span className="text-muted-foreground">{pct}%</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Savings tips */}
      <div className="space-y-1.5">
        <div className="flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground">
          <Lightbulb className="w-3 h-3" /> Tips
        </div>
        {tips.map((tip, i) => (
          <div key={i} className="flex items-start gap-2 text-[11px] text-foreground">
            <TrendingDown className="w-3 h-3 text-primary flex-shrink-0 mt-0.5" />
            <span>{tip}</span>
          </div>
        ))}
      </div>
    </div>
  );
}