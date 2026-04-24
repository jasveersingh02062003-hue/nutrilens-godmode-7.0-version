
# Comprehensive QA Testing Prompt for NutriLens

This is a **ready-to-paste prompt** you give to Lovable AI (or any QA tester) to systematically test every persona in your app. It also includes the **real user journey** for each role with examples from how Instagram, Meta Ads, Cred, and Zomato handle similar flows.

---

## How to Use This

1. Copy the **MASTER PROMPT** below into a new Lovable AI chat.
2. The AI will simulate each persona end-to-end and report broken flows.
3. Fix what it finds, then re-run.

---

## 🎯 MASTER PROMPT — Copy Everything Below This Line

```
You are a Senior QA Engineer auditing NutriLens — a 3-tenant app (Consumer + 
Admin + Brand) with role-based access control. Your job: simulate every user 
persona end-to-end, find broken journeys, missing gates, and UX gaps before 
production launch.

═══════════════════════════════════════════════════════════════
CONTEXT — APP ARCHITECTURE
═══════════════════════════════════════════════════════════════

ONE codebase, THREE apps gated by role:

1. CONSUMER APP (mobile-first)
   - Routes: /, /dashboard, /log, /progress, /profile, /market, /plans
   - Gate: ProtectedRoute (just needs auth)
   - Tiers: Free, Pro (₹299/mo), Pro+ (₹499/mo), Ultra (event plans)
   - Special states: Minor (<18, blocked from food logic), Major (18+)

2. ADMIN PANEL (desktop, /admin/*)
   - Gate: RequireAdmin → checks user_roles table
   - Roles in DB enum app_role: 'owner', 'super_admin', 'admin', 
     'marketer', 'support', 'brand_manager'
   - Layout: sidebar with conditional nav based on role

3. BRAND PORTAL (desktop, /brand/*)
   - Gate: RequireBrand → checks brand_members table OR admin override
   - Roles per brand: owner, admin, member (in brand_members.role)
   - Public entry: /advertise (sign-up funnel)

═══════════════════════════════════════════════════════════════
PERSONAS TO TEST (13 total)
═══════════════════════════════════════════════════════════════

▓▓▓ CONSUMER TIER (5 personas) ▓▓▓

[C1] FREE USER — "Priya, 26, Bengaluru, ₹0/mo"
   Real-world: Like a Spotify free user — sees ads, basic features only.
   Journey: 
     1. Lands on /  → sees marketing landing
     2. Clicks "Get Started" → /auth → email signup
     3. Onboarding (12 steps): age, weight, goal, activity, dietary prefs
     4. Lands on /dashboard → sees calorie ring, today's meals
     5. Tries to log food via camera → BLOCKED with upgrade modal
     6. Logs food manually → succeeds (3 logs/day cap)
     7. Sees ad in dashboard between cards
     8. Clicks "Upgrade" → /paywall
   Test: Camera gate works? Manual log uncapped? Ads visible?

[C2] PRO USER — "Rahul, 32, Mumbai, ₹299/mo"
   Real-world: Like Spotify Premium — no ads, AI features unlocked.
   Journey:
     1. Same signup as Free → completes onboarding
     2. /paywall → selects Pro → Paddle checkout (sandbox card 4242...)
     3. payments-webhook fires → subscription_status='pro'
     4. Returns to /dashboard → ads HIDDEN, AI camera UNLOCKED
     5. Camera scans biryani → analyze-food edge function returns macros
     6. Logs unlimited meals
     7. Sees /progress with weekly trends
   Test: Webhook actually upgrades user? Ads removed instantly? 
   Camera quota = unlimited?

[C3] PRO+ ULTRA USER — "Anjali, 29, Delhi, ₹499/mo"
   Real-world: Like Notion Plus — power features (live grocery prices, 
   meal planner with budget optimization).
   Journey:
     1. Pro user upgrades to Pro+ via /paywall
     2. Unlocks /market with live Firecrawl prices
     3. Creates meal plan with ₹3000/week budget
     4. Plan generator runs constraint optimizer
     5. Gets shopping list with live prices from Zepto/BB
   Test: Firecrawl actually fires? Budget engine respects limit?

[C4] EVENT PLAN USER — "Karan, 35, paying ₹1,499 for 21-Day Wedding Sprint"
   Real-world: Like Cult.fit event-based programs — time-bound transformation.
   Journey:
     1. Pro user clicks "Special Plans" → sees Madhavan Reset, 
        Sugar Cut, Wedding Sprint
     2. Pays one-time ₹1,499 via Paddle
     3. /onboarding-event → enters wedding date, current weight, target
     4. Plan engine calculates required deficit (7700 kcal/kg rule)
     5. Daily dashboard shows boosters checklist + chewing timer
     6. Day 21 → PostEventFeedbackModal → reverse dieting protocol
   Test: One-time payment processed? Boosters show? Reverse diet auto-starts?

[C5] MINOR USER — "Aarav, 16, signed up by accident"
   Real-world: Like Instagram blocking under-13 — legal compliance.
   Journey:
     1. Signs up → onboarding asks DOB
     2. System detects age <18 → MinorBlockedScreen
     3. Cannot proceed to dashboard
     4. Shown MinorConsentNotice (parental consent flow if 13-17)
   Test: Hard block works? Cannot bypass via DOB edit later?

▓▓▓ ADMIN TIER (5 personas) ▓▓▓

[A1] OWNER — "You, the founder"
   Real-world: Like Meta Business Manager owner — sees everything, 
   can grant/revoke any role.
   Permissions: ALL routes, including /admin/staff (assign roles), 
   /admin/audit (security logs)
   Journey:
     1. /auth login → /admin auto-redirect (or manual nav)
     2. Sees Overview with revenue, DAU, active subs, ad spend
     3. /admin/staff → adds new admin by email
     4. /admin/audit → reviews who deleted what
     5. /admin/costs → sees AI API spend (Lovable AI tokens, Firecrawl)
   Test: Owner-only nav items visible? Staff assignment writes to 
   user_roles?

[A2] SUPER ADMIN — "CTO / Head of Ops"
   Permissions: Everything except changing owner role
   Journey: Same as Owner but cannot demote owner
   Test: /admin/audit visible? Cannot edit owner's role?

[A3] ADMIN — "Operations Manager"
   Real-world: Like a YouTube content moderator with most powers.
   Permissions: Users, Revenue, Subscriptions, Costs, Ads, Brands, 
   Plans, Feedback, Scraping, Ops
   Cannot see: Staff & Roles (owner-only), Audit (super-only)
   Journey:
     1. /admin/users → searches "priya@" → opens user detail
     2. Issues refund (calls Paddle API via cancel-subscription edge fn)
     3. /admin/feedback → triages user complaints
     4. /admin/scraping → checks Firecrawl health (errors today)
   Test: Cannot access /admin/staff (should redirect)? Refund actually 
   processes via Paddle?

[A4] MARKETER — "Growth lead"
   Real-world: Like a Meta Ads campaign manager — sees ads + funnel only.
   Permissions: Users (view-only), Retention, Funnel, Ads, Brands
   Cannot see: Revenue, Subscriptions, Costs, Audit, Staff
   Journey:
     1. /admin/funnel → views signup → onboarding → first meal log → 
        first paid conversion
     2. /admin/retention → sees D1/D7/D30 cohort retention
     3. /admin/ads → reviews pending brand ads waiting approval
     4. APPROVES an ad campaign (changes status draft→active)
     5. /admin/brands → reviews brand intake applications
   Test: Cannot see revenue ₹ figures? Can approve ads?

[A5] SUPPORT — "Customer service rep"
   Real-world: Like Zomato support — read-only on users, can resolve tickets.
   Permissions: Users (view-only), Feedback (full)
   Cannot see: Revenue, Ads, Brands, Costs, Staff, Audit
   Journey:
     1. /admin/users → finds user by email
     2. Views their last 7 days of meals (debugging "app shows wrong calories")
     3. /admin/feedback → marks ticket as resolved with reply
   Test: Cannot delete users? Cannot issue refunds? Limited nav?

▓▓▓ BRAND TIER (3 personas) ▓▓▓

[B1] BRAND APPLICANT — "MuscleBlaze marketing manager, no account yet"
   Real-world: Like signing up for Meta Ads Manager for the first time.
   Journey:
     1. Lands on /advertise → marketing page
     2. Clicks "Apply to advertise" → fills form (company name, GSTIN, 
        contact email, products)
     3. Submitted → status='pending' in brand_accounts table
     4. Receives email: "We'll review in 48h"
     5. Admin approves → brand_members row created → email sent with 
        login link
     6. First login → onboarding → wallet top-up → first campaign
   Test: Application form validates GSTIN? Pending state visible to 
   admin? Approval triggers email?

[B2] BRAND OWNER — "Approved MuscleBlaze account, full powers"
   Real-world: Like Instagram business account owner.
   Journey:
     1. /auth → redirected to /brand (because brand_members exists)
     2. /brand/dashboard → sees impressions, clicks, CTR, spend
     3. /brand/billing → tops up ₹10,000 wallet (Paddle one-time)
     4. /brand/campaigns/new → creates campaign:
        - Product: MB Whey Protein
        - Budget: ₹500/day
        - Target: Pro users, age 25-40, gym-goers
     5. Submits → status='pending_review' (NEW: must be added)
     6. Admin reviews in /admin/ads → approves → status='active'
     7. Brand notified → ad goes live
     8. select-ads edge function serves ad to matching consumers
     9. log-ad-event fires impression/click → wallet debited
   Test: Wallet actually debits? Cannot launch campaign with ₹0 balance?
   Approval flow blocks unauthorized launches?

[B3] BRAND MEMBER — "Junior marketer at MuscleBlaze, limited powers"
   Real-world: Like an Instagram business team member without billing access.
   Permissions: View campaigns, edit creative, BUT cannot top up wallet 
   or launch new campaigns (owner approval needed)
   Journey:
     1. /brand → sees same dashboard as owner
     2. Tries /brand/billing → BLOCKED (owner-only)
     3. Edits campaign creative copy → saves as draft
     4. Owner reviews and submits for admin approval
   Test: Granular permissions enforced within brand?

═══════════════════════════════════════════════════════════════
TESTING METHODOLOGY
═══════════════════════════════════════════════════════════════

For EACH of the 13 personas above:

STEP 1 — VERIFY GATE
  - Read the relevant gate file (ProtectedRoute, RequireAdmin, RequireBrand)
  - Confirm role check is correct
  - Confirm fallback redirect is sensible

STEP 2 — VERIFY NAV VISIBILITY
  - Read AdminLayout.tsx / BottomNav.tsx
  - Check role-based filtering for nav items
  - Note: Should marketer see "Revenue"? NO. Confirm hidden.

STEP 3 — VERIFY DATA ACCESS (RLS)
  - Pick 1 sensitive table for each persona (e.g., subscriptions for 
    support, brand_wallet for brand member)
  - Read the RLS policy in supabase/migrations
  - Confirm SELECT/UPDATE/DELETE policies match expected permissions

STEP 4 — VERIFY HAPPY PATH UI
  - Trace the journey through actual component files
  - Find broken buttons, missing modals, dead routes

STEP 5 — VERIFY EDGE CASES
  - What if Pro user's payment fails mid-month?
  - What if brand wallet hits ₹0 mid-campaign?
  - What if admin tries to delete the only owner?
  - What if minor edits DOB to claim 18+?

═══════════════════════════════════════════════════════════════
SPECIFIC FEATURES TO AUDIT (priority gaps)
═══════════════════════════════════════════════════════════════

🚨 BRAND CAMPAIGN APPROVAL FLOW (Instagram/Meta Ads style)
   Current state: Brands can set status='active' directly with no 
   admin gate. This is INSECURE and a malicious brand could push 
   spam/scam ads.
   
   Required flow (verify each step exists):
   
   Brand creates campaign
        ↓
   Status: 'draft'
        ↓
   Brand clicks "Submit for Review"
        ↓
   Status: 'pending_review'  ← currently MISSING
        ↓
   Admin notification created (in-app + email)  ← currently MISSING
        ↓
   Admin opens /admin/ads → sees pending queue
        ↓
   Admin clicks Approve OR Reject (with reason)
        ↓
   Status: 'active' OR 'rejected'
        ↓
   Brand notified of decision  ← currently MISSING
        ↓
   If active → select-ads edge function picks it up
        ↓
   If rejected → brand sees reason, can edit + resubmit
   
   Files to read:
   - src/pages/brand/BrandNewCampaign.tsx (submission)
   - src/pages/admin/AdminAds.tsx (approval queue)
   - supabase/migrations/*ads* (status enum)
   - supabase/functions/select-ads/index.ts (does it filter by 
     status='active' AND admin_approved=true?)

🚨 NOTIFICATION SYSTEM
   Required for: brand approval, low wallet, campaign rejection, 
   subscription failures, admin alerts
   Current state: Likely missing dedicated notifications table.
   Check: Does a notifications table exist? Is there a UI bell icon?

🚨 ROLE ESCALATION ATTACKS
   Verify NONE of these work:
   - Consumer user adds row to user_roles via client SDK (RLS should block)
   - Brand member modifies brand_members.role to 'owner' (RLS should block)
   - Admin demotes owner (DB function should block)
   - Minor changes DOB after onboarding (should require admin approval 
     OR be locked)

═══════════════════════════════════════════════════════════════
OUTPUT FORMAT
═══════════════════════════════════════════════════════════════

For each persona, report:

### [Persona ID] [Persona Name]
**Gate verification:** ✅ Pass / ❌ Fail (file:line)
**Nav filtering:** ✅ Pass / ❌ Fail (which items leak)
**RLS:** ✅ Pass / ❌ Fail (which table, which policy)
**Happy path:** ✅ Works / ⚠️ Partial / ❌ Broken (specific step)
**Edge cases:** [list any failures]
**Severity:** P0 (blocks launch) / P1 (fix before scale) / P2 (polish)

End with:
- Total personas: 13
- Passed: X
- Failed: Y  
- P0 blockers: [list]
- Recommended fix order
```

