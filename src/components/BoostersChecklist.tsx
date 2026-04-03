import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Check, Zap } from 'lucide-react';
import { getTodayKey } from '@/lib/store';

const ALL_BOOSTERS: Record<string, { emoji: string; label: string; items: { id: string; label: string }[] }> = {
  morning_routine: {
    emoji: '🌅',
    label: 'Morning',
    items: [
      { id: 'warm_water', label: 'Warm water + lemon + jeera' },
      { id: 'morning_walk', label: '10-min morning walk' },
      { id: 'stretching', label: '5-min stretching' },
    ],
  },
  metabolism_drinks: {
    emoji: '☕',
    label: 'Drinks',
    items: [
      { id: 'jeera_water', label: 'Jeera water' },
      { id: 'ginger_tea', label: 'Ginger / green tea' },
      { id: 'black_coffee', label: 'Black coffee (no sugar)' },
    ],
  },
  superfoods: {
    emoji: '🥜',
    label: 'Superfoods',
    items: [
      { id: 'makhana', label: 'Makhana snack' },
      { id: 'sattu', label: 'Sattu drink or meal' },
      { id: 'sprouts', label: 'Sprouted moong / chia' },
    ],
  },
  evening_routine: {
    emoji: '🌙',
    label: 'Evening',
    items: [
      { id: 'herbal_tea', label: 'Herbal tea (chamomile/tulsi)' },
      { id: 'dinner_7pm', label: 'Finish dinner by 7 PM' },
      { id: 'no_screens', label: '30 min screen-free before bed' },
    ],
  },
};

interface Props {
  activeBoosters: string[];
}

export default function BoostersChecklist({ activeBoosters }: Props) {
  const storageKey = `nutrilens_boosters_${getTodayKey()}`;

  const [checked, setChecked] = useState<Record<string, boolean>>(() => {
    try {
      return JSON.parse(localStorage.getItem(storageKey) || '{}');
    } catch { return {}; }
  });

  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(checked));
  }, [checked, storageKey]);

  const allItems = activeBoosters.flatMap(b => ALL_BOOSTERS[b]?.items || []);
  const completedCount = allItems.filter(i => checked[i.id]).length;
  const totalCount = allItems.length;
  if (totalCount === 0) return null;
  const progress = Math.round((completedCount / totalCount) * 100);

  const toggle = (id: string) => {
    setChecked(prev => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="card-subtle p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-primary" />
          <p className="text-sm font-bold text-foreground">Today's Boosters</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-primary">{completedCount}/{totalCount}</span>
          <div className="w-10 h-10 relative">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
              <circle cx="18" cy="18" r="15" fill="none" strokeWidth="3" className="stroke-muted" />
              <circle
                cx="18" cy="18" r="15" fill="none" strokeWidth="3" className="stroke-primary"
                strokeDasharray={`${progress * 0.94} 100`}
                strokeLinecap="round"
              />
            </svg>
          </div>
        </div>
      </div>

      <div className="space-y-1.5">
        {activeBoosters.map(boosterId => {
          const booster = ALL_BOOSTERS[boosterId];
          if (!booster) return null;
          return (
            <div key={boosterId}>
              <p className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                {booster.emoji} {booster.label}
              </p>
              {booster.items.map(item => (
                <motion.button
                  key={item.id}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => toggle(item.id)}
                  className={`w-full flex items-center gap-2.5 py-2 px-2 rounded-xl text-left transition-colors ${
                    checked[item.id] ? 'bg-primary/5' : ''
                  }`}
                >
                  <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors ${
                    checked[item.id] ? 'border-primary bg-primary' : 'border-muted-foreground/30'
                  }`}>
                    {checked[item.id] && <Check className="w-3 h-3 text-primary-foreground" />}
                  </div>
                  <span className={`text-xs ${checked[item.id] ? 'text-muted-foreground line-through' : 'text-foreground'}`}>
                    {item.label}
                  </span>
                </motion.button>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}
