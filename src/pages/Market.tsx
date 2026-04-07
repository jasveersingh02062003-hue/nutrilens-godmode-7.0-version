import { useState, useMemo, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Search, MapPin, Store, Leaf, SlidersHorizontal, Package, Wallet, Users } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { MARKET_ITEMS, FRESH_CATEGORIES, PACKED_CATEGORIES, TOP_CATEGORIES, type MarketTopCategory, type MarketSubcategory, type MarketViewMode } from '@/lib/market-data';
import { useMarket } from '@/contexts/MarketContext';
import MarketPageHeader from '@/components/MarketPageHeader';
import MarketItemCard from '@/components/MarketItemCard';
import MarketItemDetailSheet from '@/components/MarketItemDetailSheet';
import ReportPriceSheet from '@/components/ReportPriceSheet';
import PriceTrendChart from '@/components/PriceTrendChart';
import MarketCompareBar from '@/components/MarketCompareBar';
import ComparisonSheet from '@/components/ComparisonSheet';
import MultiCityCompareSheet from '@/components/MultiCityCompareSheet';
import QuickActionsRow from '@/components/market/QuickActionsRow';
import TopValueCards from '@/components/market/TopValueCards';
import CategoryGridHome from '@/components/market/CategoryGridHome';
import EducationCard from '@/components/market/EducationCard';
import PriceDropsRow from '@/components/market/PriceDropsRow';
import MarketHeroSection from '@/components/MarketHeroSection';
import { HeroSkeleton, QuickActionsSkeleton, ItemCardSkeleton } from '@/components/market/MarketSkeleton';
import { scopedGet } from '@/lib/scoped-storage';
import { toast } from 'sonner';
import { Progress } from '@/components/ui/progress';

type SortMode = 'pes' | 'price' | 'protein';
type FilterMode = 'all' | 'veg' | 'nonveg' | 'high_protein' | 'budget';

const SORT_OPTIONS: { key: SortMode; label: string }[] = [
  { key: 'pes', label: 'Best Value' },
  { key: 'price', label: 'Lowest Price' },
  { key: 'protein', label: 'Most Protein' },
];

const FILTER_CHIPS: { key: FilterMode; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'veg', label: '🌱 Veg Only' },
  { key: 'nonveg', label: '🥩 Non-Veg' },
  { key: 'high_protein', label: '💪 High Protein' },
  { key: 'budget', label: '💰 Under ₹100' },
];

