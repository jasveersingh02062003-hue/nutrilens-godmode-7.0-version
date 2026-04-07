import { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Scale, Plus, X, ArrowRightLeft, Sparkles, ChevronRight } from 'lucide-react';
import { MARKET_ITEMS, getCityPrice, calculateMarketPES, getMarketPESColor, TOP_CATEGORIES, type MarketTopCategory } from '@/lib/market-data';
import MarketPageHeader from '@/components/MarketPageHeader';
import ComparisonSheet from '@/components/ComparisonSheet';
import { buildFromFood } from '@/lib/compare-helpers';
import { INDIAN_FOODS } from '@/lib/indian-foods';
import { useUserProfile } from '@/contexts/UserProfileContext';
import { toast } from 'sonner';

// Pre-built comparison pairs
const COMPARE_PAIRS = [
  { a: 'mk_egg_white', b: 'mk_paneer', label: '🥚 Eggs vs 🧀 Paneer' },
  { a: 'mk_chicken_breast', b: 'mk_rohu', label: '🍗 Chicken vs 🐟 Fish' },
  { a: 'mk_soya_chunks', b: 'mk_paneer', label: '🫘 Soya vs 🧀 Paneer' },
  { a: 'mk_peanuts', b: 'mk_almonds', label: '🥜 Peanuts vs 🌰 Almonds' },
  { a: 'mk_moong_dal', b: 'mk_toor_dal', label: '🫘 Moong vs Toor Dal' },
  { a: 'mk_milk_full', b: 'mk_milk_toned', label: '🥛 Full vs Toned Milk' },
];

