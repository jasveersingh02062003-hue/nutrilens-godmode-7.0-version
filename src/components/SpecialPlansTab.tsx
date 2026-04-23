import { useState } from 'react';
import { motion } from 'framer-motion';
import { Star, ArrowRight, Crown, Zap, Target, Lock } from 'lucide-react';
import { PLAN_CATALOG, type PlanMeta, type PlanCategory, type PlanType, getActivePlan, getActivePlanRaw, getPlanProgress, getPlanById } from '@/lib/event-plan-service';
import PlanDetailSheet from './PlanDetailSheet';
import EventPlanConfigSheet from './EventPlanConfigSheet';
import CurrentPlansTab from './CurrentPlansTab';
import { useAgeTier } from '@/hooks/useAgeTier';
import { toast } from 'sonner';

// Plans hidden / locked for users under 18 — aggressive deficits and
// strict eating-window protocols are unsafe during growth years.
const RESTRICTED_PLAN_IDS: PlanType[] = [
  'celebrity_transformation',
  'sugar_cut',
  'madhavan_21_day',
];

const FILTERS: { key: PlanCategory; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'weight_loss', label: 'Weight Loss' },
  { key: 'sugar_free', label: 'Sugar Free' },
  { key: 'muscle', label: 'Muscle' },
  { key: 'event', label: 'Event' },
  { key: 'gym', label: 'Gym' },
];

