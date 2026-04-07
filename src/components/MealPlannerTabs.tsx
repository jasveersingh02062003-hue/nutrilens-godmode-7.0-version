import { useState, useMemo, useRef, useEffect, lazy, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingCart, Check, Plus, Search, Clock, Flame, Zap, X } from 'lucide-react';
import { getWeekPlan, getCurrentWeekStart } from '@/lib/meal-planner-store';
import { generateShoppingList } from '@/lib/meal-plan-generator';
import { recipes, getRecipeById } from '@/lib/recipes';
import { getRecipeImage } from '@/lib/recipe-images';
import type { WeekPlan } from '@/lib/meal-planner-store';
import BudgetPlannerTab from './BudgetPlannerTab';
import SurvivalKitSheet from './SurvivalKitSheet';
import CompareTab from './CompareTab';
import KitchenTab from './KitchenTab';
import SpecialPlansTab from './SpecialPlansTab';
import MarketCompactView from './MarketCompactView';
import { getSavedSurvivalKit, clearSurvivalKit } from '@/lib/grocery-survival';
const TAB_ITEMS = ['Budget', 'Meal Plan', 'Plans', 'Compare', 'Kitchen', 'Market'] as const;
type TabName = typeof TAB_ITEMS[number];

interface MealPlannerTabsProps {
  plan: WeekPlan;
  activeTab: TabName;
  onTabChange: (tab: TabName) => void;
  mealPlanContent: React.ReactNode;
  onBudgetComplete?: () => void;
}

