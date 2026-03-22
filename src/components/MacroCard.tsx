import { Flame, Wheat, Droplets } from 'lucide-react';

interface Props {
  label: string;
  current: number;
  goal: number;
  variant: 'coral' | 'primary' | 'gold';
  icon: string;
}

const iconMap = {
  coral: Flame,
  primary: Wheat,
  gold: Droplets,
};

const colorMap = {
  coral: 'bg-coral',
  primary: 'bg-primary',
  gold: 'bg-accent',
};

const bgMap = {
  coral: 'bg-coral/10',
  primary: 'bg-primary/10',
  gold: 'bg-accent/10',
};

const textMap = {
  coral: 'text-coral',
  primary: 'text-primary',
  gold: 'text-accent',
};

export default function MacroCard({ label, current, goal, variant }: Props) {
  const pct = Math.min(100, Math.round((current / goal) * 100));
  const Icon = iconMap[variant];

  return (
    <div className="card-subtle p-3.5 flex-1 min-w-0">
      <div className="flex items-center gap-2 mb-2.5">
        <div className={`w-7 h-7 rounded-lg ${bgMap[variant]} flex items-center justify-center`}>
          <Icon className={`w-3.5 h-3.5 ${textMap[variant]}`} />
        </div>
        <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">{label}</span>
      </div>
      <p className="text-lg font-bold text-foreground">{current}<span className="text-xs font-medium text-muted-foreground ml-0.5">/{goal}g</span></p>
      <div className="mt-2 h-1 rounded-full bg-muted overflow-hidden">
        <div className={`h-full rounded-full ${colorMap[variant]} transition-all duration-700 ease-out`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
