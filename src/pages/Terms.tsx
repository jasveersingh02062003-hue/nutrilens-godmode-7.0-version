import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

export default function Terms() {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto px-5 py-6">
        <Link
          to="/auth"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </Link>

        <article className="prose prose-sm max-w-none">
          <h1 className="text-2xl font-bold text-foreground mb-1">Terms of Service</h1>
          <p className="text-xs text-muted-foreground mb-6">Last updated: 23 April 2026</p>

          <div className="space-y-5 text-sm text-foreground leading-relaxed">
            <section>
              <h2 className="text-base font-semibold mt-4 mb-2">1. Acceptance</h2>
              <p className="text-muted-foreground">
                By creating an account or using NutriLens AI ("the Service"), you agree to these Terms. If you do not agree, do not use the Service.
              </p>
            </section>

            <section>
              <h2 className="text-base font-semibold mt-4 mb-2">2. Eligibility</h2>
              <p className="text-muted-foreground">
                You must be at least 18 years old and capable of entering a binding contract. By using NutriLens you represent that you meet these requirements.
              </p>
            </section>

            <section>
              <h2 className="text-base font-semibold mt-4 mb-2">3. The Service</h2>
              <p className="text-muted-foreground">
                NutriLens provides AI-assisted nutrition tracking, meal planning, grocery price intelligence, and personalised coaching. Features depend on your subscription tier
                (Free, Pro, Pro+) and may change over time.
              </p>
            </section>

            <section>
              <h2 className="text-base font-semibold mt-4 mb-2">4. Health disclaimer (important)</h2>
              <p className="text-muted-foreground">
                NutriLens is <strong className="text-foreground">not a medical service</strong>. Calorie targets, macro splits, supplement suggestions, and AI coaching are general
                wellness guidance only. Do not use NutriLens as a substitute for advice from a qualified doctor, dietitian, or other healthcare provider. If you have a medical
                condition (including diabetes, PCOS, eating disorders, pregnancy), consult your doctor before changing your diet or exercise routine.
              </p>
            </section>

            <section>
              <h2 className="text-base font-semibold mt-4 mb-2">5. Account</h2>
              <p className="text-muted-foreground">
                You are responsible for keeping your login credentials secure and for all activity on your account. Notify us immediately at
                <strong className="text-foreground"> support@nutrilens.app</strong> of any unauthorised use.
              </p>
            </section>

            <section>
              <h2 className="text-base font-semibold mt-4 mb-2">6. Subscriptions, payments &amp; refunds</h2>
              <p className="text-muted-foreground">
                Paid plans (Pro / Pro+) are billed in advance and renew automatically until cancelled. You can cancel any time from your
                account — cancellation takes effect at the end of your current billing period and you keep access until then.
              </p>
              <p className="text-muted-foreground mt-2">
                <strong className="text-foreground">14-day money-back guarantee:</strong> if you're not satisfied with a paid subscription, you can
                request a full refund within <strong className="text-foreground">14 days</strong> of your initial purchase, no questions asked. Refunds
                for renewals are reviewed on a case-by-case basis. To request a refund, contact us at <strong className="text-foreground">support@nutrilens.app</strong>
                {' '}or use the buyer portal at <a href="https://paddle.net" target="_blank" rel="noopener noreferrer" className="text-primary underline">paddle.net</a>.
              </p>
              <p className="text-muted-foreground mt-2">
                <strong className="text-foreground">Merchant of Record:</strong> Our order process is conducted by our online reseller Paddle.com.
                Paddle.com is the Merchant of Record for all our orders. Paddle provides all customer service inquiries and handles returns. See
                {' '}<a href="https://www.paddle.com/legal/checkout-buyer-terms" target="_blank" rel="noopener noreferrer" className="text-primary underline">Paddle Buyer Terms</a>
                {' '}and <a href="https://www.paddle.com/legal/refund-policy" target="_blank" rel="noopener noreferrer" className="text-primary underline">Paddle Refund Policy</a> for full details.
              </p>
              <p className="text-muted-foreground mt-2">
                Brand wallet top-ups for advertisers are non-refundable except where required by law.
              </p>
            </section>

            <section>
              <h2 className="text-base font-semibold mt-4 mb-2">7. Acceptable use</h2>
              <ul className="list-disc pl-5 text-muted-foreground space-y-1">
                <li>Do not reverse-engineer, scrape, or abuse the Service.</li>
                <li>Do not upload illegal, harmful, or infringing content.</li>
                <li>Do not impersonate others or attempt to access other users' data.</li>
                <li>Do not abuse AI features (Monika, photo analysis) to generate excessive volume.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-base font-semibold mt-4 mb-2">8. User content</h2>
              <p className="text-muted-foreground">
                You retain ownership of meal photos, notes, and other content you upload. You grant us a limited licence to store, process, and display
                this content solely to operate the Service for you.
              </p>
            </section>

            <section>
              <h2 className="text-base font-semibold mt-4 mb-2">9. Advertising</h2>
              <p className="text-muted-foreground">
                Free and Pro tiers may show contextual advertisements from verified brands. Sponsored cards are clearly labelled. We never share personal
                health conditions or identifiable data with advertisers.
              </p>
            </section>

            <section>
              <h2 className="text-base font-semibold mt-4 mb-2">10. Termination</h2>
              <p className="text-muted-foreground">
                You may delete your account at any time. We may suspend or terminate accounts that violate these Terms, with notice where reasonably possible.
              </p>
            </section>

            <section>
              <h2 className="text-base font-semibold mt-4 mb-2">11. Limitation of liability</h2>
              <p className="text-muted-foreground">
                To the maximum extent permitted by law, NutriLens is provided "as is" without warranty. We are not liable for indirect, incidental, or consequential
                damages, or for any health outcome resulting from reliance on the Service. Our total liability is limited to the amount you paid us in the prior 12 months.
              </p>
            </section>

            <section>
              <h2 className="text-base font-semibold mt-4 mb-2">12. Governing law</h2>
              <p className="text-muted-foreground">
                These Terms are governed by the laws of India. Disputes are subject to the exclusive jurisdiction of the courts of Bengaluru, Karnataka.
              </p>
            </section>

            <section>
              <h2 className="text-base font-semibold mt-4 mb-2">13. Changes</h2>
              <p className="text-muted-foreground">
                We may update these Terms. Material changes will be notified in-app. Continued use after changes constitutes acceptance.
              </p>
            </section>

            <section>
              <h2 className="text-base font-semibold mt-4 mb-2">14. Contact</h2>
              <p className="text-muted-foreground">
                Questions? Reach us at <strong className="text-foreground">support@nutrilens.app</strong>.
              </p>
            </section>

            <p className="pt-4 text-xs text-muted-foreground">
              See also our <Link to="/privacy" className="text-primary underline">Privacy Policy</Link>.
            </p>
          </div>
        </article>
      </div>
    </div>
  );
}
