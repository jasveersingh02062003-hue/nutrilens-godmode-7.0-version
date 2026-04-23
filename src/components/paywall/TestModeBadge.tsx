// Visible only while we're using the mock payment backend.
// Auto-disappears the day subscription-service.ts is swapped to a real provider.

export default function TestModeBadge() {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-accent/15 text-accent border border-accent/40 text-[9px] font-bold uppercase tracking-wider">
      <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
      Test mode
    </span>
  );
}
