import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Plus, Minus, Droplets, Dumbbell, Scale, Camera, Notebook,
  Utensils, Pill, Trash2, CalendarDays, ChevronRight, Lock, Sparkles, DollarSign, Pencil, IndianRupee,
  TrendingUp, TrendingDown, CheckCircle2
} from 'lucide-react';
import {
  getDailyLog, getDailyTotals, DailyLog,
  addWaterForDate, removeWaterForDate, deleteMealFromLog,
  deleteSupplementFromLog, deleteActivityFromLog, saveJournalNote, toLocalDateKey
} from '@/lib/store';
import { useUserProfile } from '@/contexts/UserProfileContext';
import { getExpensesForDate, deleteManualExpense, type Expense } from '@/lib/expense-store';
import { CATEGORY_CONFIG } from '@/lib/budget-service';
import { ACTIVITY_TYPES } from '@/lib/activities';
import { getSourceEmoji, getSourceLabel } from '@/lib/context-learning';
import { generateDayInsight } from '@/lib/day-insights';
import { getDailyBalances, computeAdjustmentMap, computeAdjustedTarget, computeProjectedAdjustmentMap, getCorrectionMode, type DailyBalanceEntry } from '@/lib/calorie-correction';
import { getFutureDayPlan, getAdjustmentBreakdownForDate, getExplanationMessage } from '@/lib/calendar-helpers';
import ActivityLogSheet from '@/components/ActivityLogSheet';
import SupplementLogSheet from '@/components/SupplementLogSheet';
import FullScreenMemory from '@/components/FullScreenMemory';

const COOKING_LABELS: Record<string, string> = {
  fried: '🍟 Fried', air_fried: '🔥 Air Fried', grilled: '🍖 Grilled',
  baked: '🍪 Baked', boiled_steamed: '💧 Boiled', sauteed: '🍳 Sautéed', raw: '🥕 Raw',
};

interface Props {
  open: boolean;
  date: string;
  onClose: () => void;
  onChanged: () => void;
}

