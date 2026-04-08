

# Phase 5: pg_cron Daily Scraping Setup

## What Was Done
The migration created `pg_cron` and `pg_net` extensions. But the actual cron job schedules were **not added** — the migration only has extension creation.

## What Needs to Happen
Per the schedule-jobs instructions, cron jobs containing project-specific URLs and keys must be inserted via **direct SQL insert** (not migration), since they contain secrets that shouldn't run on remix.

## Implementation

### Step 1: Schedule 3 cron jobs via SQL insert

Using the Supabase insert/query tool (not migration), run:

**Job 1 — Volatile items daily (6 AM IST = 00:30 UTC)**
Scrapes chicken, eggs, mutton, fish, tomato, onion, potato for Hyderabad, Mumbai, Delhi.
```
cron.schedule('firecrawl-volatile-daily', '30 0 * * *', ...)
```
Calls `firecrawl-prices` with `{"scrapeAll": false, "city": "hyderabad"}` then Mumbai, then Delhi — 3 separate jobs, or one with `scrapeAll` for the 3 key cities.

**Job 2 — Medium-volatility biweekly (Tue + Fri, 6 AM IST)**
Scrapes paneer, dal, rice for all cities.
```
cron.schedule('firecrawl-medium-biweekly', '30 0 * * 2,5', ...)
```

**Job 3 — Full scrape monthly (1st of month)**
Scrapes all 10 cities for all items.
```
cron.schedule('firecrawl-full-monthly', '30 0 1 * *', ...)
```

Each job uses `net.http_post()` to invoke the `firecrawl-prices` edge function URL with the anon key in the Authorization header.

### Step 2: Add a cleanup job
Remove any stale/legacy cron entries if they exist from previous attempts.

### Firecrawl Credit Estimate
- Daily: 3 cities × 1 search = 3 credits/day = ~90/month
- Biweekly: 10 cities × 1 search = 10 credits × 8/month = 80/month  
- Monthly: 10 cities × 1 search = 10 credits/month
- **Total: ~180 credits/month**

### No Code Changes
The `firecrawl-prices` edge function already handles all scraping logic. This is purely a database scheduling setup.

