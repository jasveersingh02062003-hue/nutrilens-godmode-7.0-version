import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ClipboardList, Plus, Trash2, ShoppingCart, ArrowRight, Share2, Sparkles, Check, CalendarDays } from 'lucide-react';
import MarketPageHeader from '@/components/MarketPageHeader';
import { useMarket } from '@/contexts/MarketContext';
import { useNavigate } from 'react-router-dom';
import { scopedGet, scopedSet } from '@/lib/scoped-storage';
import { MARKET_ITEMS, getCityPrice } from '@/lib/market-data';
import MarketImage from '@/components/market/MarketImage';
import { toast } from 'sonner';

interface ListItem {
  id: string;
  name: string;
  emoji: string;
  quantity: string;
  checked: boolean;
  estimatedPrice?: number;
  protein?: number;
  unit?: string;
}

const STORAGE_KEY = 'nutrilens_market_list';

export default function MarketList() {
  const navigate = useNavigate();
  const { city, cityLabel, vegOnly } = useMarket();
  const [items, setItems] = useState<ListItem[]>([]);
  const [newItem, setNewItem] = useState('');

  useEffect(() => {
    try {
      const saved = scopedGet(STORAGE_KEY);
      if (saved) setItems(JSON.parse(saved));
    } catch {}
  }, []);

  const save = (updated: ListItem[]) => {
    setItems(updated);
    scopedSet(STORAGE_KEY, JSON.stringify(updated));
  };

  const addItem = () => {
    const name = newItem.trim();
    if (!name) return;
    const marketItem = MARKET_ITEMS.find(m => m.name.toLowerCase().includes(name.toLowerCase()));
    const item: ListItem = {
      id: Date.now().toString(), name: marketItem?.name || name, emoji: marketItem?.emoji || '🛒',
      quantity: '1', checked: false,
      estimatedPrice: marketItem ? getCityPrice(marketItem.basePrice, city || 'India') : undefined,
      protein: marketItem?.protein, unit: marketItem?.unit,
    };
    save([...items, item]);
    setNewItem('');
    toast.success(`Added ${item.name}`);
  };

  const addSuggested = (marketId: string) => {
    const marketItem = MARKET_ITEMS.find(m => m.id === marketId);
    if (!marketItem || items.find(i => i.name === marketItem.name)) return;
    const item: ListItem = {
      id: Date.now().toString(), name: marketItem.name, emoji: marketItem.emoji,
      quantity: '1', checked: false,
      estimatedPrice: getCityPrice(marketItem.basePrice, city || 'India'),
      protein: marketItem.protein, unit: marketItem.unit,
    };
    save([...items, item]);
    toast.success(`Added ${marketItem.name}`);
  };

  const autoGenerateFromMealPlan = () => {
    try {
      const stored = scopedGet('nutrilens_meal_planner');
      if (!stored) {
        toast.error('No meal plan found. Create one first!');
        return;
      }
      const plannerData = JSON.parse(stored);
      const ingredientMap: Record<string, { count: number; protein: number; emoji: string; unit: string; price: number }> = {};

      // Scan all days and meals for ingredients
      Object.values(plannerData).forEach((day: any) => {
        if (!day?.meals) return;
        Object.values(day.meals).forEach((meal: any) => {
          if (!meal?.items) return;
          (meal.items as any[]).forEach((food: any) => {
            const name = (food.name || '').toLowerCase();
            const marketItem = MARKET_ITEMS.find(m => m.name.toLowerCase().includes(name) || name.includes(m.name.toLowerCase().split('(')[0].trim()));
            if (marketItem && !ingredientMap[marketItem.id]) {
              ingredientMap[marketItem.id] = {
                count: 1,
                protein: marketItem.protein,
                emoji: marketItem.emoji,
                unit: marketItem.unit,
                price: getCityPrice(marketItem.basePrice, city || 'India'),
              };
            } else if (marketItem) {
              ingredientMap[marketItem.id].count += 1;
            }
          });
        });
      });

      const existingNames = items.map(i => i.name);
      const newItems: ListItem[] = Object.entries(ingredientMap)
        .filter(([id]) => {
          const m = MARKET_ITEMS.find(i => i.id === id);
          return m && !existingNames.includes(m.name);
        })
        .map(([id, data]) => {
          const m = MARKET_ITEMS.find(i => i.id === id)!;
          return {
            id: `mp_${Date.now()}_${id}`,
            name: m.name,
            emoji: data.emoji,
            quantity: String(data.count),
            checked: false,
            estimatedPrice: data.price,
            protein: data.protein,
            unit: data.unit,
          };
        });

      if (newItems.length === 0) {
        toast.info('All meal plan items are already in your list!');
        return;
      }

      save([...items, ...newItems]);
      toast.success(`Added ${newItems.length} items from meal plan! 🎉`);
    } catch (e) {
      console.error('Meal plan parse error:', e);
      toast.error('Could not read meal plan data');
    }
  };

  const toggleCheck = (id: string) => save(items.map(i => i.id === id ? { ...i, checked: !i.checked } : i));
  const removeItem = (id: string) => save(items.filter(i => i.id !== id));
  const clearChecked = () => { save(items.filter(i => !i.checked)); toast.success('Cleared completed items'); };

  const unchecked = items.filter(i => !i.checked);
  const checked = items.filter(i => i.checked);

  const totalCost = useMemo(() => items.filter(i => !i.checked).reduce((s, i) => s + (i.estimatedPrice || 0), 0), [items]);
  const totalProtein = useMemo(() => items.filter(i => !i.checked).reduce((s, i) => s + (i.protein || 0), 0), [items]);

  const shareList = () => {
    const text = items.filter(i => !i.checked).map(i => `${i.emoji} ${i.name}${i.estimatedPrice ? ` — ₹${i.estimatedPrice}` : ''}`).join('\n');
    if (navigator.share) {
      navigator.share({ title: 'My Grocery List', text });
    } else {
      navigator.clipboard.writeText(text);
      toast.success('List copied to clipboard!');
    }
  };

  const suggestions = useMemo(() => {
    const existingNames = items.map(i => i.name);
    return MARKET_ITEMS
      .filter(m => m.protein >= 10 && m.basePrice <= 200 && !existingNames.includes(m.name) && (!vegOnly || m.isVeg))
      .sort((a, b) => b.protein - a.protein)
      .slice(0, 4);
  }, [items, vegOnly]);

  return (
    <div className="max-w-lg mx-auto min-h-screen bg-background pb-24">
      <MarketPageHeader title="My List" city={cityLabel !== 'All India' ? cityLabel : undefined} />

      <div className="px-4 pt-4 space-y-4">
        {/* Add Item + Auto-generate */}
        <div className="flex gap-2">
          <input
            type="text"
            value={newItem}
            onChange={e => setNewItem(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addItem()}
            placeholder="Add item to your list..."
            className="flex-1 px-4 py-2.5 rounded-xl bg-muted text-sm text-foreground placeholder:text-muted-foreground border-none outline-none focus:ring-1 focus:ring-primary/30 transition-shadow"
          />
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={addItem}
            className="px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold"
          >
            <Plus className="w-4 h-4" />
          </motion.button>
        </div>

        {/* Auto-generate from meal plan */}
        <motion.button
          whileTap={{ scale: 0.98 }}
          onClick={autoGenerateFromMealPlan}
          className="w-full flex items-center gap-3 p-3 rounded-xl bg-primary/5 border border-primary/15 hover:bg-primary/8 transition-colors"
        >
          <CalendarDays className="w-5 h-5 text-primary" />
          <div className="flex-1 text-left">
            <p className="text-[12px] font-semibold text-foreground">Auto-generate from Meal Plan</p>
            <p className="text-[10px] text-muted-foreground">Import ingredients from your weekly plan</p>
          </div>
          <ArrowRight className="w-4 h-4 text-primary" />
        </motion.button>

        {items.length === 0 ? (
          <div className="text-center py-12">
            <ClipboardList className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm font-semibold text-foreground mb-1">Your list is empty</p>
            <p className="text-[11px] text-muted-foreground mb-4">Add items from the market or type them above</p>
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => navigate('/market')}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-semibold"
            >
              <ShoppingCart className="w-3.5 h-3.5" /> Browse Market <ArrowRight className="w-3.5 h-3.5" />
            </motion.button>

            {suggestions.length > 0 && (
              <div className="mt-8 text-left">
                <div className="flex items-center gap-1.5 mb-3">
                  <Sparkles className="w-4 h-4 text-primary" />
                  <h3 className="text-xs font-bold text-foreground">Quick Add Suggestions</h3>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {suggestions.map(s => (
                    <motion.button
                      key={s.id}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => addSuggested(s.id)}
                      className="p-2.5 rounded-xl bg-card border border-border/50 text-left hover:border-primary/20 transition-colors"
                    >
                      <MarketImage itemId={s.id} emoji={s.emoji} alt={s.name} size="sm" />
                      <p className="text-[10px] font-semibold text-foreground mt-1 truncate">{s.name}</p>
                      <p className="text-[9px] text-muted-foreground">{s.protein}g protein</p>
                    </motion.button>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <>
            {/* Summary Bar */}
            <motion.div
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-3 rounded-xl bg-primary/5 border border-primary/15 flex items-center justify-between"
            >
              <div className="flex gap-4">
                <div>
                  <p className="text-[10px] text-muted-foreground">Est. Cost</p>
                  <p className="text-sm font-bold text-foreground">₹{totalCost}</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground">Protein</p>
                  <p className="text-sm font-bold text-foreground">{totalProtein}g</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground">Items</p>
                  <p className="text-sm font-bold text-foreground">{unchecked.length}</p>
                </div>
              </div>
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={shareList}
                className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center"
              >
                <Share2 className="w-4 h-4 text-primary" />
              </motion.button>
            </motion.div>

            {/* Unchecked Items */}
            <div className="space-y-1.5">
              <AnimatePresence>
                {unchecked.map((item, i) => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10, height: 0 }}
                    transition={{ delay: i * 0.02 }}
                    className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border/50"
                  >
                    <motion.button
                      whileTap={{ scale: 0.8 }}
                      onClick={() => toggleCheck(item.id)}
                      className="w-5 h-5 rounded-full border-2 border-muted-foreground/30 flex-shrink-0"
                    />
                    <MarketImage itemId={MARKET_ITEMS.find(m => m.name === item.name)?.id} emoji={item.emoji} alt={item.name} size="sm" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-foreground truncate">{item.name}</p>
                      {item.estimatedPrice && (
                        <p className="text-[9px] text-muted-foreground">~₹{item.estimatedPrice}/{item.unit} · {item.protein}g protein</p>
                      )}
                    </div>
                    <button onClick={() => removeItem(item.id)} className="p-1">
                      <Trash2 className="w-3.5 h-3.5 text-muted-foreground hover:text-destructive transition-colors" />
                    </button>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            {/* Checked Items */}
            {checked.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-[11px] font-semibold text-muted-foreground">✅ Completed ({checked.length})</p>
                  <button onClick={clearChecked} className="text-[10px] text-primary font-semibold">Clear</button>
                </div>
                {checked.map(item => (
                  <div key={item.id} className="flex items-center gap-3 p-3 rounded-xl bg-muted/30 border border-border/30">
                    <motion.button
                      whileTap={{ scale: 0.8 }}
                      onClick={() => toggleCheck(item.id)}
                      className="w-5 h-5 rounded-full border-2 border-primary bg-primary flex items-center justify-center flex-shrink-0"
                    >
                      <Check className="w-3 h-3 text-primary-foreground" />
                    </motion.button>
                    <span className="text-lg opacity-50">{item.emoji}</span>
                    <p className="flex-1 text-sm text-muted-foreground line-through">{item.name}</p>
                    <button onClick={() => removeItem(item.id)} className="p-1">
                      <Trash2 className="w-3.5 h-3.5 text-muted-foreground hover:text-destructive transition-colors" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Suggestions */}
            {suggestions.length > 0 && (
              <div className="space-y-2 pt-2">
                <div className="flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-primary" />
                  <h3 className="text-[11px] font-bold text-foreground">Suggested Additions</h3>
                </div>
                <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
                  {suggestions.map(s => (
                    <motion.button
                      key={s.id}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => addSuggested(s.id)}
                      className="flex-shrink-0 flex items-center gap-2 px-3 py-2 rounded-xl bg-card border border-border/50 hover:border-primary/20 transition-colors"
                    >
                      <MarketImage itemId={s.id} emoji={s.emoji} alt={s.name} size="sm" />
                      <div className="text-left">
                        <p className="text-[10px] font-semibold text-foreground whitespace-nowrap">{s.name.split('(')[0].trim()}</p>
                        <p className="text-[9px] text-muted-foreground">{s.protein}g protein</p>
                      </div>
                      <Plus className="w-3.5 h-3.5 text-primary" />
                    </motion.button>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
