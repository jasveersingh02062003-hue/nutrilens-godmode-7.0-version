# 🚀 NutriLens — Launch Day Runbook

A printable, hour-by-hour checklist for shipping NutriLens to the public.
Print this out (or open on a second screen) and tick boxes as you go.

> **Owner:** \_\_\_\_\_\_\_\_\_\_\_\_  **Launch date:** \_\_\_\_\_\_\_\_\_\_\_\_  **Version tag:** \_\_\_\_\_\_\_\_\_\_\_\_

---

## 📅 T-7 days — One week before launch

Everything below should be **done and verified** seven days out. If anything
is still red on T-3, push the launch.

### Payments (real revenue)
- [ ] Paddle account fully verified (business docs uploaded, approved)
- [ ] Paddle live mode enabled in dashboard
- [ ] Live `VITE_PADDLE_*` env vars set in production
- [ ] Webhook endpoint `payments-webhook` re-pointed to live signing secret
- [ ] Test mode banner (`PaymentTestModeBanner`) hides automatically when env=live

### Email & legal mailboxes
- [ ] Email domain (e.g. `notify.nutrilens.app`) DNS verified
- [ ] `support@nutrilens.app` mailbox active and forwarding to founder
- [ ] `grievance@nutrilens.app` mailbox active (DPDP requirement)
- [ ] Welcome / password reset emails sent from branded domain
- [ ] Dunning email templates (payment failed / recovered) shipped

### Monitoring
- [ ] Sentry alert rules active (see `docs/external-monitoring-setup.md`)
- [ ] Sentry Slack/email destination tested (trigger a fake error)
- [ ] UptimeRobot pinging `/healthz` every 5 min, alert channel verified
- [ ] At least one backup-restore drill completed (`docs/backup-drill-quickstart.md`)
- [ ] Lovable Cloud `cloud_status` shows `ACTIVE_HEALTHY`

### Mobile (only if shipping native app)
- [ ] App Store listing submitted, in review
- [ ] Play Store listing submitted, in review
- [ ] Screenshots uploaded (5 per orientation, both stores)
- [ ] Privacy nutrition labels filled in (Apple)
- [ ] Data Safety form filled in (Google)

### Content
- [ ] Privacy Policy "last updated" date matches launch date
- [ ] Terms of Service "last updated" date matches launch date
- [ ] All disclaimer modals (Doctor / Plan / Medical) trigger correctly

---

## 📅 T-1 day — Final dress rehearsal

### Smoke tests
- [ ] Sign up with a brand-new email → onboarding completes
- [ ] Log a meal via camera → analyze-food returns valid macros
- [ ] Log a meal via QuickLog (text) → parses correctly
- [ ] Subscribe via Paddle **sandbox** with test card → webhook fires → plan upgrades
- [ ] Cancel subscription → status flips to `cancelled`, banner shows
- [ ] Open `/dashboard` after refresh → no console errors, no Sentry events

### Performance
- [ ] Lighthouse Performance ≥ 80 on mobile (run on `/`)
- [ ] Lighthouse Accessibility ≥ 90
- [ ] Lighthouse SEO ≥ 90
- [ ] First Contentful Paint < 2s on simulated 4G

### Sharing & SEO
- [ ] `og:image` renders on twitter.com share preview
- [ ] `og:image` renders on WhatsApp link preview
- [ ] `og:title` and `og:description` are set in `index.html`
- [ ] `robots.txt` allows indexing of public pages
- [ ] Canonical URL set on landing page

### Deployment
- [ ] Lovable deployment is on production branch
- [ ] No "Test mode" banners visible in production preview
- [ ] All `VITE_*` env vars match production values
- [ ] Service worker (PWA) registers without errors

---

## 🎯 T-0 — Launch day, hour by hour

| Time | Action | Owner | ✅ |
|---|---|---|---|
| 09:00 | Final smoke test (signup + log + subscribe with test card) | | |
| 09:30 | Verify Sentry, UptimeRobot, Cloud all green | | |
| 10:00 | Switch Paddle to live mode (flip env var, redeploy) | | |
| 10:15 | Run **₹1 real-card smoke test** end-to-end | | |
| 10:30 | Announcement post: Twitter / X | | |
| 10:35 | Announcement post: LinkedIn | | |
| 10:40 | Announcement post: WhatsApp groups & broadcasts | | |
| 11:00 | Watch Sentry live for first 100 user sessions | | |
| 12:00 | Check first signup → activation conversion in funnel | | |
| 14:00 | Check payment success rate (target: ≥ 95%) | | |
| 16:00 | Respond to support@ inbox (zero-inbox by EOD) | | |
| 18:00 | Day-1 metrics review: signups / activations / churn / revenue | | |
| 22:00 | Final Sentry sweep, schedule day-2 priorities | | |

---

## 🚨 Emergency rollback procedure

If anything goes critically wrong (data loss, payment storm, mass crashes):

1. **Stop the bleed.** In Lovable, open **Version History** and revert to
   the last known-good deployment. This takes ~30 seconds.
2. **Disable payments.** Flip `VITE_PADDLE_ENVIRONMENT` to `sandbox` and
   redeploy. Existing subscribers keep access; new sign-ups go to test mode.
3. **Communicate.** Post to status channel (Twitter/WhatsApp groups):
   *"We're investigating an issue with sign-ups / payments. Updates in 30min."*
4. **Triage.** Pull the last 30 min of Sentry events + edge function logs.
5. **Escalate if needed:**
   - Paddle support: <https://www.paddle.com/support>
   - Lovable support: in-app chat
   - Supabase status: <https://status.supabase.com>

---

## 📊 First-week monitoring (daily 18:00 review)

| Metric | Healthy | Warning | Action |
|---|---|---|---|
| DAU / signups | growing | flat 2 days | review funnel drop-off |
| Activation rate (signup → first meal logged) | ≥ 60% | < 50% | onboarding tutorial issue |
| Payment success rate | ≥ 95% | < 90% | check Paddle dashboard for declines |
| JS error rate (Sentry) | < 1% sessions | ≥ 5% | hotfix top error |
| Checkout abandonment | < 30% | > 50% | check paywall load time |
| `/healthz` uptime | 100% | < 99% | edge function or DB issue |
| Cloud DB CPU | < 60% | > 80% | check `read_query` for hotspots |

**Red flags that warrant a same-day hotfix:**
- 🔴 Crash-free sessions < 95%
- 🔴 Any data-loss bug report
- 🔴 Payment captured but plan not activated (revenue + trust risk)
- 🔴 Auth flow broken for any provider
- 🔴 Disclaimer modals not showing (legal risk)

---

## 📝 Post-launch retrospective (T+7)

Capture these so launch #2 (mobile, expansion, etc.) is smoother:

- What broke that we didn't expect?
- What signal would have warned us earlier?
- Which monitoring rule needs tightening?
- Top 3 user complaints in week 1 → product backlog
- Refund rate vs. forecast → adjust trial logic if needed

---

*Last updated: keep this doc in sync with every infra / payments change.*
