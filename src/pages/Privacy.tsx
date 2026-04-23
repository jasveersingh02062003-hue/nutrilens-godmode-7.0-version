import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

export default function Privacy() {
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
          <h1 className="text-2xl font-bold text-foreground mb-1">Privacy Policy</h1>
          <p className="text-xs text-muted-foreground mb-6">Last updated: 23 April 2026</p>

          <div className="space-y-5 text-sm text-foreground leading-relaxed">
            <section>
              <h2 className="text-base font-semibold mt-4 mb-2">1. Who we are</h2>
              <p className="text-muted-foreground">
                NutriLens AI ("NutriLens", "we", "us") is a personal nutrition tracking and coaching application operated from India.
                This Privacy Policy explains what personal data we collect, why we collect it, how it is used, and the rights you have under the
                Digital Personal Data Protection Act, 2023 ("DPDP Act").
              </p>
            </section>

            <section>
              <h2 className="text-base font-semibold mt-4 mb-2">2. Data we collect</h2>
              <ul className="list-disc pl-5 text-muted-foreground space-y-1">
                <li><strong>Account data:</strong> name, email, phone number (optional), authentication provider.</li>
                <li><strong>Profile &amp; health data:</strong> age, gender, height, weight, activity level, dietary preferences, declared health conditions (e.g. PCOS, diabetes), goals.</li>
                <li><strong>Logs:</strong> meal entries, photos, supplements, water, weight, gym sessions, symptoms, mood and energy notes.</li>
                <li><strong>Device &amp; usage:</strong> approximate city (for weather and pricing), device type, crash reports, in-app interactions.</li>
                <li><strong>Payments (if applicable):</strong> handled by our payment processor; we never store full card details.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-base font-semibold mt-4 mb-2">3. Why we use your data (purposes)</h2>
              <ul className="list-disc pl-5 text-muted-foreground space-y-1">
                <li>Calculate calorie / macro targets and personalised meal recommendations.</li>
                <li>Provide AI coaching (Monika), progress reports, and adherence tracking.</li>
                <li>Show locally-relevant grocery prices and nutrition tips.</li>
                <li>Improve product reliability (anonymised crash &amp; usage telemetry).</li>
                <li>Send transactional notifications you opt into (meal/water reminders).</li>
              </ul>
            </section>

            <section>
              <h2 className="text-base font-semibold mt-4 mb-2">4. Legal basis</h2>
              <p className="text-muted-foreground">
                We process your data based on the consent you provide during sign-up and onboarding. You can withdraw consent at any time from
                Profile → Settings, after which we will stop processing and delete your data within 30 days (subject to legal retention obligations).
              </p>
            </section>

            <section>
              <h2 className="text-base font-semibold mt-4 mb-2">5. Third-party processors</h2>
              <p className="text-muted-foreground">
                We share the minimum data necessary with the following processors, each bound by their own privacy commitments:
              </p>
              <ul className="list-disc pl-5 text-muted-foreground space-y-1 mt-2">
                <li><strong>Lovable Cloud / Supabase:</strong> authentication, database, file storage.</li>
                <li><strong>Lovable AI Gateway (Google Gemini, OpenAI):</strong> AI meal photo analysis and Monika chat.</li>
                <li><strong>Firecrawl:</strong> public grocery price scraping (no personal data sent).</li>
                <li><strong>Sentry:</strong> anonymised crash reporting (PII fields are filtered before sending).</li>
              </ul>
            </section>

            <section>
              <h2 className="text-base font-semibold mt-4 mb-2">6. Data retention</h2>
              <p className="text-muted-foreground">
                Account and log data are retained for as long as your account is active, plus 365 days after deletion (for backups and dispute resolution).
                Anonymised aggregate data may be retained indefinitely for analytics.
              </p>
            </section>

            <section>
              <h2 className="text-base font-semibold mt-4 mb-2">7. Your rights (DPDP Act)</h2>
              <ul className="list-disc pl-5 text-muted-foreground space-y-1">
                <li><strong>Access:</strong> request a copy of your data via Profile → Export Data.</li>
                <li><strong>Correction:</strong> edit inaccurate data directly in Profile.</li>
                <li><strong>Erasure:</strong> delete your account from Profile → Account.</li>
                <li><strong>Portability:</strong> export your data in JSON / CSV format.</li>
                <li><strong>Withdraw consent</strong> for marketing or analytics at any time.</li>
                <li><strong>Grievance:</strong> contact our Grievance Officer (below) within 30 days for resolution.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-base font-semibold mt-4 mb-2">8. Security</h2>
              <p className="text-muted-foreground">
                We use TLS encryption in transit, row-level security on the database, and access auditing for sensitive fields.
                No system is 100% secure; please use a strong unique password.
              </p>
            </section>

            <section>
              <h2 className="text-base font-semibold mt-4 mb-2">9. Children</h2>
              <p className="text-muted-foreground">
                NutriLens is not intended for users under 18. We do not knowingly collect data from children.
              </p>
            </section>

            <section>
              <h2 className="text-base font-semibold mt-4 mb-2">10. Health disclaimer</h2>
              <p className="text-muted-foreground">
                NutriLens provides general wellness guidance, not medical advice. Always consult a qualified medical professional before making
                significant changes to your diet, exercise, or medication.
              </p>
            </section>

            <section>
              <h2 className="text-base font-semibold mt-4 mb-2">11. Grievance Officer</h2>
              <p className="text-muted-foreground">
                For any concerns or to exercise your rights, contact our Grievance Officer at:<br />
                <strong className="text-foreground">grievance@nutrilens.app</strong><br />
                We will acknowledge within 48 hours and resolve within 30 days.
              </p>
            </section>

            <section>
              <h2 className="text-base font-semibold mt-4 mb-2">12. Changes to this policy</h2>
              <p className="text-muted-foreground">
                We will notify you in-app of material changes. Continued use after changes constitutes acceptance.
              </p>
            </section>

            <p className="pt-4 text-xs text-muted-foreground">
              See also our <Link to="/terms" className="text-primary underline">Terms of Service</Link>.
            </p>
          </div>
        </article>
      </div>
    </div>
  );
}
