import { useState, useEffect } from 'react';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { MealSource, MealSourceCategory, MealLocation, MealCompanion, MealOccasion, MealMood, CookingMethod } from '@/lib/store';
import { getSourceEmoji, getSourceLabel, COOKING_METHODS, getDefaultCookingMethod } from '@/lib/context-learning';

interface Props {
  open: boolean;
  defaultCategory?: MealSourceCategory | null;
  defaultCookingMethod?: CookingMethod | null;
  foodNames?: string[];
  onSave: (source: MealSource, cookingMethod?: CookingMethod | null) => void;
  onSkip: () => void;
}

const SOURCE_OPTIONS: MealSourceCategory[] = ['home', 'restaurant', 'street_food', 'packaged', 'fast_food', 'office', 'friends', 'other'];

const LOCATION_OPTIONS: { value: MealLocation; emoji: string; label: string }[] = [
  { value: 'home', emoji: '🏠', label: 'Home' },
  { value: 'office', emoji: '🏢', label: 'Office' },
  { value: 'restaurant_place', emoji: '🍽️', label: 'Restaurant' },
  { value: 'outdoors', emoji: '🌳', label: 'Outdoors' },
  { value: 'travel', emoji: '✈️', label: 'Travel' },
];

const COMPANION_OPTIONS: { value: MealCompanion; emoji: string; label: string }[] = [
  { value: 'alone', emoji: '👤', label: 'Alone' },
  { value: 'family', emoji: '👨‍👩‍👧', label: 'Family' },
  { value: 'friends', emoji: '🧑‍🤝‍🧑', label: 'Friends' },
  { value: 'colleagues', emoji: '👔', label: 'Colleagues' },
];

const OCCASION_OPTIONS: { value: MealOccasion; emoji: string; label: string }[] = [
  { value: 'regular', emoji: '📅', label: 'Regular' },
  { value: 'celebration', emoji: '🎉', label: 'Celebration' },
  { value: 'cheat_day', emoji: '🍕', label: 'Cheat Day' },
  { value: 'stress', emoji: '😥', label: 'Stress' },
];

const MOOD_OPTIONS: { value: MealMood; emoji: string; label: string }[] = [
  { value: 'happy', emoji: '😊', label: 'Happy' },
  { value: 'stressed', emoji: '😔', label: 'Stressed' },
  { value: 'tired', emoji: '😴', label: 'Tired' },
  { value: 'bored', emoji: '😑', label: 'Bored' },
];

