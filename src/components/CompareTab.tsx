import { useState, useMemo, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, Star, Scale, ChefHat, Home } from 'lucide-react';
import { searchIndianFoods, type IndianFood } from '@/lib/indian-foods';
import { recipes, type Recipe } from '@/lib/recipes';
import { getRecipeImage } from '@/lib/recipe-images';
import { type CompareItem, buildFromFood, buildFromRecipe } from '@/lib/compare-helpers';

interface SearchResult {
  id: string;
  name: string;
  type: 'food' | 'recipe';
  sub: string;
  source: IndianFood | Recipe;
}

function useSearch(query: string): SearchResult[] {
  return useMemo(() => {
    if (query.trim().length < 2) return [];
    const q = query.toLowerCase();
    const foodResults = searchIndianFoods(query).slice(0, 8).map(f => ({
      id: `food-${f.id}`,
      name: f.name,
      type: 'food' as const,
      sub: `${Math.round(f.calories * f.defaultServing / 100)} kcal · ${f.category}`,
      source: f,
    }));
    const recipeResults = recipes
      .filter(r => r.name.toLowerCase().includes(q) || r.tags.some(t => t.toLowerCase().includes(q)))
      .slice(0, 8)
      .map(r => ({
        id: `recipe-${r.id}`,
        name: r.name,
        type: 'recipe' as const,
        sub: `${r.calories} kcal · ${r.cuisine}`,
        source: r,
      }));
    return [...foodResults, ...recipeResults].slice(0, 10);
  }, [query]);
}

