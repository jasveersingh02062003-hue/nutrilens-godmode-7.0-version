import { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TOP_CATEGORIES, SUBCATEGORIES, MARKET_ITEMS, getCityPrice, calculateMarketPES, getMarketPESColor, type MarketTopCategory, type MarketSubcategory } from '@/lib/market-data';
import { useMarket } from '@/contexts/MarketContext';
import MarketPageHeader from '@/components/MarketPageHeader';
import MarketItemCard from '@/components/MarketItemCard';
import MarketItemDetailSheet from '@/components/MarketItemDetailSheet';
import { CategorySidebarSkeleton } from '@/components/market/MarketSkeleton';
import { getCategoryImage, getCategoryThumbnail } from '@/lib/food-images';
import { getCategoryTip } from '@/lib/nutrition-tips';
import MarketImage from '@/components/market/MarketImage';
import SponsoredCard from '@/components/market/SponsoredCard';
import { ChevronRight, Sparkles, ArrowLeft, SlidersHorizontal } from 'lucide-react';
import { type MarketItem as LegacyMarketItem } from '@/lib/market-service';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { useAdServing } from '@/hooks/useAdServing';
import { useAuth } from '@/contexts/AuthContext';

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

type SortMode = 'pes' | 'price' | 'protein';

const SORT_OPTIONS: { key: SortMode; label: string }[] = [
  { key: 'pes', label: 'Best Value' },
  { key: 'price', label: 'Lowest Price' },
  { key: 'protein', label: 'Most Protein' },
];

function CategoryThumbnail({ categoryKey, emoji }: { categoryKey: string; emoji: string }) {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);
  const url = getCategoryThumbnail(categoryKey);

  if (!url || error) {
    return (
      <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
        <span className="text-lg">{emoji}</span>
      </div>
    );
  }

  return (
    <div className="w-10 h-10 rounded-full overflow-hidden bg-muted flex-shrink-0">
      <img
        src={url}
        alt={categoryKey}
        onLoad={() => setLoaded(true)}
        onError={() => setError(true)}
        className={`w-full h-full object-cover transition-opacity duration-300 ${loaded ? 'opacity-100' : 'opacity-0'}`}
      />
    </div>
  );
}

