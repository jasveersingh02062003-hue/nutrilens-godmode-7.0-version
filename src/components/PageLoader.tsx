/**
 * Branded full-screen loader shown while lazy-loaded route chunks resolve.
 * Kept lightweight (no heavy imports) so it ships in the main bundle.
 */
export default function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-8 h-8 border-[3px] border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );
}
