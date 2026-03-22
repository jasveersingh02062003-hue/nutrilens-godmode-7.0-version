interface Props {
  emoji: string;
  text: string;
}

export default function ScrollStopperCard({ emoji, text }: Props) {
  return (
    <div className="w-full rounded-2xl bg-primary/5 border border-primary/10 px-4 py-3 text-center">
      <span className="text-lg">{emoji}</span>
      <p className="text-xs font-semibold text-foreground mt-1">{text}</p>
    </div>
  );
}
