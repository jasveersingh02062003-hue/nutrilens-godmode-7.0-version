import { motion } from 'framer-motion';
import { TOP_CATEGORIES, MARKET_ITEMS, type MarketTopCategory } from '@/lib/market-data';
import { useMemo } from 'react';
import { ChevronRight } from 'lucide-react';
import { getCategoryImage } from '@/lib/food-images';
import { useNavigate } from 'react-router-dom';
import { useMarket } from '@/contexts/MarketContext';

interface CategoryGridHomeProps {
  onCategoryTap: (category: MarketTopCategory) => void;
}

const HOME_CATEGORIES: MarketTopCategory[] = ['meat_seafood', 'eggs', 'vegetables', 'dals_pulses', 'dairy', 'grains_millets', 'fruits', 'dry_fruits', 'superfoods'];

// Categories that are entirely non-veg
const NON_VEG_CATEGORIES: MarketTopCategory[] = ['meat_seafood'];

export default function CategoryGridHome({ onCategoryTap }: CategoryGridHomeProps) {
  const navigate = useNavigate();
  const { vegOnly } = useMarket();

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    MARKET_ITEMS.forEach(item => {
      if (vegOnly && !item.isVeg) return;
      counts[item.topCategory] = (counts[item.topCategory] || 0) + 1;
    });
    return counts;
  }, [vegOnly]);

  const categories = useMemo(() => {
    let cats = TOP_CATEGORIES.filter(c => HOME_CATEGORIES.includes(c.key));
    if (vegOnly) cats = cats.filter(c => !NON_VEG_CATEGORIES.includes(c.key));
    return cats;
  }, [vegOnly]);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between px-1">
        <h2 className="text-xs font-bold text-foreground">Browse by Category</h2>
        <button
          onClick={() => navigate('/market/categories')}
          className="text-[10px] text-primary font-semibold flex items-center gap-0.5"
        >
          View All <ChevronRight className="w-3 h-3" />
        </button>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {categories.map((cat, i) => {
          const imageUrl = getCategoryImage(cat.key);
          return (
            <motion.button
              key={cat.key}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => navigate(`/market/categories?cat=${cat.key}`)}
              className="relative p-3 rounded-2xl border border-border/40 text-center hover:border-primary/20 transition-all shadow-sm overflow-hidden"
            >
              {imageUrl ? (
                <div className="absolute inset-0">
                  <img
                    src={imageUrl}
                    alt={cat.label}
                    className="w-full h-full object-cover transition-opacity duration-300"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-background via-background/80 to-background/40" />
                </div>
              ) : (
                <div className="absolute inset-0 bg-gradient-to-br from-muted to-muted/50" />
              )}

              <div className="relative z-10">
                <p className="text-[11px] font-bold text-foreground leading-tight">{cat.label}</p>
                <p className="text-[9px] text-muted-foreground mt-0.5">{categoryCounts[cat.key] || 0} items</p>
              </div>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