export default function DayDetailsSheet({ open, date, onClose, onChanged }: Props) {
  const navigate = useNavigate();
  const { profile } = useUserProfile();
  const [log, setLog] = useState<DailyLog | null>(null);
  const [journal, setJournal] = useState('');
  const [showActivitySheet, setShowActivitySheet] = useState(false);
  const [showSupplementSheet, setShowSupplementSheet] = useState(false);
  const [fullScreenMealId, setFullScreenMealId] = useState<string | null>(null);

  const todayStr = toLocalDateKey();
  const isFuture = date > todayStr;
  const isToday = date === todayStr;

  const reload = useCallback(() => {
    const l = getDailyLog(date);
    setLog(l);
    setJournal(l.journal || '');
  }, [date]);

  useEffect(() => {
    if (open) reload();
  }, [open, date, reload]);

  // Realtime: listen while open so edits elsewhere reflect instantly
  useEffect(() => {
    if (!open) return;
    const handler = () => reload();
    window.addEventListener('nutrilens:update', handler);
    window.addEventListener('storage', handler);
    return () => {
      window.removeEventListener('nutrilens:update', handler);
      window.removeEventListener('storage', handler);
    };
  }, [open, reload]);

  if (!open || !log) return null;

  const totals = getDailyTotals(log);
  const goal = profile?.dailyCalories || 2000;
  const waterGoal = profile?.waterGoal || 8;

  const formattedDate = new Date(date + 'T12:00:00').toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  });

  const handleWaterAdd = () => { addWaterForDate(date); reload(); onChanged(); };
  const handleWaterRemove = () => { removeWaterForDate(date); reload(); onChanged(); };
  const handleDeleteMeal = (id: string) => { deleteMealFromLog(date, id); reload(); onChanged(); };
  const handleDeleteSupplement = (id: string) => { deleteSupplementFromLog(date, id); reload(); onChanged(); };
  const handleDeleteActivity = (id: string) => { deleteActivityFromLog(date, id); reload(); onChanged(); };
  const handleJournalBlur = () => { saveJournalNote(date, journal); onChanged(); };

  const getActivityIcon = (type: string) => ACTIVITY_TYPES.find(a => a.id === type)?.icon || '🏃';
  const getActivityName = (type: string) => ACTIVITY_TYPES.find(a => a.id === type)?.name || type;

  const mealGroups = ['breakfast', 'lunch', 'dinner', 'snack'] as const;
  const mealEmojis = { breakfast: '🌅', lunch: '☀️', dinner: '🌙', snack: '🍿' };

  // Monica insight
  const insight = generateDayInsight(log, profile);

  // Expense summary from expense store
  const expenses = getExpensesForDate(date);
  const totalExpenseSpend = expenses.reduce((s, e) => s + e.amount, 0);

  // Meal-based spend
  const totalSpend = log.meals.reduce((s, m) => s + (m.cost?.amount || 0), 0);
  const homeSpend = log.meals.filter(m => m.source?.category === 'home').reduce((s, m) => s + (m.cost?.amount || 0), 0);
  const outsideSpend = totalSpend - homeSpend;

  const combinedSpend = Math.max(totalSpend, totalExpenseSpend);

  const handleDeleteExpense = (exp: Expense) => {
    if (exp.type === 'manual') {
      deleteManualExpense(exp.id);
      reload();
      onChanged();
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50"
        onClick={onClose}
      >
        <div className="absolute inset-0 bg-foreground/30 backdrop-blur-sm" />
        <motion.div
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', stiffness: 200, damping: 25 }}
          className="absolute inset-x-0 bottom-0 max-h-[92vh] overflow-y-auto bg-background rounded-t-3xl"
          onClick={e => e.stopPropagation()}
        >
          <div className="flex justify-center pt-3 pb-1">
            <div className="w-10 h-1 rounded-full bg-muted-foreground/20" />
          </div>

          <div className="px-5 pb-8 space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <h2 className="text-base font-bold text-foreground">{formattedDate}</h2>
                <div className="flex items-center gap-2 mt-0.5">
                  {isToday && <span className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">Today</span>}
                  {isFuture && (
                    <span className="text-[10px] font-bold text-accent bg-accent/10 px-2 py-0.5 rounded-full flex items-center gap-1">
                      <Lock className="w-2.5 h-2.5" /> Future
                    </span>
                  )}
                </div>
              </div>
              <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-muted flex items-center justify-center">
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>

            {isFuture && <FutureDayPlanSection date={date} profile={profile} />}

            {/* Day Balance Summary — today shows live projected impact */}
            {isToday && totals.eaten > 0 && <TodayLiveBalance date={date} eaten={totals.eaten} profile={profile} />}

            {/* Day Balance Summary — past days */}
            {!isFuture && !isToday && totals.eaten > 0 && <DayBalanceSummary date={date} eaten={totals.eaten} profile={profile} />}

            {/* Monica Insight */}
            {insight && !isFuture && (
              <div className="p-3 rounded-xl bg-primary/5 border border-primary/15">
                <div className="flex items-start gap-2">
                  <Sparkles className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-[10px] font-bold text-primary mb-0.5">Monica's Take</p>
                    <p className="text-xs text-foreground leading-relaxed">{insight}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Summary Cards */}
            <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
              {[
                { label: 'Calories', value: `${totals.eaten}`, sub: `/ ${goal}`, color: totals.eaten <= goal ? 'text-primary' : 'text-destructive' },
                { label: 'Protein', value: `${totals.protein}g`, sub: `goal`, color: 'text-secondary' },
                { label: 'Carbs', value: `${totals.carbs}g`, sub: '', color: 'text-accent' },
                { label: 'Fat', value: `${totals.fat}g`, sub: '', color: 'text-coral' },
                { label: 'Burned', value: `${totals.burned}`, sub: 'kcal', color: 'text-destructive' },
                { label: 'Water', value: `${log.waterCups}`, sub: `/ ${waterGoal}`, color: 'text-secondary' },
              ].map(c => (
                <div key={c.label} className="min-w-[80px] p-2.5 rounded-xl bg-muted/50 border border-border text-center flex-shrink-0">
                  <p className={`text-lg font-bold ${c.color}`}>{c.value}</p>
                  <p className="text-[9px] text-muted-foreground font-medium">{c.label} {c.sub}</p>
                </div>
              ))}
            </div>

            {/* Expense Summary */}
            {combinedSpend > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 p-2.5 rounded-xl bg-accent/5 border border-accent/15">
                  <IndianRupee className="w-3.5 h-3.5 text-accent" />
                  <p className="text-xs font-semibold text-foreground">
                    ₹{combinedSpend}
                    {totalSpend > 0 && (
                      <span className="text-muted-foreground font-normal ml-1.5">
                        🏠 ₹{homeSpend} · 🍽️ ₹{outsideSpend}
                      </span>
                    )}
                  </p>
                </div>

                {/* Individual expense rows */}
                {expenses.length > 0 && (
                  <Section icon={<IndianRupee className="w-3.5 h-3.5 text-accent" />} title="Expenses" count={expenses.length}>
                    {expenses.map(exp => {
                      const cfg = CATEGORY_CONFIG[exp.category] || CATEGORY_CONFIG.other;
                      return (
                        <div key={exp.id} className="flex items-center gap-2.5 p-2.5 rounded-lg bg-muted/30">
                          <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                            style={{ backgroundColor: `${cfg.color}15` }}>
                            <span className="text-sm">{cfg.emoji}</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-foreground truncate">{exp.description}</p>
                            <p className="text-[10px] text-muted-foreground">{cfg.label}</p>
                          </div>
                          <span className="text-xs font-bold text-foreground">
                            {exp.amount === 0 ? 'Free' : `₹${exp.amount}`}
                          </span>
                          {exp.type === 'manual' && (
                            <button
                              onClick={() => handleDeleteExpense(exp)}
                              className="p-1 rounded-lg hover:bg-destructive/10 transition-colors"
                            >
                              <Trash2 className="w-3 h-3 text-destructive/70" />
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </Section>
                )}
              </div>
            )}

            {/* Meals Section with Photos */}
            <Section icon={<Utensils className="w-3.5 h-3.5 text-primary" />} title="Meals" count={log.meals.length}>
              {mealGroups.map(type => {
                const meals = log.meals.filter(m => m.type === type);
                const isPast = date < todayStr;
                
                // Ghost card for missed meals (past days only)
                if (meals.length === 0 && isPast && !isFuture) {
                  return (
                    <div key={type} className="space-y-1.5">
                      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                        {mealEmojis[type]} {type}
                      </p>
                      <div className="rounded-xl border border-dashed border-border bg-muted/20 p-3 flex items-center justify-between">
                        <p className="text-[11px] text-muted-foreground">You didn't log {type} 🍽️</p>
                        <button
                          onClick={() => navigate(`/log?meal=${type}&date=${date}`)}
                          className="text-[10px] font-semibold text-primary hover:text-primary/80 flex items-center gap-0.5"
                        >
                          <Plus className="w-3 h-3" /> Quick Add
                        </button>
                      </div>
                    </div>
                  );
                }
                
                if (meals.length === 0) return null;
                return (
                  <div key={type} className="space-y-1.5">
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                      {mealEmojis[type]} {type}
                    </p>
                    {meals.map(m => (
                      <div key={m.id} className="rounded-xl bg-muted/30 overflow-hidden">
                        {/* Meal photo — full card */}
                        {m.photo && (
                          <button
                            onClick={() => setFullScreenMealId(m.id)}
                            className="w-full aspect-video overflow-hidden"
                          >
                            <img
                              src={m.photo}
                              alt={m.items.map(i => i.name).join(', ')}
                              className="w-full h-full object-cover hover:scale-105 transition-transform"
                            />
                          </button>
                        )}
                        <div className="p-2.5">
                          <div className="flex items-center justify-between">
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-semibold text-foreground truncate">
                                {m.items.map(i => i.name).join(', ')}
                              </p>
                              <p className="text-[10px] text-muted-foreground">
                                {m.totalCalories} kcal · P{m.totalProtein}g · C{m.totalCarbs}g · F{m.totalFat}g
                                {m.time && ` · ${m.time}`}
                              </p>
                              {/* Source & cooking badges — max 2 */}
                              <div className="flex flex-wrap gap-1 mt-1">
                                {m.source?.category && (
                                  <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
                                    {getSourceEmoji(m.source.category)} {getSourceLabel(m.source.category)}
                                  </span>
                                )}
                                {m.cookingMethod && COOKING_LABELS[m.cookingMethod] && (
                                  <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-accent/10 text-accent font-medium">
                                    {COOKING_LABELS[m.cookingMethod]}
                                  </span>
                                )}
                                {m.cost?.amount && m.cost.amount > 0 && (
                                  <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground font-medium">
                                    ₹{m.cost.amount}
                                  </span>
                                )}
                              </div>
                              {/* Caption */}
                              {m.caption && (
                                <p className="text-[10px] text-muted-foreground italic mt-1">💬 {m.caption}</p>
                              )}
                            </div>
                            {!isFuture && (
                              <button onClick={() => handleDeleteMeal(m.id)} className="w-7 h-7 rounded-lg hover:bg-destructive/10 flex items-center justify-center ml-2">
                                <Trash2 className="w-3 h-3 text-destructive" />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })}
              {log.meals.length === 0 && !isFuture && date >= todayStr && <EmptyState text="No meals logged" />}
              {!isFuture && (
                <button
                  onClick={() => navigate(`/log?meal=breakfast&date=${date}`)}
                  className="w-full py-2 rounded-xl border border-dashed border-border text-xs font-semibold text-muted-foreground hover:border-primary hover:text-primary transition-colors flex items-center justify-center gap-1"
                >
                  <Plus className="w-3 h-3" /> Add Meal
                </button>
              )}
            </Section>

            {/* Supplements Section */}
            <Section icon={<Pill className="w-3.5 h-3.5 text-violet" />} title="Supplements" count={log.supplements.length}>
              {log.supplements.map(s => (
                <div key={s.id} className="flex items-center justify-between p-2.5 rounded-lg bg-muted/30">
                  <div className="flex items-center gap-2">
                    <span className="text-base">{s.icon}</span>
                    <div>
                      <p className="text-xs font-semibold text-foreground">{s.name}</p>
                      <p className="text-[10px] text-muted-foreground">{s.dosage} {s.unit} · {s.time}</p>
                    </div>
                  </div>
                  {!isFuture && (
                    <button onClick={() => handleDeleteSupplement(s.id)} className="w-7 h-7 rounded-lg hover:bg-destructive/10 flex items-center justify-center">
                      <Trash2 className="w-3 h-3 text-destructive" />
                    </button>
                  )}
                </div>
              ))}
              {log.supplements.length === 0 && <EmptyState text="No supplements logged" />}
              {!isFuture && (
                <button
                  onClick={() => setShowSupplementSheet(true)}
                  className="w-full py-2 rounded-xl border border-dashed border-border text-xs font-semibold text-muted-foreground hover:border-primary hover:text-primary transition-colors flex items-center justify-center gap-1"
                >
                  <Plus className="w-3 h-3" /> Add Supplement
                </button>
              )}
            </Section>

            {/* Activities Section */}
            <Section icon={<Dumbbell className="w-3.5 h-3.5 text-coral" />} title="Activities" count={log.burned?.activities?.length || 0}>
              {log.burned?.stepsCount > 0 && (
                <div className="p-2.5 rounded-lg bg-muted/30 flex items-center gap-2">
                  <span className="text-base">👟</span>
                  <div>
                    <p className="text-xs font-semibold text-foreground">{log.burned.stepsCount.toLocaleString()} steps</p>
                    <p className="text-[10px] text-muted-foreground">{log.burned.steps} kcal burned</p>
                  </div>
                </div>
              )}
              {(log.burned?.activities || []).map(a => (
                <div key={a.id} className="flex items-center justify-between p-2.5 rounded-lg bg-muted/30">
                  <div className="flex items-center gap-2">
                    <span className="text-base">{getActivityIcon(a.type)}</span>
                    <div>
                      <p className="text-xs font-semibold text-foreground">{getActivityName(a.type)}</p>
                      <p className="text-[10px] text-muted-foreground">{a.duration} min · {a.calories} kcal · {a.intensity}</p>
                    </div>
                  </div>
                  {!isFuture && (
                    <button onClick={() => handleDeleteActivity(a.id)} className="w-7 h-7 rounded-lg hover:bg-destructive/10 flex items-center justify-center">
                      <Trash2 className="w-3 h-3 text-destructive" />
                    </button>
                  )}
                </div>
              ))}
              {(!log.burned?.activities?.length && !log.burned?.stepsCount) && <EmptyState text="No activities logged" />}
              {!isFuture && (
                <button
                  onClick={() => setShowActivitySheet(true)}
                  className="w-full py-2 rounded-xl border border-dashed border-border text-xs font-semibold text-muted-foreground hover:border-primary hover:text-primary transition-colors flex items-center justify-center gap-1"
                >
                  <Plus className="w-3 h-3" /> Add Activity
                </button>
              )}
            </Section>

            {/* Water Section */}
            <Section icon={<Droplets className="w-3.5 h-3.5 text-secondary" />} title="Water" count={log.waterCups}>
              <div className="flex items-center justify-between p-3 rounded-xl bg-muted/30">
                <div>
                  <p className="text-sm font-bold text-foreground">{log.waterCups} <span className="text-xs font-normal text-muted-foreground">/ {waterGoal} cups</span></p>
                  <div className="w-32 h-1.5 rounded-full bg-muted mt-1.5">
                    <div className="h-full rounded-full bg-secondary transition-all" style={{ width: `${Math.min(100, (log.waterCups / waterGoal) * 100)}%` }} />
                  </div>
                </div>
                {!isFuture && (
                  <div className="flex items-center gap-1.5">
                    <button onClick={handleWaterRemove} className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center active:scale-90 transition-transform">
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={handleWaterAdd} className="w-8 h-8 rounded-lg bg-secondary/10 flex items-center justify-center active:scale-90 transition-transform">
                      <Plus className="w-3.5 h-3.5 text-secondary" />
                    </button>
                  </div>
                )}
              </div>
            </Section>

            {/* Weight */}
            {log.weight != null && log.weight > 0 && (
              <Section icon={<Scale className="w-3.5 h-3.5 text-primary" />} title="Weight">
                <div className="p-3 rounded-xl bg-muted/30 text-center">
                  <p className="text-xl font-bold text-foreground">{log.weight} <span className="text-xs text-muted-foreground">{log.weightUnit || 'kg'}</span></p>
                </div>
              </Section>
            )}

            {/* Journal */}
            {!isFuture && (
              <Section icon={<Notebook className="w-3.5 h-3.5 text-accent" />} title="Journal Note">
                <textarea
                  value={journal}
                  onChange={e => setJournal(e.target.value)}
                  onBlur={handleJournalBlur}
                  placeholder="How did you feel today? Any notes..."
                  className="w-full p-3 rounded-xl bg-muted/30 border border-border text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 min-h-[60px] resize-none"
                />
              </Section>
            )}
          </div>
        </motion.div>
      </motion.div>

      {/* Sub-sheets */}
      <ActivityLogSheet
        open={showActivitySheet}
        onClose={() => setShowActivitySheet(false)}
        onSaved={() => { reload(); onChanged(); }}
        weightKg={profile?.weightKg || 70}
        targetDate={date}
      />
      <SupplementLogSheet
        open={showSupplementSheet}
        onClose={() => setShowSupplementSheet(false)}
        onSaved={() => { reload(); onChanged(); }}
        targetDate={date}
      />
      <FullScreenMemory
        open={!!fullScreenMealId}
        date={date}
        mealId={fullScreenMealId || ''}
        onClose={() => setFullScreenMealId(null)}
        onChanged={() => { reload(); onChanged(); }}
      />
    </AnimatePresence>
  );
}

function Section({ icon, title, count, children }: { icon: React.ReactNode; title: string; count?: number; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5">
        {icon}
        <h3 className="text-xs font-bold text-foreground">{title}</h3>
        {count !== undefined && count > 0 && (
          <span className="text-[9px] font-bold text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full">{count}</span>
        )}
      </div>
      {children}
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return <p className="text-[10px] text-muted-foreground text-center py-2">{text}</p>;
}

function DayBalanceSummary({ date, eaten, profile }: { date: string; eaten: number; profile: any }) {
  const baseTarget = profile?.dailyCalories || 1600;
  const tdee = profile?.tdee || baseTarget;
  const allBalances = useMemo(() => getDailyBalances(baseTarget), [baseTarget, date]);
  
  const adjustedTarget = useMemo(() => {
    return computeAdjustedTarget(date, baseTarget, allBalances, tdee, getCorrectionMode());
  }, [date, baseTarget, allBalances, tdee]);

  const diff = eaten - adjustedTarget;
  const isAdjusted = Math.abs(adjustedTarget - baseTarget) > 10;
  
  let statusLabel: string;
  let statusColor: string;
  let StatusIcon: typeof TrendingUp;
  
  if (Math.abs(diff) <= adjustedTarget * 0.1) {
    statusLabel = 'On Track ✅';
    statusColor = 'text-primary';
    StatusIcon = CheckCircle2;
  } else if (diff > 0) {
    statusLabel = `+${Math.round(diff)} kcal surplus`;
    statusColor = 'text-destructive';
    StatusIcon = TrendingUp;
  } else {
    statusLabel = `${Math.round(diff)} kcal deficit`;
    statusColor = 'text-accent';
    StatusIcon = TrendingDown;
  }

  return (
    <div className={`p-3.5 rounded-xl border ${
      diff > adjustedTarget * 0.1 ? 'bg-destructive/5 border-destructive/15' :
      diff < -(adjustedTarget * 0.1) ? 'bg-accent/5 border-accent/15' :
      'bg-primary/5 border-primary/15'
    }`}>
      <div className="flex items-center gap-2 mb-2">
        <StatusIcon className={`w-4 h-4 ${statusColor}`} />
        <p className={`text-xs font-bold ${statusColor}`}>{statusLabel}</p>
      </div>
      <div className="grid grid-cols-3 gap-2 text-center">
        <div>
          <p className="text-sm font-bold text-foreground">{eaten}</p>
          <p className="text-[9px] text-muted-foreground">Eaten</p>
        </div>
        <div>
          <p className="text-sm font-bold text-foreground">{adjustedTarget}</p>
          <p className="text-[9px] text-muted-foreground">{isAdjusted ? 'Adj. Target' : 'Target'}</p>
        </div>
        <div>
          <p className={`text-sm font-bold ${statusColor}`}>{diff > 0 ? '+' : ''}{Math.round(diff)}</p>
          <p className="text-[9px] text-muted-foreground">Diff</p>
        </div>
      </div>
      {isAdjusted && (
        <p className="text-[10px] text-muted-foreground mt-2 text-center">
          Original target: {baseTarget} kcal · Adjusted: {adjustedTarget} kcal
        </p>
      )}
    </div>
  );
}

function FutureDayPlanSection({ date, profile }: { date: string; profile: any }) {
  const baseTarget = profile?.dailyCalories || 1600;
  const tdee = profile?.tdee || baseTarget;
  
  // Use projected map (includes today's live intake) for future dates
  const { plan, breakdown } = useMemo(() => {
    const projMap = computeProjectedAdjustmentMap(baseTarget, tdee, getCorrectionMode());
    const allBalances = getDailyBalances();
    const pastLogs = allBalances.filter((b: DailyBalanceEntry) => b.actual >= 300);
    return {
      plan: getFutureDayPlan(date, profile, projMap),
      breakdown: getAdjustmentBreakdownForDate(date, pastLogs, baseTarget),
    };
  }, [date, baseTarget, tdee]);
  
  const explanation = getExplanationMessage(breakdown);
  const hasAdjustment = plan.adjustment !== 0;

  return (
    <div className="space-y-3">
      {/* Smart Plan Preview */}
      <div className="p-3.5 rounded-xl bg-primary/5 border border-primary/15">
        <div className="flex items-center gap-2 mb-2.5">
          <Sparkles className="w-4 h-4 text-primary" />
          <p className="text-xs font-bold text-primary">Live Projected Target</p>
        </div>

        {/* Calorie target */}
        <div className="flex items-baseline gap-1.5 mb-3">
          <span className="text-2xl font-bold text-foreground">{plan.calories}</span>
          <span className="text-xs text-muted-foreground">kcal target</span>
          {hasAdjustment && (
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
              plan.adjustment < 0 
                ? 'bg-destructive/10 text-destructive' 
                : 'bg-primary/10 text-primary'
            }`}>
              {plan.adjustment < 0 ? '🔻' : '🔺'} {plan.adjustment > 0 ? '+' : ''}{plan.adjustment} kcal
            </span>
          )}
        </div>

        {/* Macro breakdown */}
        <div className="grid grid-cols-3 gap-2">
          <div className="p-2 rounded-lg bg-primary/10 text-center">
            <p className="text-sm font-bold text-primary">{plan.protein}g</p>
            <p className="text-[9px] text-muted-foreground font-medium">Protein 🔒</p>
          </div>
          <div className="p-2 rounded-lg bg-accent/10 text-center">
            <p className="text-sm font-bold text-accent">{plan.carbs}g</p>
            <p className="text-[9px] text-muted-foreground font-medium">Carbs</p>
          </div>
          <div className="p-2 rounded-lg bg-destructive/10 text-center">
            <p className="text-sm font-bold text-destructive">{plan.fats}g</p>
            <p className="text-[9px] text-muted-foreground font-medium">Fat</p>
          </div>
        </div>
        
        <p className="text-[9px] text-muted-foreground mt-2 text-center">
          ⚡ Updates live as you eat today
        </p>
      </div>

      {/* Adjustment explanation */}
      {breakdown.length > 0 && (
        <div className="p-3 rounded-xl bg-muted/50 border border-border">
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">⚖️ Why this target?</p>
          <div className="space-y-1.5">
            {breakdown.map((b, i) => {
              const dayLabel = new Date(b.sourceDate + 'T12:00:00').toLocaleDateString('en-US', {
                weekday: 'short', month: 'short', day: 'numeric',
              });
              return (
                <div key={i} className="flex flex-col gap-0.5 text-[11px]">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">{dayLabel}</span>
                    <span className={`font-semibold ${b.surplus > 0 ? 'text-destructive' : 'text-primary'}`}>
                      {b.impactLabel}
                    </span>
                  </div>
                  <span className="text-[10px] text-muted-foreground/70">{b.reason}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {!hasAdjustment && (
        <div className="p-3 rounded-xl bg-muted/30 border border-border">
          <p className="text-xs text-muted-foreground text-center">No adjustments — original target applies ✅</p>
        </div>
      )}

      <div className="p-2.5 rounded-xl bg-accent/5 border border-accent/15">
        <p className="text-[11px] text-accent font-medium text-center">
          💡 Use the Meal Planner to plan meals for this day
        </p>
      </div>
    </div>
  );
}

/**
 * Today's live balance — shows current deficit/surplus AND projected impact on future days.
 */
function TodayLiveBalance({ date, eaten, profile }: { date: string; eaten: number; profile: any }) {
  const baseTarget = profile?.dailyCalories || 1600;
  const tdee = profile?.tdee || baseTarget;
  const allBalances = useMemo(() => getDailyBalances(baseTarget), [baseTarget, date]);
  
  const adjustedTarget = useMemo(() => {
    return computeAdjustedTarget(date, baseTarget, allBalances, tdee, getCorrectionMode());
  }, [date, baseTarget, allBalances, tdee]);

  const diff = eaten - adjustedTarget;
  const isAdjusted = Math.abs(adjustedTarget - baseTarget) > 10;
  
  // Compute projected impact on tomorrow
  const projMap = useMemo(() => computeProjectedAdjustmentMap(baseTarget, tdee, getCorrectionMode()), [baseTarget, tdee, eaten]);
  const todayStr = date;
  const tomorrow = useMemo(() => {
    const d = new Date(todayStr + 'T12:00:00');
    d.setDate(d.getDate() + 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }, [todayStr]);
  const tomorrowAdj = projMap[tomorrow] || 0;
  const tomorrowTarget = Math.round(Math.max(1200, Math.min(baseTarget * 1.15, baseTarget + tomorrowAdj)));

  let statusLabel: string;
  let statusColor: string;
  let StatusIcon: typeof TrendingUp;
  
  if (Math.abs(diff) <= adjustedTarget * 0.1) {
    statusLabel = 'On Track ✅';
    statusColor = 'text-primary';
    StatusIcon = CheckCircle2;
  } else if (diff > 0) {
    statusLabel = `+${Math.round(diff)} kcal surplus`;
    statusColor = 'text-destructive';
    StatusIcon = TrendingUp;
  } else {
    statusLabel = `${Math.round(diff)} kcal deficit`;
    statusColor = 'text-accent';
    StatusIcon = TrendingDown;
  }

  const remaining = adjustedTarget - eaten;

  return (
    <div className="space-y-2">
      <div className={`p-3.5 rounded-xl border ${
        diff > adjustedTarget * 0.1 ? 'bg-destructive/5 border-destructive/15' :
        diff < -(adjustedTarget * 0.1) ? 'bg-accent/5 border-accent/15' :
        'bg-primary/5 border-primary/15'
      }`}>
        <div className="flex items-center gap-2 mb-2">
          <StatusIcon className={`w-4 h-4 ${statusColor}`} />
          <p className={`text-xs font-bold ${statusColor}`}>{statusLabel}</p>
          <span className="ml-auto text-[9px] text-muted-foreground">⚡ Live</span>
        </div>
        <div className="grid grid-cols-3 gap-2 text-center">
          <div>
            <p className="text-sm font-bold text-foreground">{eaten}</p>
            <p className="text-[9px] text-muted-foreground">Eaten</p>
          </div>
          <div>
            <p className="text-sm font-bold text-foreground">{adjustedTarget}</p>
            <p className="text-[9px] text-muted-foreground">{isAdjusted ? 'Adj. Target' : 'Target'}</p>
          </div>
          <div>
            <p className={`text-sm font-bold ${remaining > 0 ? 'text-primary' : 'text-destructive'}`}>
              {remaining > 0 ? remaining : Math.round(diff)}
            </p>
            <p className="text-[9px] text-muted-foreground">{remaining > 0 ? 'Remaining' : 'Over'}</p>
          </div>
        </div>
        {isAdjusted && (
          <p className="text-[10px] text-muted-foreground mt-2 text-center">
            Original: {baseTarget} kcal · Adjusted: {adjustedTarget} kcal
          </p>
        )}
      </div>

      {/* Tomorrow preview */}
      {Math.abs(diff) > 50 && (
        <div className="p-3 rounded-xl bg-muted/50 border border-border">
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">📅 Tomorrow's projected target</p>
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-foreground">{tomorrowTarget} kcal</span>
            {tomorrowAdj !== 0 && (
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                tomorrowAdj < 0 ? 'bg-destructive/10 text-destructive' : 'bg-primary/10 text-primary'
              }`}>
                {tomorrowAdj > 0 ? '+' : ''}{tomorrowAdj} kcal
              </span>
            )}
          </div>
          <p className="text-[9px] text-muted-foreground mt-1">Updates in real time as you eat today</p>
        </div>
      )}
    </div>
  );
}
