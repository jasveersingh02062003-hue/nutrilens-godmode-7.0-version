// Visible only while we're using the mock payment backend.
// We can't read server env vars from the client, so we infer "test mode" by
// the presence of the mock-subscribe path. The badge auto-disappears the day
// we swap subscription-service.ts to a real provider.

export default function TestModeBadge() {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 text-[9px] font-bold uppercase tracking-wider border border-amber-300">
      <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
      Test mode
    </span>
  );
}