export default function ContextPickerSheet({ open, defaultCategory, defaultCookingMethod, foodNames, onSave, onSkip }: Props) {
  const [category, setCategory] = useState<MealSourceCategory | null>(defaultCategory || null);
  const [customLabel, setCustomLabel] = useState('');
  const [expanded, setExpanded] = useState(false);
  const [location, setLocation] = useState<MealLocation | null>(null);
  const [companions, setCompanions] = useState<MealCompanion[]>([]);
  const [occasion, setOccasion] = useState<MealOccasion | null>(null);
  const [mood, setMood] = useState<MealMood | null>(null);
  const [cookingMethod, setCookingMethod] = useState<CookingMethod | null>(null);

  // Set smart default cooking method when category changes to "home"
  useEffect(() => {
    if (category === 'home' && !cookingMethod) {
      const learned = defaultCookingMethod || (foodNames ? getDefaultCookingMethod(foodNames) : null);
      if (learned) setCookingMethod(learned);
    }
    if (category !== 'home') {
      setCookingMethod(null);
    }
  }, [category]);

  const toggleCompanion = (c: MealCompanion) => {
    setCompanions(prev => prev.includes(c) ? prev.filter(x => x !== c) : [...prev, c]);
  };

  const handleSave = () => {
    if (!category) return;
    onSave({
      category,
      customLabel: category === 'other' ? customLabel || null : null,
      location,
      companions: companions.length > 0 ? companions : undefined,
      occasion,
      mood,
    }, category === 'home' ? cookingMethod : null);
  };

  return (
    <Sheet open={open} onOpenChange={(v) => { if (!v) onSkip(); }}>
      <SheetContent side="bottom" className="rounded-t-2xl max-h-[85vh] overflow-y-auto px-4 pb-6">
        <div className="flex items-center justify-between mb-4 mt-2">
          <h3 className="text-base font-semibold text-foreground">Where did this meal come from?</h3>
          <button
            onClick={onSkip}
            className="text-xs font-medium text-muted-foreground hover:text-foreground transition-colors px-2 py-1"
          >
            Skip
          </button>
        </div>

        {/* Source chips */}
        <div className="flex flex-wrap gap-2 mb-4">
          {SOURCE_OPTIONS.map(opt => (
            <button
              key={opt}
              onClick={() => setCategory(opt)}
              className={`px-3 py-2 rounded-xl text-sm font-medium border transition-all ${
                category === opt
                  ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                  : 'bg-card border-border text-foreground hover:bg-muted'
              }`}
            >
              {getSourceEmoji(opt)} {getSourceLabel(opt)}
            </button>
          ))}
        </div>

        {/* Custom label for "Other" */}
        <AnimatePresence>
          {category === 'other' && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="mb-4 overflow-hidden"
            >
              <Input
                placeholder="Describe where (e.g., picnic, relative's home)"
                value={customLabel}
                onChange={e => setCustomLabel(e.target.value)}
                className="text-sm"
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Cooking method chips – only when Home is selected */}
        <AnimatePresence>
          {category === 'home' && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="mb-4 overflow-hidden"
            >
              <p className="text-xs font-medium text-muted-foreground mb-2">🍳 How was it cooked?</p>
              <div className="flex flex-wrap gap-1.5">
                {COOKING_METHODS.map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => setCookingMethod(cookingMethod === opt.value ? null : opt.value)}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                      cookingMethod === opt.value
                        ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                        : 'bg-card border-border text-foreground hover:bg-muted'
                    }`}
                  >
                    {opt.emoji} {opt.label}
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Expandable context section */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground mb-3 hover:text-foreground transition-colors"
        >
          {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          Add more context (optional)
        </button>

        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="space-y-4 overflow-hidden mb-4"
            >
              {/* Location */}
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2">📍 Where did you eat?</p>
                <div className="flex flex-wrap gap-1.5">
                  {LOCATION_OPTIONS.map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => setLocation(location === opt.value ? null : opt.value)}
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                        location === opt.value
                          ? 'bg-secondary text-secondary-foreground border-secondary'
                          : 'bg-card border-border text-foreground hover:bg-muted'
                      }`}
                    >
                      {opt.emoji} {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Companions */}
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2">👥 Who were you with?</p>
                <div className="flex flex-wrap gap-1.5">
                  {COMPANION_OPTIONS.map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => toggleCompanion(opt.value)}
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                        companions.includes(opt.value)
                          ? 'bg-secondary text-secondary-foreground border-secondary'
                          : 'bg-card border-border text-foreground hover:bg-muted'
                      }`}
                    >
                      {opt.emoji} {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Occasion */}
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2">🎯 What's the occasion?</p>
                <div className="flex flex-wrap gap-1.5">
                  {OCCASION_OPTIONS.map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => setOccasion(occasion === opt.value ? null : opt.value)}
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                        occasion === opt.value
                          ? 'bg-accent text-accent-foreground border-accent'
                          : 'bg-card border-border text-foreground hover:bg-muted'
                      }`}
                    >
                      {opt.emoji} {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Mood */}
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2">🧠 How are you feeling?</p>
                <div className="flex flex-wrap gap-1.5">
                  {MOOD_OPTIONS.map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => setMood(mood === opt.value ? null : opt.value)}
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                        mood === opt.value
                          ? 'bg-accent text-accent-foreground border-accent'
                          : 'bg-card border-border text-foreground hover:bg-muted'
                      }`}
                    >
                      {opt.emoji} {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Save button */}
        <Button
          onClick={handleSave}
          disabled={!category}
          className="w-full mt-2"
          size="lg"
        >
          Save with Context
        </Button>
      </SheetContent>
    </Sheet>
  );
}
