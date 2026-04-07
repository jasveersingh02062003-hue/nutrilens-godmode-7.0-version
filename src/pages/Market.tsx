import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Search, MapPin, Loader2, Store, Leaf, SlidersHorizontal, Package, Wallet, Users } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { SUPPORTED_CITIES, resolveCity, type MarketItem as LegacyMarketItem } from '@/lib/market-service';
import { MARKET_ITEMS, getCityPrice, calculateMarketPES, getMarketPESColor, TOP_CATEGORIES, FRESH_CATEGORIES, PACKED_CATEGORIES, type MarketTopCategory, type MarketSubcategory, type RawMarketItem, type MarketViewMode } from '@/lib/market-data';
import { detectCity } from '@/lib/auto-location';
import { useUserProfile } from '@/contexts/UserProfileContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
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
import { buildFromFood } from '@/lib/compare-helpers';
import { INDIAN_FOODS } from '@/lib/indian-foods';
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

function toMarketItem(item: RawMarketItem, city: string, priceChange?: number): LegacyMarketItem {
  const price = getCityPrice(item.basePrice, city);
  const pes = calculateMarketPES(item.protein, price);
  const costPerGram = item.protein > 0 ? Math.round((price / item.protein) * 100) / 100 : 999;
  return {
    id: item.id, name: item.name, price, protein: item.protein, calories: item.calories,
    pes: Math.round(pes * 100) / 100, pesColor: getMarketPESColor(pes), costPerGramProtein: costPerGram,
    category: item.isVeg ? 'Veg' : 'Non-Veg', unit: item.unit, source: 'fresh', imageUrl: item.emoji,
    lastUpdated: 'static', priceChange: priceChange || 0, carbs: item.carbs, fat: item.fat, fiber: item.fiber,
  };
}

