import { useState } from 'react';
import { motion } from 'framer-motion';
import { TOP_CATEGORIES, SUBCATEGORIES, FRESH_CATEGORIES, PACKED_CATEGORIES, type MarketTopCategory, type MarketSubcategory, type MarketViewMode } from '@/lib/market-data';
import MarketPageHeader from '@/components/MarketPageHeader';
import { Leaf, Package } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function MarketCategories() {
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState<MarketViewMode>('fresh');
  const [expandedCategory, setExpandedCategory] = useState<MarketTopCategory | null>(null);

  const allowedKeys = viewMode === 'fresh' ? FRESH_CATEGORIES : PACKED_CATEGORIES;
  const visibleCategories = TOP_CATEGORIES.filter(c => allowedKeys.includes(c.key));

  const handleSubTap = (cat: MarketTopCategory, sub?: MarketSubcategory) => {
    // Navigate to main shop with category pre-selected via query params
    const params = new URLSearchParams({ category: cat });
    if (sub) params.set('sub', sub);
    navigate(`/market?${params.toString()}`);
  };

  return (
    <div className="max-w-lg mx-auto min-h-screen bg-background pb-24">
      <MarketPageHeader title="Categories" />

      <div className="px-4 pt-4 space-y-4">
        {/* Fresh / Packed Toggle */}
        <div className="flex p-1 rounded-xl bg-muted">
          <button
            onClick={() => { setViewMode('fresh'); setExpandedCategory(null); }}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-all ${
              viewMode === 'fresh' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Leaf className="w-3.5 h-3.5" /> Fresh Foods
          </button>
          <button
            onClick={() => { setViewMode('packed'); setExpandedCategory(null); }}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-all ${
              viewMode === 'packed' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Package className="w-3.5 h-3.5" /> Packed & Branded
          </button>
        </div>

        {/* Category Grid */}
        <div className="space-y-3">
          {visibleCategories.map((cat, i) => {
            const isExpanded = expandedCategory === cat.key;
            const subs = SUBCATEGORIES[cat.key] || [];

            return (
              <motion.div
                key={cat.key}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
              >
                <button
                  onClick={() => setExpandedCategory(isExpanded ? null : cat.key)}
                  className={`w-full flex items-center gap-3 p-4 rounded-2xl border transition-all ${
                    isExpanded ? 'border-primary/30 bg-primary/5' : 'border-border bg-card hover:border-primary/20'
                  }`}
                >
                  <span className="text-3xl">{cat.emoji}</span>
                  <div className="flex-1 text-left">
                    <p className={`text-sm font-bold ${isExpanded ? 'text-primary' : 'text-foreground'}`}>{cat.label}</p>
                    <p className="text-[10px] text-muted-foreground">{subs.length} subcategories</p>
                  </div>
                  <motion.span
                    animate={{ rotate: isExpanded ? 180 : 0 }}
                    className="text-muted-foreground text-xs"
                  >
                    ▼
                  </motion.span>
                </button>

                {isExpanded && subs.length > 0 && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    className="pl-4 pr-2 pt-2 space-y-1"
                  >
                    <button
                      onClick={() => handleSubTap(cat.key)}
                      className="w-full text-left px-4 py-2.5 rounded-xl bg-muted hover:bg-muted/80 text-xs font-semibold text-foreground transition-colors"
                    >
                      View All {cat.label}
                    </button>
                    {subs.map(sub => (
                      <button
                        key={sub.key}
                        onClick={() => handleSubTap(cat.key, sub.key)}
                        className="w-full text-left px-4 py-2.5 rounded-xl hover:bg-muted/60 text-xs text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {sub.label}
                      </button>
                    ))}
                  </motion.div>
                )}
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
