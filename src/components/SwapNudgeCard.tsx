import { useState, useEffect } from 'react';
import { Lightbulb, ArrowRight, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { getMarketItems, getSwapSuggestions, type MarketItem } from '@/lib/market-service';
import { useUserProfile } from '@/contexts/UserProfileContext';
import { scopedGet, scopedSet } from '@/lib/scoped-storage';
import { toast } from 'sonner';

interface SwapNudgeCardProps {
  mealName: string;
  mealCost: number;
  mealProtein: number;
}

export default function SwapNudgeCard({ mealName, mealCost, mealProtein }: SwapNudgeCardProps) {
  const { profile } = useUserProfile();
  const [swap, setSwap] = useState<MarketItem | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const city = (profile as any)?.city || 'India';

  useEffect(() => {
    if (mealCost <= 0 || mealProtein <= 0) return;
    const costPerGram = mealCost / mealProtein;

    getMarketItems(city, 'all', 'pes').then(items => {
      const suggestions = getSwapSuggestions(mealName, costPerGram, mealProtein, items);
      if (suggestions.length > 0) setSwap(suggestions[0]);
    });
  }, [mealName, mealCost, mealProtein, city]);

  if (!swap || dismissed) return null;

  const savings = Math.max(0, mealCost - Math.round(swap.costPerGramProtein * mealProtein));
  const proteinDiff = Math.round(swap.protein - mealProtein);

  if (savings <= 5) return null;

  const handleSwap = () => {
    // Record savings
    const key = 'nutrilens_market_savings';
    const existing = JSON.parse(scopedGet(key) || '{"weekly":0,"monthly":0}');
    existing.weekly = (existing.weekly || 0) + savings;
    existing.monthly = (existing.monthly || 0) + savings;
    scopedSet(key, JSON.stringify(existing));

    toast.success(`Swap noted! Save ₹${savings} with ${swap.name}`, {
      description: 'Added to your savings tracker',
    });
    setDismissed(true);
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, height: 0 }}
        animate={{ opacity: 1, height: 'auto' }}
        exit={{ opacity: 0, height: 0 }}
        className="rounded-xl border border-primary/20 bg-primary/5 p-3 mt-1"
      >
        <div className="flex items-start gap-2">
          <Lightbulb className="w-4 h-4 text-primary mt-0.5 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-bold text-foreground">💡 Smarter swap available</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              {swap.name}: ₹{Math.round(swap.costPerGramProtein * mealProtein)}, {swap.protein}g protein
            </p>
            <p className="text-[10px] font-semibold text-primary mt-0.5">
              Save ₹{savings}{proteinDiff > 0 ? ` + ${proteinDiff}g more protein` : ''}
            </p>
            <div className="flex gap-2 mt-2">
              <button
                onClick={handleSwap}
                className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-[10px] font-bold"
              >
                Swap ✓
              </button>
              <button
                onClick={() => setDismissed(true)}
                className="px-3 py-1.5 rounded-lg bg-muted text-muted-foreground text-[10px] font-semibold"
              >
                Keep Current
              </button>
            </div>
          </div>
          <button onClick={() => setDismissed(true)} className="shrink-0">
            <X className="w-3.5 h-3.5 text-muted-foreground" />
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
