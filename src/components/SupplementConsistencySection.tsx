import { getProfile } from '@/lib/store';
import { getSupplementAdherence } from '@/lib/supplement-service';
import { Pill } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

interface Props {
  refreshKey?: number;
}

export default function SupplementConsistencySection({ refreshKey }: Props) {
  const profile = getProfile();
  if (!profile?.supplementPrefs?.items?.length) return null;

  const adherence = getSupplementAdherence(profile, 30);
  if (adherence.daysPlanned === 0) return null;

  const ringColor = adherence.adherencePercent >= 80 ? 'text-primary' : adherence.adherencePercent >= 50 ? 'text-accent' : 'text-destructive';

  return (
    <div className="card-elevated p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Pill className="w-4 h-4 text-primary" />
        <h3 className="font-semibold text-sm text-foreground">Supplement Consistency</h3>
      </div>

      <div className="flex items-center gap-4">
        {/* Adherence ring */}
        <div className="relative w-16 h-16 shrink-0">
          <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
            <circle cx="18" cy="18" r="15.5" fill="none" stroke="hsl(var(--muted))" strokeWidth="3" />
            <circle
              cx="18" cy="18" r="15.5" fill="none"
              stroke="currentColor"
              className={ringColor}
              strokeWidth="3"
              strokeDasharray={`${adherence.adherencePercent} ${100 - adherence.adherencePercent}`}
              strokeLinecap="round"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className={`text-sm font-bold ${ringColor}`}>{adherence.adherencePercent}%</span>
          </div>
        </div>

        <div className="flex-1 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Days taken</span>
            <span className="font-semibold text-foreground">{adherence.daysTaken} / {adherence.daysPlanned}</span>
          </div>
          <Progress value={adherence.adherencePercent} className="h-1.5" />
          <div className="flex items-center justify-between text-[10px]">
            <span className="text-muted-foreground">🔥 Streak: {adherence.streak} days</span>
            <span className="text-muted-foreground">💰 ₹{adherence.totalCost} spent</span>
          </div>
        </div>
      </div>

      {/* Supplement list */}
      <div className="flex flex-wrap gap-1.5">
        {profile.supplementPrefs!.items.map((item, i) => (
          <span key={i} className="px-2.5 py-1 rounded-full bg-muted text-[10px] font-medium text-foreground">
            {item.name}
          </span>
        ))}
      </div>
    </div>
  );
}
