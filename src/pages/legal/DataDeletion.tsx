import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

export default function DataDeletion() {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto px-5 py-6">
        <Link
          to="/profile"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </Link>

        <article className="prose prose-sm max-w-none">
          <h1 className="text-2xl font-bold text-foreground mb-1">Data Deletion & Retention</h1>
          <p className="text-xs text-muted-foreground mb-6">Last updated: 25 April 2026</p>

          <div className="space-y-5 text-sm text-foreground leading-relaxed">
            <section>
              <h2 className="text-base font-semibold mt-4 mb-2">1. What we store about you</h2>
              <p className="text-muted-foreground">
                Your account, profile, daily food logs, weight and water entries, supplement logs,
                event plans, AI conversation history, consent records, in-app feedback, price alerts,
                ad interactions and analytics events. A complete list is included in your data export
                and is removed when you delete your account.
              </p>
            </section>

            <section>
              <h2 className="text-base font-semibold mt-4 mb-2">2. How long we keep it</h2>
              <p className="text-muted-foreground">
                We retain your data for as long as your account is active. Inactive accounts (no
                login for 24 months) are flagged for deletion review. Anonymised, aggregated metrics
                may be retained indefinitely for product analytics — these cannot be tied back to you.
              </p>
            </section>

            <section>
              <h2 className="text-base font-semibold mt-4 mb-2">3. Export your data</h2>
              <p className="text-muted-foreground">
                Under DPDP Section 11 you can download a full JSON copy of everything we hold about you.
                Open <strong>Profile → Download All My Data</strong>. The export is rate-limited to 3 requests per hour to prevent abuse.
              </p>
            </section>

            <section>
              <h2 className="text-base font-semibold mt-4 mb-2">4. Delete your account</h2>
              <p className="text-muted-foreground">
                Open <strong>Profile → Delete Account</strong> and type <code className="px-1 py-0.5 bg-muted rounded text-xs">DELETE</code> to confirm.
                This permanently removes your profile, all logs, plans, conversations, ad interactions and your authentication record across our database.
                The action is irreversible and completes within seconds.
              </p>
              <p className="text-muted-foreground mt-2">
                Aggregated, fully anonymised event counters (e.g. "n users opened the app today") are
                retained for product analytics and cannot be linked back to your identity.
              </p>
            </section>

            <section>
              <h2 className="text-base font-semibold mt-4 mb-2">5. Backups</h2>
              <p className="text-muted-foreground">
                Database backups are kept for 30 days for disaster-recovery purposes only. Deleted
                data is purged from the active database immediately and from rolling backups within 30 days.
              </p>
            </section>

            <section>
              <h2 className="text-base font-semibold mt-4 mb-2">6. Where your data lives</h2>
              <p className="text-muted-foreground">
                All personal data is stored on servers located in <strong>Mumbai, India (ap-south-1)</strong>.
                Your data does not leave Indian jurisdiction at rest, in line with the DPDP Act 2023
                data-localisation expectations. The only cross-border traffic is short-lived API calls
                to AI providers for meal-photo analysis and chat — those calls carry only the image
                bytes or text you submit, never your name, email, or account ID.
              </p>
            </section>

            <section>
              <h2 className="text-base font-semibold mt-4 mb-2">7. Contact</h2>
              <p className="text-muted-foreground">
                Questions or formal data-protection requests:{' '}
                <a href="mailto:privacy@nutrilens.app" className="text-primary underline">
                  privacy@nutrilens.app
                </a>
                . We respond within 30 days as required by DPDP.
              </p>
            </section>

            <section>
              <h2 className="text-base font-semibold mt-4 mb-2">7. Related policies</h2>
              <p className="text-muted-foreground">
                See our <Link to="/privacy" className="text-primary underline">Privacy Policy</Link> for full details on
                what we collect and why, and our <Link to="/terms" className="text-primary underline">Terms of Service</Link>{' '}
                for usage rules.
              </p>
            </section>
          </div>
        </article>
      </div>
    </div>
  );
}
