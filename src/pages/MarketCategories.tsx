import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TOP_CATEGORIES, SUBCATEGORIES, MARKET_ITEMS, getCityPrice, calculateMarketPES, getMarketPESColor, type MarketTopCategory, type MarketSubcategory } from '@/lib/market-data';
import { useMarket } from '@/contexts/MarketContext';
import MarketPageHeader from '@/components/MarketPageHeader';
import { CategorySidebarSkeleton } from '@/components/market/MarketSkeleton';
import { getCategoryImage } from '@/lib/food-images';
import { getCategoryTip } from '@/lib/nutrition-tips';
import MarketImage from '@/components/market/MarketImage';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, Sparkles } from 'lucide-react';

const CATEGORY_INSIGHTS: Record<string, { insight: string; comparison?: string }> = {
  meat_seafood: { insight: 'Chicken breast gives 31g protein at just ₹3.2/g — leanest and cheapest meat option', comparison: 'Chicken vs Fish' },
  eggs: { insight: 'White eggs give 6.3g protein for just ₹6 — best budget protein source in India', comparison: 'White vs Brown vs Desi' },
  vegetables: { insight: 'Spinach has more iron per ₹ than any supplement — and just 23 calories per 100g', comparison: 'Spinach vs Broccoli' },
  dals_pulses: { insight: 'Soya chunks have 52g protein per 100g — more than chicken at 1/4th the cost', comparison: 'Soya vs Paneer' },
  dairy: { insight: 'Paneer costs ₹20/g protein while milk gives same protein at ₹17/g — choose wisely', comparison: 'Paneer vs Milk' },
  grains_millets: { insight: 'Bajra has 11.6g protein + high iron — best millet for muscle and blood health', comparison: 'Bajra vs Ragi' },
  fruits: { insight: 'Guava has 5x more Vitamin C than oranges at half the price', comparison: 'Guava vs Orange' },
  dry_fruits: { insight: 'Peanuts give 26g protein at ₹120/kg — 6x cheaper than almonds per gram protein', comparison: 'Peanuts vs Almonds' },
  superfoods: { insight: 'Spirulina has 57g protein per 100g — highest of any natural food source', comparison: 'Spirulina vs Moringa' },
  packed_foods: { insight: 'Amul Protein Buttermilk gives 10g protein for ₹30 — best packed protein value', comparison: 'Protein Drinks vs Bars' },
  supplements: { insight: 'Check cost per gram of protein — cheaper isn\'t always better value', comparison: 'Whey vs Plant Protein' },
};

