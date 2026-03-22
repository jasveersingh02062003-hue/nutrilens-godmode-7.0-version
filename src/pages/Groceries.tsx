import { useState, useMemo } from 'react';
import { ArrowLeft, ShoppingCart, Check, Plus, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getWeekPlan, getCurrentWeekStart } from '@/lib/meal-planner-store';
import { generateShoppingList } from '@/lib/meal-plan-generator';
import MonikaFab from '@/components/MonikaFab';

interface GroceryItem {
  name: string;
  quantity: string;
  checked: boolean;
}

interface GroceryCategory {
  category: string;
  items: GroceryItem[];
}

export default function Groceries() {
  const navigate = useNavigate();
  const weekStart = getCurrentWeekStart();
  const plan = getWeekPlan(weekStart);

  const initialList = useMemo(() => {
    if (!plan) return [];
    return generateShoppingList(plan);
  }, [plan]);

  const [groceryList, setGroceryList] = useState<GroceryCategory[]>(initialList);
  const [addingItem, setAddingItem] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const [newItemQty, setNewItemQty] = useState('');

  const toggleItem = (catIdx: number, itemIdx: number) => {
    setGroceryList(prev => prev.map((cat, ci) =>
      ci === catIdx ? {
        ...cat,
        items: cat.items.map((item, ii) =>
          ii === itemIdx ? { ...item, checked: !item.checked } : item
        ),
      } : cat
    ));
  };

  const addManualItem = () => {
    if (!newItemName.trim()) return;
    setGroceryList(prev => {
      const otherIdx = prev.findIndex(c => c.category === 'Other');
      if (otherIdx >= 0) {
        return prev.map((cat, i) =>
          i === otherIdx ? {
            ...cat,
            items: [...cat.items, { name: newItemName.trim(), quantity: newItemQty.trim() || '1', checked: false }],
          } : cat
        );
      }
      return [...prev, { category: 'Other', items: [{ name: newItemName.trim(), quantity: newItemQty.trim() || '1', checked: false }] }];
    });
    setNewItemName('');
    setNewItemQty('');
    setAddingItem(false);
  };

  const totalItems = groceryList.reduce((s, c) => s + c.items.length, 0);
  const checkedItems = groceryList.reduce((s, c) => s + c.items.filter(i => i.checked).length, 0);

  if (!plan) {
    return (
      <div className="min-h-screen bg-background pb-24">
        <div className="max-w-lg mx-auto px-4 pt-8 text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
            <ShoppingCart className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-lg font-bold text-foreground">Groceries</h1>
          <p className="text-sm text-muted-foreground">Create a meal plan first to auto-generate your grocery list.</p>
          <button onClick={() => navigate('/planner')} className="btn-primary">Go to Meal Planner</button>
        </div>
        <MonikaFab />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="max-w-lg mx-auto px-4 pt-5 space-y-4 animate-fade-in">
        {/* Header */}
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-xl bg-card border border-border flex items-center justify-center">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <h1 className="text-lg font-bold text-foreground">Groceries</h1>
            <p className="text-xs text-muted-foreground">Mark items you already have or purchased</p>
          </div>
          <span className="text-xs font-bold text-primary">{checkedItems}/{totalItems}</span>
        </div>

        {/* Progress bar */}
        <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
          <div className="h-full bg-primary rounded-full transition-all duration-300" style={{ width: `${totalItems ? (checkedItems / totalItems) * 100 : 0}%` }} />
        </div>

        {/* Categories */}
        <div className="space-y-4">
          {groceryList.map((cat, catIdx) => (
            <div key={cat.category}>
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 px-1">{cat.category}</p>
              <div className="space-y-1">
                {cat.items.map((item, itemIdx) => (
                  <button key={`${item.name}-${itemIdx}`} onClick={() => toggleItem(catIdx, itemIdx)}
                    className={`w-full card-subtle p-3 flex items-center gap-3 text-left transition-all ${item.checked ? 'opacity-50' : ''}`}>
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

        {/* Add item */}
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
      <MonikaFab />
    </div>
  );
}
