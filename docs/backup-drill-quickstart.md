# Backup Restore Drill — Quickstart

This is the **2-hour copy-paste version** of `docs/BACKUP_RESTORE.md`.
Run it once before you cross 100 paying users, then once per quarter.

---

## What you'll do

1. Take a snapshot of production
2. Create a throwaway remix project
3. Restore the snapshot into the remix
4. Smoke-test the remix
5. Throw the remix away
6. Log the result

---

## Prerequisites

- `pg_dump` and `pg_restore` installed locally (comes with Postgres CLI)
- An off-site bucket for snapshot storage (S3, GCS, or even iCloud / Drive
  for solo founders — encryption-at-rest is what matters)
- 2 free hours

---

## Step-by-step

### 1. Get production DB URL (1 min)

In Lovable: **Connectors → Lovable Cloud → Database → Connection string**.
Copy the `postgresql://...` URL.

```bash
export PROD_DB_URL="postgresql://postgres:<pwd>@<host>:5432/postgres"
```

### 2. Take snapshot (5 min)

```bash
mkdir -p snapshots
pg_dump --no-owner --format=custom "$PROD_DB_URL" \
  > "snapshots/$(date +%F)-full.dump"
ls -lh snapshots/
```

Expected size: 1-50 MB depending on user count.

### 3. Upload to off-site storage (2 min)

```bash
# AWS
aws s3 cp "snapshots/$(date +%F)-full.dump" s3://nutrilens-backups/

# OR — for solo founders without S3
cp "snapshots/$(date +%F)-full.dump" ~/Drive/NutriLens-Backups/
```

### 4. Create remix project (3 min)

In Lovable: **Project Settings → Remix Project**. Name it
`nutrilens-restore-drill-YYYYMMDD`. Wait until it provisions.

### 5. Get remix DB URL (1 min)

Open the remix, go to **Connectors → Lovable Cloud → Database**.

```bash
export REMIX_DB_URL="postgresql://postgres:<pwd>@<host>:5432/postgres"
```

### 6. Restore (10 min)

```bash
pg_restore --no-owner --clean --if-exists \
  -d "$REMIX_DB_URL" \
  "snapshots/$(date +%F)-full.dump"
```

You may see harmless warnings about missing extensions — those are fine.
Hard errors mean the restore failed — abort and investigate.

### 7. Smoke tests (15 min)

Open the remix preview URL and check:

- [ ] Sign up a new test user → succeeds
- [ ] Log in with a known seed account → succeeds
- [ ] Dashboard loads, yesterday's meals appear
- [ ] Meal plan generates without errors
- [ ] Open Brand portal (if you have a brand seed user) → wallet balance + transactions visible
- [ ] Compare row counts to production:
  ```sql
  -- Run in BOTH prod and remix, compare
  select 'profiles' tbl, count(*) from profiles union all
  select 'daily_logs', count(*) from daily_logs union all
  select 'subscriptions', count(*) from subscriptions union all
  select 'weight_logs', count(*) from weight_logs;
  ```
  Numbers should match within ±5 rows (allowing for in-flight writes).

### 8. Tear down (1 min)

In Lovable: **Remix Project Settings → Delete Project**. Confirm.

### 9. Log it (1 min)

Append a row to `docs/backup-drill-log.md`:

```markdown
| 2026-04-24 | 2026-04-24-full.dump | 35 min | None | Operator-Name |
```

---

## If it fails

1. **DO NOT** deploy any new features until you understand why.
2. File an incident note in `docs/incidents/` with timestamps and error logs.
3. If the issue is on Lovable Cloud's side, open a support ticket immediately.
4. Re-run the drill within 1 week of resolution.

---

## RTO / RPO reminder

| Metric                          | Target    |
|---------------------------------|-----------|
| RPO (max acceptable data loss)  | 24 hours  |
| RTO (time to restore service)   | 4 hours   |
| Drill frequency                 | Quarterly |

If your restore drill takes >4 hours, your RTO is broken — fix the
bottleneck (usually: missing tooling, missing credentials, slow upload).
