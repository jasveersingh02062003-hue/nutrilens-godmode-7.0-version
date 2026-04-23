// Visible only while we're using the mock payment backend.
// Auto-disappears the day subscription-service.ts is swapped to a real provider.

export default function TestModeBadge() {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-warning/15 text-warning text-[9px] font-bold uppercase tracking-wider border border-warning/40">
      <span className="w-1.5 h-1.5 rounded-full bg-warning animate-pulse" />
      Test mode
    </span>
  );
}
