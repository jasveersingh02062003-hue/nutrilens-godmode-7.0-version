import { useMemo, useState, useEffect, useRef, useCallback } from 'react';
import { Scale, Flame, Trophy, TrendingDown, TrendingUp } from 'lucide-react';
import { getRecentLogs, getDailyTotals, getProfile } from '@/lib/store';
import { getWeightEntries } from '@/lib/weight-history';
import { getUnlockedBadges, BADGES } from '@/lib/achievements';
import { motion } from 'framer-motion';

function useCountUp(target: number, duration = 800) {
  const [value, setValue] = useState(0);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    if (target === 0) { setValue(0); return; }
    const start = performance.now();
    const animate = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(target * eased));
      if (progress < 1) rafRef.current = requestAnimationFrame(animate);
    };
    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
  }, [target, duration]);

  return value;
}

interface Props {
  refreshKey: number;
}

export default function OverviewStats({ refreshKey }: Props) {
  const data = useMemo(() => {
    const profile = getProfile();
    const logs = getRecentLogs(30);
    const weightEntries = getWeightEntries();
    const unlocked = getUnlockedBadges();

    const latestWeight = weightEntries.length > 0 ? weightEntries[weightEntries.length - 1] : null;
    const monthAgoWeight = weightEntries.length > 1 ? weightEntries[0] : null;
    const weightDelta = latestWeight && monthAgoWeight
      ? +(latestWeight.weight - monthAgoWeight.weight).toFixed(1)
      : null;

    const last7 = logs.slice(0, 7);
    const daysWithFood = last7.filter(l => getDailyTotals(l).eaten > 0);
    const avgCalories = daysWithFood.length > 0
      ? Math.round(daysWithFood.reduce((s, l) => s + getDailyTotals(l).eaten, 0) / daysWithFood.length)
      : 0;

    let streak = 0;
    for (const log of logs) {
      if (getDailyTotals(log).eaten > 0) streak++;
      else break;
    }

    return {
      currentWeight: latestWeight?.weight ?? null,
      weightUnit: latestWeight?.unit ?? 'kg',
      weightDelta,
      avgCalories,
      streak,
      badgeCount: unlocked.length,
      totalBadges: BADGES.length,
      goal: profile?.dailyCalories || 2000,
    };
  }, [refreshKey]);

  const animatedAvgCal = useCountUp(data.avgCalories);
  const animatedStreak = useCountUp(data.streak, 600);
  const animatedBadges = useCountUp(data.badgeCount, 600);

  const stats = [
    {
      icon: Scale,
      label: 'Weight',
      value: data.currentWeight ? `${data.currentWeight} ${data.weightUnit}` : '—',
      sub: data.weightDelta != null
        ? `${data.weightDelta > 0 ? '+' : ''}${data.weightDelta} ${data.weightUnit}`
        : null,
      subColor: data.weightDelta != null && data.weightDelta < 0 ? 'text-primary' : 'text-destructive',
      SubIcon: data.weightDelta != null && data.weightDelta < 0 ? TrendingDown : TrendingUp,
    },
    {
      icon: Flame,
      label: 'Avg Cal',
      value: data.avgCalories > 0 ? `${animatedAvgCal}` : '—',
      sub: data.avgCalories > 0 ? `/ ${data.goal}` : null,
      subColor: 'text-muted-foreground',
    },
    {
      icon: Flame,
      label: 'Streak',
      value: `${animatedStreak}`,
      sub: data.streak === 1 ? 'day' : 'days',
      subColor: 'text-muted-foreground',
      iconColor: data.streak >= 7 ? 'text-accent' : undefined,
    },
    {
      icon: Trophy,
      label: 'Badges',
      value: `${animatedBadges}`,
      sub: `/ ${data.totalBadges}`,
      subColor: 'text-muted-foreground',
    },
  ];

  const containerVariants = {
    hidden: {},
    show: { transition: { staggerChildren: 0.08 } },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 16, scale: 0.95 },
    show: { opacity: 1, y: 0, scale: 1, transition: { type: 'spring' as const, stiffness: 300, damping: 25 } },
  };

  return (
    <motion.div
      className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-hide"
      variants={containerVariants}
      initial="hidden"
      animate="show"
    >
      {stats.map((s) => {
        const Icon = s.icon;
        const SubIcon = (s as any).SubIcon;
        return (
          <motion.div
            key={s.label}
            variants={itemVariants}
            className="glass-card flex-shrink-0 min-w-[5.5rem] p-3 flex flex-col items-center gap-1"
          >
            <Icon className={`w-4 h-4 ${(s as any).iconColor || 'text-primary'}`} />
            <span className="text-sm font-bold text-foreground">{s.value}</span>
            {s.sub && (
              <span className={`text-[10px] font-medium ${s.subColor} flex items-center gap-0.5`}>
                {SubIcon && <SubIcon className="w-3 h-3" />}
                {s.sub}
              </span>
            )}
            <span className="text-[9px] text-muted-foreground">{s.label}</span>
          </motion.div>
        );
      })}
    </motion.div>
  );
}
