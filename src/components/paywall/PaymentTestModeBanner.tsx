import { getPaddleEnvironment, isPaddleConfigured } from '@/lib/paddle';

/** Banner shown only when running against the Paddle sandbox.
 *  Returns null in production / when Paddle is unconfigured. */
export default function PaymentTestModeBanner() {
  if (!isPaddleConfigured()) return null;
  if (getPaddleEnvironment() !== 'sandbox') return null;

  return (
    <div className="w-full bg-orange-100 border-b border-orange-300 px-4 py-2 text-center text-[11px] text-orange-800">
      All payments in the preview are in <strong>test mode</strong>. Use card{' '}
      <code className="font-mono">4242 4242 4242 4242</code>.{' '}
      <a
        href="https://docs.lovable.dev/features/payments#test-and-live-environments"
        target="_blank"
        rel="noopener noreferrer"
        className="underline font-medium"
      >
        Learn more
      </a>
    </div>
  );
}
