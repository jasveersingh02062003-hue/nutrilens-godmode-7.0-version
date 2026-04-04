import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { X, ChevronRight, BarChart3, CalendarDays, User, Droplets, Plus, Flame, Wheat } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getProfile, getDailyLog, getDailyTotals, addWater, DailyLog } from '@/lib/store';
import { getGreeting } from '@/lib/nutrition';
import { mobileOverlayMotion, mobileOverlayTransition, mobileSheetMotion, mobileSheetTransition, useBodyScrollLock } from '@/hooks/use-body-scroll-lock';

const mealEmojis: Record<string, string> = { breakfast: '🌅', lunch: '☀️', dinner: '🌙', snack: '🍪' };

export default function DashboardPanel({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate();
  const profile = getProfile();
  const [log, setLog] = useState<DailyLog>(getDailyLog());
  const totals = getDailyTotals(log);

  useBodyScrollLock(true);

  useEffect(() => {
    const interval = setInterval(() => setLog(getDailyLog()), 2000);
    return () => clearInterval(interval);
  }, []);

  if (!profile) return null;
  if (typeof document === 'undefined') return null;

  const remaining = Math.max(0, profile.dailyCalories - totals.eaten);
  const progress = Math.min(1, totals.eaten / profile.dailyCalories);
  const handleAddWater = () => setLog(addWater());
  const goalCups = Math.round(profile.waterGoal / 250);

  return createPortal(
    <motion.div
      {...mobileOverlayMotion}
      transition={mobileOverlayTransition}
      className="fixed inset-0 z-40"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-foreground/30 backdrop-blur-sm" />
      <motion.div
        {...mobileSheetMotion}
        transition={mobileSheetTransition}
        className="absolute inset-x-0 bottom-0 mx-auto w-full max-w-lg max-h-[92dvh] overflow-y-auto overscroll-contain rounded-t-3xl bg-background shadow-lg"
        onClick={e => e.stopPropagation()}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-muted-foreground/20" />
        </div>

        <div className="px-5 pb-[calc(2rem+env(safe-area-inset-bottom,0px))] space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-foreground">{getGreeting()}, {profile.name || 'there'}</p>
              <p className="text-[11px] text-muted-foreground">Today's nutrition overview</p>
            </div>
            <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-muted flex items-center justify-center">
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>

          {/* Calorie Ring - Compact */}
          <div className="card-elevated p-5">
            <div className="flex items-center gap-5">
              <div className="relative w-24 h-24 flex-shrink-0">
                <svg width="96" height="96" className="-rotate-90">
                  <circle cx="48" cy="48" r="40" fill="none" stroke="hsl(var(--muted))" strokeWidth="8" />
                  <circle
                    cx="48" cy="48" r="40" fill="none"
                    stroke="hsl(var(--primary))" strokeWidth="8"
                    strokeLinecap="round"
                    strokeDasharray={2 * Math.PI * 40}
                    strokeDashoffset={2 * Math.PI * 40 * (1 - progress)}
                    style={{ transition: 'stroke-dashoffset 0.8s ease' }}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-xl font-bold text-foreground">{remaining}</span>
                  <span className="text-[9px] text-muted-foreground">kcal left</span>
                </div>
              </div>
              <div className="flex-1 space-y-2.5">
                <div className="flex justify-between items-baseline">
                  <span className="text-xs text-muted-foreground">Eaten</span>
                  <span className="text-sm font-bold text-foreground">{totals.eaten} kcal</span>
                </div>
                <div className="flex justify-between items-baseline">
                  <span className="text-xs text-muted-foreground">Goal</span>
                  <span className="text-sm font-bold text-primary">{profile.dailyCalories} kcal</span>
                </div>
              </div>
            </div>
          </div>

          {/* Macros */}
          <div className="flex gap-2">
            {[
              { label: 'Protein', current: totals.protein, goal: profile.dailyProtein, color: 'coral', icon: Flame },
              { label: 'Carbs', current: totals.carbs, goal: profile.dailyCarbs, color: 'primary', icon: Wheat },
              { label: 'Fats', current: totals.fat, goal: profile.dailyFat, color: 'accent', icon: Droplets },
            ].map(m => {
              const pct = Math.min(100, Math.round((m.current / m.goal) * 100));
              return (
                <div key={m.label} className="card-subtle p-3 flex-1">
                  <div className="flex items-center gap-1.5 mb-2">
                    <m.icon className={`w-3 h-3 text-${m.color}`} />
                    <span className="text-[10px] font-semibold text-muted-foreground uppercase">{m.label}</span>
                  </div>
                  <p className="text-sm font-bold text-foreground">{Math.round(m.current)}<span className="text-[10px] text-muted-foreground">/{m.goal}g</span></p>
                  <div className="mt-1.5 h-1 rounded-full bg-muted overflow-hidden">
                    <div className={`h-full rounded-full bg-${m.color} transition-all duration-500`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Water */}
          <div className="card-subtle p-3 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-secondary/10 flex items-center justify-center">
                <Droplets className="w-4 h-4 text-secondary" />
              </div>
              <div>
                <p className="text-xs font-semibold text-foreground">Water</p>
                <p className="text-[10px] text-muted-foreground">{log.waterCups}/{goalCups} cups</p>
              </div>
            </div>
            <button onClick={handleAddWater} className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-secondary/10 text-secondary text-xs font-semibold active:scale-95 transition-transform">
              <Plus className="w-3 h-3" /> Add
            </button>
          </div>

          {/* Today's Meals - Visual Thumbnails */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-bold text-foreground">Today's Meals</h3>
              <button onClick={() => { onClose(); navigate('/progress'); }} className="text-xs text-primary font-semibold flex items-center gap-0.5">
                History <ChevronRight className="w-3 h-3" />
              </button>
            </div>
            <div className="space-y-1.5">
              {(['breakfast', 'lunch', 'dinner', 'snack'] as const).map(type => {
                const meals = log.meals.filter(m => m.type === type);
                const totalCal = meals.reduce((s, m) => s + m.totalCalories, 0);
                const items = meals.flatMap(m => m.items.map(i => i.name));
                return (
                  <div key={type} className="card-subtle p-2.5 flex items-center gap-2.5">
                    <span className="text-lg">{mealEmojis[type]}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-foreground capitalize">{type}</p>
                      {items.length > 0 ? (
                        <p className="text-[10px] text-muted-foreground truncate">{items.join(', ')}</p>
                      ) : (
                        <p className="text-[10px] text-muted-foreground">Not logged yet</p>
                      )}
                    </div>
                    {totalCal > 0 && (
                      <span className="text-xs font-bold text-foreground">{totalCal} <span className="text-[9px] text-muted-foreground">kcal</span></span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Nav shortcuts */}
          <div className="flex gap-2">
            {[
              { icon: BarChart3, label: 'Progress', path: '/progress' },
              { icon: CalendarDays, label: 'Planner', path: '/planner' },
              { icon: User, label: 'Profile', path: '/profile' },
            ].map(item => (
              <button
                key={item.path}
                onClick={() => { onClose(); navigate(item.path); }}
                className="flex-1 card-subtle p-3 flex flex-col items-center gap-1.5 hover:shadow-md transition-shadow active:scale-[0.98]"
              >
                <item.icon className="w-4 h-4 text-muted-foreground" />
                <span className="text-[10px] font-semibold text-muted-foreground">{item.label}</span>
              </button>
            ))}
          </div>
        </div>
      </motion.div>
    </motion.div>
    , document.body
  );
}
