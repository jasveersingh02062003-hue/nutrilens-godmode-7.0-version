import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Search, MapPin, Clock, ChevronDown, Users, Scale, Wallet, Store, Leaf, SlidersHorizontal, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { SUPPORTED_CITIES, resolveCity, type MarketItem as LegacyMarketItem } from '@/lib/market-service';
import { MARKET_ITEMS, getCityPrice, calculateMarketPES, getMarketPESColor, TOP_CATEGORIES, type MarketTopCategory, type MarketSubcategory, type RawMarketItem } from '@/lib/market-data';
import { detectCity } from '@/lib/auto-location';
import { useUserProfile } from '@/contexts/UserProfileContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import MarketCategoryGrid from '@/components/MarketCategoryGrid';
import MarketHeroSection from '@/components/MarketHeroSection';
import MarketSmartSections from '@/components/MarketSmartSections';
import MarketItemCard from '@/components/MarketItemCard';
import MarketItemDetailSheet from '@/components/MarketItemDetailSheet';
import ReportPriceSheet from '@/components/ReportPriceSheet';
import PriceTrendChart from '@/components/PriceTrendChart';
import MarketCompareBar from '@/components/MarketCompareBar';
import ComparisonSheet from '@/components/ComparisonSheet';
import MultiCityCompareSheet from '@/components/MultiCityCompareSheet';
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

const FILTER_CHIPS: { key: FilterMode; label: string; icon?: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'veg', label: '🌱 Veg Only' },
  { key: 'nonveg', label: '🥩 Non-Veg' },
  { key: 'high_protein', label: '💪 High Protein' },
  { key: 'budget', label: '💰 Under ₹100' },
];

// Convert RawMarketItem to the shape needed for detail sheet
function toMarketItem(item: RawMarketItem, city: string, priceChange?: number): LegacyMarketItem {
  const price = getCityPrice(item.basePrice, city);
  const pes = calculateMarketPES(item.protein, price);
  const costPerGram = item.protein > 0 ? Math.round((price / item.protein) * 100) / 100 : 999;
  return {
    id: item.id,
    name: item.name,
    price,
    protein: item.protein,
    calories: item.calories,
    pes: Math.round(pes * 100) / 100,
    pesColor: getMarketPESColor(pes),
    costPerGramProtein: costPerGram,
    category: item.isVeg ? 'Veg' : 'Non-Veg',
    unit: item.unit,
    source: 'fresh',
    imageUrl: item.emoji,
    lastUpdated: 'static',
    priceChange: priceChange || 0,
    carbs: item.carbs,
    fat: item.fat,
    fiber: item.fiber,
  };
}

