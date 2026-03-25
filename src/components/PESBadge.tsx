import { type PESColor } from '@/lib/pes-engine';

interface Props {
  pes: number;
  color: PESColor;
  size?: 'sm' | 'md';
}

const colorMap: Record<PESColor, string> = {
  green: 'text-green-700 bg-green-100 border-green-200',
  yellow: 'text-amber-700 bg-amber-100 border-amber-200',
  red: 'text-red-700 bg-red-100 border-red-200',
};

const dotMap: Record<PESColor, string> = {
  green: 'bg-green-500',
  yellow: 'bg-amber-500',
  red: 'bg-red-500',
};

export default function PESBadge({ pes, color, size = 'sm' }: Props) {
  if (pes <= 0) return null;

  const sizeClass = size === 'sm'
    ? 'text-[9px] px-1.5 py-0.5 gap-1'
    : 'text-[11px] px-2 py-1 gap-1.5';

  const dotSize = size === 'sm' ? 'w-1.5 h-1.5' : 'w-2 h-2';

  // Educational insight (Fix 3)
  const insight = pes < 0.3
    ? 'Try eggs or dal for better protein per ₹'
    : pes > 0.8
    ? 'Great protein efficiency!'
    : null;

  return (
    <span className="inline-flex flex-col items-start">
      <span className={`inline-flex items-center rounded-full border font-semibold ${colorMap[color]} ${sizeClass}`}>
        <span className={`${dotSize} rounded-full ${dotMap[color]}`} />
        {pes.toFixed(2)}/₹
      </span>
      {insight && size === 'md' && (
        <span className="text-[8px] text-muted-foreground mt-0.5 leading-tight">{insight}</span>
      )}
    </span>
  );
}
