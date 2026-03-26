import { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { searchIndianFoods, indianFoodToFoodItem } from '@/lib/indian-foods';
import { addMealToLog, type MealEntry, type FoodItem } from '@/lib/store';
import { syncDailyBalance } from '@/lib/calorie-correction';
import { reportPrice } from '@/lib/live-price-service';
import { toast } from 'sonner';

interface Props {
  open: boolean;
  onClose: () => void;
  onSaved?: () => void;
}

// Simple parser: "2 rotis + sabzi" → [{name: "roti", qty: 2}, {name: "sabzi", qty: 1}]
function parseQuickText(text: string): Array<{ name: string; qty: number }> {
  const parts = text.split(/[+,&]/).map(s => s.trim()).filter(Boolean);
  return parts.map(part => {
    const match = part.match(/^(\d+\.?\d*)\s*(.+)/);
    if (match) return { name: match[2].trim(), qty: parseFloat(match[1]) };
    return { name: part, qty: 1 };
  });
}

export default function QuickLogSheet({ open, onClose, onSaved }: Props) {
  const [text, setText] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = () => {
    if (!text.trim()) return;
    setSaving(true);

    const parsed = parseQuickText(text);
    const items: FoodItem[] = [];

    for (const p of parsed) {
      const results = searchIndianFoods(p.name);
      if (results.length > 0) {
        const food = indianFoodToFoodItem(results[0]);
        items.push({ ...food, id: Date.now().toString() + Math.random(), quantity: p.qty, confidenceScore: 0.6 } as FoodItem);
      }
    }

    if (items.length === 0) {
      toast.error("Couldn't recognize any foods. Try 'dal rice' or '2 rotis'.");
      setSaving(false);
      return;
    }

    const hour = new Date().getHours();
    const mealType = hour < 11 ? 'breakfast' : hour < 15 ? 'lunch' : hour < 18 ? 'snack' : 'dinner';

    const meal: MealEntry = {
      id: Date.now().toString(),
      type: mealType as any,
      items,
      totalCalories: Math.round(items.reduce((s, i) => s + i.calories * i.quantity, 0)),
      totalProtein: Math.round(items.reduce((s, i) => s + i.protein * i.quantity, 0)),
      totalCarbs: Math.round(items.reduce((s, i) => s + i.carbs * i.quantity, 0)),
      totalFat: Math.round(items.reduce((s, i) => s + i.fat * i.quantity, 0)),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    addMealToLog(meal);
    syncDailyBalance();
    toast.success(`Quick log saved ✅ ${items.length} item${items.length !== 1 ? 's' : ''} added`);
    setText('');
    setSaving(false);
    onSaved?.();
    onClose();
  };

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="bottom" className="rounded-t-2xl">
        <SheetHeader>
          <SheetTitle>Quick Log ⚡</SheetTitle>
          <SheetDescription>Type what you ate — we'll estimate the rest.</SheetDescription>
        </SheetHeader>
        <div className="space-y-4 pt-4">
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="e.g. 2 rotis + dal + sabzi"
            className="w-full rounded-xl border border-border bg-card px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            onKeyDown={(e) => e.key === 'Enter' && handleSave()}
            autoFocus
          />
          <div className="flex gap-2 flex-wrap">
            {['2 rotis + sabzi', 'dal rice', '1 egg + toast', 'poha', 'idli sambar'].map(ex => (
              <button key={ex} onClick={() => setText(ex)} className="px-2.5 py-1 rounded-lg bg-muted text-[10px] font-medium text-muted-foreground hover:bg-muted/80">
                {ex}
              </button>
            ))}
          </div>
          <Button onClick={handleSave} disabled={!text.trim() || saving} className="w-full">
            {saving ? 'Saving...' : 'Log It'}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
