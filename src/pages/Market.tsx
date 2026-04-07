import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShoppingCart, PlusCircle } from 'lucide-react';
import { ArrowLeft, Search, SlidersHorizontal, Store, MapPin, Clock, ChevronDown, Users, Trophy, TrendingDown, Scale, Wallet } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { getMarketItems, getLastPriceUpdate, SUPPORTED_CITIES, resolveCity, type MarketItem, type MarketCategory, type MarketSort } from '@/lib/market-service';
import { useUserProfile } from '@/contexts/UserProfileContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import PESBadge from '@/components/PESBadge';
import type { PESColor } from '@/lib/pes-engine';
import MarketItemDetailSheet from '@/components/MarketItemDetailSheet';
import ReportPriceSheet from '@/components/ReportPriceSheet';
import PriceTrendChart from '@/components/PriceTrendChart';
import MarketCompareBar from '@/components/MarketCompareBar';
import ComparisonSheet from '@/components/ComparisonSheet';
import PriceFreshnessBadge from '@/components/PriceFreshnessBadge';
import MultiCityCompareSheet from '@/components/MultiCityCompareSheet';
import { buildFromFood } from '@/lib/compare-helpers';
import { INDIAN_FOODS } from '@/lib/indian-foods';
import { scopedGet } from '@/lib/scoped-storage';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import { Progress } from '@/components/ui/progress';

const CATEGORIES: { key: MarketCategory; label: string; icon: string }[] = [
  { key: 'all', label: 'All', icon: '🏪' },
  { key: 'protein', label: 'Protein', icon: '🥩' },
  { key: 'vegetable', label: 'Veggies', icon: '🥬' },
  { key: 'dals', label: 'Dals', icon: '🫘' },
  { key: 'dairy', label: 'Dairy', icon: '🥛' },
  { key: 'grain', label: 'Grains', icon: '🌾' },
  { key: 'fruits', label: 'Fruits', icon: '🍌' },
  { key: 'packed', label: 'Packed', icon: '📦' },
  { key: 'frozen', label: 'Frozen', icon: '🧊' },
  { key: 'drinks', label: 'Drinks', icon: '🍹' },
  { key: 'spreads', label: 'Spreads', icon: '🥜' },
  { key: 'supplement', label: 'Supps', icon: '💊' },
];

const SORT_OPTIONS: { key: MarketSort; label: string }[] = [
  { key: 'pes', label: 'PES Score' },
  { key: 'price', label: 'Price' },
  { key: 'protein', label: 'Protein' },
];

const BUDGET_PRESETS = [100, 200, 300];

