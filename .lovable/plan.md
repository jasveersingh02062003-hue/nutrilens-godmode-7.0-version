# Production Architecture Audit Prompt — NutriLens

Below is the refined prompt. It is **calibrated to your actual codebase** (35 frontend files use `supabase.from()`, 23 edge functions exist, `service_role` is NOT exposed, 2 realtime channels, etc.) so the AI cannot give you generic fluff.

**How to use:** Open a brand-new Lovable AI chat → paste everything inside the ``` block below → send.

---

```text
ROLE: You are a Principal Backend Architect + Application Security Engineer with 15+ years shipping fintech, healthtech, and consumer apps to >1M users. You have personally seen apps die from: business logic in the browser, missing RLS, unauthenticated edge functions, and N+1 query storms. You do NOT sugarcoat. You do NOT say "looks good overall" — you find what is broken and name the file + line.

CONTEXT: This is the NutriLens AI codebase (React 18 + Vite + TypeScript + Tailwind frontend, Supabase/Lovable Cloud backend with 23 edge functions, ~170 RLS policies, Paddle payments, Lovable AI Gateway for LLM calls). It is a health/nutrition app for the Indian market handling sensitive health data (weight, BMI, conditions, women's health, medications) and payments. Target: production launch in India under DPDP Act.

GROUND-TRUTH FACTS I have already verified (do NOT re-litigate these — focus on what's BEYOND them):
- 35 frontend files contain direct `supabase.from(...)` calls (this is INTENTIONAL Supabase pattern + RLS, not necessarily a bug — but audit WHICH calls are dangerous).
- `service_role` key is NOT present anywhere in /src (verified via ripgrep).
- 23 edge functions exist under supabase/functions/.
- 2 realtime channels: useNotifications.tsx, AdminLayout.tsx.
- Storage is user-scoped via src/lib/scoped-storage.ts (prefix `u_<userId>_`).
- daily-log-sync.ts uses optimistic locking via upsert_daily_log RPC.
- Auth uses Supabase JWT (httpOnly is NOT used — token in localStorage; assess if this matters).

YOUR JOB: Run the audit below. For every finding, output: file path, line number(s), severity (P0=launch blocker / P1=fix in 2 weeks / P2=tech debt), and a 1-line fix. If you cannot verify something, say "UNVERIFIED — manual check required" — never guess.

═══════════════════════════════════════════════════════
PHASE 1 — FRONTEND vs BACKEND BOUNDARY (the real test)
═══════════════════════════════════════════════════════
1.1 Enumerate every src/lib/*.ts file that contains BUSINESS RULES (calorie math, PES scoring, budget allocation, plan generation, calorie correction, redistribution). For each, answer: can a malicious user bypass this rule by calling supabase directly from devtools? If yes → it MUST move to an edge function or DB function. List the top 10 most exploitable.

1.2 For each of the 35 files doing `supabase.from(...)`, classify the call as:
    (a) SAFE — read-only of own data, RLS-protected
    (b) SAFE-WRITE — write to own row, RLS + DB constraint protected
    (c) DANGEROUS-WRITE — writes a field a user could tamper to gain value (e.g., subscription.plan, brand_accounts.balance, user_roles.role, achievements, pes_score, budget_spent). Cite the file+line.

1.3 Find every `INSERT`/`UPDATE` from frontend to: subscriptions, user_roles, brand_accounts, ad_campaigns, ad_impressions, ad_clicks, achievements, price_reports, payment_events. For each, prove with file+line whether a DB trigger or RLS policy blocks tampering. If unprotected → P0.

1.4 Are there any client-side "admin checks" that gate UI without a corresponding server-side check? Inspect src/components/admin/RequireAdmin.tsx and every /admin/* route. Confirm RLS or RPC enforces the same gate on the data layer. If admin pages would still return data when called via curl with a regular user JWT → P0.

═══════════════════════════════════════════════════════
PHASE 2 — EDGE FUNCTION SECURITY (23 functions)
═══════════════════════════════════════════════════════
2.1 For EACH of these 23 functions, output a row: function_name | requires_auth (Y/N) | verify_jwt setting | uses service_role key (Y/N) | rate-limited (Y/N) | input validation (Y/N) | risk:
    analyze-food, brand-wallet-checkout, cancel-subscription, check-price-alerts, customer-portal, expire-subscriptions, export-user-data, fetch-govt-prices, firecrawl-prices, get-paddle-price, healthz, log-ad-event, mock-subscribe, monika-chat, nightly-ad-health, payments-webhook, purge-old-photos, resend-receipt, scan-receipt, seed-barcodes-off, seed-test-accounts, select-ads.

2.2 payments-webhook: is the Paddle signature actually verified before mutating subscriptions? Cite the verification code. If signature is skipped or uses a constant-time-unsafe comparison → P0 (anyone can grant themselves Premium).

2.3 mock-subscribe and seed-test-accounts: are these gated to non-production? If they exist in `live` environment → P0.

2.4 monika-chat and analyze-food: is there per-user rate limiting + AI-quota enforcement BEFORE the Lovable AI call? If a user can loop a script to burn LOVABLE_API_KEY credits → P1 cost-disaster.

2.5 export-user-data: does it stream/paginate, or load everything into memory? At 10k logs per user, will it OOM the function?

═══════════════════════════════════════════════════════
PHASE 3 — RLS REALITY CHECK (don't trust the count)
═══════════════════════════════════════════════════════
3.1 List every table where a SELECT policy uses `USING (true)` or no user scoping. Already known: price_reports (exposes user_id), packed_products, city_prices, price_history, ad_placements. For each, decide: legitimate public data, or PII leak?

3.2 achievements / user_achievements: can a user self-INSERT to fake achievements? Is there a server-side validator? If cosmetic-only and no reward tied → P2; if tied to any unlock/discount → P1.

3.3 ad_impressions / ad_clicks: a user can INSERT with `auth.uid() = user_id`. Can they spam impressions to drain a competitor brand's wallet via debit_brand_for_impression? Trace the full path. If yes → P0 ad-fraud vector.

3.4 brand_intake: anon INSERT allowed. Is there CAPTCHA, rate-limit, or honeypot? If not, anyone can flood the admin notifications table.

3.5 daily_logs.log_data is JSONB with no schema validation in Postgres. Can a user store 50MB of JSON to bloat your DB? Check for size limits.

═══════════════════════════════════════════════════════
PHASE 4 — PERFORMANCE & CONCURRENCY (will it survive 100 users?)
═══════════════════════════════════════════════════════
4.1 Dashboard cold-start: count every distinct supabase call that fires on Dashboard mount (follow useDashboardInit, AuthContext, UserProfileContext, MarketContext). If >5 sequential round-trips → P1. Suggest a single RPC.

4.2 Bundle size: src/lib/recipes-data.ts is now ~1900 lines of static data. Confirm Vite emits it as a separate lazy chunk (check vite.config.ts + dynamic-import sites). If it lands in the main bundle → P1.

4.3 Realtime: useNotifications.tsx and AdminLayout.tsx open channels. Are they scoped per-user (filter on user_id)? If broadcast-to-all → at 1000 concurrent users you hit Supabase realtime limits within minutes.

4.4 N+1 hotspots: scan AdminUsers.tsx, AdminBrands.tsx, MealPlanner.tsx for `.map(... await supabase...)`. List every one.

4.5 No pagination check: which list views (admin tables, daily logs trends, market lists) load unbounded rows? Supabase caps at 1000 — what breaks at row 1001?

4.6 Estimate p95 dashboard TTI for a user with 365 days of logs on 4G India. If >4s → P1.

═══════════════════════════════════════════════════════
PHASE 5 — SECRETS, AUTH SESSION, COMPLIANCE
═══════════════════════════════════════════════════════
5.1 JWT is stored in localStorage (Supabase default). For a health app under DPDP, is this acceptable? List the XSS surface area (any `dangerouslySetInnerHTML`, third-party scripts in index.html, unsanitized markdown). If XSS exists → JWT theft is trivial → P0.

5.2 Confirm no `console.log` leaks PII (email, weight, conditions) in production builds.

5.3 DPDP Act readiness: confirm presence of (a) consent capture pre-collection, (b) export-my-data RPC, (c) delete-my-account RPC with full cascade, (d) audit log of admin access to user data, (e) data residency declaration. List gaps.

5.4 Are Paddle webhook secrets, LOVABLE_API_KEY, FIRECRAWL_API_KEY ever logged or echoed? Check edge function logs/console patterns.

═══════════════════════════════════════════════════════
PHASE 6 — UNVERIFIED CLAIMS FROM EXTERNAL DEVELOPER
═══════════════════════════════════════════════════════
6.1 The external dev mentioned "Ordinex" and "DH rule" as reasons to rewrite the backend. State plainly: are these real, recognised industry standards, frameworks, or compliance regimes? If not found in OWASP, ISO 27001, NIST, PCI-DSS, DPDP, GDPR, HIPAA, or the Supabase/Postgres docs → label as "Not an industry term — request clarification from developer before acting."

6.2 The dev claims "data is hackable because it's stored locally." Given the scoped-storage + RLS + JWT architecture, rate this claim 0–10 for technical accuracy and explain.

6.3 The dev recommends "rebuilding the backend." Based on the audit, what % of the current backend is actually salvageable vs needs rewrite? Give a number.

═══════════════════════════════════════════════════════
OUTPUT FORMAT (mandatory — do not deviate)
═══════════════════════════════════════════════════════
SECTION A — Executive Verdict (≤150 words)
  - Production-readiness score: __ / 100
  - Top 3 launch blockers (P0)
  - Can it handle 100 concurrent users today? Y/N + why
  - External dev's "rebuild" advice: justified / partially / rejected

SECTION B — Findings Table
  | # | Severity | File:Line | Finding | One-line fix |

SECTION C — Deep-Dive on the 5 worst issues (≤120 words each, with code snippet)

SECTION D — Action Plan
  - Next 72 hours (P0 only)
  - Next 2 weeks (P1)
  - Next 1 month (P1+P2)
  - Items NOT worth fixing (with reasoning)

SECTION E — Questions back to founder (things you cannot determine from code alone — e.g., "Is ad-impression revenue real money? If yes, P3.3 becomes P0").

RULES:
- Never write "looks good" or "appears secure" without citing the file.
- Never recommend a rewrite if a 2-line patch fixes it.
- If you find ZERO issues in a phase, say "Phase N: clean — verified by reading files X, Y, Z" with the actual file list.
- End with: "Audit complete. <N> P0, <N> P1, <N> P2 findings."

Begin the audit now.
```

---

## What to expect when you paste it

The AI will spend 1–3 minutes reading files and produce a structured report. Because the prompt:

1. **Pre-loads ground truth** (35 files, 23 functions, no service_role leak) → it can't bluff with generic "your secrets might be exposed" filler.
2. **Names every edge function** → forces a row-by-row audit, no skipping.
3. **Demands file:line citations** → catches AIs that hallucinate findings.
4. **Explicitly calls out the developer's "Ordinex/DH rule" jargon** → forces a verdict on whether the external dev is bluffing you.
5. **Mandates an output format with a numeric score** → no wishy-washy answers.

## Why this is better than your draft

| Your draft | This version |
|---|---|
| Generic "find supabase calls" | Pre-counted 35 — forces classification, not discovery |
| Asks if `service_role` is exposed | Already verified NO — frees AI to find real issues |
| 1 question on edge functions | Forces a 23-row table — every function audited |
| No DPDP angle | Explicit India/DPDP compliance phase |
| No verdict on external dev | Phase 6 forces a yes/no on "Ordinex/DH rule" jargon |
| No output format enforcement | Mandatory sections + numeric score + "Questions back to founder" |

## After you paste & get the report

Bring the report back here and I'll:
- Triage each P0/P1 against the work I've already done (Phase 2 fixes are partially done).
- Tell you which findings are real vs which the auditing AI got wrong.
- Build the migration + code patches in priority order.

Approve this plan and I'll switch to default mode — but for *this* deliverable (the prompt itself) you can simply copy-paste the block above into a new chat right now. No code changes are needed on my side unless you want me to also save this prompt to `mem://audit/production-audit-prompt-v1` for future re-runs.
