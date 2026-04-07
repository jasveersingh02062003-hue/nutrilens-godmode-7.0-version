import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Search, SlidersHorizontal, Store, MapPin, Clock, ChevronDown, Users, Trophy, TrendingDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { getMarketItems, getLastPriceUpdate, SUPPORTED_CITIES, type MarketItem, type MarketCategory, type MarketSort } from '@/lib/market-service';
import { useUserProfile } from '@/contexts/UserProfileContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import PESBadge from '@/components/PESBadge';
import type { PESColor } from '@/lib/pes-engine';
import MarketItemDetailSheet from '@/components/MarketItemDetailSheet';
import ReportPriceSheet from '@/components/ReportPriceSheet';
import PriceTrendChart from '@/components/PriceTrendChart';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';

const CATEGORIES: { key: MarketCategory; label: string; icon: string }[] = [
  { key: 'all', label: 'All', icon: '🏪' },
  { key: 'protein', label: 'Protein', icon: '🥩' },
  { key: 'vegetable', label: 'Veggies', icon: '🥬' },
  { key: 'dals', label: 'Dals', icon: '🫘' },
  { key: 'dairy', label: 'Dairy', icon: '🥛' },
  { key: 'grain', label: 'Grains', icon: '🌾' },
  { key: 'fruits', label: 'Fruits', icon: '🍌' },
  { key: 'packed', label: 'Packed', icon: '📦' },
  { key: 'supplement', label: 'Supps', icon: '💊' },
];

const SORT_OPTIONS: { key: MarketSort; label: string }[] = [
  { key: 'pes', label: 'PES Score' },
  { key: 'price', label: 'Price' },
  { key: 'protein', label: 'Protein' },
];

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

  const city = (profile as any)?.city || '';

  const handleCitySelect = async (selectedCity: string) => {
    setCityPickerOpen(false);
    if (selectedCity.toLowerCase() === city.toLowerCase()) return;
    
    // Update profile locally
    if (updateProfile) {
      updateProfile({ city: selectedCity } as any);
    }
    
    // Persist to database
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
    if (!search.trim()) return items;
    const q = search.toLowerCase();
    return items.filter(item =>
      item.name.toLowerCase().includes(q) ||
      (item.brand && item.brand.toLowerCase().includes(q))
    );
  }, [items, search]);

  const topItem = filtered.length > 0 ? filtered[0] : null;

  const lastUpdatedLabel = lastUpdated
    ? formatDistanceToNow(new Date(lastUpdated), { addSuffix: true })
    : 'Static prices';

  const handleOpenDetail = (item: MarketItem) => {
    setSelectedItem(item);
    setDetailOpen(true);
  };

  const handleReportPrice = (itemName?: string) => {
    setReportPrefill(itemName || '');
    setReportOpen(true);
  };

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
              <ChevronDown className="w-3 h-3" />
              <span className="mx-1">·</span>
              <Clock className="w-3 h-3" />
              <span>{lastUpdatedLabel}</span>
            </button>
          </div>
          {/* Source badge */}
          <div className="px-2 py-1 rounded-lg bg-muted">
            <span className="text-[9px] font-bold text-muted-foreground">
              {/* FIRECRAWL_HOOK: Change to "LIVE" when Firecrawl is active */}
              STATIC
            </span>
          </div>
        </div>

        {/* City not set warning */}
        {!city && (
          <div className="mx-4 mb-2 p-2.5 rounded-xl bg-accent/10 border border-accent/20">
            <p className="text-[11px] font-semibold text-foreground">📍 Set your city for location-based prices</p>
            <button onClick={() => setCityPickerOpen(true)} className="text-[10px] font-bold text-primary mt-0.5">
              Choose your city →
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

      {/* Sort Bar */}
      <div className="flex items-center gap-2 px-4 py-2">
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

      {/* Top Protein Value Today Hero */}
      {!loading && topItem && sort === 'pes' && !search && (
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
              return (
                <motion.button
                  key={item.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ delay: Math.min(i * 0.03, 0.3) }}
                  onClick={() => handleOpenDetail(item)}
                  className="w-full flex items-center gap-3 p-3 rounded-xl bg-card border border-border text-left hover:border-primary/20 transition-colors active:scale-[0.99]"
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
                      <span className="text-[11px] text-muted-foreground">
                        💪 {item.protein}g
                      </span>
                      <span className="text-[11px] text-muted-foreground">
                        · 🔥 {item.calories} kcal
                      </span>
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
                      <span className="text-[10px] text-muted-foreground">
                        ₹{item.costPerGramProtein}/g
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <PESBadge pes={item.pes} color={item.pesColor as PESColor} size="sm" />
                    {item.isVerified && <span className="text-[8px] text-primary font-semibold">✅</span>}
                  </div>
                </motion.button>
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
    </div>
  );
}
