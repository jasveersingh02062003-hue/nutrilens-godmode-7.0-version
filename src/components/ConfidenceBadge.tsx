interface Props {
  confidence: number;
}

export default function ConfidenceBadge({ confidence }: Props) {
  const color = confidence >= 80
    ? 'bg-primary/10 text-primary'
    : confidence >= 60
    ? 'bg-accent/10 text-accent'
    : 'bg-coral/10 text-coral';

  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold ${color}`}>
      {confidence}%
    </span>
  );
}
