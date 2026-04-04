import { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Search, Plus, Minus, Clock, Utensils } from 'lucide-react';
import { SUPPLEMENTS_DB, SUPPLEMENT_CATEGORIES, SUPPLEMENT_UNITS, SupplementDef } from '@/lib/supplements';
import { SupplementEntry, addSupplement, addSupplementForDate, addMealToLog, addMealToLogForDate, MealEntry, FoodItem } from '@/lib/store';
import { getCurrentMealType, getMealTypeForTime } from '@/lib/supplement-meal-assignment';
import MealSlotPicker from './MealSlotPicker';
import { mobileOverlayMotion, mobileOverlayTransition, mobileSheetMotion, mobileSheetTransition, useBodyScrollLock } from '@/hooks/use-body-scroll-lock';

interface Props {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  editEntry?: SupplementEntry | null;
  targetDate?: string;
}

export default function SupplementLogSheet({ open, onClose, onSaved, editEntry, targetDate }: Props) {
  const [step, setStep] = useState<'select' | 'form'>(editEntry ? 'form' : 'select');
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [selected, setSelected] = useState<SupplementDef | null>(null);

  // Form state
  const [name, setName] = useState(editEntry?.name || '');
  const [brand, setBrand] = useState(editEntry?.brand || '');
  const [dosage, setDosage] = useState(editEntry?.dosage || 1);
  const [unit, setUnit] = useState(editEntry?.unit || 'capsule');
  const [time, setTime] = useState(editEntry?.time || new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }));
  const [hasNutrition, setHasNutrition] = useState(editEntry ? (editEntry.calories > 0 || editEntry.protein > 0) : false);
  const [calories, setCalories] = useState(editEntry?.calories || 0);
  const [protein, setProtein] = useState(editEntry?.protein || 0);
  const [carbs, setCarbs] = useState(editEntry?.carbs || 0);
  const [fat, setFat] = useState(editEntry?.fat || 0);
  const [icon, setIcon] = useState(editEntry?.icon || '💊');
  const [category, setCategory] = useState(editEntry?.category || 'Other');
  const [isCustom, setIsCustom] = useState(false);

  // Meal assignment state
  const [assignedMeal, setAssignedMeal] = useState<'breakfast' | 'lunch' | 'dinner' | 'snack'>(getCurrentMealType());
  const [mealPickerOpen, setMealPickerOpen] = useState(false);

  const filtered = useMemo(() => {
    let list = SUPPLEMENTS_DB;
    if (activeCategory) list = list.filter(s => s.category === activeCategory);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(s => s.name.toLowerCase().includes(q) || s.brands.some(b => b.toLowerCase().includes(q)));
    }
    return list;
  }, [search, activeCategory]);

  const selectSupplement = (supp: SupplementDef) => {
    setSelected(supp);
    setName(supp.name);
    setIcon(supp.icon);
    setCategory(supp.category);
    setUnit(supp.defaultUnit);
    setDosage(supp.defaultDosage);
    const hasMacros = !!(supp.caloriesPerUnit || supp.proteinPerUnit);
    setHasNutrition(hasMacros);
    setCalories((supp.caloriesPerUnit || 0) * supp.defaultDosage);
    setProtein((supp.proteinPerUnit || 0) * supp.defaultDosage);
    setCarbs((supp.carbsPerUnit || 0) * supp.defaultDosage);
    setFat((supp.fatPerUnit || 0) * supp.defaultDosage);
    setStep('form');
  };

  const startCustom = () => {
    setIsCustom(true);
    setSelected(null);
    setName('');
    setBrand('');
    setDosage(1);
    setUnit('capsule');
    setHasNutrition(false);
    setCalories(0); setProtein(0); setCarbs(0); setFat(0);
    setIcon('💊');
    setCategory('Other');
    setStep('form');
  };

  const updateDosage = (d: number) => {
    const newD = Math.max(0.5, d);
    setDosage(newD);
    if (selected) {
      setCalories(Math.round((selected.caloriesPerUnit || 0) * newD));
      setProtein(Math.round((selected.proteinPerUnit || 0) * newD));
      setCarbs(Math.round((selected.carbsPerUnit || 0) * newD));
      setFat(Math.round((selected.fatPerUnit || 0) * newD));
    }
  };

  const handleTimeChange = (newTime: string) => {
    setTime(newTime);
    setAssignedMeal(getMealTypeForTime(newTime));
  };

  const handleSave = () => {
    const entry: SupplementEntry = {
      id: editEntry?.id || crypto.randomUUID(),
      name,
      brand: brand || undefined,
      dosage,
      unit,
      time,
      calories: hasNutrition ? calories : 0,
      protein: hasNutrition ? protein : 0,
      carbs: hasNutrition ? carbs : 0,
      fat: hasNutrition ? fat : 0,
      icon,
      category,
    };

    // Save as supplement
    if (targetDate) {
      addSupplementForDate(targetDate, entry);
    } else {
      addSupplement(entry);
    }

    // Also add to the assigned meal slot if it has nutritional value
    if (hasNutrition && (calories > 0 || protein > 0)) {
      const foodItem: FoodItem = {
        id: crypto.randomUUID(),
        name: `${icon} ${name}${brand ? ` (${brand})` : ''}`,
        calories: calories,
        protein: protein,
        carbs: carbs,
        fat: fat,
        quantity: dosage,
        unit: unit,
        emoji: icon,
      };

      const mealEntry: MealEntry = {
        id: crypto.randomUUID(),
        type: assignedMeal,
        items: [foodItem],
        totalCalories: calories,
        totalProtein: protein,
        totalCarbs: carbs,
        totalFat: fat,
        time: time,
      };

      if (targetDate) {
        addMealToLogForDate(targetDate, mealEntry);
      } else {
        addMealToLog(mealEntry);
      }
    }

    onSaved();
    handleClose();
  };

  const handleClose = () => {
    setStep('select');
    setSearch('');
    setActiveCategory(null);
    setSelected(null);
    setIsCustom(false);
    onClose();
  };

  useBodyScrollLock(open);

  if (typeof document === 'undefined') return null;

  const overlay = createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          {...mobileOverlayMotion}
          transition={mobileOverlayTransition}
          className="fixed inset-0 z-50"
          onClick={handleClose}
        >
          <div className="absolute inset-0 bg-foreground/30 backdrop-blur-sm" />
          <motion.div
            {...mobileSheetMotion}
            transition={mobileSheetTransition}
            className="absolute inset-x-0 bottom-0 mx-auto w-full max-w-lg max-h-[92dvh] overflow-y-auto overscroll-contain rounded-t-3xl bg-background shadow-lg"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full bg-muted-foreground/20" />
            </div>

            <div className="px-5 pb-[calc(2rem+env(safe-area-inset-bottom,0px))] space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-foreground">
                {step === 'select' ? 'Add Supplement' : (isCustom ? 'Custom Supplement' : name)}
              </h2>
              <button onClick={handleClose} className="w-8 h-8 rounded-lg hover:bg-muted flex items-center justify-center">
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>

            {step === 'select' ? (
              <>
                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Search for a supplement..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-muted border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>

                {/* Category chips */}
                <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
                  <button
                    onClick={() => setActiveCategory(null)}
                    className={`chip whitespace-nowrap ${!activeCategory ? 'chip-active' : ''}`}
                  >All</button>
                  {SUPPLEMENT_CATEGORIES.map(cat => (
                    <button
                      key={cat}
                      onClick={() => setActiveCategory(activeCategory === cat ? null : cat)}
                      className={`chip whitespace-nowrap ${activeCategory === cat ? 'chip-active' : ''}`}
                    >{cat}</button>
                  ))}
                </div>

                {/* List */}
                <div className="space-y-1.5 max-h-[45vh] overflow-y-auto">
                  {filtered.map((supp, i) => (
                    <button
                      key={supp.name}
                      onClick={() => selectSupplement(supp)}
                      className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-muted transition-colors text-left animate-fade-in active:scale-[0.98]"
                      style={{ animationDelay: `${i * 0.02}s` }}
                    >
                      <span className="text-xl">{supp.icon}</span>
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-foreground">{supp.name}</p>
                        <p className="text-[10px] text-muted-foreground">{supp.category} · {supp.defaultDosage} {supp.defaultUnit}</p>
                      </div>
                    </button>
                  ))}
                  {filtered.length === 0 && (
                    <p className="text-xs text-muted-foreground text-center py-4">No supplements found</p>
                  )}
                </div>

                {/* Custom button */}
                <button
                  onClick={startCustom}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-dashed border-border text-sm font-semibold text-muted-foreground hover:border-primary hover:text-primary transition-colors"
                >
                  <Plus className="w-4 h-4" /> Custom Supplement
                </button>
              </>
            ) : (
              /* Step 2: Form */
              <div className="space-y-4">
                {/* Back to select */}
                {!editEntry && (
                  <button onClick={() => setStep('select')} className="text-xs text-primary font-semibold">← Back to list</button>
                )}

                <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/50">
                  <span className="text-2xl">{icon}</span>
                  <div>
                    <p className="text-sm font-bold text-foreground">{name || 'Custom Supplement'}</p>
                    <p className="text-[10px] text-muted-foreground">{category}</p>
                  </div>
                </div>

                {/* Custom name/brand */}
                {isCustom && (
                  <div className="space-y-2">
                    <input
                      type="text"
                      placeholder="Supplement name *"
                      value={name}
                      onChange={e => setName(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl bg-muted border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                  </div>
                )}

                {/* Brand */}
                <input
                  type="text"
                  placeholder="Brand (optional)"
                  value={brand}
                  onChange={e => setBrand(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-muted border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                />

                {/* Dosage */}
                <div>
                  <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Dosage</label>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 bg-muted rounded-xl px-2 py-1.5">
                      <button onClick={() => updateDosage(dosage - (unit === 'g' || unit === 'mg' || unit === 'ml' ? 1 : 0.5))} className="w-8 h-8 rounded-lg bg-background flex items-center justify-center active:scale-90 transition-transform">
                        <Minus className="w-3.5 h-3.5 text-foreground" />
                      </button>
                      <span className="w-12 text-center text-sm font-bold text-foreground">{dosage}</span>
                      <button onClick={() => updateDosage(dosage + (unit === 'g' || unit === 'mg' || unit === 'ml' ? 1 : 0.5))} className="w-8 h-8 rounded-lg bg-background flex items-center justify-center active:scale-90 transition-transform">
                        <Plus className="w-3.5 h-3.5 text-foreground" />
                      </button>
                    </div>
                    <select
                      value={unit}
                      onChange={e => setUnit(e.target.value)}
                      className="flex-1 px-3 py-2.5 rounded-xl bg-muted border border-border text-sm text-foreground focus:outline-none"
                    >
                      {SUPPLEMENT_UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                    </select>
                  </div>
                </div>

                {/* Time */}
                <div>
                  <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Time taken</label>
                  <div className="relative">
                    <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                      type="time"
                      value={time}
                      onChange={e => handleTimeChange(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-muted border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                  </div>
                </div>

                {/* Meal Assignment */}
                <div>
                  <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Assign to meal</label>
                  <button
                    onClick={() => setMealPickerOpen(true)}
                    className="w-full flex items-center justify-between px-4 py-2.5 rounded-xl bg-muted border border-border text-sm text-foreground hover:border-primary/40 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <Utensils className="w-4 h-4 text-primary" />
                      <span className="font-medium capitalize">{assignedMeal === 'snack' ? 'Snack' : assignedMeal}</span>
                    </div>
                    <span className="text-[10px] text-muted-foreground">Tap to change</span>
                  </button>
                  <p className="text-[10px] text-muted-foreground mt-1">
                    Calories & macros will count toward this meal's totals
                  </p>
                </div>

                {/* Nutrition toggle */}
                <div className="flex items-center justify-between p-3 rounded-xl bg-muted/50">
                  <span className="text-xs font-semibold text-foreground">Has nutritional value?</span>
                  <button
                    onClick={() => setHasNutrition(!hasNutrition)}
                    className={`w-11 h-6 rounded-full transition-colors relative ${hasNutrition ? 'bg-primary' : 'bg-border'}`}
                  >
                    <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-card shadow transition-transform ${hasNutrition ? 'translate-x-5' : 'translate-x-0.5'}`} />
                  </button>
                </div>

                {hasNutrition && (
                  <div className="grid grid-cols-2 gap-2 animate-fade-in">
                    {[
                      { label: 'Calories (kcal)', value: calories, set: setCalories },
                      { label: 'Protein (g)', value: protein, set: setProtein },
                      { label: 'Carbs (g)', value: carbs, set: setCarbs },
                      { label: 'Fat (g)', value: fat, set: setFat },
                    ].map(f => (
                      <div key={f.label}>
                        <label className="text-[10px] font-semibold text-muted-foreground mb-1 block">{f.label}</label>
                        <input
                          type="number"
                          min={0}
                          value={f.value}
                          onChange={e => f.set(Number(e.target.value) || 0)}
                          className="w-full px-3 py-2 rounded-lg bg-muted border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                        />
                      </div>
                    ))}
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-3 pt-2">
                  <button onClick={handleClose} className="flex-1 py-3 rounded-xl border border-border text-sm font-semibold text-muted-foreground hover:bg-muted transition-colors">
                    Cancel
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={!name.trim()}
                    className="flex-1 py-3 rounded-xl bg-primary text-primary-foreground text-sm font-bold disabled:opacity-40 active:scale-[0.98] transition-transform"
                  >
                    Save
                  </button>
                </div>
              </div>
            )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
    , document.body
  );

  return (
    <>
      {overlay}
      <MealSlotPicker
        open={mealPickerOpen}
        onOpenChange={setMealPickerOpen}
        selected={assignedMeal}
        onSelect={(type) => {
          setAssignedMeal(type);
          setMealPickerOpen(false);
        }}
      />
    </>
  );
}
