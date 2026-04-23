# Backup & Restore Drill — Quarterly Checklist

NutriLens runs on Lovable Cloud (managed Supabase). Lovable Cloud takes
**daily automated backups** (point-in-time recovery up to 7 days on the free
tier, longer on paid plans). This document is the operator checklist for
verifying that backups can actually be restored — run it **once per quarter**.

---

## 1. Verify automated backups are running

1. Open **Connectors → Lovable Cloud → Backups** in the project dashboard.
2. Confirm the most recent backup is < 24 hours old.
3. Confirm at least 7 daily backups are retained.

If any of the above fails, escalate to Lovable support immediately.

---

## 2. Manual snapshot (belt-and-braces)

Once per quarter, take a manual `pg_dump` to off-site cold storage so you are
not 100% dependent on the managed provider.

```bash
# 1. Get the DB connection string from Connectors → Lovable Cloud → Database
export DB_URL="postgresql://postgres:<pwd>@<host>:5432/postgres"

# 2. Schema-only dump (small, easy to diff)
pg_dump --schema-only --no-owner "$DB_URL" > snapshots/$(date +%F)-schema.sql

# 3. Full dump with data (compressed)
pg_dump --no-owner --format=custom "$DB_URL" \
  > snapshots/$(date +%F)-full.dump

# 4. Upload to off-site bucket (S3 / GCS / personal cloud)
aws s3 cp snapshots/$(date +%F)-full.dump s3://nutrilens-backups/
```

Keep the last **4 quarterly snapshots** plus 1 yearly snapshot.

---

## 3. Restore drill

Restoring into the live DB is destructive — always restore into a **separate
remix project** so you can validate without affecting production.

1. Create a new Lovable project as a fresh remix of NutriLens.
2. Disable Lovable Cloud auto-migrations on the remix.
3. Get the remix DB URL from Connectors → Lovable Cloud → Database.
4. Restore:
   ```bash
   pg_restore --no-owner --clean --if-exists \
     -d "$REMIX_DB_URL" \
     snapshots/<date>-full.dump
   ```
5. Smoke-test the remix:
   - [ ] Sign up a new test user.
   - [ ] Verify existing test user can log in (use a known seed account).
   - [ ] Open Dashboard → meals from yesterday should appear.
   - [ ] Open Brand portal → wallet balance + recent transactions visible.
   - [ ] Run `select count(*) from daily_logs;` and compare to production.

---

## 4. Document the drill

Create a row in `docs/backup-drill-log.md` with:

- Date of drill
- Snapshot used (filename / commit hash)
- Restore time (minutes)
- Issues encountered + resolution
- Operator name

---

## 5. Failure escalation

If a restore drill fails:

1. **Do not** roll the failure forward — investigate before next quarter.
2. File an incident in `docs/incidents/` with timeline and root cause.
3. If the issue is on Lovable Cloud's side, open a support ticket immediately.
4. Re-run the drill within 1 week of resolution.

---

## RPO / RTO targets

| Metric | Target |
|--------|--------|
| RPO (max acceptable data loss) | 24 hours |
| RTO (time to restore service) | 4 hours  |
| Drill frequency               | Quarterly |
| Snapshot retention            | 4 quarterly + 1 yearly |
