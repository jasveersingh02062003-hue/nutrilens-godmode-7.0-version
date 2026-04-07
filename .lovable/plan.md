

# Phase 6: Smart Market — Resilience, Data Quality & Infrastructure Hardening

## Gap Analysis (12 gaps from your review vs current codebase)

| # | Gap | Current Status | Action |
|---|-----|---------------|--------|
| 1 | Retry & Circuit Breaker for scraping | No retry logic in `firecrawl-prices/index.ts` | Add `fetchWithRetry()` + circuit breaker to edge function |
| 2 | Data Freshness Indicators | Detail sheet shows "Updated X ago" via `formatDistanceToNow` but no color-coded staleness badge on cards | Add `PriceFreshnessBadge` component, show on cards + detail sheet |
| 3 | Crowdsourced Price Verification | Reports stored but no validation threshold; any single report could affect prices | Add verification logic — require 3+ reports in 7 days before accepting into `city_prices` |
| 4 | Edge Function Scheduling | `firecrawl-prices` exists but no cron job scheduled | Create cron schedule via `pg_cron` + `pg_net` |
| 5 | Database Indexing | No indexes on `city_prices`, `price_history`, `price_reports` | Add composite indexes via migration |
| 6 | Partial Data Handling | Items with missing nutrition show normally — no "Incomplete" indicator | Add "Incomplete" badge when protein/calories are 0 or null |
| 7 | Privacy/Moderation for Reports | No anonymization or moderation | Anonymize user_id in public queries; add `is_verified` flag to `price_reports` |
| 8 | Unit & Integration Tests | No tests for market/PES logic | Create test files for `pes-engine`, `live-price-service`, `market-service` |
| 9 | Monitoring & Alerts | No failure tracking | Add error counter in edge function + log structured failures |
| 10 | Affiliate Deep Linking | CTA uses `window.open()` with plain URLs | Add universal link detection + fallback |
| 11 | Price Alerts | No `price_alerts` table, no UI, no check logic | Create table, UI component, and hourly check edge function |
| 12 | Fallback When All Sources Fail | `getLivePrice` returns `null` if static also fails | Return last-known price with disclaimer instead of null |

## Plan — 8 Steps

### Step 1: Retry + Circuit Breaker in Edge Function
Update `supabase/functions/firecrawl-prices/index.ts`:
- Add `fetchWithRetry(url, options, retries=3)` with exponential backoff (1s, 2s, 4s)
- Add circuit breaker: track consecutive failures in a module-level counter. After 5 failures, skip Firecrawl for that city and return empty (fall back to static)
- Log structured error messages for monitoring

### Step 2: Price Freshness Badge Component
Create `src/components/PriceFreshnessBadge.tsx`:
- Green (< 6h), Yellow (6-24h), Red (> 24h) based on `lastUpdated` field
- Show on market cards (next to price) and in detail sheet
- If no `lastUpdated`, show grey "Estimate" label

### Step 3: Database Indexes + Price Alerts Table (Migration)
Single migration with:
- `CREATE INDEX idx_city_prices_lookup ON city_prices(city, item_name, price_date DESC)`
- `CREATE INDEX idx_price_history_lookup ON price_history(city, item_name, price_date DESC)`
- `CREATE INDEX idx_price_reports_lookup ON price_reports(city, item_name, reported_at DESC)`
- Create `price_alerts` table: `id, user_id (ref profiles), item_name, city, threshold_price, comparison_type ('below'/'above'), is_active, created_at, last_triggered_at`
- RLS: users can CRUD own alerts

### Step 4: Crowdsource Verification Logic
Update `src/lib/live-price-service.ts`:
- In the community reports step, require `reports.length >= 3` (already done) but also add: reports must come from >= 3 distinct `user_id`s within 7 days
- Add outlier rejection: if a report is >50% away from median, exclude it
- Add `is_verified` column to `price_reports` table (migration)

### Step 5: Price Alerts UI + Check Function
- Create `src/components/PriceAlertSheet.tsx`: set item, city, threshold, direction (below/above)
- Add "Set Alert" button in `MarketItemDetailSheet`
- Create edge function `supabase/functions/check-price-alerts/index.ts`: queries active alerts, compares vs current `city_prices`, sends notification via Supabase Realtime channel
- Schedule hourly via `pg_cron`

### Step 6: Improved Fallback Chain
Update `live-price-service.ts`:
- When all 3 tiers return null, query `city_prices` without date filter (last known price for this city+item)
- If found, return with `source: 'stale'` and add `isStale: true` flag
- Update `PriceFreshnessBadge` to show red "May be outdated" for stale prices

### Step 7: Partial Data Badge + Deep Link Improvements
- In `Market.tsx` card rendering, show "⚠️ Incomplete" badge if `item.protein === 0 && item.calories === 0`
- Update Buy CTA to try app deep links first (`bigbasket://`, `amazon://`) with `setTimeout` fallback to HTTPS URL

### Step 8: Edge Function Cron Scheduling
Use `pg_cron` + `pg_net` to schedule:
- `firecrawl-prices` daily at 6 AM IST for volatile items (chicken, eggs, vegetables)
- `check-price-alerts` hourly
- Insert via Supabase query tool (not migration, contains project-specific URLs)

## Files Changed

| File | Action |
|------|--------|
| `supabase/functions/firecrawl-prices/index.ts` | Modified — retry logic + circuit breaker |
| `src/components/PriceFreshnessBadge.tsx` | New — color-coded staleness indicator |
| `src/pages/Market.tsx` | Modified — freshness badge on cards, incomplete badge, deep links |
| `src/components/MarketItemDetailSheet.tsx` | Modified — freshness badge, "Set Alert" button |
| `src/lib/live-price-service.ts` | Modified — stale fallback, outlier rejection |
| `src/components/PriceAlertSheet.tsx` | New — UI to create price alerts |
| `supabase/functions/check-price-alerts/index.ts` | New — hourly alert checker |
| DB migration | Indexes + `price_alerts` table + `is_verified` on `price_reports` |

## Technical Notes
- No Firecrawl API calls are triggered from client — all scraping is server-side via edge functions
- `FIRECRAWL_HOOK` comments preserved throughout for future integration
- Price alerts use Supabase Realtime channels for in-app notifications (no push infrastructure needed yet)
- Circuit breaker resets after 30 minutes of no failures
- Tests deferred to a separate step to avoid blocking this phase

