import { useMemo } from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { dailyEfficiency } from '@/lib/pes-engine';
import { getBudgetSettings } from '@/lib/expense-store';
import PESBadge from './PESBadge';
import { motion } from 'framer-motion';

export default function DailyEfficiencyCard() {
  const settings = getBudgetSettings();
  const budgetEnabled = (settings.weeklyBudget || 0) > 0;

  const efficiency = useMemo(() => dailyEfficiency(), []);

  // Don't render if budget not set or no meals with cost logged
  if (!budgetEnabled || efficiency.totalCost <= 0) return null;

  const isGood = efficiency.color === 'green';

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="rounded-2xl border border-border bg-card p-4 shadow-sm"
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          {isGood
            ? <TrendingUp className="w-4 h-4 text-green-600" />
            : <TrendingDown className="w-4 h-4 text-amber-600" />
          }
          <p className="text-xs font-semibold text-foreground">Food Efficiency</p>
        </div>
        <PESBadge pes={efficiency.pes} color={efficiency.color} size="md" />
      </div>

      <div className="flex items-center gap-4 text-[11px] text-muted-foreground">
        <span>₹{efficiency.totalCost} spent</span>
        <span>{efficiency.totalProtein}g protein</span>
      </div>

      {efficiency.suggestion && (
        <p className="text-[10px] text-muted-foreground mt-2 italic">
          💡 {efficiency.suggestion}
        </p>
      )}
    </motion.div>
  );
}
