

# Phase 2 Audit + Sequenced Implementation Plan

## Honest audit of your 5 Phase 2 tasks

I went through `firecrawl-prices/index.ts`, `fetch-govt-prices/index.ts`, `check-price-alerts/index.ts`, `live-price-service.ts`, `MarketItemDetailSheet.tsx`, `Market.tsx`, the database, and cron jobs. Here's the truth:

| # | Task | Senior dev says | Reality in your code/DB | Recommendation |
|---|------|----------------|-------------------------|----------------|
| 2.1 | Govt API integration | "Wire it up" | **DEFER.** `fetch-govt-prices` is fully scaffolded with retail markups, mandi→city map, upsert logic. Only the API call is stubbed (`GOVT_API_HOOK`). You said you don't have the data.gov.in key yet. **0 work possible without the key.** | **SKIP this round.** I'll leave a one-line note in the function header. Re-open when you have the key. |
| 2.2 | Add Zepto / Instamart / JioMart | "Extend search" | **TRUE but RISKY.** Current `searchQuery` only targets bigbasket/blinkit/freshtohome (line 82). Adding 3 more domains = same 1 Firecrawl credit per call. **No cost increase.** Real risk: regex might match wrong prices from cluttered results. | **DO IT** with safeguards: add domains + a price-sanity filter (per-item min/max bounds). |
| 2.3 | Price freshness badge | "Build the component" | **ALREADY BUILT** (`PriceFreshnessBadge.tsx`, 54 lines, Live/h ago/Stale/Estimate states). But it's only used in **ONE place** (`MarketItemDetailSheet.tsx` line 130). The Market list cards, Compare bar, and grocery rows show no freshness signal. | **DO IT but smaller** — wire existing component into 3 more surfaces. No new component needed. Saves you ~2 credits. |
| 2.4 | Scraping health dashboard for admin | "Add to /admin/ads" | **TRUE.** No visibility today. You have 400 firecrawl rows in `city_prices` with timestamps — easy to derive "last scrape per city" + freshness. Circuit breaker state is in-memory only (resets per cold start), so I'll show the **derived** health, not the runtime breaker. | **DO IT** as a new collapsible section at top of `/admin/ads`. |
| 2.5 | In-app price alert notifications | "Store + bell icon" | **TRUE.** `check-price-alerts` runs hourly and only updates `last_triggered_at` — no notification surface. Need a new table + bell UI on Market header. | **DO IT** — small table, edge function update, header bell with unread count. |

**Net result:** Of 5 tasks → **4 worth doing this round**, **1 deferred** (2.1, blocked on API key). Saves ~6 credits.

---

## Strict execution order (one at a time, verified after each)

### **Step A — Task 2.5: Price-alert notifications + bell icon** (60 min, ~5 credits) ★ start here
**Why first:** Highest user-visible value. The hourly cron is firing into the void today.

1. **DB migration:** new table `price_alert_notifications`
   - columns: `id uuid pk`, `user_id uuid`, `alert_id uuid`, `item_name text`, `city text`, `current_price numeric`, `threshold_price numeric`, `direction text`, `is_read boolean default false`, `created_at timestamptz default now()`
   - RLS: users SELECT/UPDATE/DELETE only their own; INSERT allowed for service role (edge function)
   - Index: `(user_id, is_read, created_at desc)`
2. **Update `check-price-alerts/index.ts`:** when threshold met, INSERT a notification row (in addition to setting `last_triggered_at`).
3. **New component `src/components/PriceAlertBell.tsx`:**
   - Polls `price_alert_notifications` for `is_read=false` count
   - Bell icon with red dot + count badge
   - Click → opens a Sheet listing recent notifications with "Mark all read" + per-item tap to open Market detail
4. **Mount in `MarketPageHeader.tsx`** next to the city/search icons.
5. **Realtime:** subscribe to `postgres_changes` on the table for the user — instant bell update.
6. **Verify:** Manually insert a test notification via SQL → confirm bell badge updates live → click → mark read → bell clears.