export default function SpecialPlansTab() {
  const [filter, setFilter] = useState<PlanCategory>('all');
  const [selectedPlan, setSelectedPlan] = useState<PlanMeta | null>(null);
  const [eventSheetOpen, setEventSheetOpen] = useState(false);
  const [subTab, setSubTab] = useState<'available' | 'my'>(() => getActivePlanRaw() ? 'my' : 'available');
  const { disableAggressivePlans, disableEventPlans, isMinor } = useAgeTier();
  const activePlan = getActivePlan();
  const progress = getPlanProgress();

  const isPlanRestricted = (id: PlanType) =>
    disableAggressivePlans && RESTRICTED_PLAN_IDS.includes(id);

  const handlePlanClick = (plan: PlanMeta) => {
    if (isPlanRestricted(plan.id)) {
      toast.info('This plan is not available under 18 — for your safety.', {
        description: 'Aggressive calorie cuts can affect growth and metabolism.',
      });
      return;
    }
    setSelectedPlan(plan);
  };

  const handleEventCtaClick = () => {
    if (disableEventPlans) {
      toast.info('Event plans are not available under 18 — for your safety.', {
        description: 'Deadline-driven goals can encourage unsafe eating patterns.',
      });
      return;
    }
    setEventSheetOpen(true);
  };

  const filtered = filter === 'all' ? PLAN_CATALOG : PLAN_CATALOG.filter(p => p.category === filter);

  return (
    <div className="space-y-4">
      {/* Segmented Control */}
      <div className="flex rounded-xl bg-muted p-1 gap-1">
        <button
          onClick={() => setSubTab('available')}
          className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-colors ${
            subTab === 'available' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'
          }`}
        >
          Available Plans
        </button>
        <button
          onClick={() => setSubTab('my')}
          className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-colors relative ${
            subTab === 'my' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'
          }`}
        >
          My Plans
          {getActivePlanRaw() && (
            <span className="absolute top-1.5 right-2 w-2 h-2 rounded-full bg-primary" />
          )}
        </button>
      </div>

      {subTab === 'my' ? (
        <CurrentPlansTab onBrowse={() => setSubTab('available')} />
      ) : (
      <div className="space-y-4">
      {activePlan && progress && (() => {
        const meta = getPlanById(activePlan.planId);
        return (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border border-primary/20 bg-primary/5 p-4 space-y-3"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-lg">{meta?.emoji}</span>
                <div>
                  <p className="text-sm font-bold text-foreground">{meta?.name}</p>
                  <p className="text-[10px] text-muted-foreground">
                    Day {progress.dayNumber} of {progress.totalDays} · {progress.daysLeft} days left
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold text-primary">{progress.percentComplete}%</p>
              </div>
            </div>
            <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-primary rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${progress.percentComplete}%` }}
                transition={{ duration: 0.8 }}
              />
            </div>
            <div className="flex gap-3 text-center">
              <div className="flex-1 rounded-xl bg-card p-2">
                <p className="text-xs font-bold text-foreground">{activePlan.dailyCalories}</p>
                <p className="text-[9px] text-muted-foreground">kcal/day</p>
              </div>
              <div className="flex-1 rounded-xl bg-card p-2">
                <p className="text-xs font-bold text-foreground">{activePlan.dailyProtein}g</p>
                <p className="text-[9px] text-muted-foreground">protein</p>
              </div>
              <div className="flex-1 rounded-xl bg-card p-2">
                <p className="text-xs font-bold text-foreground">{activePlan.targetWeight} kg</p>
                <p className="text-[9px] text-muted-foreground">target</p>
              </div>
            </div>
          </motion.div>
        );
      })()}

      {/* Minor safety notice */}
      {isMinor && (
        <div className="rounded-2xl bg-accent/10 border border-accent/20 p-3 flex items-start gap-2.5">
          <Lock className="w-4 h-4 text-accent shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <p className="text-[11px] font-bold text-foreground">Some plans are locked for under-18s</p>
            <p className="text-[10px] text-muted-foreground leading-relaxed">
              Aggressive deficits, sugar-cut challenges, and event countdowns are hidden for your safety. Stick to balanced eating — your body's still growing. 💪
            </p>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="text-center">
        <h3 className="text-base font-bold text-foreground flex items-center justify-center gap-2">
          <Crown className="w-4 h-4 text-primary" /> Transformation Plans
        </h3>
        <p className="text-xs text-muted-foreground mt-1">Expert-designed plans to accelerate your goals</p>
      </div>

      {/* Filter Chips */}
      <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
        {FILTERS.map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
              filter === f.key
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Event Plan CTA */}
      <motion.button
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        onClick={handleEventCtaClick}
        className={`w-full rounded-2xl border-2 border-dashed p-5 text-center space-y-2 active:scale-[0.99] transition-transform relative ${
          disableEventPlans
            ? 'border-muted bg-muted/30 opacity-60'
            : 'border-primary/30 bg-primary/5'
        }`}
      >
        {disableEventPlans && (
          <div className="absolute top-3 right-3 w-7 h-7 rounded-full bg-muted flex items-center justify-center">
            <Lock className="w-3.5 h-3.5 text-muted-foreground" />
          </div>
        )}
        <span className="text-3xl">🎯</span>
        <p className="text-sm font-bold text-foreground">Create Event Plan</p>
        <p className="text-[10px] text-muted-foreground">
          {disableEventPlans
            ? 'Locked — not available under 18'
            : 'Wedding, vacation, meeting — get a custom deadline-driven plan'}
        </p>
      </motion.button>

      {/* Plan Cards */}
      <div className="space-y-3">
        {filtered.filter(p => p.id !== 'event_based').map((plan, i) => {
          const restricted = isPlanRestricted(plan.id);
          return (
          <motion.button
            key={plan.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
            onClick={() => handlePlanClick(plan)}
            className={`w-full card-subtle p-4 text-left hover:shadow-md transition-shadow active:scale-[0.99] relative ${
              restricted ? 'opacity-60' : ''
            }`}
          >
            {restricted && (
              <div className="absolute top-3 right-3 w-7 h-7 rounded-full bg-muted flex items-center justify-center">
                <Lock className="w-3.5 h-3.5 text-muted-foreground" />
              </div>
            )}
            <div className="flex items-start gap-3">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-2xl flex-shrink-0">
                {plan.emoji}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-bold text-foreground truncate">{plan.name}</h4>
                </div>
                <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-2">
                  {restricted ? 'Locked — not available under 18 for safety reasons.' : plan.description}
                </p>
                <div className="flex items-center gap-3 mt-2">
                  <div className="flex items-center gap-0.5">
                    <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                    <span className="text-[10px] font-bold text-foreground">{plan.rating}</span>
                    <span className="text-[10px] text-muted-foreground">({plan.reviewCount})</span>
                  </div>
                  <span className="text-[10px] text-muted-foreground">{plan.defaultDuration} days</span>
                  <span className="text-[10px] font-bold text-primary">₹{plan.price}</span>
                </div>
              </div>
              {!restricted && <ArrowRight className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-1" />}
            </div>
            <div className="flex gap-1.5 mt-3">
              {plan.rules.slice(0, 3).map(r => (
                <span key={r} className="text-[8px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
                  {r}
                </span>
              ))}
            </div>
          </motion.button>
          );
        })}
      </div>

      {/* Testimonial */}
      <div className="rounded-2xl border border-border bg-muted/30 p-4 space-y-2">
        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">What users say</p>
        <div className="space-y-3">
          {[
            { name: 'Ananya K.', text: 'Lost 4 kg in 21 days with the Celebrity plan. The sugar alerts were a game-changer!', stars: 5 },
            { name: 'Rahul M.', text: 'Gym Fat Loss plan synced perfectly with my workout routine. Best ₹699 I spent.', stars: 5 },
          ].map((review, i) => (
            <div key={i} className="flex gap-2">
              <div className="w-7 h-7 rounded-full bg-primary/15 flex items-center justify-center text-[9px] font-bold text-primary flex-shrink-0">
                {review.name.split(' ').map(w => w[0]).join('')}
              </div>
              <div>
                <div className="flex items-center gap-1">
                  <p className="text-[10px] font-semibold text-foreground">{review.name}</p>
                  <div className="flex">
                    {Array(review.stars).fill(0).map((_, j) => (
                      <Star key={j} className="w-2 h-2 fill-amber-400 text-amber-400" />
                    ))}
                  </div>
                </div>
                <p className="text-[10px] text-muted-foreground leading-relaxed">{review.text}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Plan Detail Sheet */}
      {selectedPlan && (
        <PlanDetailSheet
          plan={selectedPlan}
          open={!!selectedPlan}
          onOpenChange={(open) => !open && setSelectedPlan(null)}
        />
      )}

      {/* Event Plan Config Sheet */}
      <EventPlanConfigSheet open={eventSheetOpen} onOpenChange={setEventSheetOpen} />
    </div>
      )}
    </div>
  );
}
