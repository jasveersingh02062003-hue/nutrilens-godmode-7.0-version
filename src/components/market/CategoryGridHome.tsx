import { motion } from 'framer-motion';
import { TOP_CATEGORIES, MARKET_ITEMS, type MarketTopCategory } from '@/lib/market-data';
import { useMemo } from 'react';
import { ChevronRight } from 'lucide-react';

interface CategoryGridHomeProps {
  onCategoryTap: (category: MarketTopCategory) => void;
}

// Only show fresh categories on homepage grid
const HOME_CATEGORIES: MarketTopCategory[] = ['meat_seafood', 'eggs', 'vegetables', 'dals_pulses', 'dairy', 'grains_millets', 'fruits', 'dry_fruits', 'superfoods'];

const GRADIENT_COLORS: Record<string, string> = {
  meat_seafood: 'from-red-500/12 to-red-500/3',
  eggs: 'from-amber-500/12 to-amber-500/3',
  vegetables: 'from-green-500/12 to-green-500/3',
  dals_pulses: 'from-orange-500/12 to-orange-500/3',
  dairy: 'from-blue-400/12 to-blue-400/3',
  grains_millets: 'from-yellow-600/12 to-yellow-600/3',
  fruits: 'from-pink-500/12 to-pink-500/3',
  dry_fruits: 'from-amber-700/12 to-amber-700/3',
  superfoods: 'from-emerald-500/12 to-emerald-500/3',
};

export default function CategoryGridHome({ onCategoryTap }: CategoryGridHomeProps) {
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    MARKET_ITEMS.forEach(item => {
      counts[item.topCategory] = (counts[item.topCategory] || 0) + 1;
    });
    return counts;
  }, []);

  const categories = TOP_CATEGORIES.filter(c => HOME_CATEGORIES.includes(c.key));

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between px-1">
        <h2 className="text-xs font-bold text-foreground">📂 Browse by Category</h2>
        <button
          onClick={() => onCategoryTap('meat_seafood')}
          className="text-[10px] text-primary font-semibold flex items-center gap-0.5"
        >
          View All <ChevronRight className="w-3 h-3" />
        </button>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {categories.map((cat, i) => (
          <motion.button
            key={cat.key}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => onCategoryTap(cat.key)}
            className={`p-3 rounded-2xl bg-gradient-to-br ${GRADIENT_COLORS[cat.key] || 'from-muted to-muted/50'} border border-border/40 text-center hover:border-primary/20 transition-all shadow-sm`}
          >
            <span className="text-2xl block mb-1">{cat.emoji}</span>
            <p className="text-[11px] font-bold text-foreground leading-tight">{cat.label}</p>
            <p className="text-[9px] text-muted-foreground mt-0.5">{categoryCounts[cat.key] || 0} items</p>
          </motion.button>
        ))}
      </div>
    </div>
  );
}
