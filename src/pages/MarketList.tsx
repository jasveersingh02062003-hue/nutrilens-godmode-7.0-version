import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ClipboardList, Plus, Trash2, ShoppingCart, ArrowRight } from 'lucide-react';
import MarketPageHeader from '@/components/MarketPageHeader';
import { useNavigate } from 'react-router-dom';
import { scopedGet, scopedSet } from '@/lib/scoped-storage';
import { toast } from 'sonner';

interface ListItem {
  id: string;
  name: string;
  emoji: string;
  quantity: string;
  checked: boolean;
}

const STORAGE_KEY = 'nutrilens_market_list';

export default function MarketList() {
  const navigate = useNavigate();
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
    const item: ListItem = { id: Date.now().toString(), name, emoji: '🛒', quantity: '1', checked: false };
    save([...items, item]);
    setNewItem('');
    toast.success(`Added ${name}`);
  };

  const toggleCheck = (id: string) => {
    save(items.map(i => i.id === id ? { ...i, checked: !i.checked } : i));
  };

  const removeItem = (id: string) => {
    save(items.filter(i => i.id !== id));
  };

  const clearChecked = () => {
    save(items.filter(i => !i.checked));
    toast.success('Cleared completed items');
  };

  const unchecked = items.filter(i => !i.checked);
  const checked = items.filter(i => i.checked);

  return (
    <div className="max-w-lg mx-auto min-h-screen bg-background pb-24">
      <MarketPageHeader title="My List" />

      <div className="px-4 pt-4 space-y-4">
        {/* Add Item */}
        <div className="flex gap-2">
          <input
            type="text"
            value={newItem}
            onChange={e => setNewItem(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addItem()}
            placeholder="Add item to your list..."
            className="flex-1 px-4 py-2.5 rounded-xl bg-muted text-sm text-foreground placeholder:text-muted-foreground border-none outline-none"
          />
          <button
            onClick={addItem}
            className="px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        {items.length === 0 ? (
          <div className="text-center py-16">
            <ClipboardList className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm font-semibold text-foreground mb-1">Your list is empty</p>
            <p className="text-[11px] text-muted-foreground mb-4">Add items from the market or type them above</p>
            <button
              onClick={() => navigate('/market')}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-semibold"
            >
              <ShoppingCart className="w-3.5 h-3.5" /> Browse Market <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <>
            {/* Unchecked Items */}
            <div className="space-y-1.5">
              {unchecked.map((item, i) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.03 }}
                  className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border"
                >
                  <button
                    onClick={() => toggleCheck(item.id)}
                    className="w-5 h-5 rounded-full border-2 border-muted-foreground/30 flex-shrink-0"
                  />
                  <span className="text-lg">{item.emoji}</span>
                  <p className="flex-1 text-sm text-foreground">{item.name}</p>
                  <button onClick={() => removeItem(item.id)} className="p-1">
                    <Trash2 className="w-3.5 h-3.5 text-muted-foreground hover:text-destructive" />
                  </button>
                </motion.div>
              ))}
            </div>

            {/* Checked Items */}
            {checked.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-[11px] font-semibold text-muted-foreground">Completed ({checked.length})</p>
                  <button onClick={clearChecked} className="text-[10px] text-primary font-semibold">Clear</button>
                </div>
                {checked.map(item => (
                  <div key={item.id} className="flex items-center gap-3 p-3 rounded-xl bg-muted/50 border border-border/50">
                    <button
                      onClick={() => toggleCheck(item.id)}
                      className="w-5 h-5 rounded-full border-2 border-primary bg-primary flex items-center justify-center flex-shrink-0"
                    >
                      <span className="text-primary-foreground text-[10px]">✓</span>
                    </button>
                    <span className="text-lg opacity-50">{item.emoji}</span>
                    <p className="flex-1 text-sm text-muted-foreground line-through">{item.name}</p>
                    <button onClick={() => removeItem(item.id)} className="p-1">
                      <Trash2 className="w-3.5 h-3.5 text-muted-foreground hover:text-destructive" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Summary */}
            <div className="p-3 rounded-xl bg-accent/10 border border-accent/20 text-center">
              <p className="text-[11px] text-muted-foreground">
                {unchecked.length} remaining · {checked.length} done
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
