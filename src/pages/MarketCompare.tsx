import { useState, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Scale, Plus, X, ArrowRightLeft } from 'lucide-react';
import { MARKET_ITEMS, getCityPrice, calculateMarketPES, getMarketPESColor } from '@/lib/market-data';
import MarketPageHeader from '@/components/MarketPageHeader';
import ComparisonSheet from '@/components/ComparisonSheet';
import { buildFromFood } from '@/lib/compare-helpers';
import { INDIAN_FOODS } from '@/lib/indian-foods';
import { useUserProfile } from '@/contexts/UserProfileContext';
import { toast } from 'sonner';

export default function MarketCompare() {
  const { profile } = useUserProfile();
  const city = (profile as any)?.city || 'India';
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  const [compareOpen, setCompareOpen] = useState(false);

  const processedItems = useMemo(() => {
    return MARKET_ITEMS.map(item => {
      const price = getCityPrice(item.basePrice, city);
      const pes = calculateMarketPES(item.protein, price);
      return { ...item, cityPrice: price, pes: Math.round(pes * 100) / 100, pesColor: getMarketPESColor(pes) };
    });
  }, [city]);

  const filteredItems = useMemo(() => {
    if (!search.trim()) return processedItems;
    const q = search.toLowerCase();
    return processedItems.filter(i => i.name.toLowerCase().includes(q) || i.tags.some(t => t.includes(q)));
  }, [processedItems, search]);

  const toggleItem = useCallback((id: string) => {
    setSelectedIds(prev => {
      if (prev.includes(id)) return prev.filter(x => x !== id);
      if (prev.length >= 4) { toast.error('Max 4 items to compare'); return prev; }
      return [...prev, id];
    });
  }, []);

  const compareData = useMemo(() => {
    return selectedIds.map(id => {
      const item = processedItems.find(i => i.id === id);
      if (!item) return null;
      const food = INDIAN_FOODS.find(f => f.name.toLowerCase() === item.name.toLowerCase());
      if (food) return buildFromFood(food);
      return {
        type: 'food' as const, id: item.id, name: item.name, calories: item.calories, protein: item.protein,
        carbs: item.carbs, fat: item.fat, fiber: item.fiber, iron: 0, calcium: 0, vitC: 0,
        cost: item.cityPrice, pes: item.pes, image: item.emoji, servingGrams: 100,
      };
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
        {/* Selected Items Bar */}
        {selectedIds.length > 0 && (
          <div className="p-3 rounded-2xl bg-primary/5 border border-primary/20 space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold text-foreground">
                <Scale className="w-3.5 h-3.5 inline mr-1 text-primary" />
                {selectedIds.length} items selected
              </p>
              <div className="flex gap-2">
                <button onClick={() => setSelectedIds([])} className="text-[10px] text-muted-foreground hover:text-foreground">
                  Clear all
                </button>
                {selectedIds.length >= 2 && (
                  <button
                    onClick={() => setCompareOpen(true)}
                    className="px-3 py-1 rounded-lg bg-primary text-primary-foreground text-[10px] font-bold"
                  >
                    <ArrowRightLeft className="w-3 h-3 inline mr-1" /> Compare Now
                  </button>
                )}
              </div>
            </div>
            <div className="flex gap-2 overflow-x-auto scrollbar-hide">
              {selectedIds.map(id => {
                const item = processedItems.find(i => i.id === id);
                if (!item) return null;
                return (
                  <div key={id} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-card border border-border text-[10px] font-semibold whitespace-nowrap">
                    <span>{item.emoji}</span>
                    <span className="text-foreground">{item.name}</span>
                    <button onClick={() => toggleItem(id)}>
                      <X className="w-3 h-3 text-muted-foreground hover:text-destructive" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Item Grid */}
        <p className="text-[10px] text-muted-foreground">Tap items to select for comparison (max 4)</p>
        <div className="space-y-2">
          {filteredItems.map((item, i) => {
            const isSelected = selectedIds.includes(item.id);
            return (
              <motion.button
                key={item.id}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.02 }}
                onClick={() => toggleItem(item.id)}
                className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all text-left ${
                  isSelected ? 'border-primary/40 bg-primary/5' : 'border-border bg-card hover:border-primary/20'
                }`}
              >
                <span className="text-2xl">{item.emoji}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-foreground truncate">{item.name}</p>
                  <p className="text-[10px] text-muted-foreground">{item.protein}g protein · ₹{item.cityPrice}/{item.unit}</p>
                </div>
                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${item.pesColor === 'green' ? 'bg-green-500/10 text-green-600' : item.pesColor === 'yellow' ? 'bg-yellow-500/10 text-yellow-600' : 'bg-red-500/10 text-red-600'}`}>
                  PES {item.pes}
                </span>
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                  isSelected ? 'border-primary bg-primary' : 'border-muted-foreground/30'
                }`}>
                  {isSelected && <Plus className="w-3 h-3 text-primary-foreground rotate-45" />}
                </div>
              </motion.button>
            );
          })}
        </div>
      </div>

      <ComparisonSheet
        open={compareOpen}
        onClose={() => setCompareOpen(false)}
        items={compareData}
        onPick={() => setCompareOpen(false)}
      />
    </div>
  );
}
