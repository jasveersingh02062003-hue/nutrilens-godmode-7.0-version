import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Search, SlidersHorizontal, Store, TrendingUp, BarChart3, Users } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { getMarketItems, type MarketItem, type MarketCategory, type MarketSort } from '@/lib/market-service';
import { useUserProfile } from '@/contexts/UserProfileContext';
import PESBadge from '@/components/PESBadge';
import type { PESColor } from '@/lib/pes-engine';

const CATEGORIES: { key: MarketCategory; label: string; icon: string }[] = [
  { key: 'all', label: 'All', icon: '🏪' },
  { key: 'protein', label: 'Protein', icon: '🥩' },
  { key: 'vegetable', label: 'Veggies', icon: '🥬' },
  { key: 'dairy', label: 'Dairy', icon: '🥛' },
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
  const { profile } = useUserProfile();
  const [items, setItems] = useState<MarketItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState<MarketCategory>('all');
  const [sort, setSort] = useState<MarketSort>('pes');
  const [search, setSearch] = useState('');
  const city = (profile as any)?.city || 'India';

  useEffect(() => {
    setLoading(true);
    getMarketItems(city, category, sort).then(data => {
      setItems(data);
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
            <p className="text-[11px] text-muted-foreground">📍 {city} · Static prices</p>
          </div>
        </div>

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

      {/* Items List */}
      <div className="px-4 space-y-2">
        {loading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-20 rounded-xl bg-muted animate-pulse" />
          ))
        ) : filtered.length === 0 ? (
          <div className="text-center py-12">
            <Store className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No items found</p>
          </div>
        ) : (
          <AnimatePresence mode="popLayout">
            {filtered.map((item, i) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ delay: Math.min(i * 0.03, 0.3) }}
                className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border"
              >
                <span className="text-xs font-bold text-muted-foreground w-6 text-center">#{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="text-sm font-semibold text-foreground truncate">
                      {item.brand ? `${item.brand} ` : ''}{item.name}
                    </p>
                    {item.source === 'packed' && (
                      <span className="px-1.5 py-0.5 rounded text-[8px] font-bold bg-accent/20 text-accent">PACKED</span>
                    )}
                    {item.isVerified && (
                      <span className="text-[10px]">✅</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[11px] text-muted-foreground">
                      💪 {item.protein}g protein
                    </span>
                    <span className="text-[11px] text-muted-foreground">
                      · 🔥 {item.calories} kcal
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[11px] font-medium text-foreground">
                      ₹{item.price}{item.unit ? `/${item.unit}` : ''}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      ₹{item.costPerGramProtein}/g protein
                    </span>
                  </div>
                  {item.allergens && item.allergens.length > 0 && (
                    <div className="flex gap-1 mt-1">
                      {item.allergens.map(a => (
                        <span key={a} className="px-1.5 py-0.5 rounded text-[8px] bg-destructive/10 text-destructive font-medium">
                          {a}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <PESBadge pes={item.pes} color={item.pesColor as PESColor} size="sm" />
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>

      {/* Price Trend Placeholder */}
      <div className="px-4 mt-6">
        <div className="p-4 rounded-xl bg-muted/50 border border-dashed border-border text-center">
          <BarChart3 className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm font-semibold text-muted-foreground">Price Trends Coming Soon</p>
          <p className="text-[11px] text-muted-foreground mt-1">7-day & 30-day price charts will appear here</p>
        </div>
      </div>

      {/* Report Price */}
      <div className="px-4 mt-4 mb-8">
        <div className="p-4 rounded-xl bg-card border border-border">
          <div className="flex items-center gap-2 mb-1">
            <Users className="w-4 h-4 text-primary" />
            <p className="text-sm font-semibold text-foreground">Report a Price</p>
          </div>
          <p className="text-[11px] text-muted-foreground">Help improve prices for everyone in your area</p>
          <button
            onClick={() => navigate('/progress')}
            className="mt-2 w-full py-2 rounded-lg bg-primary/10 text-primary text-xs font-semibold"
          >
            Coming in Phase 2 →
          </button>
        </div>
      </div>
    </div>
  );
}
