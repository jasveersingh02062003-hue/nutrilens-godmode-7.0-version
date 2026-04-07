import { motion } from 'framer-motion';
import { TOP_CATEGORIES, SUBCATEGORIES, FRESH_CATEGORIES, PACKED_CATEGORIES, type MarketTopCategory, type MarketSubcategory, type MarketViewMode } from '@/lib/market-data';

interface MarketCategoryGridProps {
  selectedCategory: MarketTopCategory | null;
  selectedSub: MarketSubcategory | null;
  viewMode: MarketViewMode;
  onSelectCategory: (cat: MarketTopCategory | null) => void;
  onSelectSub: (sub: MarketSubcategory | null) => void;
}

export default function MarketCategoryGrid({ selectedCategory, selectedSub, viewMode, onSelectCategory, onSelectSub }: MarketCategoryGridProps) {
  const allowedKeys = viewMode === 'fresh' ? FRESH_CATEGORIES : PACKED_CATEGORIES;
  const visibleCategories = TOP_CATEGORIES.filter(c => allowedKeys.includes(c.key));
  const subs = selectedCategory ? SUBCATEGORIES[selectedCategory] || [] : [];

  return (
    <div className="space-y-3">
      {/* Top-level category grid */}
      <div className="grid grid-cols-3 gap-2">
        {visibleCategories.map((cat, i) => {
          const isActive = selectedCategory === cat.key;
          return (
            <motion.button
              key={cat.key}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.03 }}
              onClick={() => {
                if (isActive) {
                  onSelectCategory(null);
                  onSelectSub(null);
                } else {
                  onSelectCategory(cat.key);
                  onSelectSub(null);
                }
              }}
              className={`relative flex flex-col items-center gap-1.5 p-3 rounded-2xl border transition-all duration-200 ${
                isActive
                  ? 'border-primary/40 bg-primary/10 shadow-sm'
                  : 'border-border bg-card hover:border-primary/20'
              }`}
            >
              <span className="text-2xl">{cat.emoji}</span>
              <span className={`text-[10px] font-semibold leading-tight text-center ${
                isActive ? 'text-primary' : 'text-foreground'
              }`}>
                {cat.label}
              </span>
              {isActive && (
                <motion.div
                  layoutId="category-indicator"
                  className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-6 h-1 rounded-full bg-primary"
                />
              )}
            </motion.button>
          );
        })}
      </div>

      {/* Sub-category pills */}
      {subs.length > 0 && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          className="flex gap-2 overflow-x-auto scrollbar-hide pb-1"
        >
          <button
            onClick={() => onSelectSub(null)}
            className={`px-3 py-1.5 rounded-full text-[11px] font-semibold whitespace-nowrap transition-colors ${
              !selectedSub
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            All
          </button>
          {subs.map(sub => (
            <button
              key={sub.key}
              onClick={() => onSelectSub(selectedSub === sub.key ? null : sub.key)}
              className={`px-3 py-1.5 rounded-full text-[11px] font-semibold whitespace-nowrap transition-colors ${
                selectedSub === sub.key
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              {sub.label}
            </button>
          ))}
        </motion.div>
      )}
    </div>
  );
}