export default function Market() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { profile, updateProfile } = useUserProfile();
  const { user } = useAuth();

  const [city, setCity] = useState<string>('');
  const [detectedCity, setDetectedCity] = useState<string>('');
  const [isAutoDetected, setIsAutoDetected] = useState(false);
  const [locationLoading, setLocationLoading] = useState(true);

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

  const [selectedItem, setSelectedItem] = useState<LegacyMarketItem | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportPrefill, setReportPrefill] = useState('');
  const [compareItems, setCompareItems] = useState<LegacyMarketItem[]>([]);
  const [compareOpen, setCompareOpen] = useState(false);
  const [multiCityOpen, setMultiCityOpen] = useState(false);
  const [showTrend, setShowTrend] = useState(false);
  const [trendItem, setTrendItem] = useState('Chicken');

  // Whether we're in "browse all" mode vs homepage
  const isBrowsing = !!selectedCategory || !!search || filter !== 'all';

  useEffect(() => {
    const profileCity = (profile as any)?.city || '';
    setLocationLoading(true);
    detectCity(profileCity).then(result => {
      setCity(result.resolvedCity);
      setDetectedCity(result.city);
      setIsAutoDetected(result.isAutoDetected);
      setLocationLoading(false);
      if (result.isAutoDetected && !profileCity && result.resolvedCity !== 'India') {
        if (updateProfile) updateProfile({ city: result.resolvedCity } as any);
        if (user?.id) supabase.from('profiles').update({ city: result.resolvedCity }).eq('id', user.id);
        toast.success(`📍 Location detected: ${result.city}`, { duration: 3000 });
      }
    });
  }, [(profile as any)?.city]);

  const handleCitySelect = async (selectedCity: string) => {
    setCity(selectedCity);
    setIsAutoDetected(false);
    if (updateProfile) updateProfile({ city: selectedCity } as any);
    if (user?.id) await supabase.from('profiles').update({ city: selectedCity }).eq('id', user.id);
    toast.success(`📍 Prices updated for ${selectedCity}`);
  };

  const handleViewModeChange = (mode: MarketViewMode) => {
    setViewMode(mode);
    setSelectedCategory(null);
    setSelectedSub(null);
  };

  const processedItems = useMemo(() => {
    const resolvedCity = city || 'India';
    return MARKET_ITEMS.map(item => {
      const price = getCityPrice(item.basePrice, resolvedCity);
      const pes = calculateMarketPES(item.protein, price);
      const costPerGram = item.protein > 0 ? Math.round((price / item.protein) * 100) / 100 : 999;
      return { ...item, cityPrice: price, pes: Math.round(pes * 100) / 100, pesColor: getMarketPESColor(pes), costPerGram };
    });
  }, [city]);

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

  // Top value items for cards
  const topValueItems = useMemo(() => {
    return [...processedItems]
      .filter(i => FRESH_CATEGORIES.includes(i.topCategory))
      .sort((a, b) => b.pes - a.pes)
      .slice(0, 3)
      .map(i => ({ name: i.name, emoji: i.emoji, price: i.cityPrice, unit: i.unit, protein: i.protein, costPerGram: i.costPerGram, pes: i.pes, pesColor: i.pesColor }));
  }, [processedItems]);

  const bestValue = useMemo(() => {
    const sorted = [...processedItems].sort((a, b) => b.pes - a.pes);
    const top = sorted[0];
    if (!top) return null;
    return { name: top.name, emoji: top.emoji, price: top.cityPrice, unit: top.unit, protein: top.protein, costPerGram: top.costPerGram };
  }, [processedItems]);

  // Simulated price drops
  const priceDrops = useMemo(() => {
    const drops = [
      { id: 'mk_egg_white', dropPercent: 12 },
      { id: 'mk_tomato', dropPercent: 8 },
      { id: 'mk_bangda', dropPercent: 15 },
      { id: 'mk_onion', dropPercent: 6 },
      { id: 'mk_cabbage', dropPercent: 10 },
    ];
    return drops.map(d => {
      const item = processedItems.find(i => i.id === d.id);
      if (!item) return null;
      return { name: item.name, emoji: item.emoji, price: item.cityPrice, unit: item.unit, dropPercent: d.dropPercent };
    }).filter(Boolean) as any[];
  }, [processedItems]);

  const handleOpenDetail = useCallback((item: typeof processedItems[0]) => {
    setSelectedItem(toMarketItem(MARKET_ITEMS.find(m => m.id === item.id)!, city || 'India'));
    setDetailOpen(true);
  }, [city]);

  const handleItemTapByName = useCallback((name: string) => {
    const item = processedItems.find(i => i.name.toLowerCase().includes(name.toLowerCase()));
    if (item) handleOpenDetail(item);
  }, [processedItems, handleOpenDetail]);

  const toggleCompare = useCallback((item: typeof processedItems[0], e: React.MouseEvent) => {
    e.stopPropagation();
    const marketItem = toMarketItem(MARKET_ITEMS.find(m => m.id === item.id)!, city || 'India');
    setCompareItems(prev => {
      if (prev.find(i => i.id === item.id)) return prev.filter(i => i.id !== item.id);
      if (prev.length >= 4) { toast.error('Max 4 items'); return prev; }
      return [...prev, marketItem];
    });
  }, [city]);

  const compareData = useMemo(() => {
    return compareItems.map(item => {
      const food = INDIAN_FOODS.find(f => f.name.toLowerCase() === item.name.toLowerCase());
      if (food) return buildFromFood(food);
      return { type: 'food' as const, id: item.id, name: item.name, calories: item.calories, protein: item.protein, carbs: item.carbs || 0, fat: item.fat || 0, fiber: item.fiber || 0, iron: 0, calcium: 0, vitC: 0, cost: item.price, pes: item.pes, image: item.imageUrl, servingGrams: 100 };
    });
  }, [compareItems]);

  const savings = useMemo(() => {
    try { return JSON.parse(scopedGet('nutrilens_market_savings') || '{"weekly":0,"monthly":0}'); }
    catch { return { weekly: 0, monthly: 0 }; }
  }, []);

  const cityLabel = city && city !== 'India' ? city : 'All India';

  const handleCategoryNav = (cat: MarketTopCategory) => {
    navigate('/market/categories');
  };

  return (
    <div className="max-w-lg mx-auto min-h-screen bg-background pb-24">
      {/* Header */}
      <MarketPageHeader
        title="Smart Market"
        city={cityLabel}
        showSearch={isBrowsing}
        searchValue={search}
        onSearchChange={setSearch}
        onCityChange={handleCitySelect}
      />

      <div className="px-4 pt-4 space-y-5">
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

        {/* ═══ HOMEPAGE SECTIONS (shown when not browsing) ═══ */}
        {!isBrowsing && viewMode === 'fresh' && (
          <>
            {/* 1. Hero Banner */}
            <MarketHeroSection bestValue={bestValue} biggestDrop={null} city={cityLabel} onTap={handleItemTapByName} />

            {/* 2. Quick Actions Row */}
            <QuickActionsRow city={city || 'India'} onItemTap={handleItemTapByName} />

            {/* 3. Today's Best Value */}
            <TopValueCards items={topValueItems} onItemTap={handleItemTapByName} />

            {/* 4. Browse by Category */}
            <CategoryGridHome onCategoryTap={handleCategoryNav} />

            {/* 5. Education Card */}
            <EducationCard onItemTap={handleItemTapByName} />

            {/* 6. Price Drops */}
            <PriceDropsRow items={priceDrops} onItemTap={handleItemTapByName} />

            {/* 7. City Prices Banner */}
            {city && city !== 'India' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-4 rounded-2xl bg-gradient-to-r from-primary/8 to-accent/8 border border-primary/15">
                <p className="text-xs font-bold text-foreground mb-1">🏙️ Your City: {city}</p>
                <p className="text-[10px] text-muted-foreground">Prices adjusted for local market rates</p>
                <button onClick={() => setMultiCityOpen(true)} className="mt-2 text-[10px] font-bold text-primary">
                  Compare with other cities →
                </button>
              </motion.div>
            )}
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