export default function Market() {
  const navigate = useNavigate();
  const { profile, updateProfile } = useUserProfile();
  const { user } = useAuth();

  // Location state
  const [city, setCity] = useState<string>('');
  const [detectedCity, setDetectedCity] = useState<string>('');
  const [isAutoDetected, setIsAutoDetected] = useState(false);
  const [locationLoading, setLocationLoading] = useState(true);
  const [cityPickerOpen, setCityPickerOpen] = useState(false);

  // Browse state
  const [selectedCategory, setSelectedCategory] = useState<MarketTopCategory | null>(null);
  const [selectedSub, setSelectedSub] = useState<MarketSubcategory | null>(null);
  const [sort, setSort] = useState<SortMode>('pes');
  const [filter, setFilter] = useState<FilterMode>('all');
  const [search, setSearch] = useState('');
  const [showSortFilter, setShowSortFilter] = useState(false);

  // Detail/compare state
  const [selectedItem, setSelectedItem] = useState<LegacyMarketItem | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportPrefill, setReportPrefill] = useState('');
  const [compareItems, setCompareItems] = useState<LegacyMarketItem[]>([]);
  const [compareOpen, setCompareOpen] = useState(false);
  const [multiCityOpen, setMultiCityOpen] = useState(false);
  const [showTrend, setShowTrend] = useState(false);
  const [trendItem, setTrendItem] = useState('Chicken');

  // ─── Auto-Location Detection ───
  useEffect(() => {
    const profileCity = (profile as any)?.city || '';
    setLocationLoading(true);
    detectCity(profileCity).then(result => {
      setCity(result.resolvedCity);
      setDetectedCity(result.city);
      setIsAutoDetected(result.isAutoDetected);
      setLocationLoading(false);
      // Auto-save detected city to profile if no city was set
      if (result.isAutoDetected && !profileCity && result.resolvedCity !== 'India') {
        if (updateProfile) updateProfile({ city: result.resolvedCity } as any);
        if (user?.id) {
          supabase.from('profiles').update({ city: result.resolvedCity }).eq('id', user.id);
        }
        toast.success(`📍 Location detected: ${result.city}`, { duration: 3000 });
      }
    });
  }, [(profile as any)?.city]);

  const handleCitySelect = async (selectedCity: string) => {
    setCityPickerOpen(false);
    setCity(selectedCity);
    setIsAutoDetected(false);
    if (updateProfile) updateProfile({ city: selectedCity } as any);
    if (user?.id) {
      await supabase.from('profiles').update({ city: selectedCity }).eq('id', user.id);
    }
    toast.success(`📍 Prices updated for ${selectedCity}`);
  };

  // ─── Process Market Items with City Pricing ───
  const processedItems = useMemo(() => {
    const resolvedCity = city || 'India';
    return MARKET_ITEMS.map(item => {
      const price = getCityPrice(item.basePrice, resolvedCity);
      const pes = calculateMarketPES(item.protein, price);
      const costPerGram = item.protein > 0 ? Math.round((price / item.protein) * 100) / 100 : 999;
      return {
        ...item,
        cityPrice: price,
        pes: Math.round(pes * 100) / 100,
        pesColor: getMarketPESColor(pes),
        costPerGram,
      };
    });
  }, [city]);

  // ─── Filtering & Sorting ───
  const filteredItems = useMemo(() => {
    let result = processedItems;

    // Category filter
    if (selectedCategory) {
      result = result.filter(i => i.topCategory === selectedCategory);
    }
    if (selectedSub) {
      result = result.filter(i => i.subcategory === selectedSub);
    }

    // Search
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(i => i.name.toLowerCase().includes(q) || i.tags.some(t => t.includes(q)));
    }

    // Filter chips
    switch (filter) {
      case 'veg': result = result.filter(i => i.isVeg); break;
      case 'nonveg': result = result.filter(i => !i.isVeg); break;
      case 'high_protein': result = result.filter(i => i.protein >= 15); break;
      case 'budget': result = result.filter(i => i.cityPrice <= 100); break;
    }

    // Sort
    switch (sort) {
      case 'pes': result = [...result].sort((a, b) => b.pes - a.pes); break;
      case 'price': result = [...result].sort((a, b) => a.cityPrice - b.cityPrice); break;
      case 'protein': result = [...result].sort((a, b) => b.protein - a.protein); break;
    }

    return result;
  }, [processedItems, selectedCategory, selectedSub, search, filter, sort]);

  // ─── Smart Sections Data ───
  const bestValue = useMemo(() => {
    const sorted = [...processedItems].sort((a, b) => b.pes - a.pes);
    const top = sorted[0];
    if (!top) return null;
    return { name: top.name, emoji: top.emoji, price: top.cityPrice, unit: top.unit, protein: top.protein, costPerGram: top.costPerGram };
  }, [processedItems]);

  const budgetPicks = useMemo(() => {
    return processedItems
      .filter(i => i.cityPrice <= 100 && i.protein >= 5)
      .sort((a, b) => a.costPerGram - b.costPerGram)
      .slice(0, 6)
      .map(i => ({ name: i.name, emoji: i.emoji, price: i.cityPrice, unit: i.unit, protein: i.protein, costPerGram: i.costPerGram }));
  }, [processedItems]);

  const comparePair = useMemo(() => {
    // Paneer vs Soya Chunks
    const paneer = processedItems.find(i => i.id === 'mk_paneer');
    const soya = processedItems.find(i => i.id === 'mk_soya_chunks');
    if (paneer && soya) {
      return {
        a: { name: paneer.name, emoji: paneer.emoji, price: paneer.cityPrice, unit: paneer.unit, protein: paneer.protein, costPerGram: paneer.costPerGram },
        b: { name: soya.name, emoji: soya.emoji, price: soya.cityPrice, unit: soya.unit, protein: soya.protein, costPerGram: soya.costPerGram },
      };
    }
    return null;
  }, [processedItems]);

  // ─── Handlers ───
  const handleOpenDetail = useCallback((item: typeof processedItems[0]) => {
    setSelectedItem(toMarketItem(MARKET_ITEMS.find(m => m.id === item.id)!, city || 'India'));
    setDetailOpen(true);
  }, [city]);

  const handleItemTapByName = useCallback((name: string) => {
    const item = processedItems.find(i => i.name === name);
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
      return {
        type: 'food' as const, id: item.id, name: item.name, calories: item.calories, protein: item.protein,
        carbs: item.carbs || 0, fat: item.fat || 0, fiber: item.fiber || 0, iron: 0, calcium: 0, vitC: 0,
        cost: item.price, pes: item.pes, image: item.imageUrl, servingGrams: 100,
      };
    });
  }, [compareItems]);

  const savings = useMemo(() => {
    try { return JSON.parse(scopedGet('nutrilens_market_savings') || '{"weekly":0,"monthly":0}'); }
    catch { return { weekly: 0, monthly: 0 }; }
  }, []);

  const cityLabel = city && city !== 'India' ? city : 'All India';

  return (
    <div className="max-w-lg mx-auto min-h-screen bg-background pb-24">
      {/* ─── Header ─── */}
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="flex items-center gap-3 px-4 py-3">
          <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center">
            <ArrowLeft className="w-4 h-4 text-foreground" />
          </button>
          <div className="flex-1">
            <h1 className="text-base font-bold text-foreground flex items-center gap-2">
              <Store className="w-4.5 h-4.5 text-primary" /> Smart Market
            </h1>
            <button
              onClick={() => setCityPickerOpen(!cityPickerOpen)}
              className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
            >
              <MapPin className="w-3 h-3" />
              {locationLoading ? (
                <span className="flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" /> Detecting...</span>
              ) : (
                <>
                  <span>{cityLabel}</span>
                  {isAutoDetected && <span className="text-[9px] text-primary">(auto)</span>}
                  <ChevronDown className="w-3 h-3" />
                </>
              )}
            </button>
          </div>
          <button
            onClick={() => setMultiCityOpen(true)}
            className="px-2.5 py-1 rounded-lg bg-muted hover:bg-muted/80 transition-colors"
          >
            <span className="text-[9px] font-bold text-muted-foreground">🏙️ Compare</span>
          </button>
          <div className="px-2 py-1 rounded-lg bg-muted">
            <span className="text-[9px] font-bold text-muted-foreground">
              {/* FIRECRAWL_HOOK: Change to "LIVE" when Firecrawl is active */}
              STATIC
            </span>
          </div>
        </div>

        {/* City picker dropdown */}
        <AnimatePresence>
          {cityPickerOpen && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
              <div className="px-4 pb-3">
                <p className="text-[10px] font-semibold text-muted-foreground mb-2">Select your city</p>
                <div className="flex flex-wrap gap-1.5">
                  {SUPPORTED_CITIES.map(c => (
                    <button
                      key={c}
                      onClick={() => handleCitySelect(c)}
                      className={`px-3 py-1.5 rounded-full text-[11px] font-semibold transition-colors ${
                        city.toLowerCase() === c.toLowerCase()
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted text-muted-foreground hover:bg-muted/80'
                      }`}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Search */}
        <div className="px-4 pb-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search chicken, eggs, paneer, dal..."
              className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-muted text-sm text-foreground placeholder:text-muted-foreground border-none outline-none"
            />
          </div>
        </div>
      </div>

      {/* ─── Main Content ─── */}
      <div className="px-4 pt-4 space-y-5">

        {/* Auto-location banner */}
        {!city || city === 'India' ? (
          <div className="p-3 rounded-2xl bg-accent/10 border border-accent/20">
            <p className="text-[11px] font-semibold text-foreground">🇮🇳 Showing national average prices</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">Set your city for location-specific prices</p>
            <button onClick={() => setCityPickerOpen(true)} className="text-[10px] font-bold text-primary mt-1">
              📍 Choose your city →
            </button>
          </div>
        ) : isAutoDetected && (
          <div className="p-2.5 rounded-xl bg-primary/5 border border-primary/10 flex items-center gap-2">
            <MapPin className="w-3.5 h-3.5 text-primary" />
            <p className="text-[10px] text-foreground flex-1">
              📍 Auto-detected: <span className="font-bold">{detectedCity}</span>
              {detectedCity !== city && <span className="text-muted-foreground"> → Prices for {city}</span>}
            </p>
            <button onClick={() => setCityPickerOpen(true)} className="text-[10px] font-bold text-primary">Change</button>
          </div>
        )}

        {/* Hero Section */}
        {!search && !selectedCategory && (
          <MarketHeroSection
            bestValue={bestValue}
            biggestDrop={null}
            city={cityLabel}
            onTap={handleItemTapByName}
          />
        )}

        {/* Category Grid */}
        <MarketCategoryGrid
          selectedCategory={selectedCategory}
          selectedSub={selectedSub}
          onSelectCategory={setSelectedCategory}
          onSelectSub={setSelectedSub}
        />

        {/* Filter & Sort Bar */}
        <div className="space-y-2">
          {/* Filter chips */}
          <div className="flex gap-1.5 overflow-x-auto scrollbar-hide">
            {FILTER_CHIPS.map(f => (
              <button
                key={f.key}
                onClick={() => setFilter(filter === f.key ? 'all' : f.key)}
                className={`px-2.5 py-1.5 rounded-full text-[10px] font-semibold whitespace-nowrap transition-colors ${
                  filter === f.key
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Sort */}
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

        {/* Smart Sections (only on home / no category) */}
        {!selectedCategory && !search && filter === 'all' && (
          <MarketSmartSections
            budgetPicks={budgetPicks}
            comparePair={comparePair}
            onItemTap={handleItemTapByName}
          />
        )}

        {/* ─── Items List ─── */}
        {selectedCategory && (
          <div className="flex items-center gap-2 mb-1">
            <span className="text-lg">{TOP_CATEGORIES.find(c => c.key === selectedCategory)?.emoji}</span>
            <h2 className="text-sm font-bold text-foreground">{TOP_CATEGORIES.find(c => c.key === selectedCategory)?.label}</h2>
          </div>
        )}

        <div className="space-y-2">
          {filteredItems.length === 0 ? (
            <div className="text-center py-12">
              <Store className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">No items found</p>
              <button onClick={() => { setFilter('all'); setSelectedCategory(null); setSearch(''); }} className="text-xs text-primary font-semibold mt-2">
                Clear filters
              </button>
            </div>
          ) : (
            filteredItems.map((item, i) => {
              const isCompareSelected = compareItems.some(c => c.id === item.id);
              return (
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
                  isCompareSelected={isCompareSelected}
                  onTap={() => handleOpenDetail(item)}
                  onAddToPlan={(e) => {
                    e.stopPropagation();
                    toast.success(`${item.name} noted! Open Meal Planner to add it.`, { icon: '✅' });
                    navigate('/planner');
                  }}
                  onToggleCompare={(e) => toggleCompare(item, e)}
                  index={i}
                />
              );
            })
          )}
        </div>

        {/* Price Trend Section */}
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
                      <button
                        key={name}
                        onClick={() => setTrendItem(name)}
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold whitespace-nowrap transition-colors ${
                          trendItem === name ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                        }`}
                      >
                        {name}
                      </button>
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
            <div>
              <p className="text-lg font-bold text-foreground">₹{savings.weekly || 0}</p>
              <p className="text-[10px] text-muted-foreground">This week</p>
            </div>
            <div>
              <p className="text-lg font-bold text-foreground">₹{savings.monthly || 0}</p>
              <p className="text-[10px] text-muted-foreground">This month</p>
            </div>
          </div>
          <Progress value={Math.min((savings.weekly || 0) / 5, 100)} className="h-1.5 mb-2" />
          <p className="text-[10px] text-muted-foreground">
            {savings.weekly === 0 ? 'Use swap suggestions in your meal plan to start tracking savings' : savings.weekly > 200 ? '🎉 Great savings!' : 'Keep using smart swaps to save more!'}
          </p>
        </div>

        {/* Report Price */}
        <button
          onClick={() => { setReportPrefill(''); setReportOpen(true); }}
          className="w-full p-4 rounded-2xl bg-card border border-border hover:border-primary/20 transition-colors text-left"
        >
          <div className="flex items-center gap-2 mb-1">
            <Users className="w-4 h-4 text-primary" />
            <p className="text-sm font-semibold text-foreground">Report a Price</p>
          </div>
          <p className="text-[11px] text-muted-foreground">Help improve prices for everyone in {cityLabel}</p>
        </button>
      </div>

      {/* ─── Floating & Sheet Components ─── */}
      <MarketCompareBar
        selected={compareItems}
        onCompare={() => setCompareOpen(true)}
        onClear={() => setCompareItems([])}
        onRemove={(id) => setCompareItems(prev => prev.filter(i => i.id !== id))}
      />

      <ComparisonSheet
        open={compareOpen}
        onClose={() => { setCompareOpen(false); setCompareItems([]); }}
        items={compareData}
        onPick={() => { setCompareOpen(false); setCompareItems([]); }}
      />

      <MarketItemDetailSheet
        open={detailOpen}
        onOpenChange={setDetailOpen}
        item={selectedItem}
        city={city || 'hyderabad'}
        onReportPrice={(name) => { setReportPrefill(name || ''); setReportOpen(true); }}
      />

      <ReportPriceSheet open={reportOpen} onOpenChange={setReportOpen} prefillItem={reportPrefill} />

      <MultiCityCompareSheet open={multiCityOpen} onOpenChange={setMultiCityOpen} defaultCity={city || undefined} />
    </div>
  );
}