// ─── Search Input with Dropdown ───
function SearchSlot({
  label,
  selected,
  onSelect,
  onClear,
}: {
  label: string;
  selected: CompareItem | null;
  onSelect: (item: CompareItem) => void;
  onClear: () => void;
}) {
  const [query, setQuery] = useState('');
  const [focused, setFocused] = useState(false);
  const results = useSearch(query);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handle = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setFocused(false);
    };
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, []);

  if (selected) {
    return (
      <div className="flex items-center gap-2 rounded-xl bg-muted p-3">
        {selected.image && (
          <img src={selected.image} alt="" className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />
        )}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground truncate">{selected.name}</p>
          <p className="text-[10px] text-muted-foreground">{selected.calories} kcal · ₹{selected.cost}</p>
        </div>
        <button onClick={onClear} className="w-6 h-6 rounded-full bg-background flex items-center justify-center flex-shrink-0">
          <X className="w-3 h-3 text-muted-foreground" />
        </button>
      </div>
    );
  }

  return (
    <div ref={ref} className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          onFocus={() => setFocused(true)}
          placeholder={label}
          className="w-full pl-10 pr-3 py-2.5 rounded-xl bg-muted text-sm outline-none focus:ring-2 focus:ring-primary/20"
        />
      </div>
      <AnimatePresence>
        {focused && results.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="absolute z-20 top-full mt-1 left-0 right-0 bg-card border border-border rounded-xl shadow-lg max-h-52 overflow-y-auto"
          >
            {results.map(r => (
              <button
                key={r.id}
                onClick={() => {
                  const item = r.type === 'food'
                    ? buildFromFood(r.source as IndianFood)
                    : buildFromRecipe(r.source as Recipe);
                  onSelect(item);
                  setQuery('');
                  setFocused(false);
                }}
                className="w-full px-3 py-2.5 text-left hover:bg-muted/50 flex items-center gap-2 transition-colors"
              >
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-semibold flex-shrink-0">
                  {r.type === 'food' ? '🥗' : '🍳'}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground truncate">{r.name}</p>
                  <p className="text-[10px] text-muted-foreground">{r.sub}</p>
                </div>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Comparison Row ───
function CompareRow({
  label,
  v1,
  v2,
  unit,
  lowerIsBetter,
  index,
}: {
  label: string;
  v1: number;
  v2: number;
  unit: string;
  lowerIsBetter?: boolean;
  index: number;
}) {
  const winner = lowerIsBetter
    ? v1 < v2 ? 1 : v2 < v1 ? 2 : 0
    : v1 > v2 ? 1 : v2 > v1 ? 2 : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06 }}
      className="grid grid-cols-3 items-center gap-2 py-2.5 border-b border-border/50 last:border-0"
    >
      <div className={`text-center rounded-lg py-1.5 px-1 ${winner === 1 ? 'bg-green-500/10' : ''}`}>
        <span className={`text-sm font-bold ${winner === 1 ? 'text-green-600' : 'text-foreground'}`}>
          {v1}{unit}
        </span>
        {winner === 1 && <span className="text-[10px] ml-0.5">✅</span>}
      </div>
      <div className="text-center">
        <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">{label}</span>
      </div>
      <div className={`text-center rounded-lg py-1.5 px-1 ${winner === 2 ? 'bg-green-500/10' : ''}`}>
        <span className={`text-sm font-bold ${winner === 2 ? 'text-green-600' : 'text-foreground'}`}>
          {v2}{unit}
        </span>
        {winner === 2 && <span className="text-[10px] ml-0.5">✅</span>}
      </div>
    </motion.div>
  );
}

// ─── Main Compare Tab ───
export default function CompareTab() {
  const [item1, setItem1] = useState<CompareItem | null>(null);
  const [item2, setItem2] = useState<CompareItem | null>(null);

  const hasBoth = item1 && item2;
  const pesWinner = hasBoth ? (item1.pes > item2.pes ? 1 : item2.pes > item1.pes ? 2 : 0) : 0;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="text-center py-2">
        <div className="inline-flex items-center gap-2 text-primary">
          <Scale className="w-4 h-4" />
          <span className="text-xs font-bold uppercase tracking-wider">Side-by-Side Compare</span>
        </div>
      </div>

      {/* Two search slots */}
      <div className="space-y-2">
        <SearchSlot
          label="Search first item..."
          selected={item1}
          onSelect={setItem1}
          onClear={() => setItem1(null)}
        />
        <SearchSlot
          label="Search second item..."
          selected={item2}
          onSelect={setItem2}
          onClear={() => setItem2(null)}
        />
      </div>

      {/* Empty state */}
      {!hasBoth && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-8"
        >
          <div className="w-16 h-16 rounded-2xl bg-primary/10 mx-auto flex items-center justify-center mb-3">
            <Scale className="w-7 h-7 text-primary" />
          </div>
          <p className="text-sm font-semibold text-foreground">Pick any two foods or recipes</p>
          <p className="text-xs text-muted-foreground mt-1">Compare calories, protein, cost & PES score side by side</p>
        </motion.div>
      )}

      {/* Comparison Table */}
      {hasBoth && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="card-subtle p-4 space-y-1"
        >
          {/* Names Header */}
          <div className="grid grid-cols-3 gap-2 pb-3 border-b border-border">
            <div className="text-center">
              {item1.image && <img src={item1.image} alt="" className="w-14 h-14 rounded-xl object-cover mx-auto mb-1" />}
              <p className="text-xs font-bold text-foreground line-clamp-2">{item1.name}</p>
              {item1.type === 'recipe' && (
                <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-accent text-muted-foreground inline-flex items-center gap-0.5 mt-1">
                  <ChefHat className="w-2.5 h-2.5" /> Recipe
                </span>
              )}
            </div>
            <div className="flex items-center justify-center">
              <span className="text-lg font-black text-muted-foreground/30">VS</span>
            </div>
            <div className="text-center">
              {item2.image && <img src={item2.image} alt="" className="w-14 h-14 rounded-xl object-cover mx-auto mb-1" />}
              <p className="text-xs font-bold text-foreground line-clamp-2">{item2.name}</p>
              {item2.type === 'recipe' && (
                <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-accent text-muted-foreground inline-flex items-center gap-0.5 mt-1">
                  <ChefHat className="w-2.5 h-2.5" /> Recipe
                </span>
              )}
            </div>
          </div>

          {/* Data Rows */}
          <CompareRow label="Price" v1={item1.cost} v2={item2.cost} unit="₹" lowerIsBetter index={0} />
          <CompareRow label="Calories" v1={item1.calories} v2={item2.calories} unit="" lowerIsBetter index={1} />
          <CompareRow label="Protein" v1={item1.protein} v2={item2.protein} unit="g" index={2} />
          <CompareRow label="Carbs" v1={item1.carbs} v2={item2.carbs} unit="g" lowerIsBetter index={3} />
          <CompareRow label="Fat" v1={item1.fat} v2={item2.fat} unit="g" lowerIsBetter index={4} />
          <CompareRow label="Fiber" v1={item1.fiber} v2={item2.fiber} unit="g" index={5} />

          {/* PES Score Row (special) */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.36 }}
            className="grid grid-cols-3 items-center gap-2 py-3 border-t border-primary/20 mt-2"
          >
            <div className={`text-center rounded-xl py-2 ${pesWinner === 1 ? 'bg-primary/10 ring-1 ring-primary/30' : ''}`}>
              <p className="text-lg font-black text-foreground">{(item1.pes * 10).toFixed(1)}</p>
              {pesWinner === 1 && <Star className="w-3.5 h-3.5 text-primary mx-auto mt-0.5 fill-primary" />}
            </div>
            <div className="text-center">
              <span className="text-[10px] font-bold text-primary uppercase tracking-wider">PES Score</span>
            </div>
            <div className={`text-center rounded-xl py-2 ${pesWinner === 2 ? 'bg-primary/10 ring-1 ring-primary/30' : ''}`}>
              <p className="text-lg font-black text-foreground">{(item2.pes * 10).toFixed(1)}</p>
              {pesWinner === 2 && <Star className="w-3.5 h-3.5 text-primary mx-auto mt-0.5 fill-primary" />}
            </div>
          </motion.div>

          {/* Pantry match (if any recipe) */}
          {(item1.pantryMatch || item2.pantryMatch) && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.42 }}
              className="grid grid-cols-3 items-center gap-2 py-2"
            >
              <div className="text-center">
                {item1.pantryMatch ? (
                  <span className="text-[10px] font-medium text-muted-foreground inline-flex items-center gap-1">
                    <Home className="w-3 h-3" /> {item1.pantryMatch.available}/{item1.pantryMatch.total}
                  </span>
                ) : <span className="text-[10px] text-muted-foreground">—</span>}
              </div>
              <div className="text-center">
                <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Pantry</span>
              </div>
              <div className="text-center">
                {item2.pantryMatch ? (
                  <span className="text-[10px] font-medium text-muted-foreground inline-flex items-center gap-1">
                    <Home className="w-3 h-3" /> {item2.pantryMatch.available}/{item2.pantryMatch.total}
                  </span>
                ) : <span className="text-[10px] text-muted-foreground">—</span>}
              </div>
            </motion.div>
          )}

          {/* Verdict */}
          {pesWinner > 0 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.5 }}
              className="mt-3 p-3 rounded-xl bg-primary/5 border border-primary/10 text-center"
            >
              <p className="text-xs font-bold text-primary">
                ⭐ {pesWinner === 1 ? item1.name : item2.name} wins on value
              </p>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                Better protein-per-rupee with optimal calorie fit
              </p>
            </motion.div>
          )}
        </motion.div>
      )}
    </div>
  );
}