export default function MarketCategories() {
  const navigate = useNavigate();
  const { city, cityLabel, locationLoading, processedItems, toMarketItem, vegOnly } = useMarket();
  const { user } = useAuth();
  const searchParams = new URLSearchParams(window.location.search);
  const initialCat = (searchParams.get('cat') as MarketTopCategory) || 'meat_seafood';
  const [activeCategory, setActiveCategory] = useState<MarketTopCategory>(initialCat);
  const [selectedSub, setSelectedSub] = useState<MarketSubcategory | null>(null);
  const [sort, setSort] = useState<SortMode>('pes');
  const [selectedItem, setSelectedItem] = useState<LegacyMarketItem | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const { ad: categoryAd, logImpression: logCatImpression, logClick: logCatClick } = useAdServing('category_promoted', { category: activeCategory });

  const allCategories = useMemo(() => {
    if (!vegOnly) return TOP_CATEGORIES;
    // Filter out categories with zero veg items
    return TOP_CATEGORIES.filter(cat => {
      return MARKET_ITEMS.some(i => i.topCategory === cat.key && i.isVeg);
    });
  }, [vegOnly]);
  const subs = SUBCATEGORIES[activeCategory] || [];
  const insightData = CATEGORY_INSIGHTS[activeCategory];

  const subCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    let items = MARKET_ITEMS.filter(i => i.topCategory === activeCategory);
    if (vegOnly) items = items.filter(i => i.isVeg);
    items.forEach(item => {
      counts[item.subcategory] = (counts[item.subcategory] || 0) + 1;
    });
    return counts;
  }, [activeCategory, vegOnly]);

  const topItems = useMemo(() => {
    let items = processedItems.filter(i => i.topCategory === activeCategory);
    if (vegOnly) items = items.filter(i => i.isVeg);
    return items.sort((a, b) => b.pes - a.pes).slice(0, 4);
  }, [activeCategory, processedItems, vegOnly]);

  // Items for inline browsing when a subcategory is selected
  const inlineItems = useMemo(() => {
    if (!selectedSub && selectedSub !== null) return [];
    let items = processedItems.filter(i => i.topCategory === activeCategory);
    if (selectedSub) items = items.filter(i => i.subcategory === selectedSub);
    if (vegOnly) items = items.filter(i => i.isVeg);
    switch (sort) {
      case 'pes': return [...items].sort((a, b) => b.pes - a.pes);
      case 'price': return [...items].sort((a, b) => a.cityPrice - b.cityPrice);
      case 'protein': return [...items].sort((a, b) => b.protein - a.protein);
    }
    return items;
  }, [activeCategory, selectedSub, processedItems, sort, vegOnly]);

  const handleOpenDetail = useCallback((item: typeof processedItems[0]) => {
    try {
      const key = 'nutrilens_recently_viewed';
      const recent: string[] = JSON.parse(localStorage.getItem(key) || '[]');
      const updated = [item.id, ...recent.filter(id => id !== item.id)].slice(0, 10);
      localStorage.setItem(key, JSON.stringify(updated));
    } catch {}
    setSelectedItem(toMarketItem(MARKET_ITEMS.find(m => m.id === item.id)!));
    setDetailOpen(true);
  }, [toMarketItem]);

  const handleSubTap = (sub: MarketSubcategory | null) => {
    setSelectedSub(sub);
  };

  const handleViewAll = () => {
    setSelectedSub(null);
    // Show all items inline — selectedSub being explicitly set triggers inline view
    setSelectedSub(null);
  };

  // Whether we're in "browsing items" mode
  const isBrowsingItems = selectedSub !== null;

  const totalCatItems = useMemo(() => {
    let items = MARKET_ITEMS.filter(i => i.topCategory === activeCategory);
    if (vegOnly) items = items.filter(i => i.isVeg);
    return items.length;
  }, [activeCategory, vegOnly]);

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
                  onClick={() => { setActiveCategory(cat.key); setSelectedSub(null); }}
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
                  <CategoryThumbnail categoryKey={cat.key} emoji={cat.emoji} />
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
              key={`${activeCategory}-${isBrowsingItems ? 'items' : 'overview'}`}
              initial={{ opacity: 0, x: 15 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -15 }}
              transition={{ duration: 0.2 }}
              className="p-4 space-y-4"
            >
              {/* Back button when browsing items */}
              {isBrowsingItems && (
                <motion.button
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  onClick={() => setSelectedSub(null)}
                  className="flex items-center gap-1.5 text-[11px] font-semibold text-primary mb-1"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  Back to {allCategories.find(c => c.key === activeCategory)?.label}
                </motion.button>
              )}

              {/* Header with real image */}
              <div className="flex items-center gap-3">
                <CategoryThumbnail categoryKey={activeCategory} emoji={allCategories.find(c => c.key === activeCategory)?.emoji || ''} />
                <div>
                  <h2 className="text-base font-bold text-foreground">
                    {isBrowsingItems && selectedSub
                      ? subs.find(s => s.key === selectedSub)?.label || allCategories.find(c => c.key === activeCategory)?.label
                      : allCategories.find(c => c.key === activeCategory)?.label}
                  </h2>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {isBrowsingItems ? `${inlineItems.length} items` : `${totalCatItems} items available`}
                  </p>
                </div>
              </div>

              {!isBrowsingItems ? (
                <>
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
                              Compare: {insightData.comparison} →
                            </button>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {/* Subcategories grid */}
                  <div className="space-y-2">
                    <h3 className="text-xs font-bold text-foreground">Subcategories</h3>
                    <div className="grid grid-cols-2 gap-2">
                      {subs.map((sub, i) => {
                        // Find a representative item for this subcategory to get its image
                        const repItem = MARKET_ITEMS.find(m => m.topCategory === activeCategory && m.subcategory === sub.key);
                        return (
                          <motion.button
                            key={sub.key}
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: i * 0.04 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => handleSubTap(sub.key)}
                            className="p-3 rounded-xl bg-card border border-border/50 text-left hover:border-primary/20 transition-colors flex items-center gap-2.5"
                          >
                            {repItem && <MarketImage itemId={repItem.id} emoji={repItem.emoji} alt={sub.label} size="sm" />}
                            <div className="flex-1 min-w-0">
                              <p className="text-[11px] font-semibold text-foreground">{sub.label}</p>
                              <p className="text-[9px] text-muted-foreground mt-0.5">{subCounts[sub.key] || 0} items</p>
                            </div>
                            <ChevronRight className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                          </motion.button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Top Value items */}
                  <div className="space-y-2">
                    <h3 className="text-xs font-bold text-foreground">Top Value in {allCategories.find(c => c.key === activeCategory)?.label}</h3>
                    {topItems.map((item, i) => (
                      <motion.button
                        key={item.id}
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.15 + i * 0.04 }}
                        onClick={() => handleOpenDetail(item)}
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
                </>
              ) : (
                /* INLINE ITEM LIST — shown when a subcategory is tapped */
                <>
                  {/* Sort pills */}
                  <div className="flex items-center gap-2">
                    <SlidersHorizontal className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="text-[10px] text-muted-foreground">Sort:</span>
                    {SORT_OPTIONS.map(opt => (
                      <button
                        key={opt.key}
                        onClick={() => setSort(opt.key)}
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold transition-colors ${
                          sort === opt.key ? 'bg-secondary text-secondary-foreground' : 'text-muted-foreground hover:bg-muted'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>

                  {/* Item list */}
                  <div className="space-y-2">
                    {inlineItems.length === 0 ? (
                      <div className="text-center py-8">
                        <p className="text-sm text-muted-foreground">No items found</p>
                      </div>
                    ) : (
                      <>
                        {inlineItems.map((item, i) => (
                          <div key={item.id}>
                            <MarketItemCard
                              rank={i + 1}
                              name={item.name}
                              emoji={item.emoji}
                              price={item.cityPrice}
                              unit={item.unit}
                              protein={item.protein}
                              calories={item.calories}
                              costPerGram={item.costPerGram}
                              pesColor={item.pesColor}
                              pes={item.pes}
                              servingDesc={item.servingDesc}
                              isVeg={item.isVeg}
                              isCompareSelected={false}
                              badge={null}
                              onTap={() => handleOpenDetail(item)}
                              onAddToPlan={(e) => {
                                e.stopPropagation();
                                toast.success(`${item.name} noted! Open Meal Planner to add.`, { icon: '✅' });
                                navigate('/planner');
                              }}
                              onToggleCompare={() => {}}
                              index={i}
                              itemId={item.id}
                            />
                            {/* Insert sponsored card after 2nd item */}
                            {i === 1 && categoryAd && (
                              <div className="mt-2">
                                <SponsoredCard
                                  ad={categoryAd}
                                  onImpression={() => logCatImpression(user?.id)}
                                  onClick={() => logCatClick(user?.id)}
                                  variant="native"
                                />
                              </div>
                            )}
                          </div>
                        ))}
                      </>
                    )}
                  </div>
                </>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      <MarketItemDetailSheet
        open={detailOpen}
        onOpenChange={setDetailOpen}
        item={selectedItem}
        city={city || 'hyderabad'}
        onReportPrice={() => {}}
      />
    </div>
  );
}