### **Step B — Task 2.4: Admin scraping health panel** (45 min, ~4 credits)
1. **In `AdAdmin.tsx`** add a collapsible card "Scraping Health" above campaigns.
2. **Query:** `SELECT city, MAX(updated_at) latest, COUNT(*) FILTER (WHERE updated_at::date = CURRENT_DATE) today_count FROM city_prices WHERE source='firecrawl' GROUP BY city`
3. **Render:** table with city · last scrape · #items today · status pill (green if <24h, amber <72h, red older)
4. **Add a "Run scrape now" button** that calls `firecrawl-prices` with `{ scrapeAll: true }` — already supported by the function.
5. **Verify:** Open `/admin/ads` → confirm 10 cities listed with timestamps from your 400 firecrawl rows → click "Run scrape now" → confirm toast + row updates.

### **Step C — Task 2.3: Wire freshness badge into 3 more surfaces** (20 min, ~2 credits)
1. `src/components/MarketItemCard.tsx` — add `<PriceFreshnessBadge compact lastUpdated={item.lastUpdated} />` next to price.
2. `src/components/MarketCompareBar.tsx` — same compact badge per row.
3. `src/components/MarketCompactView.tsx` — same.
4. **Verify:** Market grid shows "Live"/"3h ago"/"Est." chip on every card. No layout break on small screens.

### **Step D — Task 2.2: Extend Firecrawl to Zepto + Instamart** (30 min, ~3 credits)
1. **In `firecrawl-prices/index.ts` line 82**, change query to include `site:zeptonow.com OR site:swiggy.com/instamart OR site:jiomart.com`.
2. **Bump `limit: 5` → `limit: 8`** to give more results to regex against (still 1 search credit).
3. **Add per-item sanity bounds** (line ~117) to reject obvious garbage: chicken ₹100–800/kg, eggs ₹4–15/piece, etc. Map kept inline.
4. **Deploy + manual test:** call function with `{ city: 'mumbai' }` via test tool → confirm prices land for at least 5 of 10 items → check `city_prices` for fresh rows.

### **Step E — Task 2.1: Govt API** ⏭️ **SKIPPED**
Leave `fetch-govt-prices` untouched. When you get the data.gov.in key, paste it as `GOVT_DATA_API_KEY` secret and ping me — that's a separate ~2 hr job replacing the `GOVT_API_HOOK` stub with real `fetch()`.

### **Step F — Manual QA pass** (15 min, 0 credits)
After A–D ship I will:
1. Open `/market` → confirm freshness chips on cards
2. Click an item → confirm freshness in detail sheet (already works)
3. Open admin `/admin/ads` → confirm health panel shows 10 cities + click "Run scrape now"
4. Insert a test notification via SQL → confirm bell badge appears on Market header within 2s (realtime)
5. Click bell → confirm sheet lists it → mark read → confirm badge clears
6. Call `firecrawl-prices` for one new city → confirm Zepto/Instamart hits land in `city_prices`

I'll report each step ✅ or ❌ with screenshots.

---

## Tasks I'm explicitly NOT doing (and why)

| Skipped | Reason |
|---------|--------|
| Real `data.gov.in` integration | No API key. Code scaffold already in place. 0 work possible. |
| Push notifications for alerts | Out of scope. Senior dev's own task list said "in-app toast, not push" — bell + sheet covers it. |
| Building a new `PriceFreshnessBadge` component | Already exists. Reusing saves credits. |
| Storing circuit-breaker state in DB | In-memory state is fine for 1 edge function instance. Cross-instance sync is a 2-day refactor for marginal value. |
| Caching layer for notifications poll | Realtime subscription handles freshness; polling is a fallback only. |

---

## Technical details

**Files created**
- `src/components/PriceAlertBell.tsx`
- `src/components/PriceAlertNotificationsSheet.tsx`

**Files modified**
- `supabase/functions/check-price-alerts/index.ts` (insert notification row)
- `supabase/functions/firecrawl-prices/index.ts` (query + sanity bounds)
- `src/components/MarketPageHeader.tsx` (mount bell)
- `src/components/MarketItemCard.tsx` (freshness chip)
- `src/components/MarketCompareBar.tsx` (freshness chip)
- `src/components/MarketCompactView.tsx` (freshness chip)
- `src/pages/AdAdmin.tsx` (health panel + Run-scrape button)

**DB migration (1)**
- New table `price_alert_notifications` + RLS + index
- Add `price_alert_notifications` to `supabase_realtime` publication

**No new dependencies. No secret changes.**

**Total estimate:** ~2.5 hrs of build, ~14 credits. Each step shipped + verified before moving to the next, in this order: **A → B → C → D → F**.

After each step I will say: `Step A done, verified — moving to B` so you can stop me if anything looks off.