export default function MarketCompare() {
  const { profile } = useUserProfile();
  const city = (profile as any)?.city || 'India';
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  const [compareOpen, setCompareOpen] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<MarketTopCategory | 'all'>('all');

  const processedItems = useMemo(() => {
    return MARKET_ITEMS.map(item => {
      const price = getCityPrice(item.basePrice, city);
      const pes = calculateMarketPES(item.protein, price);
      return { ...item, cityPrice: price, pes: Math.round(pes * 100) / 100, pesColor: getMarketPESColor(pes) };
    });
  }, [city]);

  const filteredItems = useMemo(() => {
    let result = processedItems;
    if (categoryFilter !== 'all') result = result.filter(i => i.topCategory === categoryFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(i => i.name.toLowerCase().includes(q) || i.tags.some(t => t.includes(q)));
    }
    return result.sort((a, b) => b.pes - a.pes);
  }, [processedItems, search, categoryFilter]);

  const toggleItem = useCallback((id: string) => {
    setSelectedIds(prev => {
      if (prev.includes(id)) return prev.filter(x => x !== id);
      if (prev.length >= 4) { toast.error('Max 4 items to compare'); return prev; }
      return [...prev, id];
    });
  }, []);

  const handleQuickCompare = (aId: string, bId: string) => {
    setSelectedIds([aId, bId]);
    setTimeout(() => setCompareOpen(true), 100);
  };

  const compareData = useMemo(() => {
    return selectedIds.map(id => {
      const item = processedItems.find(i => i.id === id);
      if (!item) return null;
      const food = INDIAN_FOODS.find(f => f.name.toLowerCase() === item.name.toLowerCase());
      if (food) return buildFromFood(food);
      return { type: 'food' as const, id: item.id, name: item.name, calories: item.calories, protein: item.protein, carbs: item.carbs, fat: item.fat, fiber: item.fiber, iron: 0, calcium: 0, vitC: 0, cost: item.cityPrice, pes: item.pes, image: item.emoji, servingGrams: 100 };
    }).filter(Boolean) as any[];
  }, [selectedIds, processedItems]);

  return (
    <div className="max-w-lg mx-auto min-h-screen bg-background pb-24">
      <MarketPageHeader
        title="Compare Items"
        city={city !== 'India' ? city : 'All India'}
        showSearch
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search items to compare..."
      />

      <div className="px-4 pt-4 space-y-4">
        {/* Quick Compare Pairs */}
        <div className="space-y-2">
          <div className="flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-primary" />
            <h3 className="text-xs font-bold text-foreground">Popular Comparisons</h3>
          </div>
          <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1 -mx-1 px-1">
            {COMPARE_PAIRS.map((pair, i) => (
              <motion.button
                key={pair.label}
                initial={{ opacity: 0, x: 15 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => handleQuickCompare(pair.a, pair.b)}
                className="flex-shrink-0 px-3 py-2 rounded-xl bg-card border border-border/60 hover:border-primary/30 transition-all text-[11px] font-semibold text-foreground whitespace-nowrap"
              >
                {pair.label}
              </motion.button>
            ))}
          </div>
        </div>

        {/* Category filter pills */}
        <div className="flex gap-1.5 overflow-x-auto scrollbar-hide pb-1">
          <button
            onClick={() => setCategoryFilter('all')}
            className={`px-2.5 py-1 rounded-full text-[10px] font-semibold whitespace-nowrap transition-colors ${
              categoryFilter === 'all' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
            }`}
          >
            All
          </button>
          {TOP_CATEGORIES.slice(0, 7).map(cat => (
            <button
              key={cat.key}
              onClick={() => setCategoryFilter(categoryFilter === cat.key ? 'all' : cat.key)}
              className={`px-2.5 py-1 rounded-full text-[10px] font-semibold whitespace-nowrap transition-colors ${
                categoryFilter === cat.key ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
              }`}
            >
              {cat.emoji} {cat.label.split(' ')[0]}
            </button>
          ))}
        </div>

        {/* Selected Items Bar */}
        <AnimatePresence>
          {selectedIds.length > 0 && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="p-3 rounded-2xl bg-primary/5 border border-primary/20 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold text-foreground">
                    <Scale className="w-3.5 h-3.5 inline mr-1 text-primary" />
                    {selectedIds.length} selected
                  </p>
                  <div className="flex gap-2">
                    <button onClick={() => setSelectedIds([])} className="text-[10px] text-muted-foreground hover:text-foreground">Clear</button>
                    {selectedIds.length >= 2 && (
                      <motion.button
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setCompareOpen(true)}
                        className="px-3 py-1 rounded-lg bg-primary text-primary-foreground text-[10px] font-bold"
                      >
                        <ArrowRightLeft className="w-3 h-3 inline mr-1" /> Compare Now
                      </motion.button>
                    )}
                  </div>
                </div>
                <div className="flex gap-2 overflow-x-auto scrollbar-hide">
                  {selectedIds.map(id => {
                    const item = processedItems.find(i => i.id === id);
                    if (!item) return null;
                    return (
                      <motion.div
                        key={id}
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.8, opacity: 0 }}
                        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-card border border-border text-[10px] font-semibold whitespace-nowrap"
                      >
                        <span>{item.emoji}</span>
                        <span className="text-foreground">{item.name.split('(')[0].trim()}</span>
                        <button onClick={() => toggleItem(id)}><X className="w-3 h-3 text-muted-foreground hover:text-destructive" /></button>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Item Grid */}
        <p className="text-[10px] text-muted-foreground">Tap items to select for comparison (max 4)</p>
        <div className="space-y-1.5">
          {filteredItems.map((item, i) => {
            const isSelected = selectedIds.includes(item.id);
            return (
              <motion.button
                key={item.id}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(i * 0.02, 0.3) }}
                onClick={() => toggleItem(item.id)}
                className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all text-left ${
                  isSelected ? 'border-primary/40 bg-primary/5' : 'border-border/50 bg-card hover:border-primary/20'
                }`}
              >
                <span className="text-xl">{item.emoji}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-semibold text-foreground truncate">{item.name}</p>
                  <p className="text-[9px] text-muted-foreground">{item.protein}g protein · ₹{item.cityPrice}/{item.unit}</p>
                </div>
                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                  item.pesColor === 'green' ? 'bg-green-500/10 text-green-600'
                  : item.pesColor === 'yellow' ? 'bg-amber-500/10 text-amber-600'
                  : 'bg-red-500/10 text-red-600'
                }`}>PES {item.pes}</span>
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                  isSelected ? 'border-primary bg-primary' : 'border-muted-foreground/30'
                }`}>
                  {isSelected && <span className="text-primary-foreground text-[10px]">✓</span>}
                </div>
              </motion.button>
            );
          })}
        </div>
      </div>

      <ComparisonSheet open={compareOpen} onClose={() => setCompareOpen(false)} items={compareData} onPick={() => setCompareOpen(false)} />
    </div>
  );
}
