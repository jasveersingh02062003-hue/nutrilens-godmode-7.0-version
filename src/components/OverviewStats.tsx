import { useMemo } from 'react';
import { Scale, Flame, Trophy, TrendingDown, TrendingUp } from 'lucide-react';
import { getRecentLogs, getDailyTotals, getProfile } from '@/lib/store';
import { getWeightEntries } from '@/lib/weight-history';
import { getUnlockedBadges, BADGES } from '@/lib/achievements';

interface Props {
  refreshKey: number;
}

export default function OverviewStats({ refreshKey }: Props) {
  const data = useMemo(() => {
    const profile = getProfile();
    const logs = getRecentLogs(30);
    const weightEntries = getWeightEntries();
    const unlocked = getUnlockedBadges();

    // Current weight & delta
    const latestWeight = weightEntries.length > 0 ? weightEntries[weightEntries.length - 1] : null;
    const monthAgoWeight = weightEntries.length > 1 ? weightEntries[0] : null;
    const weightDelta = latestWeight && monthAgoWeight
      ? +(latestWeight.weight - monthAgoWeight.weight).toFixed(1)
      : null;

    // Avg calories last 7 days
    const last7 = logs.slice(0, 7);
    const daysWithFood = last7.filter(l => getDailyTotals(l).eaten > 0);
    const avgCalories = daysWithFood.length > 0
      ? Math.round(daysWithFood.reduce((s, l) => s + getDailyTotals(l).eaten, 0) / daysWithFood.length)
      : 0;

    // Logging streak
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
      value: data.avgCalories > 0 ? `${data.avgCalories}` : '—',
      sub: data.avgCalories > 0 ? `/ ${data.goal}` : null,
      subColor: 'text-muted-foreground',
    },
    {
      icon: Flame,
      label: 'Streak',
      value: `${data.streak}`,
      sub: data.streak === 1 ? 'day' : 'days',
      subColor: 'text-muted-foreground',
      iconColor: data.streak >= 7 ? 'text-accent' : undefined,
    },
    {
      icon: Trophy,
      label: 'Badges',
      value: `${data.badgeCount}`,
      sub: `/ ${data.totalBadges}`,
      subColor: 'text-muted-foreground',
    },
  ];

  return (
    <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-hide">
      {stats.map((s) => {
        const Icon = s.icon;
        const SubIcon = (s as any).SubIcon;
        return (
          <div key={s.label} className="card-subtle flex-shrink-0 min-w-[5.5rem] p-3 flex flex-col items-center gap-1">
            <Icon className={`w-4 h-4 ${(s as any).iconColor || 'text-primary'}`} />
            <span className="text-sm font-bold text-foreground">{s.value}</span>
            {s.sub && (
              <span className={`text-[10px] font-medium ${s.subColor} flex items-center gap-0.5`}>
                {SubIcon && <SubIcon className="w-3 h-3" />}
                {s.sub}
              </span>
            )}
            <span className="text-[9px] text-muted-foreground">{s.label}</span>
          </div>
        );
      })}
    </div>
  );
}