export default function MarketCategories() {
  const navigate = useNavigate();
  const { city, cityLabel, locationLoading } = useMarket();
  const searchParams = new URLSearchParams(window.location.search);
  const initialCat = (searchParams.get('cat') as MarketTopCategory) || 'meat_seafood';
  const [activeCategory, setActiveCategory] = useState<MarketTopCategory>(initialCat);

  const allCategories = TOP_CATEGORIES;
  const subs = SUBCATEGORIES[activeCategory] || [];
  const insightData = CATEGORY_INSIGHTS[activeCategory];

  const subCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    MARKET_ITEMS.filter(i => i.topCategory === activeCategory).forEach(item => {
      counts[item.subcategory] = (counts[item.subcategory] || 0) + 1;
    });
    return counts;
  }, [activeCategory]);

  const topItems = useMemo(() => {
    return MARKET_ITEMS
      .filter(i => i.topCategory === activeCategory)
      .map(item => {
        const price = getCityPrice(item.basePrice, city || 'India');
        const pes = calculateMarketPES(item.protein, price);
        return { ...item, cityPrice: price, pes: Math.round(pes * 100) / 100, pesColor: getMarketPESColor(pes) };
      })
      .sort((a, b) => b.pes - a.pes)
      .slice(0, 4);
  }, [activeCategory, city]);

  const handleSubTap = (cat: MarketTopCategory, sub?: MarketSubcategory) => {
    const params = new URLSearchParams({ category: cat });
    if (sub) params.set('sub', sub);
    navigate(`/market?${params.toString()}`);
  };

  return (
    <div className="max-w-lg mx-auto min-h-screen bg-background pb-24">
      <MarketPageHeader title="Categories" city={cityLabel} />

      <div className="flex min-h-[calc(100vh-120px)]">
        {/* Left Sidebar */}
        {locationLoading ? (
          <CategorySidebarSkeleton />
        ) : (
          <div className="w-20 bg-card/50 border-r border-border/30 overflow-y-auto scrollbar-hide flex-shrink-0">
            {allCategories.map((cat, i) => {
              const isActive = activeCategory === cat.key;
              return (
                <motion.button
                  key={cat.key}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.03 }}
                  onClick={() => setActiveCategory(cat.key)}
                  className={`relative w-full flex flex-col items-center gap-1 py-3 px-1 transition-all ${
                    isActive ? 'bg-primary/8' : 'hover:bg-muted/50'
                  }`}
                >
                  {isActive && (
                    <motion.div
                      layoutId="category-active-bar"
                      className="absolute left-0 top-0 bottom-0 w-[3px] bg-primary rounded-r-full"
                      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                    />
                  )}
                  <span className="text-2xl">{cat.emoji}</span>
                  <span className={`text-[9px] text-center leading-tight ${
                    isActive ? 'font-bold text-primary' : 'font-medium text-muted-foreground'
                  }`}>
                    {cat.label.split(' ')[0]}
                  </span>
                </motion.button>
              );
            })}
          </div>
        )}

        {/* Right Content Area */}
        <div className="flex-1 overflow-y-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeCategory}
              initial={{ opacity: 0, x: 15 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -15 }}
              transition={{ duration: 0.2 }}
              className="p-4 space-y-4"
            >
              <div>
                <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                  {allCategories.find(c => c.key === activeCategory)?.emoji}
                  {allCategories.find(c => c.key === activeCategory)?.label}
                </h2>
                <p className="text-[10px] text-muted-foreground mt-0.5">{MARKET_ITEMS.filter(i => i.topCategory === activeCategory).length} items available</p>
              </div>

              {/* Category hero image */}
              {(() => {
                const catImg = getCategoryImage(activeCategory);
                return catImg ? (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="relative h-24 rounded-xl overflow-hidden"
                  >
                    <img src={catImg} alt={activeCategory} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-transparent" />
                  </motion.div>
                ) : null;
              })()}

              {insightData && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.1 }}
                  className="p-3 rounded-xl bg-gradient-to-r from-primary/8 to-accent/8 border border-primary/15"
                >
                  <div className="flex items-start gap-2">
                    <Sparkles className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-[11px] font-medium text-foreground leading-relaxed">{insightData.insight}</p>
                      {insightData.comparison && (
                        <button className="text-[10px] font-bold text-primary mt-1.5">
                          ⚖️ Compare: {insightData.comparison} →
                        </button>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}

              <div className="space-y-2">
                <h3 className="text-xs font-bold text-foreground">Subcategories</h3>
                <div className="grid grid-cols-2 gap-2">
                  <motion.button
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleSubTap(activeCategory)}
                    className="p-3 rounded-xl bg-primary/8 border border-primary/20 text-left hover:bg-primary/12 transition-colors"
                  >
                    <p className="text-[11px] font-bold text-primary">View All</p>
                    <p className="text-[9px] text-muted-foreground mt-0.5">
                      {MARKET_ITEMS.filter(i => i.topCategory === activeCategory).length} items
                    </p>
                  </motion.button>

                  {subs.map((sub, i) => (
                    <motion.button
                      key={sub.key}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: (i + 1) * 0.04 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => handleSubTap(activeCategory, sub.key)}
                      className="p-3 rounded-xl bg-card border border-border/50 text-left hover:border-primary/20 transition-colors"
                    >
                      <p className="text-[11px] font-semibold text-foreground">{sub.label}</p>
                      <p className="text-[9px] text-muted-foreground mt-0.5">{subCounts[sub.key] || 0} items</p>
                    </motion.button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <h3 className="text-xs font-bold text-foreground">🏆 Top Value in {allCategories.find(c => c.key === activeCategory)?.label}</h3>
                {topItems.map((item, i) => (
                    <motion.button
                      key={item.id}
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.15 + i * 0.04 }}
                      onClick={() => handleSubTap(activeCategory)}
                      className="w-full flex items-center gap-3 p-3 rounded-xl bg-card border border-border/50 text-left hover:border-primary/20 transition-colors"
                    >
                      <MarketImage itemId={item.id} emoji={item.emoji} alt={item.name} size="sm" />
                      <div className="flex-1 min-w-0">
                        <p className="text-[12px] font-semibold text-foreground truncate">{item.name}</p>
                        <p className="text-[10px] text-muted-foreground">₹{item.cityPrice}/{item.unit} · {item.protein}g protein</p>
                      </div>
                      <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                        item.pesColor === 'green' ? 'bg-green-500/10 text-green-600'
                        : item.pesColor === 'yellow' ? 'bg-amber-500/10 text-amber-600'
                        : 'bg-red-500/10 text-red-600'
                      }`}>
                        PES {item.pes}
                      </span>
                      <ChevronRight className="w-4 h-4 text-muted-foreground" />
                    </motion.button>
                ))}
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
