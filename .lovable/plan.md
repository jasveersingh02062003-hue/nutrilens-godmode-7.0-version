

# Production Readiness Audit — What's Left

Based on a fresh scan of your codebase against the original `.lovable/plan.md`, here's everything that still needs to happen before you can call this **production-grade**.

---

## 🔴 P0 — Blockers (revenue, legal, data risk)

| # | Item | Why it matters | Effort |
|---|---|---|---|
| **P0-3** | **Paddle live-mode go-live** — sandbox works, live mode never activated | No real money can be collected | 4h (mostly Paddle approval wait) |
| **P0-4** | **"Consult a doctor" modal at point-of-use** for PCOS / Blood Report / 1200kcal plans | Currently only in `Progress.tsx`; missing on plan-start flows. App-store + DPDP risk | 2h |
| **P0-5** | **Paddle end-to-end smoke test** with real test card | Revenue path is unverified — could silently fail on launch day | 1h |

---

## 🟠 P1 — High-impact gaps (UX, retention, legal)

| # | Item | What's missing | Effort |
|---|---|---|---|
| **P1-2** | **Push notifications via FCM** | `notifications.ts` still uses Browser Notification API only. **No FCM, no `device_tokens` table, no `send-push` edge fn.** iOS users get nothing | 8h |
| **P1-5** | **Mailboxes**: `support@` and `grievance@nutrilens.app` | Privacy/Terms/404 reference them but DNS/mailbox not provisioned. Legal exposure under DPDP | 2h (your DNS work) |
| **P1-7** | **CORS lockdown verification** — `_shared/cors.ts` exists but not every edge fn imports it | A grep showed only ~2 files use the helper. The rest may still default to `*` | 1h audit |
| **P1-3** | **Funnel events end-to-end** — `signup`, `first_meal`, `subscribe_started/succeeded/failed`, `churn_cancel` | Only ~5 fire sites verified. Missing `subscribe_failed`, `onboarding_step_exit`, `day2_return` | 4h |
| **P1-4** | **Activation event** — *"logged 3 meals on day 1"* | `funnel.ts` has the helper, but the activation rule itself is undefined/unfired | 1h |

---

## 🟡 P2 — Medium (perf, ops, safety net)

| # | Item | Status | Effort |
|---|---|---|---|
| **P2-6** | **Sentry alert rules** (email on new issue / spike) | Code wired ✅, dashboard rules ❌ | 5min (you, in Sentry UI) |
| **P2-7** | **UptimeRobot** on `/healthz` | Endpoint ready ✅, monitor not signed up ❌ | 10min (you) |
| **P2-8** | **Backup restore drill** — actually run it once | Doc + quickstart written ✅, never executed | 2h one-time |
| **P2-9** | **Staging environment** | Recommended **defer until 500+ users** | skip |
| **P2-11** | **Failed-renewal dunning emails** | Webhook + banner + DB ✅. **Email templates skipped — no email domain yet** | 1h once domain is set up |
| **P2-2** | **Photo-purge cron schedule** | Migration created ✅. Verify it actually ran in `cron.job` | 5min check |

---

## 🟣 P3 — Nice to have (defer post-launch)

| # | Item | Note |
|---|---|---|
| P3-1 | Referral / WhatsApp share loop | Growth lever, post-launch |
| P3-2 | Store-review prompt after 3-day streak | Standard ASO |
| P3-3 | Feature flags table | Useful at scale, not now |
| P3-4 | Trademark "NutriLens" filing in India | Founder/legal task |
| P3-5 | Cyber-insurance quote | Founder task |
| P3-6 | **Capacitor App Store + Play Store builds** | Mobile shell exists, never published. Includes signing certs, screenshots, store listings |

---

## 🆕 Newly discovered gaps (not in original plan)

| # | Item | Why it matters |
|---|---|---|
| **N-1** | **Email domain not configured** — blocks dunning emails (P2-11), order receipts, password-reset branding | When you're ready, takes ~15 min |
| **N-2** | **`og:image` still points to lovable.dev** (`index.html:35,42`) | Social shares look unbranded — quick fix |
| **N-3** | **Bundle size audit** — verify Vite build output, check for accidental large imports (lucide tree-shaking, recharts) | Lighthouse confidence before launch |
| **N-4** | **Privacy/Terms "last updated" date** — needs to reflect actual launch date, not draft date | DPDP requirement |
| **N-5** | **App-store screenshots + listing copy** for Play Store/App Store | Required even for closed beta TestFlight |
| **N-6** | **Healthz endpoint auth** — confirm it returns useful info but doesn't leak DB version/env | 10min review |

---

## 🎯 Recommended Execution Order

**Pre-launch must-do (~12 hours of code work):**
1. P0-4 — Doctor modal at plan-start points (2h)
2. P0-5 — Run Paddle smoke test (1h)
3. P0-3 — Paddle go-live (waiting on Paddle, start now)
4. P1-7 — CORS audit across all edge functions (1h)
5. P1-3 + P1-4 — Funnel + activation events (5h)
6. N-2, N-4, N-6 — quick metadata fixes (30min)
7. P2-2 verify cron actually scheduled (5min)

**You do externally (~30 min):**
- P2-6 Sentry alert rules
- P2-7 UptimeRobot signup
- P1-5 DNS for support@/grievance@

**One-time drill (~2h):**
- P2-8 Backup restore test

**Defer until traction (post-100 paying users):**
- P1-2 FCM push (8h — big lift, do when retention matters more)
- P2-11 Dunning emails (needs domain first)
- P3-6 App Store / Play Store publish

**Skip until 500+ users:**
- P2-9 Staging env

---

## 📊 Honest Status

- **Closed-beta ready: ~85%** (was 72% in original plan — significant progress)
- **Public-launch ready: ~70%**
- **Biggest remaining risks:**
  1. Paddle live mode never tested with real money (P0-3, P0-5)
  2. iOS users get zero push reminders → day-2 retention will collapse (P1-2)
  3. CORS may still be `*` on some edge functions (P1-7)
  4. Doctor disclaimer missing at plan-entry points (P0-4 — app-store rejection risk)

---

## Reply Options

- **"do P0 bundle"** — knock out P0-4, P0-5, plus N-2/N-4/N-6 quick wins (~4h)
- **"do P1-7 CORS audit"** — lock down all edge functions to prod domain
- **"do P1-3 funnel events"** — wire up the full funnel + activation
- **"start P1-2 push"** — begin the FCM build (big task, ~8h)
- **"just give me the launch-day checklist"** — I'll generate a printable runbook
- **"set up email domain"** — unblocks P2-11 dunning emails