---

## 📋 What Happens After You Use This Prompt

Once you paste this into a fresh Lovable AI chat, the AI will:

1. Read every gate file (`RequireAdmin`, `RequireBrand`, `ProtectedRoute`)
2. Check every nav filter
3. Audit every RLS policy on sensitive tables
4. Trace each user journey through actual components
5. Return a **per-persona report card** showing exactly what's broken

Expected runtime: ~15 minutes of AI work, ~10 minutes for you to read.

---

## 🎁 Bonus: What This Prompt Will Find (my prediction)

Based on what I've already seen in your codebase:

| Likely finding | Severity |
|---|---|
| Brand campaign approval gate missing | P0 |
| No notifications table for approval flow | P0 |
| Marketer can probably see revenue numbers | P1 |
| Support role might be able to issue refunds | P1 |
| Minor DOB-edit-bypass not locked | P1 |
| Brand member granular permissions not enforced | P2 |
| No "pending" state for new brand applicants | P2 |

---

## Next Step Recommendation

After you run this audit prompt, the most logical follow-up is:

**"build approval flow"** — Add the missing Instagram-style brand campaign approval workflow (the #1 P0 finding). I have it scoped at ~3 hours of work.

Reply **"approved"** to use this prompt as-is, or tell me what to add/remove.

