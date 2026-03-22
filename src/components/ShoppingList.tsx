import { useState } from 'react';
import { ArrowLeft, Check } from 'lucide-react';
import { motion } from 'framer-motion';

interface ShoppingItem {
  name: string;
  quantity: string;
  checked: boolean;
}

interface Props {
  list: { category: string; items: ShoppingItem[] }[];
  onBack: () => void;
}

export default function ShoppingList({ list, onBack }: Props) {
  const [checked, setChecked] = useState<Set<string>>(new Set());

  const toggle = (key: string) => {
    setChecked(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  const totalItems = list.reduce((sum, cat) => sum + cat.items.length, 0);
  const checkedCount = checked.size;

  return (
    <div className="min-h-screen pb-24 bg-background">
      <div className="max-w-lg mx-auto px-4 pt-5 space-y-4 animate-fade-in">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="w-9 h-9 rounded-xl bg-card border border-border flex items-center justify-center">
            <ArrowLeft className="w-4 h-4 text-foreground" />
          </button>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-foreground">Shopping List</h1>
            <p className="text-xs text-muted-foreground">{checkedCount}/{totalItems} items checked</p>
          </div>
        </div>

        {/* Progress */}
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <motion.div className="h-full bg-primary rounded-full" animate={{ width: `${totalItems ? (checkedCount / totalItems) * 100 : 0}%` }} />
        </div>

        {list.map(cat => (
          <div key={cat.category}>
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">{cat.category}</h3>
            <div className="space-y-1">
              {cat.items.map(item => {
                const key = `${cat.category}-${item.name}`;
                const isChecked = checked.has(key);
                return (
                  <motion.button key={key} onClick={() => toggle(key)} whileTap={{ scale: 0.98 }}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-all ${isChecked ? 'bg-primary/5 border-primary/20' : 'bg-card border-border'}`}>
                    <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${isChecked ? 'bg-primary border-primary' : 'border-border'}`}>
                      {isChecked && <Check className="w-3 h-3 text-primary-foreground" />}
                    </div>
                    <span className={`text-sm flex-1 text-left ${isChecked ? 'line-through text-muted-foreground' : 'text-foreground'}`}>{item.name}</span>
                    <span className="text-xs text-muted-foreground">{item.quantity}</span>
                  </motion.button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