export default function Market() {
  const navigate = useNavigate();
  const { profile, updateProfile } = useUserProfile();
  const { user } = useAuth();
  const [items, setItems] = useState<MarketItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState<MarketCategory>('all');
  const [sort, setSort] = useState<MarketSort>('pes');
  const [search, setSearch] = useState('');
  const [selectedItem, setSelectedItem] = useState<MarketItem | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportPrefill, setReportPrefill] = useState('');
  const [cityPickerOpen, setCityPickerOpen] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [showTrend, setShowTrend] = useState(false);
  const [trendItem, setTrendItem] = useState('Chicken');
  const [compareItems, setCompareItems] = useState<MarketItem[]>([]);
  const [compareOpen, setCompareOpen] = useState(false);
  const [budgetFilter, setBudgetFilter] = useState<number | null>(null);
  const [multiCityOpen, setMultiCityOpen] = useState(false);

  const rawCity = (profile as any)?.city || '';
  const cityInfo = useMemo(() => resolveCity(rawCity || 'India'), [rawCity]);
  const city = rawCity || '';

  const savings = useMemo(() => {
    try {
      return JSON.parse(scopedGet('nutrilens_market_savings') || '{"weekly":0,"monthly":0}');
    } catch { return { weekly: 0, monthly: 0 }; }
  }, []);

  const handleCitySelect = async (selectedCity: string) => {
    setCityPickerOpen(false);
    if (selectedCity.toLowerCase() === city.toLowerCase()) return;
    if (updateProfile) {
      updateProfile({ city: selectedCity } as any);
    }
    if (user?.id) {
      await supabase.from('profiles').update({ city: selectedCity }).eq('id', user.id);
    }
    toast.success(`📍 Prices updated for ${selectedCity}`);
  };

  useEffect(() => {
    setLoading(true);
    const c = city || 'India';
    Promise.all([
      getMarketItems(c, category, sort),
      getLastPriceUpdate(c),
    ]).then(([data, updated]) => {
      setItems(data);
      setLastUpdated(updated);
      setLoading(false);
    });
  }, [city, category, sort]);

  const filtered = useMemo(() => {
    let result = items;
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(item =>
        item.name.toLowerCase().includes(q) ||
        (item.brand && item.brand.toLowerCase().includes(q))
      );
    }
    if (budgetFilter) {
      result = result.filter(item => item.price <= budgetFilter);
    }
    return result;
  }, [items, search, budgetFilter]);

  // Budget protein summary
  const budgetProteinSummary = useMemo(() => {
    if (!budgetFilter) return null;
    let totalProtein = 0;
    let totalCost = 0;
    const picked: string[] = [];
    const sorted = [...filtered].sort((a, b) => a.costPerGramProtein - b.costPerGramProtein);
    for (const item of sorted) {
      if (totalCost + item.price > budgetFilter) continue;
      totalCost += item.price;
      totalProtein += item.protein;
      picked.push(item.name);
      if (picked.length >= 5) break;
    }
    return { totalProtein: Math.round(totalProtein), totalCost: Math.round(totalCost), count: picked.length };
  }, [filtered, budgetFilter]);

  const topItem = filtered.length > 0 ? filtered[0] : null;

  const lastUpdatedLabel = lastUpdated
    ? formatDistanceToNow(new Date(lastUpdated), { addSuffix: true })
    : city ? 'Static prices' : 'Average across India';

  const handleOpenDetail = (item: MarketItem) => {
    setSelectedItem(item);
    setDetailOpen(true);
  };

  const handleReportPrice = (itemName?: string) => {
    setReportPrefill(itemName || '');
    setReportOpen(true);
  };

  const toggleCompare = (item: MarketItem, e: React.MouseEvent) => {
    e.stopPropagation();
    setCompareItems(prev => {
      const exists = prev.find(i => i.id === item.id);
      if (exists) return prev.filter(i => i.id !== item.id);
      if (prev.length >= 4) {
        toast.error('Max 4 items to compare');
        return prev;
      }
      return [...prev, item];
    });
  };

  const handleCompare = () => {
    setCompareOpen(true);
  };

  // Convert MarketItem to CompareItem for ComparisonSheet
  const compareData = useMemo(() => {
    return compareItems.map(item => {
      const food = INDIAN_FOODS.find(f => f.name.toLowerCase() === item.name.toLowerCase());
      if (food) return buildFromFood(food);
      return {
        type: 'food' as const,
        id: item.id,
        name: item.name,
        calories: item.calories,
        protein: item.protein,
        carbs: item.carbs || 0,
        fat: item.fat || 0,
        fiber: item.fiber || 0,
        iron: 0,
        calcium: 0,
        vitC: 0,
        cost: item.price,
        pes: item.pes,
        image: item.imageUrl,
        servingGrams: 100,
      };
    });
  }, [compareItems]);

  return (
    <div className="max-w-lg mx-auto min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="flex items-center gap-3 px-4 py-3">
          <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center">
            <ArrowLeft className="w-4 h-4 text-foreground" />
          </button>
          <div className="flex-1">
            <h1 className="text-base font-bold text-foreground flex items-center gap-2">
              <Store className="w-4.5 h-4.5 text-secondary" /> Smart Market
            </h1>
            <button
              onClick={() => setCityPickerOpen(!cityPickerOpen)}
              className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
            >
              <MapPin className="w-3 h-3" />
              <span>{city || 'Set city'}</span>
              {cityInfo.isAlias && (
                <span className="text-[9px] text-primary">(→ {cityInfo.resolved})</span>
              )}
              <ChevronDown className="w-3 h-3" />
              <span className="mx-1">·</span>
              <Clock className="w-3 h-3" />
              <span>{lastUpdatedLabel}</span>
            </button>
          </div>
          <button
            onClick={() => setMultiCityOpen(true)}
            className="px-2 py-1 rounded-lg bg-muted hover:bg-muted/80 transition-colors"
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

      {/* City not set — "Average across India" label + prompt */}
        {!city && (
          <div className="mx-4 mb-2 p-2.5 rounded-xl bg-accent/10 border border-accent/20">
            <p className="text-[11px] font-semibold text-foreground">🇮🇳 Showing average prices across India</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">Set your city to see location-specific prices & trends</p>
            <button onClick={() => setCityPickerOpen(true)} className="text-[10px] font-bold text-primary mt-1">
              📍 Choose your city →
            </button>
          </div>
        )}

        {/* City picker */}
        <AnimatePresence>
          {cityPickerOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
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
              placeholder="Search foods, brands..."
              className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-muted text-sm text-foreground placeholder:text-muted-foreground border-none outline-none"
            />
          </div>
        </div>

        {/* Category Pills */}
        <div className="flex gap-2 px-4 pb-3 overflow-x-auto scrollbar-hide">
          {CATEGORIES.map(cat => (
            <button
              key={cat.key}
              onClick={() => setCategory(cat.key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors
                ${category === cat.key
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}
            >
              <span>{cat.icon}</span> {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Sort Bar + Budget Filter */}
      <div className="px-4 py-2 space-y-2">
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="text-[11px] text-muted-foreground">Sort:</span>
          {SORT_OPTIONS.map(opt => (
            <button
              key={opt.key}
              onClick={() => setSort(opt.key)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors
                ${sort === opt.key
                  ? 'bg-secondary text-secondary-foreground'
                  : 'text-muted-foreground hover:bg-muted'}`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Budget Quick Filter */}
        <div className="flex items-center gap-2">
          <Wallet className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="text-[10px] text-muted-foreground">Budget:</span>
          {BUDGET_PRESETS.map(b => (
            <button
              key={b}
              onClick={() => setBudgetFilter(budgetFilter === b ? null : b)}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold transition-colors ${
                budgetFilter === b
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              ≤₹{b}
            </button>
          ))}
          {budgetFilter && (
            <button onClick={() => setBudgetFilter(null)} className="text-[10px] text-primary font-semibold ml-1">
              Clear
            </button>
          )}
        </div>

        {/* Budget protein summary */}
        {budgetProteinSummary && (
          <div className="p-2.5 rounded-xl bg-primary/5 border border-primary/10">
            <p className="text-[11px] font-semibold text-foreground">
              💪 You can get ~{budgetProteinSummary.totalProtein}g protein for ₹{budgetProteinSummary.totalCost}
            </p>
            <p className="text-[10px] text-muted-foreground">
              From top {budgetProteinSummary.count} value items below
            </p>
          </div>
        )}
      </div>

      {/* Top Protein Value Today Hero */}
      {!loading && topItem && sort === 'pes' && !search && !budgetFilter && (
        <div className="px-4 mb-3">
          <motion.button
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            onClick={() => handleOpenDetail(topItem)}
            className="w-full p-4 rounded-2xl bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/20 text-left"
          >
            <div className="flex items-center gap-1 mb-2">
              <Trophy className="w-4 h-4 text-primary" />
              <span className="text-[11px] font-bold text-primary">🏆 TOP PROTEIN VALUE TODAY</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 rounded-xl bg-muted flex items-center justify-center overflow-hidden shrink-0">
                {topItem.imageUrl && topItem.imageUrl.length <= 4 ? (
                  <span className="text-3xl">{topItem.imageUrl}</span>
                ) : topItem.imageUrl ? (
                  <img src={topItem.imageUrl} alt={topItem.name} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-3xl">🥗</span>
                )}
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold text-foreground">
                  {topItem.brand ? `${topItem.brand} ` : ''}{topItem.name}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  💪 {topItem.protein}g protein · ₹{topItem.price}{topItem.unit ? `/${topItem.unit}` : ''}
                </p>
                <p className="text-[11px] font-semibold text-primary mt-0.5">
                  ₹{topItem.costPerGramProtein}/g protein · PES {topItem.pes}
                </p>
              </div>
              <PESBadge pes={topItem.pes} color={topItem.pesColor as PESColor} size="sm" />
            </div>
          </motion.button>
        </div>
      )}

      {/* Items List */}
      <div className="px-4 space-y-2">
        {loading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-24 rounded-xl bg-muted animate-pulse" />
          ))
        ) : filtered.length === 0 ? (
          <div className="text-center py-12">
            <Store className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No items found</p>
          </div>
        ) : (
          <AnimatePresence mode="popLayout">
            {filtered.map((item, i) => {
              const isEmoji = item.imageUrl && item.imageUrl.length <= 4;
              const isCompareSelected = compareItems.some(c => c.id === item.id);
              return (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ delay: Math.min(i * 0.03, 0.3) }}
                  className="relative"
                >
                  <button
                    onClick={() => handleOpenDetail(item)}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl bg-card border text-left hover:border-primary/20 transition-colors active:scale-[0.99] ${
                      isCompareSelected ? 'border-primary/40 bg-primary/5' : 'border-border'
                    }`}
                  >
                    {/* Image / Emoji */}
                    <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center overflow-hidden shrink-0">
                      {isEmoji ? (
                        <span className="text-2xl">{item.imageUrl}</span>
                      ) : item.imageUrl ? (
                        <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" loading="lazy" />
                      ) : (
                        <span className="text-2xl">🥗</span>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-bold text-muted-foreground">#{i + 1}</span>
                        <p className="text-sm font-semibold text-foreground truncate">
                          {item.brand ? `${item.brand} ` : ''}{item.name}
                        </p>
                        {item.source === 'packed' && (
                          <span className="px-1.5 py-0.5 rounded text-[8px] font-bold bg-accent/20 text-accent-foreground">PACKED</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[11px] text-muted-foreground">💪 {item.protein}g</span>
                        <span className="text-[11px] text-muted-foreground">· 🔥 {item.calories} kcal</span>
                        {item.protein === 0 && item.calories === 0 && (
                          <span className="text-[9px] font-semibold text-amber-500">⚠️ Incomplete</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[11px] font-medium text-foreground">
                          ₹{item.price}{item.unit ? `/${item.unit}` : ''}
                        </span>
                        {item.priceChange !== undefined && item.priceChange !== 0 && (
                          <span className={`text-[10px] font-bold ${item.priceChange > 0 ? 'text-destructive' : 'text-primary'}`}>
                            {item.priceChange > 0 ? '↑' : '↓'}{Math.abs(item.priceChange)}%
                          </span>
                        )}
                        <span className="text-[10px] text-muted-foreground">₹{item.costPerGramProtein}/g</span>
                        <PriceFreshnessBadge lastUpdated={item.lastUpdated} isStale={(item as any).isStale} compact />
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <PESBadge pes={item.pes} color={item.pesColor as PESColor} size="sm" />
                      {item.isVerified && <span className="text-[8px] text-primary font-semibold">✅</span>}
                      {/* Quick action buttons */}
                      <div className="flex gap-1 mt-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toast.success(`${item.name} noted! Open Meal Planner to add it.`, { icon: '✅' });
                            navigate('/planner');
                          }}
                          className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center hover:bg-primary/20 transition-colors"
                          title="Add to Plan"
                        >
                          <PlusCircle className="w-3.5 h-3.5 text-primary" />
                        </button>
                        {item.platforms && item.platforms.length > 0 && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              const cheapest = [...item.platforms!].sort((a, b) => a.price - b.price)[0];
                              // Try deep link first, fallback to HTTPS
                              const deepLinks: Record<string, string> = {
                                'BigBasket': 'bigbasket://',
                                'Amazon': 'amazon://',
                                'Blinkit': 'blinkit://',
                              };
                              const deepLink = Object.entries(deepLinks).find(([name]) => 
                                cheapest.name?.toLowerCase().includes(name.toLowerCase())
                              );
                              if (deepLink) {
                                window.location.href = deepLink[1];
                                setTimeout(() => window.open(cheapest.url, '_blank'), 500);
                              } else {
                                window.open(cheapest.url, '_blank');
                              }
                            }}
                            className="w-6 h-6 rounded-full bg-secondary/10 flex items-center justify-center hover:bg-secondary/20 transition-colors"
                            title="Buy"
                          >
                            <ShoppingCart className="w-3.5 h-3.5 text-secondary" />
                          </button>
                        )}
                      </div>
                    </div>
                  </button>
                  {/* Compare toggle */}
                  <button
                    onClick={(e) => toggleCompare(item, e)}
                    className={`absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center transition-colors ${
                      isCompareSelected ? 'bg-primary text-primary-foreground' : 'bg-muted/80 text-muted-foreground hover:bg-muted'
                    }`}
                  >
                    <Scale className="w-3 h-3" />
                  </button>
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}
      </div>

      {/* Price Trend Section */}
      {!loading && filtered.length > 0 && (
        <div className="px-4 mt-6">
          <button
            onClick={() => setShowTrend(!showTrend)}
            className="w-full flex items-center justify-between mb-3"
          >
            <p className="text-xs font-bold text-foreground">📊 Price Trends</p>
            <span className="text-[10px] text-primary font-semibold">{showTrend ? 'Hide' : 'Show'}</span>
          </button>
          <AnimatePresence>
            {showTrend && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden space-y-3"
              >
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
      <div className="px-4 mt-6">
        <div className="p-4 rounded-xl bg-card border border-border">
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
          {savings.weekly === 0 && savings.monthly === 0 ? (
            <p className="text-[10px] text-muted-foreground">
              Use swap suggestions in your meal plan to start tracking savings
            </p>
          ) : (
            <p className="text-[10px] text-primary font-semibold">
              {savings.weekly > 200 ? '🎉 Great savings!' : 'Keep using smart swaps to save more!'}
            </p>
          )}
        </div>
      </div>

      {/* Report Price */}
      <div className="px-4 mt-4 mb-8">
        <button
          onClick={() => handleReportPrice()}
          className="w-full p-4 rounded-xl bg-card border border-border hover:border-primary/20 transition-colors text-left"
        >
          <div className="flex items-center gap-2 mb-1">
            <Users className="w-4 h-4 text-primary" />
            <p className="text-sm font-semibold text-foreground">Report a Price</p>
          </div>
          <p className="text-[11px] text-muted-foreground">Help improve prices for everyone in {city || 'your area'}</p>
        </button>
      </div>

      {/* Compare floating bar */}
      <MarketCompareBar
        selected={compareItems}
        onCompare={handleCompare}
        onClear={() => setCompareItems([])}
        onRemove={(id) => setCompareItems(prev => prev.filter(i => i.id !== id))}
      />

      {/* Comparison Sheet */}
      <ComparisonSheet
        open={compareOpen}
        onClose={() => { setCompareOpen(false); setCompareItems([]); }}
        items={compareData}
        onPick={() => { setCompareOpen(false); setCompareItems([]); }}
      />

      {/* Detail Sheet */}
      <MarketItemDetailSheet
        open={detailOpen}
        onOpenChange={setDetailOpen}
        item={selectedItem}
        city={city || 'hyderabad'}
        onReportPrice={handleReportPrice}
      />

      {/* Report Price Sheet */}
      <ReportPriceSheet
        open={reportOpen}
        onOpenChange={setReportOpen}
        prefillItem={reportPrefill}
      />

      {/* Multi-City Compare Sheet */}
      <MultiCityCompareSheet
        open={multiCityOpen}
        onOpenChange={setMultiCityOpen}
        defaultCity={city || undefined}
      />
    </div>
  );
}
