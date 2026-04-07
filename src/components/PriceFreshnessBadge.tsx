import { Clock } from 'lucide-react';

interface PriceFreshnessBadgeProps {
  lastUpdated?: string | null;
  isStale?: boolean;
  compact?: boolean;
}

export default function PriceFreshnessBadge({ lastUpdated, isStale, compact }: PriceFreshnessBadgeProps) {
  if (!lastUpdated || lastUpdated === 'static') {
    return (
      <span className="inline-flex items-center gap-0.5 text-[9px] font-medium text-muted-foreground">
        <Clock className="w-2.5 h-2.5" />
        {compact ? 'Est.' : 'Estimate'}
      </span>
    );
  }

  if (isStale) {
    return (
      <span className="inline-flex items-center gap-0.5 text-[9px] font-semibold text-destructive">
        <Clock className="w-2.5 h-2.5" />
        {compact ? 'Old' : 'May be outdated'}
      </span>
    );
  }

  const hoursAgo = (Date.now() - new Date(lastUpdated).getTime()) / (1000 * 60 * 60);

  if (hoursAgo < 6) {
    return (
      <span className="inline-flex items-center gap-0.5 text-[9px] font-semibold text-primary">
        <Clock className="w-2.5 h-2.5" />
        {compact ? 'Live' : `${Math.floor(hoursAgo)}h ago`}
      </span>
    );
  }

  if (hoursAgo < 24) {
    return (
      <span className="inline-flex items-center gap-0.5 text-[9px] font-semibold text-amber-500">
        <Clock className="w-2.5 h-2.5" />
        {compact ? `${Math.floor(hoursAgo)}h` : `${Math.floor(hoursAgo)}h ago`}
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-0.5 text-[9px] font-semibold text-destructive">
      <Clock className="w-2.5 h-2.5" />
      {compact ? '>24h' : `${Math.floor(hoursAgo / 24)}d old`}
    </span>
  );
}