export default function Market() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { city, cityLabel, detectedCity, isAutoDetected, locationLoading, handleCitySelect, processedItems, compareItems, toggleCompare, setCompareItems, compareData, toMarketItem } = useMarket();

  const [viewMode, setViewMode] = useState<MarketViewMode>('fresh');
  const [selectedCategory, setSelectedCategory] = useState<MarketTopCategory | null>(
    (searchParams.get('category') as MarketTopCategory) || null
  );
  const [selectedSub, setSelectedSub] = useState<MarketSubcategory | null>(
    (searchParams.get('sub') as MarketSubcategory) || null
  );
  const [sort, setSort] = useState<SortMode>('pes');
  const [filter, setFilter] = useState<FilterMode>('all');
  const [search, setSearch] = useState('');

  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportPrefill, setReportPrefill] = useState('');
  const [compareOpen, setCompareOpen] = useState(false);
  const [multiCityOpen, setMultiCityOpen] = useState(false);
  const [showTrend, setShowTrend] = useState(false);
  const [trendItem, setTrendItem] = useState('Chicken');

  const isBrowsing = !!selectedCategory || !!search || filter !== 'all';

  const handleViewModeChange = (mode: MarketViewMode) => {
    setViewMode(mode);
    setSelectedCategory(null);
    setSelectedSub(null);
  };

  const filteredItems = useMemo(() => {
    let result = processedItems;
    const allowedCategories = viewMode === 'fresh' ? FRESH_CATEGORIES : PACKED_CATEGORIES;
    result = result.filter(i => allowedCategories.includes(i.topCategory));
    if (selectedCategory) result = result.filter(i => i.topCategory === selectedCategory);
    if (selectedSub) result = result.filter(i => i.subcategory === selectedSub);
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(i => i.name.toLowerCase().includes(q) || i.tags.some(t => t.includes(q)));
    }
    switch (filter) {
      case 'veg': result = result.filter(i => i.isVeg); break;
      case 'nonveg': result = result.filter(i => !i.isVeg); break;
      case 'high_protein': result = result.filter(i => i.protein >= 15); break;
      case 'budget': result = result.filter(i => i.cityPrice <= 100); break;
    }
    switch (sort) {
      case 'pes': result = [...result].sort((a, b) => b.pes - a.pes); break;
      case 'price': result = [...result].sort((a, b) => a.cityPrice - b.cityPrice); break;
      case 'protein': result = [...result].sort((a, b) => b.protein - a.protein); break;
    }
    return result;
  }, [processedItems, viewMode, selectedCategory, selectedSub, search, filter, sort]);

  const badgeMap = useMemo(() => {
    const map = new Map<string, 'popular' | 'best_seller' | 'new'>();
    const sorted = [...filteredItems].sort((a, b) => b.pes - a.pes);
    sorted.slice(0, 3).forEach(item => map.set(item.id, 'popular'));
    filteredItems.forEach(item => { if (item.tags.includes('best_value') && !map.has(item.id)) map.set(item.id, 'best_seller'); });
    return map;
  }, [filteredItems]);

  const topValueItems = useMemo(() => {
    return [...processedItems]
      .filter(i => FRESH_CATEGORIES.includes(i.topCategory))
      .sort((a, b) => b.pes - a.pes)
      .slice(0, 3)
      .map(i => ({ name: i.name, emoji: i.emoji, price: i.cityPrice, unit: i.unit, protein: i.protein, costPerGram: i.costPerGram, pes: i.pes, pesColor: i.pesColor, itemId: i.id }));
  }, [processedItems]);

  const bestValue = useMemo(() => {
    const sorted = [...processedItems].sort((a, b) => b.pes - a.pes);
    const top = sorted[0];
    if (!top) return null;
    return { name: top.name, emoji: top.emoji, price: top.cityPrice, unit: top.unit, protein: top.protein, costPerGram: top.costPerGram, itemId: top.id };
  }, [processedItems]);

  const biggestDrop = useMemo(() => {
    const drops = [
      { id: 'mk_bangda', change: -15 }, { id: 'mk_egg_white', change: -12 },
      { id: 'mk_cabbage', change: -10 }, { id: 'mk_tomato', change: -8 },
    ];
    for (const d of drops) {
      const item = processedItems.find(i => i.id === d.id);
      if (item) return { name: item.name, emoji: item.emoji, price: item.cityPrice, unit: item.unit, protein: item.protein, costPerGram: item.costPerGram, priceChange: d.change, itemId: d.id };
    }
    return null;
  }, [processedItems]);

  const priceDrops = useMemo(() => {
    const drops = [
      { id: 'mk_egg_white', dropPercent: 12 }, { id: 'mk_tomato', dropPercent: 8 },
      { id: 'mk_bangda', dropPercent: 15 }, { id: 'mk_onion', dropPercent: 6 },
      { id: 'mk_cabbage', dropPercent: 10 },
    ];
    return drops.map(d => {
      const item = processedItems.find(i => i.id === d.id);
      if (!item) return null;
      return { name: item.name, emoji: item.emoji, price: item.cityPrice, unit: item.unit, dropPercent: d.dropPercent, itemId: d.id };
    }).filter(Boolean) as any[];
  }, [processedItems]);

  const handleOpenDetail = useCallback((item: typeof processedItems[0]) => {
    // Track recently viewed
    try {
      const key = 'nutrilens_recently_viewed';
      const recent: string[] = JSON.parse(localStorage.getItem(key) || '[]');
      const updated = [item.id, ...recent.filter(id => id !== item.id)].slice(0, 10);
      localStorage.setItem(key, JSON.stringify(updated));
    } catch {}
    setSelectedItem(toMarketItem(MARKET_ITEMS.find(m => m.id === item.id)!));
    setDetailOpen(true);
  }, [toMarketItem]);

  const handleItemTapByName = useCallback((name: string) => {
    const item = processedItems.find(i => i.name.toLowerCase().includes(name.toLowerCase()));
    if (item) handleOpenDetail(item);
  }, [processedItems, handleOpenDetail]);

  const savings = useMemo(() => {
    try { return JSON.parse(scopedGet('nutrilens_market_savings') || '{"weekly":0,"monthly":0}'); }
    catch { return { weekly: 0, monthly: 0 }; }
  }, []);

  const handleCategoryNav = (_cat: MarketTopCategory) => {
    navigate('/market/categories');
  };

  return (
    <div className="max-w-lg mx-auto min-h-screen bg-background pb-24">
      <MarketPageHeader
        title="Smart Market"
        city={cityLabel}
        showSearch={isBrowsing}
        searchValue={search}
        onSearchChange={setSearch}
        onCityChange={handleCitySelect}
      />

      <div className="px-4 pt-4 space-y-5">
        {/* Loading skeleton */}
        {locationLoading ? (
          <>
            <HeroSkeleton />
            <QuickActionsSkeleton />
            {[1, 2, 3].map(i => <ItemCardSkeleton key={i} />)}
          </>
        ) : (
          <>
            {/* Auto-location banner */}
            {!city || city === 'India' ? (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="p-3 rounded-2xl bg-accent/10 border border-accent/20">
                <p className="text-[11px] font-semibold text-foreground">🇮🇳 Showing national average prices</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">Set your city for location-specific prices</p>
              </motion.div>
            ) : isAutoDetected && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="p-2.5 rounded-xl bg-primary/5 border border-primary/10 flex items-center gap-2">
                <MapPin className="w-3.5 h-3.5 text-primary" />
                <p className="text-[10px] text-foreground flex-1">📍 Auto-detected: <span className="font-bold">{detectedCity}</span></p>
              </motion.div>
            )}

            {/* HOMEPAGE SECTIONS */}
            {!isBrowsing && viewMode === 'fresh' && (
              <>
                <MarketHeroSection bestValue={bestValue} biggestDrop={biggestDrop} city={cityLabel} onTap={handleItemTapByName} />
                <QuickActionsRow city={city || 'India'} onItemTap={handleItemTapByName} />
                <TopValueCards items={topValueItems} onItemTap={handleItemTapByName} />
                <CategoryGridHome onCategoryTap={handleCategoryNav} />
                <EducationCard onItemTap={handleItemTapByName} />
                <PriceDropsRow items={priceDrops} onItemTap={handleItemTapByName} />
                {city && city !== 'India' && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-4 rounded-2xl bg-gradient-to-r from-primary/8 to-accent/8 border border-primary/15">
                    <p className="text-xs font-bold text-foreground mb-1">🏙️ Your City: {city}</p>
                    <p className="text-[10px] text-muted-foreground">Prices adjusted for local market rates</p>
                    <button onClick={() => setMultiCityOpen(true)} className="mt-2 text-[10px] font-bold text-primary">
                      Compare with other cities →
                    </button>
                  </motion.div>
                )}

                {/* Recently Viewed */}
                <RecentlyViewedRow processedItems={processedItems} onItemTap={handleItemTapByName} />
              </>
            )}

            {/* Fresh / Packed Toggle */}
            <div className="flex p-1 rounded-xl bg-muted">
              <button
                onClick={() => handleViewModeChange('fresh')}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-all ${
                  viewMode === 'fresh' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Leaf className="w-3.5 h-3.5" /> Fresh Foods
              </button>
              <button
                onClick={() => handleViewModeChange('packed')}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-all ${
                  viewMode === 'packed' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Package className="w-3.5 h-3.5" /> Packed & Branded
              </button>
            </div>

            {/* Filter & Sort Bar */}
            <div className="space-y-2">
              <div className="flex gap-1.5 overflow-x-auto scrollbar-hide">
                {FILTER_CHIPS.map(f => (
                  <button
                    key={f.key}
                    onClick={() => setFilter(filter === f.key ? 'all' : f.key)}
                    className={`px-2.5 py-1.5 rounded-full text-[10px] font-semibold whitespace-nowrap transition-colors ${
                      filter === f.key ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
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
                <span className="ml-auto text-[10px] text-muted-foreground">{filteredItems.length} items</span>
              </div>
            </div>

            {/* Category label */}
            {selectedCategory && (
              <div className="flex items-center gap-2">
                <span className="text-lg">{TOP_CATEGORIES.find(c => c.key === selectedCategory)?.emoji}</span>
                <h2 className="text-sm font-bold text-foreground">{TOP_CATEGORIES.find(c => c.key === selectedCategory)?.label}</h2>
                <button onClick={() => { setSelectedCategory(null); setSelectedSub(null); }} className="text-[10px] text-primary font-semibold ml-auto">Clear</button>
              </div>
            )}

            {/* Items List */}
            <div className="space-y-2">
              {filteredItems.length === 0 ? (
                <div className="text-center py-12">
                  <Store className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">No items found</p>
                  <button onClick={() => { setFilter('all'); setSelectedCategory(null); setSearch(''); }} className="text-xs text-primary font-semibold mt-2">Clear filters</button>
                </div>
              ) : (
                filteredItems.map((item, i) => (
                  <MarketItemCard
                    key={item.id}
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
                    isCompareSelected={compareItems.some(c => c.id === item.id)}
                    badge={badgeMap.get(item.id) || null}
                    badgeCity={city && city !== 'India' ? city : undefined}
                    onTap={() => handleOpenDetail(item)}
                    onAddToPlan={(e) => {
                      e.stopPropagation();
                      toast.success(`${item.name} noted! Open Meal Planner to add it.`, { icon: '✅' });
                      navigate('/planner');
                    }}
                    onToggleCompare={(e) => toggleCompare(item, e)}
                    index={i}
                    itemId={item.id}
                  />
                ))
              )}
            </div>

            {/* Price Trends */}
            {filteredItems.length > 0 && (
              <div className="mt-4">
                <button onClick={() => setShowTrend(!showTrend)} className="w-full flex items-center justify-between mb-3">
                  <p className="text-xs font-bold text-foreground">📊 Price Trends</p>
                  <span className="text-[10px] text-primary font-semibold">{showTrend ? 'Hide' : 'Show'}</span>
                </button>
                <AnimatePresence>
                  {showTrend && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden space-y-3">
                      <div className="flex gap-1.5 overflow-x-auto scrollbar-hide pb-1">
                        {['Chicken', 'Eggs', 'Paneer', 'Tomato', 'Onion', 'Milk'].map(name => (
                          <button key={name} onClick={() => setTrendItem(name)} className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold whitespace-nowrap transition-colors ${trendItem === name ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>{name}</button>
                        ))}
                      </div>
                      <PriceTrendChart city={city || 'hyderabad'} itemName={trendItem} />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}

            {/* Savings Tracker */}
            <div className="p-4 rounded-2xl bg-card border border-border">
              <div className="flex items-center gap-2 mb-2">
                <Wallet className="w-4 h-4 text-primary" />
                <p className="text-xs font-bold text-foreground">💰 Your Savings</p>
              </div>
              <div className="flex gap-4 mb-3">
                <div><p className="text-lg font-bold text-foreground">₹{savings.weekly || 0}</p><p className="text-[10px] text-muted-foreground">This week</p></div>
                <div><p className="text-lg font-bold text-foreground">₹{savings.monthly || 0}</p><p className="text-[10px] text-muted-foreground">This month</p></div>
              </div>
              <Progress value={Math.min((savings.weekly || 0) / 5, 100)} className="h-1.5 mb-2" />
              <p className="text-[10px] text-muted-foreground">{savings.weekly === 0 ? 'Use swap suggestions in your meal plan to start tracking savings' : '🎉 Great savings!'}</p>
            </div>

            {/* Report Price */}
            <button onClick={() => { setReportPrefill(''); setReportOpen(true); }} className="w-full p-4 rounded-2xl bg-card border border-border hover:border-primary/20 transition-colors text-left">
              <div className="flex items-center gap-2 mb-1">
                <Users className="w-4 h-4 text-primary" />
                <p className="text-sm font-semibold text-foreground">Report a Price</p>
              </div>
              <p className="text-[11px] text-muted-foreground">Help improve prices for everyone in {cityLabel}</p>
            </button>
          </>
        )}
      </div>

      {/* Floating & Sheet Components */}
      <MarketCompareBar selected={compareItems} onCompare={() => setCompareOpen(true)} onClear={() => setCompareItems([])} onRemove={(id) => setCompareItems(prev => prev.filter(i => i.id !== id))} />
      <ComparisonSheet open={compareOpen} onClose={() => { setCompareOpen(false); setCompareItems([]); }} items={compareData} onPick={() => { setCompareOpen(false); setCompareItems([]); }} />
      <MarketItemDetailSheet open={detailOpen} onOpenChange={setDetailOpen} item={selectedItem} city={city || 'hyderabad'} onReportPrice={(name) => { setReportPrefill(name || ''); setReportOpen(true); }} />
      <ReportPriceSheet open={reportOpen} onOpenChange={setReportOpen} prefillItem={reportPrefill} />
      <MultiCityCompareSheet open={multiCityOpen} onOpenChange={setMultiCityOpen} defaultCity={city || undefined} />
    </div>
  );
}
