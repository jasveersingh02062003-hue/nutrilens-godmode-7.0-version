import { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { searchIndianFoods, indianFoodToFoodItem } from '@/lib/indian-foods';
import { addMealToLog, type MealEntry, type FoodItem, getProfile } from '@/lib/store';
import { syncDailyBalance } from '@/lib/calorie-correction';
import { reportPrice } from '@/lib/live-price-service';
import { checkAllergens, getAllergenLabel, getAllergenEmoji } from '@/lib/allergen-engine';
import { checkFoodForConditions, getUserConditions } from '@/lib/condition-coach';
import { getSugarWarnings, isSugarDetectionActive } from '@/lib/sugar-detector';
import AnimatedWarningBanner from '@/components/AnimatedWarningBanner';
import { toast } from 'sonner';

interface Props {
  open: boolean;
  onClose: () => void;
  onSaved?: () => void;
}

// Hindi / common units to strip (container words that aren't food names)
const STRIP_UNITS = ['katori', 'katora', 'bowl', 'plate', 'glass', 'cup', 'piece', 'slice', 'serving', 'scoop', 'tbsp', 'tsp', 'spoon', 'handful', 'bunch', 'packet', 'pkt'];

// Enhanced parser: handles "2 rotis + sabzi", "an apple", "roti x3", "half bowl dal", "2 katori dal"
function parseQuickText(text: string): Array<{ name: string; qty: number }> {
  const parts = text.split(/[+,&]/).map(s => s.trim()).filter(Boolean);
  return parts.map(part => {
    let p = part.trim();

    // 1. Handle articles and word-based quantities
    let qty = 1;
    if (/^half\b/i.test(p)) { qty = 0.5; p = p.replace(/^half\s*/i, ''); }
    else if (/^quarter\b/i.test(p)) { qty = 0.25; p = p.replace(/^quarter\s*/i, ''); }
    else if (/^double\b/i.test(p)) { qty = 2; p = p.replace(/^double\s*/i, ''); }
    else if (/^(an?|one)\s+/i.test(p)) { qty = 1; p = p.replace(/^(an?|one)\s+/i, ''); }
    else if (/^two\s+/i.test(p)) { qty = 2; p = p.replace(/^two\s+/i, ''); }
    else if (/^three\s+/i.test(p)) { qty = 3; p = p.replace(/^three\s+/i, ''); }

    // 2. Leading number: "2 rotis", "1.5 bowl dal"
    const leadMatch = p.match(/^(\d+\.?\d*)\s*[x×]?\s*(.+)/i);
    if (leadMatch) {
      qty = parseFloat(leadMatch[1]) * (qty !== 1 ? qty : 1);
      p = leadMatch[2].trim();
    }

    // 3. Trailing quantity: "roti x3", "dal × 2", "apple x 2"
    const trailMatch = p.match(/^(.+?)\s*[x×]\s*(\d+\.?\d*)$/i);
    if (trailMatch) {
      p = trailMatch[1].trim();
      qty = parseFloat(trailMatch[2]) * (qty !== 1 ? qty : 1);
    }

    // 4. Strip unit words: "2 katori dal" → "dal", "1 bowl rice" → "rice"
    for (const unit of STRIP_UNITS) {
      const unitRegex = new RegExp(`^${unit}s?\\s+`, 'i');
      if (unitRegex.test(p)) {
        p = p.replace(unitRegex, '');
        break;
      }
      const unitRegexEnd = new RegExp(`\\s+${unit}s?$`, 'i');
      if (unitRegexEnd.test(p)) {
        p = p.replace(unitRegexEnd, '');
        break;
      }
    }

    // 5. Strip trailing 's' for plurals: "rotis" → "roti", "eggs" → "egg"
    const name = p.replace(/s$/i, '').trim() || p.trim();

    return { name, qty };
  });
}

export default function QuickLogSheet({ open, onClose, onSaved }: Props) {
  const [text, setText] = useState('');
  const [saving, setSaving] = useState(false);
  const [sugarWarningItems, setSugarWarningItems] = useState<FoodItem[]>([]);
  const [showSugarWarning, setShowSugarWarning] = useState(false);
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

    // Check for allergens
    const profile = getProfile();
    const userAllergens = profile?.allergens || [];
    if (userAllergens.length > 0) {
      const warnings: string[] = [];
      for (const item of items) {
        const check = checkAllergens(item.name, userAllergens);
        if (check.hasConflict) {
          warnings.push(`${item.name} contains ${check.matched.map(a => `${getAllergenEmoji(a)} ${getAllergenLabel(a)}`).join(', ')}`);
        }
      }
      if (warnings.length > 0) {
        warnings.forEach(w => toast.error(`⚠️ ${w}`, { duration: 5000 }));
      }
    }

    // Check for health condition warnings
    const userConditions = getUserConditions(profile as any);
    if (userConditions.length > 0) {
      for (const item of items) {
        const condWarnings = checkFoodForConditions(item.name, userConditions);
        for (const w of condWarnings) {
          const style = w.severity === 'high' ? 'error' as const : 'warning' as const;
          toast[style](`${w.icon} ${item.name}: ${w.text}`, { duration: 5000 });
        }
      }
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