// ===== Groceries Sub-Tab =====
function GroceriesTab({ plan }: { plan: WeekPlan }) {
  const [kitOpen, setKitOpen] = useState(false);
  const [savedKit, setSavedKit] = useState(() => getSavedSurvivalKit());

  const initialList = useMemo(() => {
    const planList = generateShoppingList(plan);

    if (!savedKit) return planList;

    // Convert survival kit items into grocery format grouped by category
    const kitByCategory: Record<string, { name: string; quantity: string; checked: boolean; isKit?: boolean }[]> = {};
    for (const item of savedKit.items) {
      const cat = item.category || 'Survival Kit';
      if (!kitByCategory[cat]) kitByCategory[cat] = [];
      kitByCategory[cat].push({
        name: `⚡ ${item.name}`,
        quantity: `${item.quantity} ${item.unit} (₹${Math.round(item.cost)})`,
        checked: false,
        isKit: true,
      });
    }

    // Merge: kit categories first, then plan categories
    const merged: typeof planList = [];
    for (const [cat, items] of Object.entries(kitByCategory)) {
      const existing = planList.find((c: any) => c.category === cat);
      if (existing) {
        merged.push({ category: cat, items: [...items, ...existing.items] });
      } else {
        merged.push({ category: cat, items });
      }
    }
    // Add remaining plan categories not in kit
    for (const cat of planList) {
      if (!kitByCategory[cat.category]) {
        merged.push(cat);
      }
    }
    return merged;
  }, [plan, savedKit]);

  const [groceryList, setGroceryList] = useState(initialList);
  const [addingItem, setAddingItem] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const [newItemQty, setNewItemQty] = useState('');

  // Re-sync grocery list when kit changes
  useEffect(() => {
    setGroceryList(initialList);
  }, [initialList]);

  const toggleItem = (catIdx: number, itemIdx: number) => {
    setGroceryList(prev => prev.map((cat, ci) =>
      ci === catIdx ? {
        ...cat,
        items: cat.items.map((item: any, ii: number) =>
          ii === itemIdx ? { ...item, checked: !item.checked } : item
        ),
      } : cat
    ));
  };

  const addManualItem = () => {
    if (!newItemName.trim()) return;
    setGroceryList(prev => {
      const otherIdx = prev.findIndex((c: any) => c.category === 'Other');
      const newItem = { name: newItemName.trim(), quantity: newItemQty.trim() || '1', checked: false };
      if (otherIdx >= 0) {
        return prev.map((cat: any, i: number) =>
          i === otherIdx ? { ...cat, items: [...cat.items, newItem] } : cat
        );
      }
      return [...prev, { category: 'Other', items: [newItem] }];
    });
    setNewItemName('');
    setNewItemQty('');
    setAddingItem(false);
  };

  const totalItems = groceryList.reduce((s: number, c: any) => s + c.items.length, 0);
  const checkedItems = groceryList.reduce((s: number, c: any) => s + c.items.filter((i: any) => i.checked).length, 0);

  return (
    <div className="space-y-4">
      {/* Survival Kit Button */}
      <button
        onClick={() => setKitOpen(true)}
        className="w-full py-3.5 rounded-2xl bg-primary/10 border border-primary/20 text-sm font-bold text-primary flex items-center justify-center gap-2 hover:bg-primary/15 transition-colors"
      >
        <Zap className="w-4 h-4" /> Build Survival Kit — Max protein for your budget
      </button>

      {/* Active Kit Banner */}
      {savedKit && (
        <div className="rounded-xl bg-accent border border-border p-3 flex items-center gap-3">
          <div className="flex-1">
            <p className="text-xs font-bold text-foreground">🔒 Active Survival Kit</p>
            <p className="text-[10px] text-muted-foreground">
              ₹{savedKit.totalCost} · {savedKit.totalProtein}g protein · {savedKit.proteinCoverage}% coverage
            </p>
          </div>
          <button onClick={() => setKitOpen(true)} className="text-[10px] font-semibold text-primary">View</button>
          <button
            onClick={() => { clearSurvivalKit(); setSavedKit(null); }}
            className="w-6 h-6 rounded-full bg-muted flex items-center justify-center"
          >
            <X className="w-3 h-3 text-muted-foreground" />
          </button>
        </div>
      )}

      <SurvivalKitSheet open={kitOpen} onOpenChange={(o) => { setKitOpen(o); if (!o) setSavedKit(getSavedSurvivalKit()); }} />

      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">Mark items you already have or purchased</p>
        <span className="text-xs font-bold text-primary">{checkedItems}/{totalItems}</span>
      </div>

      <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
        <div className="h-full bg-primary rounded-full transition-all duration-300" style={{ width: `${totalItems ? (checkedItems / totalItems) * 100 : 0}%` }} />
      </div>

      <div className="space-y-4">
        {groceryList.map((cat: any, catIdx: number) => (
          <div key={cat.category}>
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 px-1">{cat.category}</p>
            <div className="space-y-1">
              {cat.items.map((item: any, itemIdx: number) => (
                <button key={`${item.name}-${itemIdx}`} onClick={() => toggleItem(catIdx, itemIdx)}
                  className={`w-full card-subtle p-3 flex items-center gap-3 text-left transition-all ${item.checked ? 'opacity-50' : ''} ${item.isKit ? 'border-l-2 border-l-primary bg-primary/5' : ''}`}>
                  <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-colors ${item.checked ? 'bg-primary border-primary' : 'border-border'}`}>
                    {item.checked && <Check className="w-3 h-3 text-primary-foreground" />}
                  </div>
                  <span className={`text-sm font-medium flex-1 ${item.checked ? 'line-through text-muted-foreground' : 'text-foreground'}`}>{item.name}</span>
                  <span className="text-xs text-muted-foreground">{item.quantity}</span>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      {addingItem ? (
        <div className="card-subtle p-4 space-y-3">
          <input value={newItemName} onChange={e => setNewItemName(e.target.value)} placeholder="Item name"
            className="w-full px-3 py-2.5 rounded-xl bg-muted text-sm outline-none focus:ring-2 focus:ring-primary/20" autoFocus />
          <input value={newItemQty} onChange={e => setNewItemQty(e.target.value)} placeholder="Quantity (e.g., 200g)"
            className="w-full px-3 py-2.5 rounded-xl bg-muted text-sm outline-none focus:ring-2 focus:ring-primary/20" />
          <div className="flex gap-2">
            <button onClick={() => setAddingItem(false)} className="flex-1 py-2 rounded-xl bg-muted text-sm font-semibold text-muted-foreground">Cancel</button>
            <button onClick={addManualItem} className="flex-1 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold">Add</button>
          </div>
        </div>
      ) : (
        <button onClick={() => setAddingItem(true)}
          className="w-full py-3 rounded-xl border border-dashed border-border text-sm font-medium text-muted-foreground hover:border-primary/50 hover:text-primary transition-colors flex items-center justify-center gap-2">
          <Plus className="w-4 h-4" /> Add item
        </button>
      )}
    </div>
  );
}

// ===== Recipes Sub-Tab =====
function RecipesTab() {
  const [search, setSearch] = useState('');
  const [selectedRecipe, setSelectedRecipe] = useState<string | null>(null);

  const filtered = useMemo(() => {
    if (!search.trim()) return recipes;
    const q = search.toLowerCase();
    return recipes.filter(r =>
      r.name.toLowerCase().includes(q) ||
      r.cuisine.toLowerCase().includes(q) ||
      r.tags.some(t => t.toLowerCase().includes(q))
    );
  }, [search]);

  const detail = selectedRecipe ? getRecipeById(selectedRecipe) : null;

  if (detail) {
    return (
      <div className="space-y-4">
        <button onClick={() => setSelectedRecipe(null)} className="text-xs font-semibold text-primary">← Back to recipes</button>
        <div className="text-center">
          <div className="w-24 h-24 rounded-2xl overflow-hidden mx-auto">
            <img src={getRecipeImage(detail.id, detail.mealType[0])} alt={detail.name} className="w-full h-full object-cover" />
          </div>
          <h3 className="text-lg font-bold text-foreground mt-2">{detail.name}</h3>
          <p className="text-xs text-muted-foreground mt-1">{detail.cuisine} · {detail.difficulty}</p>
        </div>
        <div className="flex justify-center gap-4">
          <div className="card-subtle px-3 py-2 text-center">
            <Clock className="w-3.5 h-3.5 text-muted-foreground mx-auto" />
            <p className="text-[10px] text-muted-foreground mt-1">Prep</p>
            <p className="text-xs font-bold">{detail.prepTime}m</p>
          </div>
          <div className="card-subtle px-3 py-2 text-center">
            <Clock className="w-3.5 h-3.5 text-muted-foreground mx-auto" />
            <p className="text-[10px] text-muted-foreground mt-1">Cook</p>
            <p className="text-xs font-bold">{detail.cookTime}m</p>
          </div>
          <div className="card-subtle px-3 py-2 text-center">
            <Flame className="w-3.5 h-3.5 text-muted-foreground mx-auto" />
            <p className="text-[10px] text-muted-foreground mt-1">Calories</p>
            <p className="text-xs font-bold">{detail.calories}</p>
          </div>
        </div>
        <div>
          <h4 className="text-xs font-bold text-foreground uppercase tracking-wider mb-2">Macros</h4>
          <div className="flex gap-2">
            {[{ l: 'Protein', v: detail.protein }, { l: 'Carbs', v: detail.carbs }, { l: 'Fat', v: detail.fat }, { l: 'Fiber', v: detail.fiber }].map(m => (
              <div key={m.l} className="flex-1 card-subtle p-2 text-center">
                <p className="text-[10px] text-muted-foreground">{m.l}</p>
                <p className="text-xs font-bold">{m.v}g</p>
              </div>
            ))}
          </div>
        </div>
        <div>
          <h4 className="text-xs font-bold text-foreground uppercase tracking-wider mb-2">Ingredients</h4>
          <div className="space-y-1">
            {detail.ingredients.map((ing, i) => (
              <div key={i} className="flex items-center gap-2 text-sm">
                <span className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
                <span className="text-foreground">{ing.name}</span>
                <span className="text-muted-foreground ml-auto text-xs">{ing.quantity}</span>
              </div>
            ))}
          </div>
        </div>
        <div>
          <h4 className="text-xs font-bold text-foreground uppercase tracking-wider mb-2">Instructions</h4>
          <div className="space-y-2">
            {detail.steps.map((step, i) => (
              <div key={i} className="flex gap-3">
                <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-[10px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">{i + 1}</span>
                <p className="text-sm text-foreground">{step}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search recipes..."
          className="w-full pl-10 pr-3 py-2.5 rounded-xl bg-muted text-sm outline-none focus:ring-2 focus:ring-primary/20" />
      </div>
      <p className="text-xs text-muted-foreground">{filtered.length} recipes</p>
      <div className="grid grid-cols-2 gap-2">
        {filtered.slice(0, 20).map(r => (
          <button key={r.id} onClick={() => setSelectedRecipe(r.id)}
            className="card-subtle overflow-hidden text-left hover:shadow-md transition-shadow">
            <div className="h-24 overflow-hidden">
              <img src={getRecipeImage(r.id, r.mealType[0])} alt={r.name} className="w-full h-full object-cover" loading="lazy" />
            </div>
            <div className="p-3">
            <p className="text-xs font-semibold text-foreground mt-1.5 line-clamp-2">{r.name}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">{r.calories} kcal · {r.prepTime + r.cookTime}m</p>
            <div className="flex flex-wrap gap-1 mt-1.5">
              {r.tags.slice(0, 2).map(t => (
                <span key={t} className="text-[8px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-medium">{t}</span>
              ))}
            </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

// ===== Main Tabs Component =====
export default function MealPlannerTabs({ plan, activeTab, onTabChange, mealPlanContent, onBudgetComplete }: MealPlannerTabsProps) {
  const touchStart = useRef<number | null>(null);
  const touchDelta = useRef<number>(0);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStart.current = e.touches[0].clientX;
    touchDelta.current = 0;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStart.current === null) return;
    touchDelta.current = e.touches[0].clientX - touchStart.current;
  };

  const handleTouchEnd = () => {
    if (Math.abs(touchDelta.current) > 50) {
      const currentIdx = TAB_ITEMS.indexOf(activeTab);
      if (touchDelta.current < 0 && currentIdx < TAB_ITEMS.length - 1) {
        onTabChange(TAB_ITEMS[currentIdx + 1]);
      } else if (touchDelta.current > 0 && currentIdx > 0) {
        onTabChange(TAB_ITEMS[currentIdx - 1]);
      }
    }
    touchStart.current = null;
    touchDelta.current = 0;
  };

  return (
    <div>
      {/* Top tab bar */}
      <div className="flex bg-muted rounded-xl p-1 mb-4">
        {TAB_ITEMS.map(tab => (
          <button key={tab} onClick={() => onTabChange(tab)}
            className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all relative ${activeTab === tab ? 'text-foreground' : 'text-muted-foreground'}`}>
            {activeTab === tab && (
              <motion.div layoutId="activeTab" className="absolute inset-0 bg-card rounded-lg shadow-sm" transition={{ type: 'spring', stiffness: 400, damping: 30 }} />
            )}
            <span className="relative z-10">{tab}</span>
          </button>
        ))}
      </div>

      {/* Swipeable tab content */}
      <div onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd} className="min-h-[200px]">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
          >
            {activeTab === 'Budget' && <BudgetPlannerTab onOnboardingComplete={onBudgetComplete} />}
            {activeTab === 'Meal Plan' && mealPlanContent}
            {activeTab === 'Plans' && <SpecialPlansTab />}
            {activeTab === 'Compare' && <CompareTab />}
            {activeTab === 'Kitchen' && (
              <KitchenTab
                groceriesContent={<GroceriesTab plan={plan} />}
                recipesContent={<RecipesTab />}
              />
            )}
            {activeTab === 'Market' && <MarketCompactView />}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

export type { TabName };
